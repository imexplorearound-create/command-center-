"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  formInputStyle,
  formButtonStyle,
  formButtonPrimaryStyle,
  formButtonDangerStyle,
} from "@/components/shared/form-styles";
import { FormField } from "@/components/shared/form-field";
import type { OpportunityData, OpportunityStage } from "@/lib/types";
import {
  OPPORTUNITY_STAGE_OPTIONS,
  OPPORTUNITY_SOURCE_OPTIONS,
} from "@/lib/validation/opportunity-schema";
import {
  createOpportunity,
  updateOpportunity,
  archiveOpportunity,
} from "@/lib/actions/opportunity-actions";

interface BaseProps {
  people: { id: string; name: string; avatarColor: string | null }[];
  onClose: () => void;
}

type Props =
  | (BaseProps & { mode: "create"; initialStageId: OpportunityStage; opportunity?: undefined })
  | (BaseProps & { mode: "edit"; opportunity: OpportunityData; initialStageId?: undefined });

export function DealEditModal(props: Props) {
  const isEdit = props.mode === "edit";
  const action = isEdit
    ? updateOpportunity
    : (createOpportunity as typeof updateOpportunity);
  const [state, formAction, pending] = useActionState(action, undefined);
  const [showArchive, setShowArchive] = useState(false);
  const [archivePending, setArchivePending] = useState(false);

  useEffect(() => {
    if (state && "success" in state) {
      toast.success(isEdit ? "Negócio actualizado" : "Negócio criado");
      props.onClose();
    } else if (state && "error" in state) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function handleArchive() {
    setArchivePending(true);
    const r = await archiveOpportunity((props.opportunity as OpportunityData).id);
    setArchivePending(false);
    setShowArchive(false);
    if ("error" in r) {
      toast.error(r.error);
    } else {
      toast.success("Negócio arquivado");
      props.onClose();
    }
  }

  const initial = isEdit ? props.opportunity : undefined;

  return (
    <>
      <Modal
        open
        onClose={props.onClose}
        title={isEdit ? "Editar negócio" : "Novo negócio"}
        width={560}
      >
        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {isEdit && <input type="hidden" name="id" value={props.opportunity.id} />}
          {!isEdit && (
            <input type="hidden" name="stageId" value={props.initialStageId} />
          )}

          <FormField label="Título">
            <input
              name="title"
              required
              defaultValue={initial?.title ?? ""}
              maxLength={500}
              style={formInputStyle}
              placeholder="Nome do negócio"
              autoFocus
            />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {isEdit && (
              <FormField label="Fase">
                <select
                  name="stageId"
                  defaultValue={initial?.stageId ?? "contacto_inicial"}
                  style={formInputStyle}
                >
                  {OPPORTUNITY_STAGE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            <FormField label="Valor (EUR)">
              <input
                type="number"
                name="value"
                min={0}
                step="any"
                defaultValue={initial?.value ?? ""}
                style={formInputStyle}
                placeholder="0"
              />
            </FormField>

            <FormField label="Probabilidade (%)">
              <input
                type="number"
                name="probability"
                min={0}
                max={100}
                defaultValue={initial?.probability ?? 0}
                style={formInputStyle}
              />
            </FormField>

            <FormField label="Empresa">
              <input
                name="companyName"
                defaultValue={initial?.companyName ?? ""}
                maxLength={300}
                style={formInputStyle}
                placeholder="Nome da empresa"
              />
            </FormField>

            <FormField label="NIF">
              <input
                name="companyNif"
                defaultValue={initial?.companyNif ?? ""}
                maxLength={20}
                style={formInputStyle}
                placeholder="NIF"
              />
            </FormField>

            <FormField label="Contacto">
              <select
                name="contactId"
                defaultValue={initial?.contactId ?? ""}
                style={formInputStyle}
              >
                <option value="">-- Sem contacto --</option>
                {props.people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Responsável">
              <select
                name="ownerId"
                defaultValue={initial?.ownerId ?? ""}
                style={formInputStyle}
              >
                <option value="">-- Sem responsável --</option>
                {props.people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Fecho esperado">
              <input
                type="date"
                name="expectedClose"
                defaultValue={initial?.expectedClose ?? ""}
                style={formInputStyle}
              />
            </FormField>

            <FormField label="Origem">
              <select
                name="source"
                defaultValue={initial?.source ?? ""}
                style={formInputStyle}
              >
                <option value="">-- Origem --</option>
                {OPPORTUNITY_SOURCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: isEdit ? "space-between" : "flex-end",
              alignItems: "center",
              gap: 8,
              marginTop: 8,
              paddingTop: 12,
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {isEdit && (
              <button
                type="button"
                onClick={() => setShowArchive(true)}
                disabled={pending || archivePending}
                style={{ ...formButtonStyle, ...formButtonDangerStyle }}
              >
                Arquivar
              </button>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={props.onClose}
                disabled={pending}
                style={formButtonStyle}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                style={{ ...formButtonStyle, ...formButtonPrimaryStyle }}
              >
                {pending ? "A guardar..." : isEdit ? "Guardar" : "Criar"}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {isEdit && (
        <ConfirmDialog
          open={showArchive}
          title="Arquivar negócio"
          message={`Arquivar "${props.opportunity.title}"? Pode ser restaurado mais tarde.`}
          confirmLabel="Arquivar"
          onConfirm={handleArchive}
          onClose={() => setShowArchive(false)}
          loading={archivePending}
          destructive
        />
      )}
    </>
  );
}
