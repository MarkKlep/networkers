const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { parse } = require('csv-parse/sync');

const app = express();
app.use(cors());
// The browser posts the raw file contents, so no upload middleware is needed.
// Some browsers report a .csv file as application/vnd.ms-excel.
app.use(express.text({ type: ['text/csv', 'text/plain', 'application/vnd.ms-excel'], limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Saved to disk so the CSV only ever has to be uploaded once - without this,
// every restart means re-exporting from LinkedIn, which defeats the point of
// the app. It holds real people's names and email addresses, so it lives in
// data/ (gitignored) and never leaves this machine.
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'connections.json');

let connections = [];
let savedAt = null;

function load() {
  try {
    const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    connections = saved.connections || [];
    savedAt = saved.savedAt || null;
    console.log(`Loaded ${connections.length} saved connections`);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Could not read saved connections:', err.message);
    }
  }
}

function save() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify({ savedAt, connections }, null, 2));
}

// LinkedIn's export starts with a "Notes:" preamble of a few lines before the
// real header row, so we can't hand the file straight to the CSV parser.
function stripPreamble(csv) {
  const lines = csv.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => line.startsWith('First Name'));

  if (headerIndex === -1) {
    return null;
  }

  return lines.slice(headerIndex).join('\n');
}

// "Google, Inc." and "google llc" should both match a search for "Google", so
// both sides get lowercased, stripped of punctuation and of the legal suffixes
// that show up inconsistently across profiles.
const LEGAL_SUFFIXES = /\b(inc|llc|ltd|limited|corp|corporation|co|gmbh|bv|ag|sa|plc|pvt|group|holdings)\b/g;

function normalize(value) {
  return (value || '')
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()'"]/g, ' ')
    .replace(LEGAL_SUFFIXES, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 0 = no match. Higher is a better match, so exact hits sort above the
// company that merely contains the query as a substring.
function matchScore(company, query) {
  const a = normalize(company);
  const b = normalize(query);

  if (!a || !b) return 0;
  if (a === b) return 3;
  if (a.startsWith(b)) return 2;
  if (a.includes(b)) return 1;
  return 0;
}

app.post('/connections', (req, res) => {
  const body = stripPreamble(req.body || '');

  if (!body) {
    return res.status(400).send({
      error: "That doesn't look like a LinkedIn connections export - no \"First Name\" header row found.",
    });
  }

  let rows;
  try {
    rows = parse(body, { columns: true, skip_empty_lines: true, relax_column_count: true });
  } catch (err) {
    return res.status(400).send({ error: `Could not parse the CSV: ${err.message}` });
  }

  connections = rows.map((row) => ({
    firstName: row['First Name'] || '',
    lastName: row['Last Name'] || '',
    url: row['URL'] || '',
    email: row['Email Address'] || '',
    company: row['Company'] || '',
    position: row['Position'] || '',
    connectedOn: row['Connected On'] || '',
  }));

  savedAt = new Date().toISOString();
  save();

  res.send(status());
});

// LinkedIn leaves Company blank for a lot of connections, and those can never
// match a search - worth surfacing so result counts aren't mistaken for the
// whole picture.
function status() {
  return {
    total: connections.length,
    withoutCompany: connections.filter((c) => !c.company.trim()).length,
    savedAt,
  };
}

// The UI calls this on load: if connections were saved on a previous run it
// skips the upload step entirely and goes straight to the search box.
app.get('/status', (req, res) => {
  res.send(status());
});

app.delete('/connections', (req, res) => {
  connections = [];
  savedAt = null;
  fs.rmSync(DATA_FILE, { force: true });
  res.send(status());
});

// Every connection, unfiltered - powers the table view. /search stays
// company-only and empty-query-returns-nothing, since that's the "did I
// forget who I know at X" flow; this is the "show me everyone" flow.
app.get('/connections', (req, res) => {
  const all = [...connections].sort((a, b) => a.firstName.localeCompare(b.firstName));
  res.send({ total: all.length, connections: all });
});

app.get('/search', (req, res) => {
  const query = (req.query.company || '').trim();

  if (!query) {
    return res.send({ query, matches: [] });
  }

  const matches = connections
    .map((connection) => ({ connection, score: matchScore(connection.company, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.connection.firstName.localeCompare(b.connection.firstName);
    })
    .map((entry) => entry.connection);

  res.send({ query, matches });
});

// Powers the "who do I know, anywhere?" browse case - the companies you have
// the most connections at are the ones worth asking first.
app.get('/companies', (req, res) => {
  const counts = new Map();

  connections.forEach(({ company }) => {
    if (!company.trim()) return;
    const key = normalize(company);
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { company, count: 1 });
    }
  });

  const companies = Array.from(counts.values()).sort((a, b) => b.count - a.count);

  res.send({ loaded: connections.length, companies });
});

load();

const server = app.listen(4006, () => {
  console.log('Referrals service is running on port 4006');
});

server.on('error', (err) => {
  console.error('Server error:', err);
});
