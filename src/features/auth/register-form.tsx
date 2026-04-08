"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { signUpAction } from "@/lib/actions/auth-actions";
import { registerSchema } from "@/lib/validators/auth";
import type { AuthFormValues } from "@/types/forms";

export function RegisterForm({ initialEmail = "", inviteFlow = false }: { initialEmail?: string; inviteFlow?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<AuthFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: initialEmail,
      password: ""
    }
  });

  const loginHref = inviteFlow ? `/login?invite=1${initialEmail ? `&email=${encodeURIComponent(initialEmail)}` : ""}` : "/login";

  return (
    <Card className="w-full max-w-md p-8">
      <div className="mb-6 space-y-2">
        <CardTitle>Crea tu cuenta</CardTitle>
        <CardDescription>Registra tu perfil para crear o unirte a un hogar compartido.</CardDescription>
      </div>
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((values) => {
          startTransition(async () => {
            const result = await signUpAction(values);

            if (!result.ok) {
              toast.error(result.message);
              return;
            }

            toast.success(result.message);
            router.replace(inviteFlow ? `/login?invite=1&email=${encodeURIComponent(values.email)}` : "/login");
            router.refresh();
          });
        })}
      >
        <FormField label="Nombre" error={form.formState.errors.fullName?.message}>
          <Input autoComplete="name" {...form.register("fullName")} />
        </FormField>
        <FormField label="Email" error={form.formState.errors.email?.message}>
          <Input type="email" autoComplete="email" {...form.register("email")} />
        </FormField>
        <FormField label="Contraseña" error={form.formState.errors.password?.message}>
          <Input type="password" autoComplete="new-password" {...form.register("password")} />
        </FormField>
        <Button type="submit" className="w-full" disabled={isPending}>
          Crear cuenta
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href={loginHref} className="font-semibold text-primary">
          Entra
        </Link>
      </p>
    </Card>
  );
}
