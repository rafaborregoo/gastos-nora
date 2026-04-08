"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown, MoreHorizontal, Pencil, ReceiptText, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { TransactionForm } from "@/features/transactions/transaction-form";
import { TransactionStatusBadge } from "@/features/transactions/status-badge";
import { cancelTransactionAction } from "@/lib/actions/transaction-actions";
import { formatCurrency } from "@/lib/formatters/currency";
import { formatDisplayDate } from "@/lib/formatters/date";
import { cn } from "@/lib/utils";
import type { Category, Json, TransactionAuditLog, TransactionWithRelations } from "@/types/database";

function displayName(name?: string | null, email?: string | null) {
  return name || email || "Sin nombre";
}

function getTransferDestination(metadata: Json) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const destination = metadata.destination_account_name;
  return typeof destination === "string" ? destination : null;
}

function formatSettlementMethod(method: string) {
  const labels: Record<string, string> = {
    bizum: "Bizum",
    cash: "Efectivo",
    bank_transfer: "Transferencia",
    card: "Tarjeta",
    other: "Otro"
  };

  return labels[method] ?? method;
}

function formatAuditAction(action: string) {
  const labels: Record<string, string> = {
    insert: "Creado",
    update: "Actualizado",
    delete: "Eliminado",
    status_change: "Cambio de estado"
  };

  return labels[action] ?? action;
}

export function TransactionCard({
  transaction,
  auditLog,
  accounts,
  categories,
  members
}: {
  transaction: TransactionWithRelations;
  auditLog?: TransactionAuditLog[];
  accounts: Array<{ id: string; name: string; currency: string; type: string }>;
  categories: Category[];
  members: Array<{ id: string; label: string }>;
}) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const pendingAmount = transaction.balance?.pending_amount ?? 0;
  const canSettle = transaction.is_shared && pendingAmount > 0 && transaction.status !== "cancelled";
  const canCancel = transaction.status !== "cancelled";
  const transferDestination = getTransferDestination(transaction.metadata);

  return (
    <article className={cn("relative rounded-[26px] border border-border bg-card shadow-soft", isMenuOpen && "z-20")}>
      <div className="flex items-start gap-2 p-2.5 sm:p-3">
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="flex min-w-0 flex-1 items-start gap-2 rounded-2xl px-1 py-1 text-left outline-none transition hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <TransactionStatusBadge status={transaction.status} />
              {transaction.is_shared ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                  Compartido
                </span>
              ) : null}
              {transaction.type === "transfer" ? (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-secondary-foreground">
                  Transferencia
                </span>
              ) : null}
            </div>
            <div className="mt-1.5 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold sm:text-[15px]">{transaction.title}</h3>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDisplayDate(transaction.transaction_date)} · {transaction.account?.name ?? "Sin cuenta"} ·{" "}
                  {transaction.category?.name ?? "Sin categoría"}
                </p>
                {transaction.is_shared ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">Pendiente: {formatCurrency(pendingAmount, transaction.currency)}</p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-sm font-semibold sm:text-base">{formatCurrency(transaction.amount, transaction.currency)}</p>
              </div>
            </div>
          </div>
        </button>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsMenuOpen((current) => !current)}
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-background text-muted-foreground transition hover:bg-muted"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {isMenuOpen ? (
            <div className="absolute right-0 top-12 z-[60] flex w-56 flex-col rounded-2xl border border-border bg-popover p-2 shadow-soft">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-popover-foreground transition hover:bg-muted"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsEditOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" />
                Editar
              </button>
              {canSettle ? (
                <Link
                  href={`/add?mode=settlement&transactionId=${transaction.id}`}
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-popover-foreground transition hover:bg-muted"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <ReceiptText className="h-4 w-4" />
                  Registrar liquidación
                </Link>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground">
                  <ReceiptText className="h-4 w-4" />
                  Sin liquidación pendiente
                </span>
              )}
              <button
                type="button"
                disabled={isPending || !canCancel}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:text-muted-foreground"
                onClick={() => {
                  setIsMenuOpen(false);
                  startTransition(async () => {
                    const result = await cancelTransactionAction(transaction.id);

                    if (!result.ok) {
                      toast.error(result.message);
                      return;
                    }

                    toast.success(result.message);
                    router.refresh();
                  });
                }}
              >
                <Trash2 className="h-4 w-4" />
                {canCancel ? "Cancelar" : "Ya cancelado"}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {isExpanded ? (
        <div className="border-t border-border bg-background/60 px-4 py-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Pagado por</p>
              <p className="font-medium">{displayName(transaction.paid_by_profile?.full_name, transaction.paid_by_profile?.email)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Beneficiario</p>
              <p className="font-medium">
                {displayName(transaction.beneficiary_profile?.full_name, transaction.beneficiary_profile?.email)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Cuenta</p>
              <p className="font-medium">
                {transaction.account?.name ?? "Sin cuenta"}
                {transferDestination ? ` → ${transferDestination}` : ""}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Descripción</p>
              <p className="font-medium">{transaction.description || "Sin descripción"}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <section className="rounded-2xl border border-border bg-card px-3 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Reparto</p>
              <div className="space-y-2">
                {transaction.splits.length ? (
                  transaction.splits.map((split) => (
                    <div key={split.id} className="flex items-center justify-between gap-3 rounded-xl bg-background px-3 py-2">
                      <span className="truncate">{split.user_id}</span>
                      <span className="font-medium">{formatCurrency(split.share_amount, transaction.currency)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Este movimiento no tiene reparto asociado.</p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card px-3 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Liquidaciones</p>
              <div className="space-y-2">
                {transaction.settlements.length ? (
                  transaction.settlements.map((settlement) => (
                    <div key={settlement.id} className="rounded-xl bg-background px-3 py-2">
                      <p className="font-medium">
                        {formatCurrency(settlement.amount, settlement.currency)} · {formatSettlementMethod(settlement.method)}
                      </p>
                      <p className="text-sm text-muted-foreground">{formatDisplayDate(settlement.settlement_date)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No hay liquidaciones registradas.</p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card px-3 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Auditoría</p>
              <div className="space-y-2">
                {auditLog?.length ? (
                  auditLog.map((entry) => (
                    <div key={entry.id} className="rounded-xl bg-background px-3 py-2">
                      <p className="font-medium">{formatAuditAction(entry.action)}</p>
                      <p className="text-sm text-muted-foreground">{formatDisplayDate(entry.created_at, "d MMM yyyy, HH:mm")}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">La auditoría completa está disponible en la vista detalle.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {isEditOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-6">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] border border-border bg-background p-4 shadow-soft sm:max-w-4xl sm:rounded-[28px] sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <CardTitle>Editar movimiento</CardTitle>
                <CardDescription>Modifica el movimiento sin salir del listado.</CardDescription>
              </div>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground transition hover:bg-muted"
                onClick={() => setIsEditOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <Card className="p-4 sm:p-5">
              <TransactionForm
                embedded
                accounts={accounts}
                categories={categories}
                members={members}
                initialTransaction={transaction}
                submitLabel="Guardar cambios"
                onCancel={() => setIsEditOpen(false)}
                onSuccess={() => setIsEditOpen(false)}
              />
            </Card>
          </div>
        </div>
      ) : null}
    </article>
  );
}
