import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { TransactionCard } from "@/features/transactions/transaction-card";
import { getCategories } from "@/lib/queries/household-queries";
import { getTransactions } from "@/lib/queries/transaction-queries";

export default async function TransactionsPage({
  searchParams
}: {
  searchParams?: { ownership?: "mine" | "others" | "shared" | "all"; month?: string; status?: string; categoryId?: string };
}) {
  const [transactions, categories] = await Promise.all([getTransactions(searchParams), getCategories()]);

  return (
    <div className="space-y-6">
      <PageHeader title="Movimientos" description="Listado editable con filtros por origen, estado y mes." />
      <form className="grid gap-3 rounded-[28px] border border-border bg-card p-4 md:grid-cols-5" action="/transactions">
        <Select name="ownership" defaultValue={searchParams?.ownership ?? "all"}>
          <option value="all">Todos</option>
          <option value="mine">Míos</option>
          <option value="others">Suyos</option>
          <option value="shared">Compartidos</option>
        </Select>
        <Input type="month" name="month" defaultValue={searchParams?.month ?? new Date().toISOString().slice(0, 7)} />
        <Select name="status" defaultValue={searchParams?.status ?? ""}>
          <option value="">Todos los estados</option>
          <option value="posted">Pendiente</option>
          <option value="partially_settled">Parcial</option>
          <option value="settled">Liquidado</option>
          <option value="cancelled">Cancelado</option>
        </Select>
        <Select name="categoryId" defaultValue={searchParams?.categoryId ?? ""}>
          <option value="">Todas las categorías</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        <Button type="submit">Filtrar</Button>
      </form>
      {transactions.length ? (
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <TransactionCard key={transaction.id} transaction={transaction} />
          ))}
        </div>
      ) : (
        <EmptyState title="No hay movimientos" description="Prueba creando un gasto, ingreso o liquidación desde la pantalla de añadir." />
      )}
    </div>
  );
}
