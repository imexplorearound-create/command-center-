"use client";
import { useEffect, useRef, useState } from "react";
import { timeAgo } from "@/lib/utils";
import { useMaestro } from "./maestro-context";
import { useMaestroChat } from "./use-maestro-chat";
import { MessageBubble } from "./message-bubble";

interface ConversationListItem {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
}

export function MaestroPanel() {
  const { open, close, conversationId, setConversationId, newConversation } = useMaestro();
  const { messages, loading, sending, send } = useMaestroChat();
  const [input, setInput] = useState("");
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Refetched only when the panel opens or when the user just finished sending
  // (sending: true → false transition). Watching `sending` directly would
  // double-fire (once on send start, once on completion).
  const wasSending = useRef(false);
  useEffect(() => {
    if (!open) return;
    if (wasSending.current && !sending) {
      wasSending.current = false;
    } else if (sending) {
      wasSending.current = true;
      return;
    }
    fetch("/api/maestro/conversations")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => setConversations(data.conversations))
      .catch(() => setConversations([]));
  }, [open, sending]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    await send(text);
  };

  return (
    <>
      <MaestroFloatingButton />

      {/* Slide-in panel */}
      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width: 420,
          maxWidth: "94vw",
          background: "var(--bg)",
          borderLeft: "1px solid var(--border)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.4)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s ease",
          display: "flex",
          flexDirection: "column",
          zIndex: 100,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>🎼</span>
            <strong style={{ fontSize: 14, color: "var(--text)" }}>Maestro</strong>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              title="Conversas anteriores"
              style={iconBtn}
            >
              📚
            </button>
            <button
              type="button"
              onClick={() => {
                newConversation();
                setShowHistory(false);
              }}
              title="Nova conversa"
              style={iconBtn}
            >
              ＋
            </button>
            <button type="button" onClick={close} title="Fechar" style={iconBtn}>
              ✕
            </button>
          </div>
        </div>

        {/* History dropdown */}
        {showHistory && (
          <div
            style={{
              borderBottom: "1px solid var(--border)",
              maxHeight: 240,
              overflowY: "auto",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            {conversations.length === 0 && (
              <div style={{ padding: 14, fontSize: 12, color: "var(--text-dim)" }}>
                Sem conversas anteriores.
              </div>
            )}
            {conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setConversationId(c.id);
                  setShowHistory(false);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 14px",
                  background:
                    c.id === conversationId
                      ? "var(--accent-glow)"
                      : "transparent",
                  border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  color: "var(--text)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 500 }}>{c.title}</div>
                <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}>
                  {c.messageCount} mensagens · {timeAgo(c.updatedAt)}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px",
          }}
        >
          {loading && (
            <div style={{ color: "var(--text-dim)", fontSize: 12 }}>A carregar…</div>
          )}
          {!loading && messages.length === 0 && (
            <div
              style={{
                color: "var(--text-dim)",
                fontSize: 13,
                padding: 20,
                textAlign: "center",
              }}
            >
              Olá. Pergunta-me sobre projectos, tarefas ou pessoas — ou pede-me para criar uma tarefa.
            </div>
          )}
          {messages.map((m) => (
            <MessageBubble key={m.id} msg={m} />
          ))}
        </div>

        {/* Input */}
        <div
          style={{
            padding: 12,
            borderTop: "1px solid var(--border)",
            background: "rgba(0,0,0,0.2)",
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Pergunta ao Maestro… (Enter envia, Shift+Enter nova linha)"
            disabled={sending}
            rows={2}
            style={{
              width: "100%",
              padding: "10px 12px",
              background: "var(--bg-elev)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text)",
              fontSize: 13,
              fontFamily: "inherit",
              resize: "none",
              outline: "none",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 6,
            }}
          >
            <span style={{ fontSize: 10, color: "var(--text-dim)" }}>
              MiniMax M2.7
            </span>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !input.trim()}
              style={{
                padding: "6px 14px",
                background: sending ? "rgba(99,102,241,0.3)" : "var(--accent)",
                border: "none",
                borderRadius: 6,
                color: "#fff",
                fontSize: 12,
                fontWeight: 500,
                cursor: sending ? "wait" : "pointer",
                opacity: !input.trim() ? 0.4 : 1,
              }}
            >
              {sending ? "A enviar…" : "Enviar"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function MaestroFloatingButton() {
  const { open, toggle } = useMaestro();
  if (open) return null;
  return (
    <button
      type="button"
      onClick={toggle}
      title="Abrir Maestro"
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        width: 52,
        height: 52,
        borderRadius: "50%",
        background: "var(--accent)",
        border: "none",
        color: "#fff",
        fontSize: 22,
        cursor: "pointer",
        boxShadow: "0 8px 24px rgba(0,0,0,0.4), 0 0 0 4px rgba(99,102,241,0.15)",
        zIndex: 99,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      🎼
    </button>
  );
}

const iconBtn: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--text-dim)",
  width: 28,
  height: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontSize: 13,
};
