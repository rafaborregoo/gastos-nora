import { z } from "zod";

export const accountSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().min(2, "El nombre es obligatorio."),
    type: z.enum(["personal", "shared", "cash", "bank", "savings"]),
    ownerUserId: z.string().uuid().nullable().optional(),
    memberUserIds: z.array(z.string().uuid()).default([]),
    currency: z.string().trim().min(3).max(3).default("EUR"),
    initialBalance: z.number().min(0, "El saldo inicial no puede ser negativo.").default(0)
  })
  .superRefine((value, ctx) => {
    if (value.type !== "shared" && !value.ownerUserId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ownerUserId"],
        message: "Selecciona una persona titular."
      });
    }

    if (value.type === "shared" && value.memberUserIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["memberUserIds"],
        message: "Selecciona al menos una persona vinculada."
      });
    }
  });

