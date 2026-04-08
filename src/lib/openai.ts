import "server-only";

import { z } from "zod";

import type { ThemeMode, ThemeTokens } from "@/types/database";
import { validateThemeTokens } from "@/lib/theme";

const openAiThemeResponseSchema = z.object({
  theme_name: z.string().min(2).max(60),
  mode: z.enum(["light", "dark"]),
  tokens: z.record(z.string()),
  rationale: z.string().max(280)
});

function getOpenAiEnv() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Falta OPENAI_API_KEY en el servidor.");
  }

  return {
    apiKey,
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini"
  };
}

export function isAiThemeGenerationEnabled() {
  return process.env.OPENAI_THEME_GENERATION_ENABLED === "true";
}

export async function generateThemeWithOpenAi(prompt: string): Promise<{
  themeName: string;
  mode: ThemeMode;
  tokens: ThemeTokens;
  rationale?: string;
}> {
  if (!isAiThemeGenerationEnabled()) {
    throw new Error("La generacion de temas con IA esta desactivada temporalmente.");
  }

  const env = getOpenAiEnv();
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.apiKey}`
    },
    body: JSON.stringify({
      model: env.model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "Eres un director de arte para una app financiera. Devuelves solo temas visuales seguros y elegantes para una interfaz de producto. No alteres layout ni tipografia. Devuelve colores equilibrados, legibles y coherentes para una app moderna."
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Genera un tema visual inspirado en esta idea: "${prompt}". Debes devolver una paleta completa de color para una app financiera elegante, usable y con buen contraste.`
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "theme_palette",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              theme_name: { type: "string" },
              mode: { type: "string", enum: ["light", "dark"] },
              rationale: { type: "string" },
              tokens: {
                type: "object",
                additionalProperties: false,
                properties: {
                  background: { type: "string" },
                  foreground: { type: "string" },
                  muted: { type: "string" },
                  muted_foreground: { type: "string" },
                  card: { type: "string" },
                  card_foreground: { type: "string" },
                  border: { type: "string" },
                  ring: { type: "string" },
                  primary: { type: "string" },
                  primary_foreground: { type: "string" },
                  secondary: { type: "string" },
                  secondary_foreground: { type: "string" },
                  accent: { type: "string" },
                  accent_foreground: { type: "string" },
                  success: { type: "string" },
                  success_foreground: { type: "string" },
                  warning: { type: "string" },
                  warning_foreground: { type: "string" },
                  danger: { type: "string" },
                  danger_foreground: { type: "string" }
                },
                required: [
                  "background",
                  "foreground",
                  "muted",
                  "muted_foreground",
                  "card",
                  "card_foreground",
                  "border",
                  "ring",
                  "primary",
                  "primary_foreground",
                  "secondary",
                  "secondary_foreground",
                  "accent",
                  "accent_foreground",
                  "success",
                  "success_foreground",
                  "warning",
                  "warning_foreground",
                  "danger",
                  "danger_foreground"
                ]
              }
            },
            required: ["theme_name", "mode", "tokens", "rationale"]
          }
        }
      }
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI no pudo generar el tema: ${message}`);
  }

  const data = (await response.json()) as { output_text?: string };
  const outputText = data.output_text;

  if (!outputText) {
    throw new Error("OpenAI no devolvio contenido util para el tema.");
  }

  const parsed = openAiThemeResponseSchema.parse(JSON.parse(outputText));
  const validatedTokens = validateThemeTokens(parsed.tokens);

  if (!validatedTokens) {
    throw new Error("La IA devolvio colores invalidos o con contraste insuficiente.");
  }

  return {
    themeName: parsed.theme_name,
    mode: parsed.mode,
    tokens: validatedTokens,
    rationale: parsed.rationale
  };
}
