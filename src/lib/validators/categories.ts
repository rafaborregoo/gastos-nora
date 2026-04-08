import { z } from "zod";

export const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, "El nombre es obligatorio."),
  kind: z.enum(["expense", "income", "both"]),
  color: z.string().optional(),
  icon: z.string().optional()
});

