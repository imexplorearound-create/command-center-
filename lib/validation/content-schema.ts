import { z } from "zod";
import { dateString } from "./project-schema";

// ─── Enums ──────────────────────────────────────────────────

export const contentStatusEnum = z.enum([
  "proposta",
  "aprovado",
  "em_producao",
  "pronto",
  "publicado",
]);
export type ContentStatusInput = z.infer<typeof contentStatusEnum>;

export const contentFormatEnum = z.enum([
  "video",
  "artigo",
  "podcast",
  "post",
  "reels",
  "carrossel",
]);
export type ContentFormatInput = z.infer<typeof contentFormatEnum>;

export const contentPlatformEnum = z.enum([
  "LinkedIn",
  "Instagram",
  "TikTok",
  "YouTube",
  "Twitter",
  "Outro",
]);
export type ContentPlatformInput = z.infer<typeof contentPlatformEnum>;

// ─── Labels ─────────────────────────────────────────────────

export const CONTENT_STATUS_LABELS: Record<ContentStatusInput, string> = {
  proposta: "Proposta",
  aprovado: "Aprovado",
  em_producao: "Em Produção",
  pronto: "Pronto",
  publicado: "Publicado",
};

export const CONTENT_FORMAT_LABELS: Record<ContentFormatInput, string> = {
  video: "Vídeo",
  artigo: "Artigo",
  podcast: "Podcast",
  post: "Post",
  reels: "Reels",
  carrossel: "Carrossel",
};

export const CONTENT_STATUS_OPTIONS = contentStatusEnum.options.map((value) => ({
  value,
  label: CONTENT_STATUS_LABELS[value],
}));

export const CONTENT_FORMAT_OPTIONS = contentFormatEnum.options.map((value) => ({
  value,
  label: CONTENT_FORMAT_LABELS[value],
}));

export const CONTENT_PLATFORM_OPTIONS = contentPlatformEnum.options.map((value) => ({
  value,
  label: value,
}));

// ─── Field helpers ──────────────────────────────────────────

const optionalUuid = z.string().uuid("ID inválido").optional().or(z.literal(""));

// ─── Create ─────────────────────────────────────────────────

export const contentCreateSchema = z.object({
  title: z.string().trim().min(1, "Título obrigatório").max(500),
  format: contentFormatEnum.optional(),
  status: contentStatusEnum.default("proposta"),
  platform: z.string().trim().max(100).optional().or(z.literal("")),
  sourceCallDate: dateString,
  projectId: optionalUuid,
});

export type ContentCreateInput = z.infer<typeof contentCreateSchema>;

// ─── Update ─────────────────────────────────────────────────

export const contentUpdateSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  format: contentFormatEnum.optional(),
  status: contentStatusEnum.optional(),
  platform: z.string().trim().max(100).optional().or(z.literal("")),
  sourceCallDate: dateString,
  projectId: optionalUuid,
});

export type ContentUpdateInput = z.infer<typeof contentUpdateSchema>;

// ─── Move (drag & drop) ────────────────────────────────────

export const contentMoveSchema = z.object({
  toStatus: contentStatusEnum,
});

export type ContentMoveInput = z.infer<typeof contentMoveSchema>;
