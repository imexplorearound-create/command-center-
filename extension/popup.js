// Popup: login (email+password → JWT 30d) e gestão de workspaces dinâmicos.

function $(id) { return document.getElementById(id); }

function showStatus(el, msg, type) {
  el.textContent = msg;
  el.className = "status " + (type || "");
  if (msg) {
    setTimeout(function () {
      if (el.textContent === msg) {
        el.textContent = "";
        el.className = "status";
      }
    }, 4000);
  }
}

// "https://x.com/foo" → "https://x.com/*"
function originToMatchPattern(input) {
  try {
    const u = new URL(input);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.protocol + "//" + u.host + "/*";
  } catch {
    return null;
  }
}

function originFromInput(input) {
  try { return new URL(input).origin; } catch { return null; }
}

let currentWorkspaces = [];

(async function init() {
  const settings = await window.ccStorage.get();
  $("serverUrl").value = settings.serverUrl;

  if (!settings.gdprConsentAt) {
    $("gdprBanner").style.display = "block";
  }

  const tokenValid = settings.feedbackToken && settings.feedbackTokenExp >= Date.now();
  if (!tokenValid && settings.feedbackToken) {
    await window.ccStorage.set({ feedbackToken: "", feedbackTokenExp: 0 });
  }

  if (tokenValid) {
    showLoggedIn(settings);
  } else {
    showLoggedOut();
  }

  currentWorkspaces = settings.workspaces || [];
  renderWorkspaces(currentWorkspaces);
})();

$("gdprAcceptBtn").addEventListener("click", async () => {
  await window.ccStorage.set({ gdprConsentAt: Date.now() });
  $("gdprBanner").style.display = "none";
});

function showLoggedOut() {
  $("authLoggedIn").style.display = "none";
  $("authLoggedOut").style.display = "block";
}

function showLoggedIn(settings) {
  $("authLoggedOut").style.display = "none";
  $("authLoggedIn").style.display = "block";
  $("loggedInName").textContent = settings.testerName || "Tester";
  $("loggedInEmail").textContent = settings.testerEmail || "";
}

$("loginBtn").addEventListener("click", async () => {
  const serverUrl = $("serverUrl").value.trim().replace(/\/$/, "");
  const email = $("email").value.trim();
  const password = $("password").value;

  if (!serverUrl || !email || !password) {
    showStatus($("loginStatus"), "Preenche todos os campos.", "error");
    return;
  }

  $("loginBtn").disabled = true;
  $("loginBtn").textContent = "A entrar...";

  try {
    const res = await fetch(serverUrl + "/api/feedback/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      showStatus($("loginStatus"), body.error || "Login falhou (" + res.status + ")", "error");
      return;
    }

    await window.ccStorage.set({
      serverUrl,
      feedbackToken: body.token,
      feedbackTokenExp: body.expiresAt,
      testerEmail: body.email,
      testerName: body.name,
    });

    $("password").value = "";
    showLoggedIn({ testerEmail: body.email, testerName: body.name });
    showStatus($("loginStatus"), "✓ Sessão iniciada", "success");
  } catch (err) {
    showStatus($("loginStatus"), "Erro de rede: " + err.message, "error");
  } finally {
    $("loginBtn").disabled = false;
    $("loginBtn").textContent = "Entrar";
  }
});

$("logoutBtn").addEventListener("click", async () => {
  await window.ccStorage.set({
    feedbackToken: "",
    feedbackTokenExp: 0,
    testerEmail: "",
    testerName: "",
  });
  showLoggedOut();
});

function renderWorkspaces(workspaces) {
  const list = $("workspaceList");
  list.innerHTML = "";
  if (!workspaces.length) {
    const empty = document.createElement("div");
    empty.className = "workspace-empty";
    empty.textContent = "Nenhum workspace configurado";
    list.appendChild(empty);
    return;
  }
  for (const ws of workspaces) {
    const row = document.createElement("div");
    row.className = "workspace";

    const info = document.createElement("div");
    info.className = "workspace-info";
    const origin = document.createElement("div");
    origin.className = "workspace-origin";
    origin.textContent = ws.origin;
    const slug = document.createElement("div");
    slug.className = "workspace-slug";
    slug.textContent = ws.projectSlug || "(sem slug)";
    info.appendChild(origin);
    info.appendChild(slug);

    const removeBtn = document.createElement("button");
    removeBtn.className = "workspace-remove";
    removeBtn.title = "Remover";
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => removeWorkspace(ws.id));

    row.appendChild(info);
    row.appendChild(removeBtn);
    list.appendChild(row);
  }
}

$("addWorkspaceBtn").addEventListener("click", async () => {
  const urlInput = $("workspaceUrl").value.trim();
  const slug = $("workspaceSlug").value.trim();

  if (!urlInput || !slug) {
    showStatus($("workspaceStatus"), "URL e slug obrigatórios.", "error");
    return;
  }

  const matchPattern = originToMatchPattern(urlInput);
  const origin = originFromInput(urlInput);
  if (!matchPattern || !origin) {
    showStatus($("workspaceStatus"), "URL inválido.", "error");
    return;
  }

  if (currentWorkspaces.some((w) => w.origin === origin)) {
    showStatus($("workspaceStatus"), "Workspace já existe.", "error");
    return;
  }

  let granted;
  try {
    granted = await chrome.permissions.request({ origins: [matchPattern] });
  } catch (err) {
    showStatus($("workspaceStatus"), "Erro: " + err.message, "error");
    return;
  }

  if (!granted) {
    showStatus($("workspaceStatus"), "Permissão recusada pelo browser.", "error");
    return;
  }

  currentWorkspaces = currentWorkspaces.concat({
    id: crypto.randomUUID(),
    origin,
    matchPattern,
    projectSlug: slug,
  });

  await window.ccStorage.set({ workspaces: currentWorkspaces });
  $("workspaceUrl").value = "";
  $("workspaceSlug").value = "";
  showStatus($("workspaceStatus"), "✓ Workspace adicionado", "success");
  renderWorkspaces(currentWorkspaces);
});

async function removeWorkspace(id) {
  const ws = currentWorkspaces.find((w) => w.id === id);
  if (!ws) return;

  // best-effort: pode falhar se outra feature depender do origin.
  try {
    await chrome.permissions.remove({ origins: [ws.matchPattern] });
  } catch { /* ignore */ }

  currentWorkspaces = currentWorkspaces.filter((w) => w.id !== id);
  await window.ccStorage.set({ workspaces: currentWorkspaces });
  showStatus($("workspaceStatus"), "Workspace removido", "success");
  renderWorkspaces(currentWorkspaces);
}
