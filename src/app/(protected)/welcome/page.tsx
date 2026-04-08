import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getAccounts, getAppContext } from "@/lib/queries/household-queries";

function getUserOwnedAccountsCount(accounts: Awaited<ReturnType<typeof getAccounts>>, userId: string) {
  return accounts.filter(
    (account) => account.owner_user_id === userId || account.members.some((member) => member.user_id === userId)
  ).length;
}

export default async function WelcomePage({
  searchParams
}: {
  searchParams?: { fromInvite?: string };
}) {
  const { user, profile, householdBundle } = await getAppContext();

  if (!user || !profile) {
    redirect("/login");
  }

  if (!householdBundle) {
    redirect("/onboarding");
  }

  const accounts = await getAccounts();
  const personalAccountCount = getUserOwnedAccountsCount(accounts, user.id);
  const cameFromInvite = searchParams?.fromInvite === "1";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-4 py-10">
      <div className="w-full space-y-6">
        <Card className="space-y-4 p-8">
          <div className="space-y-2">
            <CardTitle>
              {cameFromInvite
                ? `Te has unido a ${householdBundle.household.name}`
                : `Bienvenida/o a ${householdBundle.household.name}`}
            </CardTitle>
            <CardDescription>
              {cameFromInvite
                ? "Tu invitación ya se ha vinculado a este hogar. Desde ahora todo lo que registres puede formar parte del espacio compartido."
                : "Ya formas parte del hogar. Vamos a dejar listo tu espacio para que empieces a registrar gastos con claridad."}
            </CardDescription>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-border bg-background/70 p-4">
              <p className="text-sm font-semibold">Tu hogar</p>
              <p className="mt-2 text-sm text-muted-foreground">{householdBundle.household.name}</p>
            </div>
            <div className="rounded-[24px] border border-border bg-background/70 p-4">
              <p className="text-sm font-semibold">Miembros activos</p>
              <p className="mt-2 text-sm text-muted-foreground">{householdBundle.members.length} personas</p>
            </div>
            <div className="rounded-[24px] border border-border bg-background/70 p-4">
              <p className="text-sm font-semibold">Tus cuentas</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {personalAccountCount > 0 ? `${personalAccountCount} disponibles` : "Aún no tienes ninguna configurada"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="space-y-4 p-8">
          <div className="space-y-2">
            <CardTitle>Primeros pasos</CardTitle>
            <CardDescription>Esto es lo recomendable para empezar bien dentro del hogar compartido.</CardDescription>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-border bg-background/70 p-4">
              <p className="text-sm font-semibold">1. Revisa tus cuentas</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Crea tus cuentas personales o de trabajo para separar bien de dónde sale cada gasto.
              </p>
            </div>
            <div className="rounded-[24px] border border-border bg-background/70 p-4">
              <p className="text-sm font-semibold">2. Empieza a registrar</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Añade gastos, ingresos o transferencias y decide si un movimiento es compartido o solo tuyo.
              </p>
            </div>
            <div className="rounded-[24px] border border-border bg-background/70 p-4">
              <p className="text-sm font-semibold">3. Mira la actividad</p>
              <p className="mt-2 text-sm text-muted-foreground">
                En análisis podrás ver quién registra más movimientos, su última actividad y la posición neta.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <Link
              href="/accounts"
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              Configurar mis cuentas
            </Link>
            <Link
              href="/add"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-border px-5 text-sm font-semibold"
            >
              Registrar mi primer movimiento
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-border px-5 text-sm font-semibold"
            >
              Ir al análisis
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
