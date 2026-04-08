import { Logo } from "@/components/layout/logo";

export default function AuthLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="grid w-full max-w-6xl gap-10 md:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden rounded-[36px] border border-border bg-card/80 p-10 shadow-soft md:block">
          <Logo />
          <div className="mt-16 space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">NORA Gastos</p>
              <h1 className="max-w-lg text-5xl font-semibold leading-tight">
                Control claro para gastos, ingresos y Bizums sin romper las cuentas.
              </h1>
            </div>
            <p className="max-w-xl text-base text-muted-foreground">
              Registra quien pago, como se reparte cada gasto y cuanto queda pendiente. Todo conectado con Supabase y pensado para movil.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center">{children}</div>
      </div>
    </div>
  );
}

