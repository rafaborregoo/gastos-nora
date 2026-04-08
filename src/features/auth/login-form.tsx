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
import { signInAction } from "@/lib/actions/auth-actions";
import { loginSchema } from "@/lib/validators/auth";
import type { AuthFormValues } from "@/types/forms";

export function LoginForm({ initialEmail = "" }: { initialEmail?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<AuthFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: initialEmail,
      password: ""
    }
  });

  return (
    <Card className="w-full max-w-md p-8">
      <div className="mb-6 space-y-2">
        <CardTitle>Entra en tu hogar financiero</CardTitle>
        <CardDescription>Accede para ver cuentas, movimientos, liquidaciones y dashboard mensual.</CardDescription>
      </div>
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((values) => {
          startTransition(async () => {
            const result = await signInAction(values);

            if (!result.ok) {
              toast.error(result.message);
              return;
            }

            toast.success(result.message);
            router.replace("/");
            router.refresh();
          });
        })}
      >
        <FormField label="Email" error={form.formState.errors.email?.message}>
          <Input type="email" autoComplete="email" {...form.register("email")} />
        </FormField>
        <FormField label="Contrasena" error={form.formState.errors.password?.message}>
          <Input type="password" autoComplete="current-password" {...form.register("password")} />
        </FormField>
        <Button type="submit" className="w-full" disabled={isPending}>
          Entrar
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        No tienes cuenta?{" "}
        <Link href="/register" className="font-semibold text-primary">
          Registrate
        </Link>
      </p>
    </Card>
  );
}

