// Drafts and solved state, kept in localStorage.
//
// Coming back to a problem and finding your half-finished attempt gone is the
// difference between a practice tool and a demo, so the draft is saved on every
// keystroke. It stays on the machine: there is no practice service, and tying
// this to the `auth` account would mean one - which is the upgrade path if
// progress ever needs to follow you between browsers.

const DRAFT_KEY = (id) => `practice:draft:${id}`;
const SOLVED_KEY = 'practice:solved';

// localStorage throws in private-browsing modes and when the quota is full.
// Losing a draft is bad; taking the whole workspace down with it is worse.
const safely = (operation, fallback) => {
  try {
    return operation();
  } catch (error) {
    return fallback;
  }
};

export const loadDraft = (id) => safely(() => localStorage.getItem(DRAFT_KEY(id)), null);

export const saveDraft = (id, code) =>
  safely(() => localStorage.setItem(DRAFT_KEY(id), code), undefined);

export const clearDraft = (id) => safely(() => localStorage.removeItem(DRAFT_KEY(id)), undefined);

export const loadSolved = () =>
  safely(() => JSON.parse(localStorage.getItem(SOLVED_KEY)) || [], []);

export const markSolved = (id) =>
  safely(() => {
    const solved = loadSolved();
    if (!solved.includes(id)) {
      localStorage.setItem(SOLVED_KEY, JSON.stringify([...solved, id]));
    }
    return undefined;
  }, undefined);
