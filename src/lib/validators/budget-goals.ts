import { z } from "zod";

export const budgetGoalSchema = z.object({
  id: z.string().uuid().optional(),
  categoryId: z.string().uuid("Selecciona una categoria."),
  targetAmount: z
    .number({ invalid_type_error: "Introduce un importe valido." })
    .positive("El objetivo debe ser mayor que 0."),
  targetPercent: z
    .number({ invalid_type_error: "Introduce un porcentaje valido." })
    .min(1, "El porcentaje minimo es 1.")
    .max(100, "El porcentaje maximo es 100.")
    .optional(),
  note: z.string().max(180, "La nota es demasiado larga.").optional()
});
