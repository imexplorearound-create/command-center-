// Botão flutuante 🎤 + gravação áudio + captura de eventos DOM.
// Ver storage.js (defaults) e queue.js (persistência).

(function () {
  "use strict";

  // Re-injection em SPA: evita botões duplicados e wrappers em cascata.
  if (document.querySelector(".cc-feedback-btn")) return;

  var mediaRecorder = null;
  var audioChunks = [];
  var isRecording = false;
  var currentSessionId = null;
  var pagesVisited = [window.location.href];

  var recordingStartTime = 0;
  var recordedEvents = [];
  var eventListeners = [];
  var mutationObserver = null;
  var inputDebounceTimers = {};

  function isOurElement(el) {
    return el && (el.closest(".cc-feedback-btn") || el.closest(".cc-feedback-toast"));
  }

  function relativeMs() {
    return Date.now() - recordingStartTime;
  }

  // Preferência: data-testid > id > tag.classes:nth-child(N).
  // data-testid sobrevive a refactors; classes Tailwind/CSS Modules são hashed.
  function getCssSelector(el) {
    if (!el || el === document.body || el === document.documentElement) return "body";
    var parts = [];
    var current = el;
    while (current && current !== document.body) {
      var tag = current.tagName.toLowerCase();
      var testid = current.getAttribute && current.getAttribute("data-testid");
      if (testid) {
        parts.unshift(tag + "[data-testid='" + testid + "']");
        break;
      }
      if (current.id) {
        parts.unshift(tag + "#" + current.id);
        break;
      }
      var classes = current.className && typeof current.className === "string"
        ? "." + current.className.trim().split(/\s+/).slice(0, 3).join(".")
        : "";
      var parent = current.parentElement;
      if (parent) {
        var siblings = Array.from(parent.children).filter(function (c) { return c.tagName === current.tagName; });
        if (siblings.length > 1) {
          var idx = siblings.indexOf(current) + 1;
          parts.unshift(tag + classes + ":nth-child(" + idx + ")");
        } else {
          parts.unshift(tag + classes);
        }
      } else {
        parts.unshift(tag + classes);
      }
      current = parent;
    }
    return parts.join(" > ");
  }

  // Defesa em profundidade: remove value="..." do HTML capturado em clicks.
  function sanitizeOuterHtml(html) {
    return html.replace(/\svalue=("[^"]*"|'[^']*')/gi, "");
  }

  function startEventRecording() {
    recordingStartTime = Date.now();
    recordedEvents = [];
    inputDebounceTimers = {};

    function onClickCapture(e) {
      if (isOurElement(e.target)) return;
      var el = e.target;
      recordedEvents.push({
        type: "click",
        timestampMs: relativeMs(),
        selector: getCssSelector(el),
        tagName: el.tagName.toLowerCase(),
        text: (el.textContent || "").trim().slice(0, 100),
        outerHTML: sanitizeOuterHtml(el.outerHTML.slice(0, 150)),
      });
    }

    function onInputCapture(e) {
      if (isOurElement(e.target)) return;
      var el = e.target;

      var inputType = (el.type || "").toLowerCase();
      if (inputType === "password" || inputType === "hidden") return;
      var ac = (el.autocomplete || "").toLowerCase();
      if (ac.indexOf("cc-") === 0) return;
      if (inputType === "file") {
        recordedEvents.push({
          type: "input",
          timestampMs: relativeMs(),
          selector: getCssSelector(el),
          tagName: el.tagName.toLowerCase(),
          value: "[ficheiro seleccionado]",
        });
        return;
      }

      var key = getCssSelector(el);
      if (inputDebounceTimers[key]) clearTimeout(inputDebounceTimers[key]);
      inputDebounceTimers[key] = setTimeout(function () {
        recordedEvents.push({
          type: "input",
          timestampMs: relativeMs(),
          selector: key,
          tagName: el.tagName.toLowerCase(),
          value: (el.value || "").slice(0, 200),
        });
      }, 500);
    }

    function onFocusCapture(e) {
      if (isOurElement(e.target)) return;
      var el = e.target;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable) {
        recordedEvents.push({
          type: "focus",
          timestampMs: relativeMs(),
          selector: getCssSelector(el),
          tagName: el.tagName.toLowerCase(),
        });
      }
    }

    function onNavigateCapture() {
      recordedEvents.push({
        type: "navigate",
        timestampMs: relativeMs(),
        pageUrl: window.location.href,
      });
    }

    document.addEventListener("click", onClickCapture, true);
    document.addEventListener("input", onInputCapture, true);
    document.addEventListener("focus", onFocusCapture, true);
    window.addEventListener("popstate", onNavigateCapture);

    eventListeners = [
      { target: document, type: "click", fn: onClickCapture, capture: true },
      { target: document, type: "input", fn: onInputCapture, capture: true },
      { target: document, type: "focus", fn: onFocusCapture, capture: true },
      { target: window, type: "popstate", fn: onNavigateCapture, capture: false },
    ];

    mutationObserver = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var mutation = mutations[i];
        for (var j = 0; j < mutation.addedNodes.length; j++) {
          var node = mutation.addedNodes[j];
          if (node.nodeType !== 1) continue;
          if (node.tagName === "DIALOG" || (node.getAttribute && node.getAttribute("role") === "dialog")) {
            recordedEvents.push({
              type: "modal_open",
              timestampMs: relativeMs(),
              selector: getCssSelector(node),
              text: (node.textContent || "").trim().slice(0, 100),
            });
          }
        }
        for (var k = 0; k < mutation.removedNodes.length; k++) {
          var removed = mutation.removedNodes[k];
          if (removed.nodeType !== 1) continue;
          if (removed.tagName === "DIALOG" || (removed.getAttribute && removed.getAttribute("role") === "dialog")) {
            recordedEvents.push({
              type: "modal_close",
              timestampMs: relativeMs(),
              selector: getCssSelector(removed),
            });
          }
        }
        if (mutation.type === "attributes" && mutation.attributeName === "open" && mutation.target.tagName === "DIALOG") {
          var dlg = mutation.target;
          recordedEvents.push({
            type: dlg.hasAttribute("open") ? "modal_open" : "modal_close",
            timestampMs: relativeMs(),
            selector: getCssSelector(dlg),
            text: dlg.hasAttribute("open") ? (dlg.textContent || "").trim().slice(0, 100) : undefined,
          });
        }
      }
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["open"] });
  }

  function stopEventRecording() {
    for (var i = 0; i < eventListeners.length; i++) {
      var l = eventListeners[i];
      l.target.removeEventListener(l.type, l.fn, l.capture);
    }
    eventListeners = [];

    for (var key in inputDebounceTimers) {
      clearTimeout(inputDebounceTimers[key]);
    }
    inputDebounceTimers = {};

    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }

    return recordedEvents;
  }

  // Idempotente: marca a função patched para não envolver duas vezes em SPA re-inject.
  if (!history.pushState.__ccWrapped) {
    var origPushState = history.pushState;
    history.pushState = function () {
      origPushState.apply(this, arguments);
      onNavigate();
    };
    history.pushState.__ccWrapped = true;
    window.addEventListener("popstate", onNavigate);
  }

  function onNavigate() {
    var url = window.location.href;
    if (!pagesVisited.includes(url)) {
      pagesVisited.push(url);
    }
  }

  // Devolve o projectSlug do workspace correspondente ao host actual.
  // Não devíamos chegar aqui sem match (background só injecta em hosts autorizados).
  function resolveProjectSlug(workspaces) {
    var origin = window.location.origin;
    for (var i = 0; i < workspaces.length; i++) {
      if (workspaces[i].origin === origin) return workspaces[i].projectSlug || "";
    }
    return "";
  }

  var btn = document.createElement("button");
  btn.className = "cc-feedback-btn";
  btn.textContent = "🎤";
  btn.title = "Gravar nota de voz";
  document.body.appendChild(btn);

  var CAM_BTN_TITLE = "Capturar screenshot (Alt+S para modais)";

  var camBtn = document.createElement("button");
  camBtn.className = "cc-feedback-camera-btn";
  camBtn.textContent = "📷";
  camBtn.title = CAM_BTN_TITLE;
  camBtn.style.display = "none";
  document.body.appendChild(camBtn);

  var toastEl = document.createElement("div");
  toastEl.className = "cc-feedback-toast";
  document.body.appendChild(toastEl);

  var capturedShots = [];
  var isCapturing = false;
  var MAX_MANUAL_SHOTS = 10;

  function showToast(message, isError) {
    toastEl.textContent = "";
    var label = document.createElement("div");
    label.className = "cc-feedback-toast-label";
    label.textContent = isError ? "Erro" : "Transcrito";
    var msg = document.createElement("div");
    msg.textContent = message;
    toastEl.appendChild(label);
    toastEl.appendChild(msg);
    toastEl.classList.toggle("cc-feedback-toast--error", !!isError);
    toastEl.classList.add("cc-feedback-toast--visible");
    setTimeout(function () { toastEl.classList.remove("cc-feedback-toast--visible"); }, 4000);
  }

  function triggerManualCapture() {
    if (!isRecording || isCapturing) return;
    if (capturedShots.length >= MAX_MANUAL_SHOTS) {
      showToast("Limite de " + MAX_MANUAL_SHOTS + " capturas atingido.", true);
      return;
    }
    isCapturing = true;
    camBtn.textContent = "⏳";
    camBtn.title = "A capturar...";
    var shotTimestampMs = relativeMs();
    captureScreenshot(function (dataUrl) {
      isCapturing = false;
      camBtn.textContent = "📷";
      camBtn.title = CAM_BTN_TITLE;
      if (!dataUrl) {
        showToast("Falha ao capturar screenshot.", true);
        return;
      }
      capturedShots.push({ timestampMs: shotTimestampMs, dataUrl: dataUrl });
      recordedEvents.push({ type: "screenshot", timestampMs: shotTimestampMs });
      showToast("📸 captado (" + capturedShots.length + ")", false);
    });
  }

  camBtn.addEventListener("click", triggerManualCapture);

  // Atalho Alt+S para capturar sem tirar foco do elemento activo — crítico
  // para capturar modais que fecham em "click fora".
  function onCaptureShortcut(e) {
    if (!isRecording) return;
    if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key !== "s" && e.key !== "S") return;
    e.preventDefault();
    e.stopPropagation();
    triggerManualCapture();
  }
  document.addEventListener("keydown", onCaptureShortcut, true);

  btn.addEventListener("click", function () {
    if (isRecording) {
      stopRecording();
      return;
    }
    // Defesa adicional: mesmo com host_permissions, confirmar que o origin actual
    // está num workspace configurado + GDPR aceite antes de gravar.
    window.ccStorage.get().then(function (settings) {
      if (!settings.gdprConsentAt) {
        showToast("Abre o popup da extensão e aceita o aviso de privacidade.", true);
        return;
      }
      var currentOrigin = window.location.origin;
      var allowed = (settings.workspaces || []).some(function (w) {
        return w.origin === currentOrigin;
      });
      if (!allowed) {
        showToast("Este site não está na tua lista de workspaces.", true);
        return;
      }
      drainQueue();
      startRecording();
    });
  });

  function startRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      audioChunks = [];
      capturedShots = [];
      mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      mediaRecorder.ondataavailable = function (e) {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = function () {
        // Snapshot do estado desta gravação — protege de race se uma nova
        // startRecording() corre antes do onstop desta disparar.
        var shots = capturedShots;
        capturedShots = [];

        stream.getTracks().forEach(function (t) { t.stop(); });
        var events = stopEventRecording();
        var blob = new Blob(audioChunks, { type: "audio/webm" });

        if (shots.length > 0) {
          persistAndSend(blob, events, shots[0].dataUrl, shots.slice(1));
        } else {
          btn.textContent = "📸";
          btn.title = "A capturar screenshot...";
          captureScreenshot(function (dataUrl) {
            persistAndSend(blob, events, dataUrl, []);
          });
        }
      };

      mediaRecorder.start();
      startEventRecording();
      isRecording = true;
      btn.classList.add("cc-feedback-btn--recording");
      btn.textContent = "⏹";
      btn.title = "Parar gravação";
      camBtn.style.display = "";
    }).catch(function (err) {
      showToast("Não foi possível aceder ao microfone: " + err.message, true);
    });
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    isRecording = false;
    btn.classList.remove("cc-feedback-btn--recording");
    btn.textContent = "🎤";
    btn.title = "Gravar nota de voz";
    camBtn.style.display = "none";
  }

  function captureScreenshot(callback) {
    // Preferir a API nativa — captura pixels reais (inclui modais, popovers,
    // iframes) e não tira foco do elemento activo.
    if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        chrome.runtime.sendMessage({ type: "captureVisibleTab" }, function (res) {
          var runtimeErr = chrome.runtime.lastError;
          if (runtimeErr || !res || !res.ok) {
            console.warn("[CC Feedback] captureVisibleTab falhou, fallback html2canvas:",
              (runtimeErr && runtimeErr.message) || (res && res.error));
            captureScreenshotFallback(callback);
            return;
          }
          callback(res.dataUrl);
        });
        return;
      } catch (err) {
        console.warn("[CC Feedback] sendMessage falhou:", err && err.message);
      }
    }
    captureScreenshotFallback(callback);
  }

  function captureScreenshotFallback(callback) {
    if (typeof window.html2canvas !== "function") {
      console.warn("[CC Feedback] html2canvas não carregado");
      callback(null);
      return;
    }
    var target = document.scrollingElement || document.documentElement || document.body;
    window.html2canvas(target, {
      logging: false,
      backgroundColor: "#ffffff",
      scale: Math.min(window.devicePixelRatio || 1, 1.5),
      useCORS: true,
      width: window.innerWidth,
      height: window.innerHeight,
      x: window.scrollX || 0,
      y: window.scrollY || 0,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      ignoreElements: isOurFeedbackElement,
    }).then(function (canvas) {
      try {
        callback(canvas.toDataURL("image/jpeg", 0.75));
      } catch (err) {
        console.warn("[CC Feedback] toDataURL failed:", err && err.message);
        callback(null);
      }
    }).catch(function (err) {
      console.warn("[CC Feedback] html2canvas failed:", err && err.message);
      callback(null);
    });
  }

  function isOurFeedbackElement(el) {
    return !!(el.classList && (
      el.classList.contains("cc-feedback-btn") ||
      el.classList.contains("cc-feedback-camera-btn") ||
      el.classList.contains("cc-feedback-toast")
    ));
  }

  function persistAndSend(audioBlob, events, screenshotDataUrl, extraScreenshots) {
    window.ccStorage.get().then(function (settings) {
      var metadata = {
        projectSlug: resolveProjectSlug(settings.workspaces || []),
        pageUrl: window.location.href,
        pageTitle: document.title,
        timestampMs: Date.now(),
        sessionId: currentSessionId,
        screenshotDataUrl: screenshotDataUrl || null,
        extraScreenshots: Array.isArray(extraScreenshots) ? extraScreenshots : [],
      };

      // Persistir SEMPRE antes de tentar enviar — falha de rede não perde gravação.
      window.ccQueue.enqueue(audioBlob, metadata, events)
        .then(function (queueId) {
          return attemptUpload(queueId, audioBlob, events, metadata, settings);
        })
        .catch(function (err) {
          showToast("Erro a guardar localmente: " + err.message, true);
        });
    });
  }

  function attemptUpload(queueId, audioBlob, events, metadata, settings) {
    if (!settings.feedbackToken) {
      showToast("Sem sessão activa. Abre o popup e faz login.", true);
      return Promise.resolve();
    }
    if (!metadata.projectSlug) {
      showToast("Workspace sem projectSlug — abre o popup para configurar.", true);
      return Promise.resolve();
    }

    btn.textContent = "⏳";
    btn.title = "A enviar...";

    var formData = new FormData();
    formData.append("audio", audioBlob, "voice-note.webm");
    formData.append("projectSlug", metadata.projectSlug);
    formData.append("pageUrl", metadata.pageUrl || "");
    formData.append("pageTitle", metadata.pageTitle || "");
    formData.append("timestampMs", String(metadata.timestampMs));
    if (events && events.length > 0) {
      formData.append("events", JSON.stringify(events));
    }
    if (metadata.sessionId) {
      formData.append("sessionId", metadata.sessionId);
    }
    if (metadata.screenshotDataUrl) {
      formData.append("screenshotDataUrl", metadata.screenshotDataUrl);
    }
    if (metadata.extraScreenshots && metadata.extraScreenshots.length > 0) {
      formData.append("extraScreenshotsJson", JSON.stringify(metadata.extraScreenshots));
    }

    var MAX_RETRIES = 3;
    var BACKOFF_MS = [0, 1000, 3000]; // tentativa 1 imediata, 2 após 1s, 3 após 3s

    function doPost() {
      return fetch(settings.serverUrl + "/api/feedback/voice-note", {
        method: "POST",
        headers: { Authorization: "Bearer " + settings.feedbackToken },
        body: formData,
      });
    }

    function attemptWithRetry(attempt) {
      if (attempt > 1) {
        btn.textContent = "🔁";
        btn.title = "Tentativa " + attempt + "/" + MAX_RETRIES + "...";
      }
      return doPost().then(function (res) {
        if (res.status === 401) {
          showToast("Sessão expirada — abre o popup e faz login outra vez.", true);
          var e = new Error("auth"); throw e;
        }
        if (!res.ok) {
          return res.json().catch(function () { return { error: res.statusText }; }).then(function (err) {
            showToast(err.error || "Erro " + res.status, true);
            var e = new Error("server"); throw e;
          });
        }
        return res.json();
      }, function (netErr) {
        // Network failure — try again with backoff
        if (attempt >= MAX_RETRIES) throw netErr;
        return new Promise(function (resolve) {
          setTimeout(resolve, BACKOFF_MS[attempt]);
        }).then(function () { return attemptWithRetry(attempt + 1); });
      });
    }

    return attemptWithRetry(1)
      .then(function (result) {
        if (!result) return;
        currentSessionId = result.sessionId;
        return window.ccQueue.remove(queueId).then(function () {
          showToast(result.transcript || "Nota enviada (sem transcrição).");
        });
      })
      .catch(function (err) {
        if (err && (err.message === "auth" || err.message === "server")) throw err;
        showToast("Sem rede após " + MAX_RETRIES + " tentativas — guardado localmente, tentará de novo.", true);
      })
      .finally(function () {
        btn.textContent = "🎤";
        btn.title = "Gravar nota de voz";
      });
  }

  // Drena a queue: envia pendentes em série, abortando ao primeiro erro de
  // auth/server (todos os restantes falhariam pelo mesmo motivo).
  function drainQueue() {
    return window.ccQueue.list().then(function (items) {
      if (!items.length) return;
      return window.ccStorage.get().then(function (settings) {
        if (!settings.feedbackToken) return;
        var p = Promise.resolve();
        items.forEach(function (item) {
          p = p.then(function () {
            return attemptUpload(item.id, item.blob, item.events, item.metadata, settings)
              .catch(function (err) {
                if (err && (err.message === "auth" || err.message === "server")) {
                  throw err;
                }
              });
          });
        });
        return p.catch(function () { /* short-circuit */ });
      });
    }).catch(function () { /* best-effort */ });
  }

  // Drain ao carregar a página, com gate por sessionStorage para que múltiplas
  // tabs do mesmo host não façam upload em paralelo do mesmo item.
  var DRAIN_KEY = "ccfb-drained-" + location.host;
  if (!sessionStorage.getItem(DRAIN_KEY)) {
    sessionStorage.setItem(DRAIN_KEY, "1");
    setTimeout(drainQueue, 2000);
  }

  window.addEventListener("beforeunload", function () {
    if (!currentSessionId) return;

    window.ccStorage.get().then(function (settings) {
      if (!settings.feedbackToken) return;
      var body = JSON.stringify({
        endedAt: new Date().toISOString(),
        pagesVisited: pagesVisited,
        status: "ready",
      });

      try {
        fetch(settings.serverUrl + "/api/feedback/sessions/" + currentSessionId, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + settings.feedbackToken,
          },
          body: body,
          keepalive: true,
        });
      } catch (_) { /* best-effort */ }
    });
  });
})();
