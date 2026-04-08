"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Pencil, ReceiptText, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TransactionStatusBadge } from "@/features/transactions/status-badge";
import { cancelTransactionAction } from "@/lib/actions/transaction-actions";
import { formatCurrency } from "@/lib/formatters/currency";
import { formatDisplayDate } from "@/lib/formatters/date";
import type { TransactionAuditLog, TransactionWithRelations } from "@/types/database";

function displayName(name?: string | null, email?: string | null) {
  return name || email || "Sin nombre";
}

export function TransactionCard({
  transaction,
  auditLog
}: {
  transaction: TransactionWithRelations;
  auditLog?: TransactionAuditLog[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Card className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <TransactionStatusBadge status={transaction.status} />
            {transaction.is_shared ? <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Compartido</span> : null}
          </div>
          <div>
            <h3 className="text-lg font-semibold">{transaction.title}</h3>
            <p className="text-sm text-muted-foreground">{transaction.description || "Sin descripción"}</p>
          </div>
        </div>
        <div className="text-left md:text-right">
          <p className="font-mono text-2xl font-semibold">{formatCurrency(transaction.amount, transaction.currency)}</p>
          <p className="text-sm text-muted-foreground">{formatDisplayDate(transaction.transaction_date)}</p>
        </div>
      </div>

      <div className="grid gap-3 text-sm md:grid-cols-4">
        <div>
          <p className="text-muted-foreground">Categoría</p>
          <p className="font-medium">{transaction.category?.name ?? "Sin categoría"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Pagado por</p>
          <p className="font-medium">{displayName(transaction.paid_by_profile?.full_name, transaction.paid_by_profile?.email)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Cuenta</p>
          <p className="font-medium">{transaction.account?.name ?? "Sin cuenta"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Pendiente</p>
          <p className="font-medium">{formatCurrency(transaction.balance?.pending_amount ?? 0, transaction.currency)}</p>
        </div>
      </div>

      <details className="rounded-2xl border border-border bg-background/60 p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold">Ver detalle, reparto y auditoría</summary>
        <div className="mt-4 space-y-4 text-sm">
          <div>
            <p className="mb-2 font-semibold">Splits</p>
            <div className="space-y-2">
              {transaction.splits.length ? (
                transaction.splits.map((split) => (
                  <div key={split.id} className="flex items-center justify-between rounded-xl bg-card px-3 py-2">
                    <span>{split.user_id}</span>
                    <span>{formatCurrency(split.share_amount, transaction.currency)}</span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">Este movimiento no tiene reparto asociado.</p>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 font-semibold">Liquidaciones</p>
            <div className="space-y-2">
              {transaction.settlements.length ? (
                transaction.settlements.map((settlement) => (
                  <div key={settlement.id} className="rounded-xl bg-card px-3 py-2">
                    <p className="font-medium">
                      {formatCurrency(settlement.amount, settlement.currency)} · {settlement.method}
                    </p>
                    <p className="text-muted-foreground">{formatDisplayDate(settlement.settlement_date)}</p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">No hay liquidaciones registradas.</p>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 font-semibold">Auditoría</p>
            <div className="space-y-2">
              {auditLog?.length ? (
                auditLog.map((entry) => (
                  <div key={entry.id} className="rounded-xl bg-card px-3 py-2">
                    <p className="font-medium">{entry.action}</p>
                    <p className="text-muted-foreground">{formatDisplayDate(entry.created_at, "d MMM yyyy, HH:mm")}</p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">La auditoría completa está disponible en la vista detalle.</p>
              )}
            </div>
          </div>
        </div>
      </details>

      <div className="flex flex-col gap-3 md:flex-row">
        <Link
          href={`/add?mode=transaction&id=${transaction.id}`}
          className={cn(
            "inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border px-4 text-sm font-semibold"
          )}
        >
          <Pencil className="h-4 w-4" />
          Editar
        </Link>
        <Link
          href={`/add?mode=settlement&transactionId=${transaction.id}`}
          className={cn(
            "inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border px-4 text-sm font-semibold"
          )}
        >
          <ReceiptText className="h-4 w-4" />
          Registrar liquidación
        </Link>
        <Button
          variant="ghost"
          disabled={isPending}
          onClick={() => {
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
          Cancelar
        </Button>
      </div>
    </Card>
  );
}
