"use client";
import { useCallback, useEffect, useState } from "react";
import { useMaestro } from "./maestro-context";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: Array<{ id: string; name: string; ok?: boolean; display?: string }>;
  streaming?: boolean;
  error?: string;
}

function updateLastAssistant(
  messages: ChatMessage[],
  patch: (last: ChatMessage) => Partial<ChatMessage>
): ChatMessage[] {
  const lastIdx = messages.length - 1;
  const last = messages[lastIdx];
  if (!last || last.role !== "assistant") return messages;
  const next = messages.slice();
  next[lastIdx] = { ...last, ...patch(last) };
  return next;
}

interface UseMaestroChatResult {
  messages: ChatMessage[];
  loading: boolean;
  sending: boolean;
  send: (text: string) => Promise<void>;
  reset: () => void;
}

export function useMaestroChat(): UseMaestroChatResult {
  const { conversationId, setConversationId } = useMaestro();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Load existing conversation when ID changes (e.g., user picks from history)
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/maestro/conversations/${conversationId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => {
        if (cancelled) return;
        const loaded: ChatMessage[] = data.messages.map((m: {
          id: string;
          role: "user" | "assistant";
          content: string;
          toolCalls: unknown;
        }) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          toolCalls: Array.isArray(m.toolCalls)
            ? (m.toolCalls as Array<{ id: string; name: string }>).map((tc) => ({
                id: tc.id,
                name: tc.name,
              }))
            : undefined,
        }));
        setMessages(loaded);
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  const reset = useCallback(() => {
    setMessages([]);
  }, []);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || sending) return;

      const userMsg: ChatMessage = {
        id: `local-${Date.now()}-u`,
        role: "user",
        content: text,
      };
      const assistantMsg: ChatMessage = {
        id: `local-${Date.now()}-a`,
        role: "assistant",
        content: "",
        toolCalls: [],
        streaming: true,
      };
      setMessages((m) => [...m, userMsg, assistantMsg]);
      setSending(true);

      try {
        const res = await fetch("/api/maestro/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, message: text }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          // Parse SSE events from buffer
          const events = buf.split("\n\n");
          buf = events.pop() ?? "";

          for (const evt of events) {
            const lines = evt.split("\n");
            let eventName = "message";
            let dataLine = "";
            for (const l of lines) {
              if (l.startsWith("event: ")) eventName = l.slice(7);
              else if (l.startsWith("data: ")) dataLine = l.slice(6);
            }
            if (!dataLine) continue;
            let data: Record<string, unknown>;
            try {
              data = JSON.parse(dataLine);
            } catch {
              continue;
            }

            if (eventName === "meta") {
              if (typeof data.conversationId === "string" && !conversationId) {
                setConversationId(data.conversationId);
              }
            } else if (eventName === "delta") {
              const t = data.text as string;
              setMessages((m) => updateLastAssistant(m, (last) => ({
                content: last.content + t,
              })));
            } else if (eventName === "tool_start") {
              setMessages((m) => updateLastAssistant(m, (last) => ({
                toolCalls: [
                  ...(last.toolCalls ?? []),
                  { id: data.id as string, name: data.name as string },
                ],
              })));
            } else if (eventName === "tool_result") {
              setMessages((m) => updateLastAssistant(m, (last) => ({
                toolCalls: (last.toolCalls ?? []).map((tc) =>
                  tc.id === data.id
                    ? { ...tc, ok: data.ok as boolean, display: data.display as string }
                    : tc
                ),
              })));
            } else if (eventName === "error") {
              setMessages((m) => updateLastAssistant(m, () => ({
                error: data.message as string,
                streaming: false,
              })));
            } else if (eventName === "done") {
              setMessages((m) => updateLastAssistant(m, () => ({ streaming: false })));
            }
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Erro de rede";
        setMessages((m) => updateLastAssistant(m, () => ({
          error: errorMsg,
          streaming: false,
        })));
      } finally {
        setSending(false);
      }
    },
    [conversationId, sending, setConversationId]
  );

  return { messages, loading, sending, send, reset };
}
