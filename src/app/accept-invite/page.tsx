import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getAuthenticatedUser } from "@/lib/queries/auth-queries";

export default async function AcceptInvitePage({
  searchParams
}: {
  searchParams?: { email?: string };
}) {
  const user = await getAuthenticatedUser();

  if (user) {
    redirect("/welcome?fromInvite=1");
  }

  const email = searchParams?.email ?? "";
  const inviteQuery = `invite=1${email ? `&email=${encodeURIComponent(email)}` : ""}`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-10">
      <Card className="w-full space-y-6 p-8">
        <div className="space-y-2">
          <CardTitle>Invitación recibida</CardTitle>
          <CardDescription>
            Si ya tienes cuenta, entra con el mismo correo. Si todavía no la tienes, regístrate primero y NORA Gastos te
            unirá automáticamente al hogar pendiente.
          </CardDescription>
        </div>
        <div className="rounded-[24px] border border-border bg-background/60 p-4 text-sm text-muted-foreground">
          Después de entrar verás una bienvenida con los siguientes pasos para configurar tus cuentas y empezar a registrar tus
          gastos dentro del hogar compartido.
        </div>
        <div className="flex flex-col gap-3 md:flex-row">
          <Link
            href={`/register?${inviteQuery}`}
            className={cn(
              "inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
            )}
          >
            Registrarme
          </Link>
          <Link
            href={`/login?${inviteQuery}`}
            className={cn("inline-flex h-11 items-center justify-center rounded-2xl border border-border px-4 text-sm font-semibold")}
          >
            Ya tengo cuenta
          </Link>
        </div>
      </Card>
    </main>
  );
}
