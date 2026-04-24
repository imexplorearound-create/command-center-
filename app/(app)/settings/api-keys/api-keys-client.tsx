"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, ShieldOff } from "lucide-react";
import {
  createDevApiKeyAction,
  revokeDevApiKeyAction,
} from "@/lib/actions/dev-api-key-actions";
import {
  AVAILABLE_SCOPES,
  type DevApiKeyScope,
} from "@/lib/validation/dev-api-key-schema";
import { Modal } from "@/components/shared/modal";
import { CopyButton } from "@/components/shared/copy-button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

type KeyRow = {
  id: string;
  label: string;
  tokenPrefix: string;
  scopes: DevApiKeyScope[];
  lastUsedAt: string;
  revokedAt: string;
  expiresAt: string;
  createdAt: string;
  revoked: boolean;
  expired: boolean;
  ownerName: string | null;
};

type Person = { id: string; name: string };

type Props = {
  keys: KeyRow[];
  people: Person[];
};

export function ApiKeysClient({ keys, people }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [revealToken, setRevealToken] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {!showCreate && (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="cc-button"
          style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Plus size={14} /> Nova API Key
        </button>
      )}

      {showCreate && (
        <CreateForm
          people={people}
          onCancel={() => setShowCreate(false)}
          onCreated={(token) => {
            setShowCreate(false);
            setRevealToken(token);
          }}
        />
      )}

      <Modal
        open={Boolean(revealToken)}
        onClose={() => setRevealToken(null)}
        title="Chave criada"
        width={560}
      >
        <p style={{ fontSize: 13, color: "var(--muted, #999)", marginTop: 0, marginBottom: 16 }}>
          Copia o token agora — <strong>não voltarás a vê-lo</strong>. Só guardamos o hash.
        </p>
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            padding: 12,
            borderRadius: 6,
            fontFamily: "monospace",
            fontSize: 13,
            wordBreak: "break-all",
            marginBottom: 16,
          }}
        >
          {revealToken}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {revealToken && <CopyButton value={revealToken} toastLabel="Token" className="cc-button" />}
          <button type="button" onClick={() => setRevealToken(null)} className="cc-button-ghost">
            Fechar
          </button>
        </div>
      </Modal>

      <KeyTable keys={keys} />
    </div>
  );
}

function CreateForm({
  people,
  onCancel,
  onCreated,
}: {
  people: Person[];
  onCancel: () => void;
  onCreated: (token: string) => void;
}) {
  const [state, action, pending] = useActionState(createDevApiKeyAction, undefined);

  useEffect(() => {
    if (!state) return;
    if ("error" in state) toast.error(state.error);
    else if (state.data) onCreated(state.data.token);
  }, [state, onCreated]);

  return (
    <form
      action={action}
      className="cc-card"
      style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Label</label>
        <input
          name="label"
          required
          minLength={2}
          maxLength={100}
          placeholder="Ex: Bruno laptop"
          className="cc-input"
          style={{ width: "100%" }}
        />
      </div>

      <div>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Pessoa (opcional)</label>
        <select name="personId" className="cc-input" style={{ width: "100%" }} defaultValue="">
          <option value="">— sem owner —</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset style={{ border: "1px solid #eee", padding: 12, borderRadius: 6 }}>
        <legend style={{ fontSize: 13, fontWeight: 500, padding: "0 6px" }}>Scopes</legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {AVAILABLE_SCOPES.map((s) => (
            <label key={s} style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13 }}>
              <input type="checkbox" name="scopes" value={s} />
              <code>{s}</code>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Expira em (opcional)</label>
        <input
          name="expiresAt"
          type="datetime-local"
          className="cc-input"
          style={{ width: "100%" }}
        />
        <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
          Em branco = chave sem expiração.
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" onClick={onCancel} className="cc-button-ghost" disabled={pending}>
          Cancelar
        </button>
        <button type="submit" className="cc-button" disabled={pending}>
          {pending ? "A criar…" : "Criar chave"}
        </button>
      </div>
    </form>
  );
}

function KeyTable({ keys }: { keys: KeyRow[] }) {
  if (keys.length === 0) {
    return <p style={{ color: "#888", fontSize: 13 }}>Ainda não há chaves.</p>;
  }

  return (
    <div className="cc-card" style={{ overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
            <th style={{ padding: 10 }}>Label</th>
            <th style={{ padding: 10 }}>Prefix</th>
            <th style={{ padding: 10 }}>Owner</th>
            <th style={{ padding: 10 }}>Scopes</th>
            <th style={{ padding: 10 }}>Última utilização</th>
            <th style={{ padding: 10 }}>Criada</th>
            <th style={{ padding: 10 }}>Expira</th>
            <th style={{ padding: 10 }}>Estado</th>
            <th style={{ padding: 10 }}></th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => (
            <tr key={k.id} style={{ borderTop: "1px solid #eee", opacity: k.revoked ? 0.5 : 1 }}>
              <td style={{ padding: 10, fontWeight: 500 }}>{k.label}</td>
              <td style={{ padding: 10, fontFamily: "monospace" }}>{k.tokenPrefix}…</td>
              <td style={{ padding: 10 }}>{k.ownerName ?? "—"}</td>
              <td style={{ padding: 10, fontFamily: "monospace", fontSize: 11 }}>
                {k.scopes.join(", ")}
              </td>
              <td style={{ padding: 10 }}>{k.lastUsedAt}</td>
              <td style={{ padding: 10 }}>{k.createdAt}</td>
              <td style={{ padding: 10 }}>{k.expiresAt}</td>
              <td style={{ padding: 10 }}>
                {k.revoked ? (
                  <span style={{ color: "#b91c1c", fontWeight: 500 }}>revogada</span>
                ) : k.expired ? (
                  <span style={{ color: "#b45309", fontWeight: 500 }}>expirada</span>
                ) : (
                  <span style={{ color: "#15803d", fontWeight: 500 }}>activa</span>
                )}
              </td>
              <td style={{ padding: 10 }}>
                {!k.revoked && <RevokeButton keyId={k.id} label={k.label} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RevokeButton({ keyId, label }: { keyId: string; label: string }) {
  const [state, action, pending] = useActionState(revokeDevApiKeyAction, undefined);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!state) return;
    if ("error" in state) toast.error(state.error);
    else toast.success("Chave revogada");
  }, [state]);

  return (
    <>
      <button
        type="button"
        className="cc-button-ghost"
        style={{
          color: "#b91c1c",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 12,
        }}
        disabled={pending}
        onClick={() => setConfirmOpen(true)}
      >
        <ShieldOff size={12} /> Revogar
      </button>
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          const fd = new FormData();
          fd.set("keyId", keyId);
          action(fd);
          setConfirmOpen(false);
        }}
        title="Revogar API Key"
        message={`A chave "${label}" deixa de funcionar imediatamente. Esta acção é irreversível.`}
        confirmLabel="Revogar"
        destructive
        loading={pending}
      />
    </>
  );
}
