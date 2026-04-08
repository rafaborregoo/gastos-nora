import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

export interface ActionResult<T = void> {
  ok: boolean;
  message: string;
  data?: T;
  fieldErrors?: Record<string, string[] | undefined>;
}

export function successResult<T>(message: string, data?: T): ActionResult<T> {
  return { ok: true, message, data };
}

export function errorResult(message: string, fieldErrors?: Record<string, string[] | undefined>): ActionResult<never> {
  return { ok: false, message, fieldErrors };
}

export function handleActionError(error: unknown): ActionResult<never> {
  if (error instanceof ZodError) {
    return errorResult("Revisa los campos del formulario.", error.flatten().fieldErrors);
  }

  if (error instanceof Error) {
    return errorResult(error.message);
  }

  return errorResult("Ha ocurrido un error inesperado.");
}

export function revalidateAppPaths() {
  for (const path of ["/", "/add", "/transactions", "/dashboard", "/notifications", "/categories", "/accounts", "/settings"]) {
    revalidatePath(path);
  }
}
