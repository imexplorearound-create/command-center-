"use client";

import { useState, useEffect } from "react";
import {
  slugify,
  type ProjectType,
  type ProjectStatus,
  type ProjectHealth,
} from "@/lib/validation/project-schema";
import {
  formLabelStyle as labelStyle,
  formInputStyle as inputStyle,
  formRowStyle as rowStyle,
  formTwoColStyle as twoColStyle,
} from "@/components/shared/form-styles";

export interface ProjectFormValues {
  name: string;
  slug: string;
  type: ProjectType;
  status: ProjectStatus;
  health: ProjectHealth;
  progress: number;
  description: string;
  color: string;
}

interface Props {
  initial?: Partial<ProjectFormValues>;
  mode: "create" | "edit";
}

export function ProjectFormFields({ initial, mode }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(false);
  const [progress, setProgress] = useState(initial?.progress ?? 0);
  const [color, setColor] = useState(initial?.color ?? "#888888");

  useEffect(() => {
    if (mode === "create" && !slugTouched) {
      setSlug(slugify(name));
    }
  }, [name, slugTouched, mode]);

  return (
    <>
      <div style={rowStyle}>
        <label style={labelStyle} htmlFor="name">Nome *</label>
        <input
          id="name"
          name="name"
          required
          maxLength={200}
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
          autoFocus
        />
      </div>

      <div style={rowStyle}>
        <label style={labelStyle} htmlFor="slug">Slug</label>
        <input
          id="slug"
          name="slug"
          maxLength={100}
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugTouched(true);
          }}
          style={inputStyle}
          placeholder="auto-gerado do nome"
        />
        {mode === "edit" && (
          <p style={{ fontSize: "0.7rem", color: "var(--yellow, #d80)", marginTop: 4, marginBottom: 0 }}>
            ⚠ Mudar o slug quebra URLs externas para este projecto.
          </p>
        )}
      </div>

      <div style={{ ...rowStyle, ...twoColStyle }}>
        <div>
          <label style={labelStyle} htmlFor="type">Tipo *</label>
          <select id="type" name="type" required defaultValue={initial?.type ?? "interno"} style={inputStyle}>
            <option value="interno">Interno</option>
            <option value="cliente">Cliente</option>
          </select>
        </div>
        <div>
          <label style={labelStyle} htmlFor="color">Cor</label>
          <div style={{ position: "relative" }}>
            <input
              id="color"
              name="color"
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              maxLength={7}
              pattern="#[0-9A-Fa-f]{6}"
              placeholder="#888888"
              style={inputStyle}
            />
            <div
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                width: 20,
                height: 20,
                borderRadius: 4,
                backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#888",
                border: "1px solid rgba(255,255,255,0.15)",
                pointerEvents: "none",
              }}
            />
          </div>
        </div>
      </div>

      {mode === "edit" && (
        <>
          <div style={{ ...rowStyle, ...twoColStyle }}>
            <div>
              <label style={labelStyle} htmlFor="status">Estado</label>
              <select id="status" name="status" defaultValue={initial?.status ?? "ativo"} style={inputStyle}>
                <option value="ativo">Activo</option>
                <option value="pausado">Pausado</option>
                <option value="concluido">Concluído</option>
              </select>
            </div>
            <div>
              <label style={labelStyle} htmlFor="health">Saúde</label>
              <select id="health" name="health" defaultValue={initial?.health ?? "green"} style={inputStyle}>
                <option value="green">🟢 Verde</option>
                <option value="yellow">🟡 Amarelo</option>
                <option value="red">🔴 Vermelho</option>
              </select>
            </div>
          </div>

          <div style={rowStyle}>
            <label style={labelStyle} htmlFor="progress">
              Progresso: <span style={{ color: "var(--text)" }}>{progress}%</span>
            </label>
            <input
              id="progress"
              name="progress"
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
        </>
      )}

      <div style={rowStyle}>
        <label style={labelStyle} htmlFor="description">Descrição</label>
        <textarea
          id="description"
          name="description"
          maxLength={2000}
          rows={3}
          defaultValue={initial?.description ?? ""}
          style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
        />
      </div>
    </>
  );
}
