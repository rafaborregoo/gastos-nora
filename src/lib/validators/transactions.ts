import { z } from "zod";

const splitSchema = z.object({
  userId: z.string().uuid("Usuario inválido."),
  shareAmount: z.coerce.number().min(0, "La parte debe ser positiva."),
  sharePercent: z.coerce.number().min(0).max(100).optional(),
  isDebtor: z.boolean().optional()
});

export const transactionSchema = z
  .object({
    id: z.string().uuid().optional(),
    type: z.enum(["expense", "income", "transfer", "adjustment"]),
    title: z.string().min(2, "El título es obligatorio."),
    description: z.string().optional(),
    amount: z.coerce.number().positive("El importe debe ser superior a cero."),
    currency: z.string().min(3).max(3),
    transactionDate: z.string().min(1, "La fecha es obligatoria."),
    accountId: z.string().uuid("Selecciona una cuenta."),
    destinationAccountId: z.string().uuid().optional().or(z.literal("")),
    categoryId: z.string().uuid().optional().or(z.literal("")),
    paidByUserId: z.string().uuid().optional().or(z.literal("")),
    beneficiaryUserId: z.string().uuid().optional().or(z.literal("")),
    isShared: z.boolean(),
    splitMethod: z.enum(["none", "equal", "percentage", "fixed"]),
    splits: z.array(splitSchema),
    note: z.string().optional(),
    externalRef: z.string().optional()
  })
  .superRefine((value, ctx) => {
    if (value.isShared && value.type === "expense") {
      if (value.splitMethod === "none") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Un gasto compartido necesita un método de reparto distinto de none.",
          path: ["splitMethod"]
        });
      }

      if (value.splits.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Debes indicar a quién afecta el reparto.",
          path: ["splits"]
        });
      }
    }

    if (value.type === "transfer") {
      if (!value.destinationAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Selecciona una cuenta de destino.",
          path: ["destinationAccountId"]
        });
      }

      if (value.destinationAccountId && value.destinationAccountId === value.accountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La cuenta de origen y la de destino no pueden ser la misma.",
          path: ["destinationAccountId"]
        });
      }
    }
  });

export const settlementSchema = z.object({
  id: z.string().uuid().optional(),
  transactionId: z.string().uuid().optional().or(z.literal("")),
  fromUserId: z.string().uuid("Selecciona quién paga."),
  toUserId: z.string().uuid("Selecciona quién recibe."),
  amount: z.coerce.number().positive("El importe debe ser superior a cero."),
  currency: z.string().min(3).max(3),
  settlementDate: z.string().min(1, "La fecha es obligatoria."),
  method: z.enum(["bizum", "cash", "bank_transfer", "card", "other"]),
  note: z.string().optional()
});
