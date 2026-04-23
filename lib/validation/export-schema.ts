import { z } from "zod";

export const exportFormatEnum = z.enum(["pdf", "excel"]);
export type ExportFormat = z.infer<typeof exportFormatEnum>;

export const exportTypeEnum = z.enum([
  "projects",
  "timesheets",
  "pipeline",
  "people",
  "investments",
]);
export type ExportType = z.infer<typeof exportTypeEnum>;

export const exportFilterSchema = z.object({
  type: exportTypeEnum,
  format: exportFormatEnum,
  projectId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});
