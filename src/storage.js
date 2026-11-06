'use strict';
/* Storage boundary shared by session storage and a future authenticated database. */
const TreasuresStorage = (() => {
  const KEY = 'my-ai-treasures:session:v1';
  function createSessionStore(resolveStorage = () => window.sessionStorage) {
    return {
      async load() {
        const raw = resolveStorage().getItem(KEY);
        if (!raw) return null;
        try { return JSON.parse(raw); }
        catch { resolveStorage().removeItem(KEY); return null; }
      },
      async save(snapshot) { resolveStorage().setItem(KEY, JSON.stringify(snapshot)); },
      async clear() { resolveStorage().removeItem(KEY); }
    };
  }
  // Not activated by this release. Supply modular Firebase SDK functions after
  // authentication is implemented; no SDK, credentials or network is used now.
  function createFirebaseStore({ db, uid, doc, getDoc, setDoc, deleteDoc }) {
    if (!uid || typeof uid !== 'string' || uid.includes('/')) throw new Error('Authenticated user ID required');
    if (!db || [doc,getDoc,setDoc,deleteDoc].some(fn => typeof fn !== 'function')) throw new Error('Firebase SDK dependencies required');
    const ref = doc(db, 'users', uid, 'settlements', 'current');
    return {
      async load() { const snapshot = await getDoc(ref); return snapshot.exists() ? snapshot.data() : null; },
      async save(snapshot) { await setDoc(ref, snapshot); },
      async clear() { await deleteDoc(ref); }
    };
  }
  return { KEY, createSessionStore, createFirebaseStore };
})();
