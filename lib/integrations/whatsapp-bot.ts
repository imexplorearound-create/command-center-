import { basePrisma } from "@/lib/db";
import { WhatsAppChannel } from "@/lib/notifications/channels/whatsapp";
import {
  BOT_USER_SELECT,
  type BotUser,
  fetchActiveProjects,
  fetchWeekHours,
  fetchPipelineSummary,
  formatProjectsForWhatsApp,
  formatHoursForWhatsApp,
  formatPipelineForWhatsApp,
} from "./bot-queries";

const wa = new WhatsAppChannel();

async function resolveUserFromPhone(phone: string): Promise<BotUser | null> {
  const normalized = phone.replace(/^\+/, "");
  return basePrisma.user.findFirst({
    where: { whatsappPhoneId: normalized },
    select: BOT_USER_SELECT,
  });
}

async function handleProjectos(phone: string, tenantId: string) {
  const projects = await fetchActiveProjects(tenantId);
  await wa.sendTextMessage(phone, formatProjectsForWhatsApp(projects));
}

async function handleHoras(phone: string, tenantId: string, personId: string) {
  const hours = await fetchWeekHours(tenantId, personId);
  await wa.sendTextMessage(phone, formatHoursForWhatsApp(hours));
}

async function handlePipeline(phone: string, tenantId: string) {
  const pipeline = await fetchPipelineSummary(tenantId);
  await wa.sendTextMessage(phone, formatPipelineForWhatsApp(pipeline));
}

async function handleAjuda(phone: string) {
  await wa.sendTextMessage(
    phone,
    "*Comandos disponíveis:*\n\n• projectos — Projectos activos\n• horas — Horas da semana\n• pipeline — Pipeline comercial\n• ajuda — Esta mensagem"
  );
}

export async function handleWhatsAppMessage(from: string, text: string) {
  const user = await resolveUserFromPhone(from);
  if (!user) {
    await wa.sendTextMessage(from, "Conta não ligada. Configura o WhatsApp nas Definições do Command Center.");
    return;
  }

  const cmd = text.toLowerCase().trim();

  if (cmd === "projectos" || cmd === "projetos" || cmd === "projects") {
    await handleProjectos(from, user.tenantId);
  } else if (cmd === "horas" || cmd === "hours") {
    await handleHoras(from, user.tenantId, user.personId);
  } else if (cmd === "pipeline") {
    await handlePipeline(from, user.tenantId);
  } else {
    await handleAjuda(from);
  }
}
