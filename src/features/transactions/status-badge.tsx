import { Badge } from "@/components/ui/badge";
import type { TransactionStatus } from "@/types/database";

const STATUS_MAP: Record<TransactionStatus, { label: string; intent: "neutral" | "success" | "warning" | "danger" | "info" }> = {
  draft: { label: "Borrador", intent: "neutral" },
  posted: { label: "Registrado", intent: "warning" },
  partially_settled: { label: "Pendiente parcial", intent: "info" },
  settled: { label: "Liquidado", intent: "success" },
  cancelled: { label: "Cancelado", intent: "danger" }
};

export function TransactionStatusBadge({ status }: { status: TransactionStatus }) {
  const config = STATUS_MAP[status];
  return <Badge intent={config.intent}>{config.label}</Badge>;
}
