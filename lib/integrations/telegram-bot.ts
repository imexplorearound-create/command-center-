import { basePrisma, tenantPrisma } from "@/lib/db";
import crypto from "crypto";
import {
  BOT_USER_SELECT,
  type BotUser,
  fetchActiveProjects,
  fetchWeekHours,
  fetchPipelineSummary,
  formatProjectsForTelegram,
  formatHoursForTelegram,
  formatPipelineForTelegram,
} from "./bot-queries";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

// ─── Telegram API Helpers ──────────────────────────────────

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  keyboard?: { inline_keyboard: { text: string; callback_data: string }[][] }
) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...(keyboard ? { reply_markup: keyboard } : {}),
    }),
  });
}

export async function answerCallbackQuery(callbackId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackId, text }),
  });
}

// ─── User Resolution ───────────────────────────────────────

async function resolveUserFromChatId(chatId: string): Promise<BotUser | null> {
  return basePrisma.user.findFirst({
    where: { telegramChatId: chatId },
    select: BOT_USER_SELECT,
  });
}

// ─── Link Code (DB-backed for reliability) ─────────────────

export async function generateLinkCode(userId: string): Promise<string> {
  const code = crypto.randomBytes(3).toString("hex").toUpperCase();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Store link code in notificationPrefs JSON field
  const user = await basePrisma.user.findUnique({
    where: { id: userId },
    select: { notificationPrefs: true },
  });
  const existingPrefs = (user?.notificationPrefs ?? {}) as Record<string, unknown>;
  const updatedPrefs = {
    ...existingPrefs,
    _telegramLinkCode: code,
    _telegramLinkExpires: expiresAt.toISOString(),
  };

  await basePrisma.user.update({
    where: { id: userId },
    data: { notificationPrefs: updatedPrefs },
  });

  return code;
}

async function tryLinkAccount(chatId: string, code: string): Promise<boolean> {
  const upperCode = code.toUpperCase();

  // Find user with this link code
  const users = await basePrisma.user.findMany({
    where: { telegramChatId: null },
    select: { id: true, notificationPrefs: true },
    take: 500,
  });

  for (const user of users) {
    const prefs = (user.notificationPrefs ?? {}) as Record<string, unknown>;
    if (prefs._telegramLinkCode === upperCode) {
      const expires = prefs._telegramLinkExpires as string;
      if (expires && new Date(expires) > new Date()) {
        // Remove link code and set chat ID
        const cleanPrefs = { ...prefs };
        delete cleanPrefs._telegramLinkCode;
        delete cleanPrefs._telegramLinkExpires;
        await basePrisma.user.update({
          where: { id: user.id },
          data: {
            telegramChatId: chatId,
            notificationPrefs: cleanPrefs as object,
          },
        });
        return true;
      }
    }
  }
  return false;
}

// ─── Webhook Verification ──────────────────────────────────

/**
 * Verify the X-Telegram-Bot-Api-Secret-Token header.
 * Set this token when registering the webhook via setWebhook API.
 */
export function verifyTelegramWebhook(secretTokenHeader: string | null): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) return true; // No secret configured — accept all (dev mode)
  return secretTokenHeader === expected;
}

// ─── Command Handlers ──────────────────────────────────���───

async function handleStart(chatId: string, text: string) {
  const parts = text.split(" ");
  if (parts.length > 1) {
    const linked = await tryLinkAccount(chatId, parts[1]);
    if (linked) {
      await sendTelegramMessage(chatId, "Conta ligada com sucesso! Usa /ajuda para ver os comandos.");
      return;
    }
  }
  await sendTelegramMessage(
    chatId,
    "Bem-vindo ao Command Center Bot!\n\nPara ligar a tua conta, vai a Definições → Ligar Telegram no Command Center e segue as instruções."
  );
}

async function handleProjectos(chatId: string) {
  const user = await resolveUserFromChatId(chatId);
  if (!user) { await sendTelegramMessage(chatId, "Conta não ligada. Usa /start para ligar."); return; }
  const projects = await fetchActiveProjects(user.tenantId);
  await sendTelegramMessage(chatId, formatProjectsForTelegram(projects));
}

async function handleHoras(chatId: string) {
  const user = await resolveUserFromChatId(chatId);
  if (!user) { await sendTelegramMessage(chatId, "Conta não ligada. Usa /start para ligar."); return; }
  const hours = await fetchWeekHours(user.tenantId, user.personId);
  await sendTelegramMessage(chatId, formatHoursForTelegram(hours));
}

async function handlePipeline(chatId: string) {
  const user = await resolveUserFromChatId(chatId);
  if (!user) { await sendTelegramMessage(chatId, "Conta não ligada. Usa /start para ligar."); return; }
  const pipeline = await fetchPipelineSummary(user.tenantId);
  await sendTelegramMessage(chatId, formatPipelineForTelegram(pipeline));
}

async function handleAjuda(chatId: string) {
  await sendTelegramMessage(
    chatId,
    "<b>Comandos disponíveis:</b>\n\n/projectos — Projectos activos\n/horas — Horas da semana\n/pipeline — Pipeline comercial\n/ajuda — Esta mensagem"
  );
}

// ─── Callback Handlers ─────────────────────────────────────

async function handleCallback(callbackId: string, chatId: string, data: string) {
  const user = await resolveUserFromChatId(chatId);
  if (!user) { await answerCallbackQuery(callbackId, "Conta não ligada"); return; }

  const db = tenantPrisma(user.tenantId);
  const [action, id] = data.split(":");

  if (action === "approve" && id) {
    await db.timeEntry.update({ where: { id }, data: { status: "approved", approvedById: user.personId } });
    await answerCallbackQuery(callbackId, "Aprovado!");
    await sendTelegramMessage(chatId, "Registo de horas aprovado.");
  } else if (action === "reject" && id) {
    await db.timeEntry.update({ where: { id }, data: { status: "rejected" } });
    await answerCallbackQuery(callbackId, "Rejeitado");
    await sendTelegramMessage(chatId, "Registo de horas rejeitado.");
  } else if (action === "task_done" && id) {
    await db.task.update({ where: { id }, data: { status: "feito", completedAt: new Date() } });
    await answerCallbackQuery(callbackId, "Tarefa concluída!");
    await sendTelegramMessage(chatId, "Tarefa marcada como feita.");
  } else {
    await answerCallbackQuery(callbackId, "Acção desconhecida");
  }
}

// ─── Main Dispatcher ───────────────────────────────────��───

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleTelegramUpdate(update: any) {
  if (update.callback_query) {
    const cq = update.callback_query;
    await handleCallback(cq.id, String(cq.message?.chat?.id), cq.data);
    return;
  }

  const message = update.message;
  if (!message?.text) return;

  const chatId = String(message.chat.id);
  const text = message.text.trim();

  if (text.startsWith("/start")) await handleStart(chatId, text);
  else if (text === "/projectos") await handleProjectos(chatId);
  else if (text === "/horas") await handleHoras(chatId);
  else if (text === "/pipeline") await handlePipeline(chatId);
  else if (text === "/ajuda" || text === "/help") await handleAjuda(chatId);
  else if (/^[A-F0-9]{6}$/i.test(text)) {
    const linked = await tryLinkAccount(chatId, text);
    await sendTelegramMessage(chatId, linked
      ? "Conta ligada com sucesso! Usa /ajuda para ver os comandos."
      : "Código inválido ou expirado. Gera um novo no Command Center."
    );
  }
}
