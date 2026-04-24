import { z } from "zod";

export const devTaskTransitionEnum = z.enum([
  "in_dev",
  "ready_for_verification",
  "needs_review",
]);

export const devTaskTransitionSchema = z
  .object({
    status: devTaskTransitionEnum,
    rejectionReason: z.string().trim().min(3).max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "needs_review" && !data.rejectionReason) {
      ctx.addIssue({
        code: "custom",
        path: ["rejectionReason"],
        message: "rejectionReason required on reject (status=needs_review)",
      });
    }
  });
