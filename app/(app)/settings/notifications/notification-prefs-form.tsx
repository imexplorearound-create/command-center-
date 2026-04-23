"use client";

import { useActionState, useEffect, useState } from "react";
import { useT } from "@/lib/i18n/context";
import {
  saveNotificationPrefs,
  generateTelegramLinkCode,
  saveWhatsAppPhone,
} from "@/lib/actions/settings-actions";
import { toast } from "sonner";
import { MessageCircle, Phone, Check } from "lucide-react";

const CHANNELS = ["email", "telegram", "whatsapp"] as const;

interface Props {
  currentPrefs: Record<string, unknown>;
  telegramLinked: boolean;
  whatsappPhone: string | null;
}

export function NotificationPrefsForm({ currentPrefs, telegramLinked, whatsappPhone }: Props) {
  const t = useT();
  const [channels, setChannels] = useState<string[]>(
    (currentPrefs.channels as string[]) ?? ["email"]
  );
  const [telegramCode, setTelegramCode] = useState<string | null>(null);

  // Save prefs
  const [prefsState, prefsAction, prefsPending] = useActionState(saveNotificationPrefs, undefined);

  useEffect(() => {
    if (prefsState && "success" in prefsState) {
      toast.success("Preferências guardadas");
    } else if (prefsState && "error" in prefsState) {
      toast.error(prefsState.error);
    }
  }, [prefsState]);

  // Save WhatsApp
  const [waState, waAction, waPending] = useActionState(saveWhatsAppPhone, undefined);

  useEffect(() => {
    if (waState && "success" in waState) {
      toast.success("WhatsApp ligado");
    } else if (waState && "error" in waState) {
      toast.error(waState.error);
    }
  }, [waState]);

  function toggleChannel(ch: string) {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  }

  async function handleGenerateTelegramCode() {
    const result = await generateTelegramLinkCode();
    if ("success" in result && result.data) {
      setTelegramCode(result.data.code);
    } else if ("error" in result) {
      toast.error(result.error);
    }
  }

  return (
    <div>
      {/* Active channels */}
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
        {t("settings.notif_channels")}
      </h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {CHANNELS.map((ch) => (
          <button
            key={ch}
            type="button"
            onClick={() => toggleChannel(ch)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: `1px solid ${channels.includes(ch) ? "var(--cc-primary, #3b82f6)" : "var(--cc-border, #e0e0e0)"}`,
              background: channels.includes(ch) ? "var(--cc-primary-bg, #eff6ff)" : "transparent",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            {ch === "email" ? "Email" : ch === "telegram" ? "Telegram" : "WhatsApp"}
            {ch === "telegram" && telegramLinked && <Check size={14} style={{ marginLeft: 4, color: "#10b981" }} />}
            {ch === "whatsapp" && whatsappPhone && <Check size={14} style={{ marginLeft: 4, color: "#10b981" }} />}
          </button>
        ))}
      </div>

      {/* Telegram link */}
      <div style={{ marginBottom: 24, padding: 16, border: "1px solid var(--cc-border, #e0e0e0)", borderRadius: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <MessageCircle size={18} />
          <strong>{t("settings.telegram_link")}</strong>
          {telegramLinked && <span style={{ fontSize: 12, color: "#10b981" }}>{t("settings.telegram_linked")}</span>}
        </div>
        {!telegramLinked && (
          <>
            <button
              type="button"
              onClick={handleGenerateTelegramCode}
              className="cc-btn cc-btn-secondary"
              style={{ marginBottom: 8 }}
            >
              Gerar código
            </button>
            {telegramCode && (
              <div style={{ padding: 12, background: "#f3f4f6", borderRadius: 6, fontFamily: "monospace", fontSize: 18 }}>
                {telegramCode}
                <p style={{ fontSize: 12, color: "#666", marginTop: 4, fontFamily: "sans-serif" }}>
                  Envia este código ao bot do Command Center no Telegram, ou clica: <code>/start {telegramCode}</code>
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* WhatsApp link */}
      <div style={{ marginBottom: 24, padding: 16, border: "1px solid var(--cc-border, #e0e0e0)", borderRadius: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Phone size={18} />
          <strong>{t("settings.whatsapp_link")}</strong>
          {whatsappPhone && <span style={{ fontSize: 12, color: "#10b981" }}>{t("settings.whatsapp_linked")}: +{whatsappPhone}</span>}
        </div>
        <form action={waAction} style={{ display: "flex", gap: 8 }}>
          <input
            name="phone"
            defaultValue={whatsappPhone ?? ""}
            placeholder="351912345678"
            className="cc-input"
            style={{ flex: 1 }}
          />
          <button type="submit" disabled={waPending} className="cc-btn cc-btn-secondary">
            {waPending ? "..." : t("common.save")}
          </button>
        </form>
      </div>

      {/* Save preferences */}
      <form action={prefsAction}>
        <input type="hidden" name="prefs" value={JSON.stringify({ channels })} />

        <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
          Todos os alertas são enviados para os canais seleccionados acima.
        </p>

        <button type="submit" disabled={prefsPending} className="cc-btn cc-btn-primary">
          {prefsPending ? "..." : t("common.save")}
        </button>
      </form>
    </div>
  );
}
