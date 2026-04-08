"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { resetUserThemeAction, saveUserThemeAction } from "@/lib/actions/theme-actions";
import { getDefaultThemeTokens, buildThemeTokensFromControls, themeTokenToHex, themeVariablesToStyle } from "@/lib/theme";
import { themeSettingsSchema } from "@/lib/validators/theme";
import type { ThemeSettingsFormValues } from "@/types/forms";
import type { UserThemePreference } from "@/types/database";

function getThemeFormDefaults(themePreference: UserThemePreference | null): ThemeSettingsFormValues {
  const mode = themePreference?.mode ?? "light";
  const tokens = themePreference?.tokens ?? getDefaultThemeTokens(mode);

  return {
    mode,
    themeName: themePreference?.theme_name ?? "Tema personalizado",
    primary: themeTokenToHex(tokens.primary),
    secondary: themeTokenToHex(tokens.secondary),
    accent: themeTokenToHex(tokens.accent),
    background: themeTokenToHex(tokens.background),
    foreground: themeTokenToHex(tokens.foreground),
    border: themeTokenToHex(tokens.border)
  };
}

export function ThemeManager({
  themePreference,
  aiThemeGenerationEnabled
}: {
  themePreference: UserThemePreference | null;
  aiThemeGenerationEnabled: boolean;
}) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const themeForm = useForm<ThemeSettingsFormValues>({
    resolver: zodResolver(themeSettingsSchema),
    defaultValues: getThemeFormDefaults(themePreference)
  });

  const watchedTheme = themeForm.watch();
  const previewTokens = buildThemeTokensFromControls({
    mode: watchedTheme.mode ?? "light",
    primary: watchedTheme.primary ?? "#129474",
    secondary: watchedTheme.secondary ?? "#ea6d2f",
    accent: watchedTheme.accent ?? "#18a5ec",
    background: watchedTheme.background ?? "#f9f5ed",
    foreground: watchedTheme.foreground ?? "#18212d",
    border: watchedTheme.border ?? "#e6dccc"
  });

  return (
    <div className="space-y-6">
      <Card className="space-y-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Tema visual</h2>
            <p className="text-sm text-muted-foreground">
              Ajusta colores base y guarda un estilo propio para tu sesión y tus dispositivos.
            </p>
          </div>
          {themePreference ? (
            <Badge intent={themePreference.source === "ai" ? "info" : "neutral"}>
              {themePreference.source === "ai" ? "Generado con IA" : "Personalizado"}
            </Badge>
          ) : (
            <Badge>Por defecto</Badge>
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <form
            className="space-y-4"
            onSubmit={themeForm.handleSubmit((values) => {
              startSaving(async () => {
                const result = await saveUserThemeAction(values);

                if (!result.ok) {
                  toast.error(result.message);
                  return;
                }

                toast.success(result.message);
                router.refresh();
              });
            })}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Nombre del tema">
                <Input {...themeForm.register("themeName")} />
              </FormField>
              <FormField label="Modo">
                <Select {...themeForm.register("mode")}>
                  <option value="light">Claro</option>
                  <option value="dark">Oscuro</option>
                </Select>
              </FormField>
              <FormField label="Color principal">
                <Input type="color" {...themeForm.register("primary")} />
              </FormField>
              <FormField label="Color secundario">
                <Input type="color" {...themeForm.register("secondary")} />
              </FormField>
              <FormField label="Color de acento">
                <Input type="color" {...themeForm.register("accent")} />
              </FormField>
              <FormField label="Fondo">
                <Input type="color" {...themeForm.register("background")} />
              </FormField>
              <FormField label="Texto principal">
                <Input type="color" {...themeForm.register("foreground")} />
              </FormField>
              <FormField label="Borde">
                <Input type="color" {...themeForm.register("border")} />
              </FormField>
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <Button type="submit" disabled={isSaving}>
                Guardar tema
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={() => {
                  startSaving(async () => {
                    const result = await resetUserThemeAction();

                    if (!result.ok) {
                      toast.error(result.message);
                      return;
                    }

                    toast.success(result.message);
                    themeForm.reset(getThemeFormDefaults(null));
                    router.refresh();
                  });
                }}
              >
                Restaurar por defecto
              </Button>
            </div>
          </form>

          <div
            className="rounded-[28px] border p-4 shadow-soft"
            style={themeVariablesToStyle(previewTokens)}
          >
            <div className="space-y-4 rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-[hsl(var(--card-foreground))]">
              <div className="space-y-1">
                <p className="text-lg font-semibold">Vista previa</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Así se verían tarjetas, acciones y mensajes.</p>
              </div>
              <div className="flex gap-2">
                <span className="inline-flex rounded-full bg-[hsl(var(--primary))] px-3 py-1 text-xs font-semibold text-[hsl(var(--primary-foreground))]">
                  Principal
                </span>
                <span className="inline-flex rounded-full bg-[hsl(var(--secondary))] px-3 py-1 text-xs font-semibold text-[hsl(var(--secondary-foreground))]">
                  Secundario
                </span>
                <span className="inline-flex rounded-full bg-[hsl(var(--accent))] px-3 py-1 text-xs font-semibold text-[hsl(var(--accent-foreground))]">
                  Acento
                </span>
              </div>
              <div className="rounded-[20px] bg-[hsl(var(--muted))] p-4 text-[hsl(var(--foreground))]">
                <p className="font-medium">Balance disponible</p>
                <p className="mt-2 text-2xl font-semibold">1.300,00 EUR</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
      {!aiThemeGenerationEnabled ? (
        <Card className="space-y-2">
          <h2 className="text-lg font-semibold">Generación con IA desactivada</h2>
          <p className="text-sm text-muted-foreground">
            El generador de temas con OpenAI está oculto por ahora. Puedes seguir personalizando colores manualmente.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
