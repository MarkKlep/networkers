// Runs a solution against a problem's test cases.
//
// The code runs in a Web Worker, for one reason above all others: an infinite
// loop is the normal failure mode of a half-written DSA solution, and
// `worker.terminate()` is the only way a browser can interrupt one. On the main
// thread the same loop hangs the tab and takes the unsaved draft with it.
//
// The worker is built from a Blob URL rather than a separate file so it needs
// no CRA/webpack worker configuration, and is created fresh per run and torn
// down after - a terminated worker cannot be reused, and a fresh one also means
// no state leaks between runs.
//
// Nothing leaves the browser. Execution stays entirely client-side; if this
// ever grows a Python mode it becomes a backend judge, and only this module
// changes - the result shape below is what the UI is written against.

const WORKER_SOURCE = `
  // Captured per case so the results panel can show the stdout of the case you
  // are looking at, rather than one merged blob for the whole run.
  var logs = [];
  var format = function (value) {
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value);
    } catch (error) {
      return String(value);
    }
  };
  console.log = function () {
    logs.push(Array.prototype.map.call(arguments, format).join(' '));
  };
  var takeLogs = function () {
    var taken = logs;
    logs = [];
    return taken;
  };

  // A returned value has to survive structured cloning to get back to the main
  // thread. Anything that cannot (a function, a class instance with methods) is
  // reported as its string form instead of failing the whole run.
  var send = function (message) {
    try {
      self.postMessage(message);
    } catch (error) {
      message.received = String(message.received);
      message.uncloneable = true;
      self.postMessage(message);
    }
  };

  self.onmessage = function (event) {
    var code = event.data.code;
    var functionName = event.data.functionName;
    var tests = event.data.tests;

    var solution;
    try {
      // Indirect definition rather than eval: the last expression hands back
      // the function the problem asked for, so a solution that defines helpers
      // alongside it works exactly as it would in a file.
      solution = new Function(
        code + '\\nreturn typeof ' + functionName + " === 'function' ? " + functionName + ' : null;'
      )();
    } catch (error) {
      self.postMessage({ kind: 'fatal', message: String(error) });
      return;
    }

    if (!solution) {
      self.postMessage({
        kind: 'fatal',
        message: 'No function named ' + functionName + ' was defined.',
      });
      return;
    }

    for (var index = 0; index < tests.length; index++) {
      var startedAt = Date.now();
      takeLogs();
      try {
        var received = solution.apply(null, tests[index].args);
        send({
          kind: 'case',
          index: index,
          received: received,
          logs: takeLogs(),
          ms: Date.now() - startedAt,
        });
      } catch (error) {
        self.postMessage({
          kind: 'case',
          index: index,
          error: String(error && error.message ? error.message : error),
          logs: takeLogs(),
          ms: Date.now() - startedAt,
        });
      }
    }

    self.postMessage({ kind: 'done' });
  };
`;

// One case may take this long before the worker is killed. The timer is reset
// after every case, so it caps a single case rather than the whole run.
const CASE_TIMEOUT_MS = 3000;

// Structural comparison, because these problems return arrays and arrays of
// arrays. NaN equals NaN here (a legitimate answer to some numeric problems);
// key order in objects deliberately does not matter.
export function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') {
    return Number.isNaN(a) && Number.isNaN(b);
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => key in b && deepEqual(a[key], b[key]));
  }
  return false;
}

// Values are shown, not logged, so this has to render `undefined` and strings
// distinguishably - "undefined" and '"abc"' rather than "" and "abc".
export function display(value) {
  if (value === undefined) return 'undefined';
  try {
    return JSON.stringify(value);
  } catch (error) {
    return String(value);
  }
}

export function runTests({ code, functionName, tests }) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }));
    const worker = new Worker(url);

    // Every case starts as `pending`; whatever is still pending when the run
    // ends is what the failure happened on. That is what lets a timeout name
    // the case that hung instead of failing the run as a whole.
    const cases = tests.map((test, index) => ({
      index,
      test,
      status: 'pending',
      received: undefined,
      error: '',
      logs: [],
      ms: 0,
    }));

    let timer;
    let settled = false;

    const finish = (fatal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve({
        fatal: fatal || '',
        cases: cases.map((item) =>
          item.status === 'pending' ? { ...item, status: 'skipped' } : item
        ),
      });
    };

    const armTimeout = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const hung = cases.find((item) => item.status === 'pending');
        if (hung) {
          hung.status = 'timeout';
          hung.error = `Timed out after ${CASE_TIMEOUT_MS / 1000}s — likely an infinite loop.`;
        }
        finish();
      }, CASE_TIMEOUT_MS);
    };

    worker.onmessage = (event) => {
      const message = event.data;

      if (message.kind === 'fatal') {
        finish(message.message);
        return;
      }

      if (message.kind === 'case') {
        const item = cases[message.index];
        item.logs = message.logs || [];
        item.ms = message.ms;
        if (message.error) {
          item.status = 'error';
          item.error = message.error;
        } else {
          item.received = message.received;
          item.status = deepEqual(message.received, item.test.expected) ? 'passed' : 'failed';
        }
        armTimeout();
        return;
      }

      if (message.kind === 'done') finish();
    };

    // A syntax error in the submitted code surfaces here rather than as a
    // message, since the worker never gets far enough to reply.
    worker.onerror = (event) => {
      event.preventDefault();
      finish(event.message || 'Your code could not be run.');
    };

    armTimeout();
    worker.postMessage({ code, functionName, tests: tests.map(({ args }) => ({ args })) });
  });
}
