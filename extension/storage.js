// Shared storage helper para content scripts e popup. Expõe `window.ccStorage`.
// Cache em memória invalidado automaticamente via chrome.storage.onChanged
// para evitar round-trips redundantes ao IPC do storage.

(function () {
  "use strict";

  var DEFAULTS = {
    serverUrl: "http://91.99.211.238:3100",
    feedbackToken: "",
    feedbackTokenExp: 0,
    testerEmail: "",
    testerName: "",
    workspaces: [],
    gdprConsentAt: 0,
  };

  var cache = null;

  chrome.storage.onChanged.addListener(function (_changes, area) {
    if (area === "local") cache = null;
  });

  function get() {
    if (cache) return Promise.resolve(cache);
    return new Promise(function (resolve) {
      chrome.storage.local.get(DEFAULTS, function (values) {
        cache = values;
        resolve(values);
      });
    });
  }

  function set(values) {
    return new Promise(function (resolve) {
      chrome.storage.local.set(values, function () {
        cache = null;
        resolve();
      });
    });
  }

  window.ccStorage = { get: get, set: set, DEFAULTS: DEFAULTS };
})();
