// Service worker: regista dinamicamente os content scripts nos workspaces
// autorizados pelo utilizador via chrome.scripting.

const CONTENT_JS = ["storage.js", "queue.js", "content.js"];
const CONTENT_CSS = ["styles.css"];
const SCRIPT_ID_PREFIX = "ccfb-";

async function listOurRegistered() {
  try {
    const all = await chrome.scripting.getRegisteredContentScripts();
    return all.filter((r) => r.id.startsWith(SCRIPT_ID_PREFIX));
  } catch {
    return [];
  }
}

async function syncWorkspaces() {
  const { workspaces = [] } = await chrome.storage.local.get({ workspaces: [] });
  const ourRegistered = await listOurRegistered();
  const registeredIds = new Set(ourRegistered.map((r) => r.id));

  if (workspaces.length === 0) {
    if (ourRegistered.length) {
      try {
        await chrome.scripting.unregisterContentScripts({
          ids: ourRegistered.map((r) => r.id),
        });
      } catch (err) {
        console.warn("[CC Feedback] unregister failed:", err);
      }
    }
    return;
  }

  // Filtrar pelos hosts ainda concedidos: o user pode ter revogado a permissão
  // manualmente em chrome://extensions sem remover o workspace no popup.
  const granted = await chrome.permissions.getAll();
  const grantedOrigins = new Set(granted.origins || []);

  const desired = new Map();
  for (const ws of workspaces) {
    if (!ws || !ws.matchPattern) continue;
    if (!grantedOrigins.has(ws.matchPattern)) continue;
    desired.set(SCRIPT_ID_PREFIX + ws.id, ws);
  }

  const toRemove = [];
  for (const id of registeredIds) {
    if (!desired.has(id)) toRemove.push(id);
  }
  if (toRemove.length) {
    try {
      await chrome.scripting.unregisterContentScripts({ ids: toRemove });
    } catch (err) {
      console.warn("[CC Feedback] unregister failed:", err);
    }
  }

  const toRegister = [];
  for (const [id, ws] of desired) {
    if (registeredIds.has(id)) continue;
    toRegister.push({
      id,
      matches: [ws.matchPattern],
      js: CONTENT_JS,
      css: CONTENT_CSS,
      runAt: "document_idle",
      allFrames: false,
      world: "ISOLATED",
    });
  }
  if (toRegister.length) {
    try {
      await chrome.scripting.registerContentScripts(toRegister);
    } catch (err) {
      console.warn("[CC Feedback] register failed:", err);
    }
  }
}

chrome.runtime.onInstalled.addListener(syncWorkspaces);
chrome.runtime.onStartup.addListener(syncWorkspaces);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.workspaces) syncWorkspaces();
});

if (chrome.permissions && chrome.permissions.onAdded) {
  chrome.permissions.onAdded.addListener(syncWorkspaces);
}
if (chrome.permissions && chrome.permissions.onRemoved) {
  chrome.permissions.onRemoved.addListener(syncWorkspaces);
}
