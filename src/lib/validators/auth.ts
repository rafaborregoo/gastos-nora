import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Introduce un email válido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres.")
});

export const registerSchema = loginSchema.extend({
  fullName: z.string().min(2, "Tu nombre debe tener al menos 2 caracteres.")
});

