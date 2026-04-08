import { z } from "zod";

export const themeSettingsSchema = z.object({
  mode: z.enum(["light", "dark"]),
  themeName: z.string().max(60).optional(),
  primary: z.string().min(4),
  secondary: z.string().min(4),
  accent: z.string().min(4),
  background: z.string().min(4),
  foreground: z.string().min(4),
  border: z.string().min(4)
});

export const generateThemeSchema = z.object({
  prompt: z.string().min(8, "Describe el estilo con un poco mas de detalle.").max(280)
});

