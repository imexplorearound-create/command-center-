// IndexedDB queue de gravações pendentes. Expõe `window.ccQueue`.
// Drain é manual: chamado pelo content script no carregamento da página
// (gated por sessionStorage para evitar duplicação entre tabs) e antes de
// nova gravação.

(function () {
  "use strict";

  var DB_NAME = "cc-feedback";
  var DB_VERSION = 1;
  var STORE = "pending";
  var MAX_ITEMS = 50;
  var MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

  var dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { dbPromise = null; reject(req.error); };
    });
    return dbPromise;
  }

  function tx(mode) {
    return open().then(function (db) {
      return { store: db.transaction(STORE, mode).objectStore(STORE) };
    });
  }

  function enqueue(blob, metadata, events) {
    return tx("readwrite").then(function (ctx) {
      return new Promise(function (resolve, reject) {
        var record = {
          blob: blob,
          events: events || [],
          metadata: metadata || {},
          queuedAt: Date.now(),
        };
        var req = ctx.store.add(record);
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
    }).then(enforceLimits);
  }

  function list() {
    return tx("readonly").then(function (ctx) {
      return new Promise(function (resolve, reject) {
        var req = ctx.store.getAll();
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function remove(id) {
    return tx("readwrite").then(function (ctx) {
      return new Promise(function (resolve, reject) {
        var req = ctx.store.delete(id);
        req.onsuccess = function () { resolve(); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  // Limita a queue: descarta items > MAX_AGE_MS e o overflow acima de MAX_ITEMS.
  // Evita que IndexedDB cresça sem fim quando o servidor está offline durante dias.
  function enforceLimits(addedId) {
    return list().then(function (items) {
      var now = Date.now();
      var toRemove = items.filter(function (it) { return now - it.queuedAt > MAX_AGE_MS; });
      var fresh = items.filter(function (it) { return now - it.queuedAt <= MAX_AGE_MS; });
      if (fresh.length > MAX_ITEMS) {
        fresh.sort(function (a, b) { return a.queuedAt - b.queuedAt; });
        toRemove = toRemove.concat(fresh.slice(0, fresh.length - MAX_ITEMS));
      }
      return Promise.all(toRemove.map(function (it) { return remove(it.id); }))
        .then(function () { return addedId; });
    }).catch(function () { return addedId; });
  }

  window.ccQueue = {
    enqueue: enqueue,
    list: list,
    remove: remove,
  };
})();
