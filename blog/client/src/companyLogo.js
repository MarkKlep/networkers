// Resolves a company name to a real logo, with a graceful path back to "no
// logo" for anything that can't be resolved - a post about a small startup
// or a typo'd company name should never show a broken image.
//
// This is the one place in the app that sends data to a third party that
// isn't LinkedIn: company *names* (never people, never emails) go to
// Clearbit's free autocomplete API to find a domain, which is then hit
// through Google's favicon service to get an icon. If that's not
// acceptable, unset ENABLED below - every caller already falls back to the
// existing colour-coded monogram with no other code changes required.
const ENABLED = true;

const AUTOCOMPLETE_URL = 'https://autocomplete.clearbit.com/v1/companies/suggest?query=';
const faviconUrl = (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

// Clearbit's top suggestion is ranked by its own relevance score, not by
// exact name match, so it's sometimes a subsidiary site rather than the
// company's real domain - "Microsoft" resolves office.com first, with the
// actual microsoft.com result second. A handful of very well-known employers
// don't have their main domain in the candidate list at all (searching
// "Meta" never offers meta.com - only meta*careers*.com, whose favicon isn't
// Meta's actual brand mark), so those get a direct override instead of
// relying on the API's ranking.
const KNOWN_DOMAINS = {
  meta: 'meta.com',
  facebook: 'meta.com',
};

// Among Clearbit's suggestions, a name that matches the query exactly is a
// far more reliable signal than "came first" - that's what fixes the
// Microsoft case above without needing an override entry for every company.
function pickDomain(suggestions, query) {
  const exact = suggestions.find((s) => s.name?.trim().toLowerCase() === query);
  return (exact || suggestions[0])?.domain || null;
}

// Company names repeat constantly across posts, connections and chips on the
// same page, and the resolved domain never changes within a session - so
// cache in memory rather than re-querying per render.
const cache = new Map();

export function resolveCompanyLogo(companyName) {
  if (!ENABLED || !companyName) {
    return Promise.resolve(null);
  }

  const key = companyName.trim().toLowerCase();
  if (!key) return Promise.resolve(null);

  if (cache.has(key)) {
    return cache.get(key);
  }

  const promise = KNOWN_DOMAINS[key]
    ? Promise.resolve(faviconUrl(KNOWN_DOMAINS[key]))
    : fetch(`${AUTOCOMPLETE_URL}${encodeURIComponent(key)}`)
        .then((response) => (response.ok ? response.json() : []))
        .then((suggestions) => {
          const domain = pickDomain(suggestions || [], key);
          return domain ? faviconUrl(domain) : null;
        })
        .catch(() => null);

  cache.set(key, promise);
  return promise;
}
