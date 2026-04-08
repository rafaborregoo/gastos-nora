"use client";

import { useEffect, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { saveTransactionAction } from "@/lib/actions/transaction-actions";
import { formatCurrency } from "@/lib/formatters/currency";
import { transactionSchema } from "@/lib/validators/transactions";
import { toDateInputValue } from "@/lib/utils";
import type { Category, TransactionWithRelations } from "@/types/database";
import type { TransactionFormValues } from "@/types/forms";

interface MemberOption {
  id: string;
  label: string;
}

export function TransactionForm({
  accounts,
  categories,
  members,
  initialTransaction,
  initialType = "expense"
}: {
  accounts: Array<{ id: string; name: string; currency: string; type: string }>;
  categories: Category[];
  members: MemberOption[];
  initialTransaction?: TransactionWithRelations | null;
  initialType?: TransactionFormValues["type"];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const transferMetadata =
    initialTransaction?.metadata && typeof initialTransaction.metadata === "object" && !Array.isArray(initialTransaction.metadata)
      ? initialTransaction.metadata
      : null;
  const defaultValues: TransactionFormValues = {
    id: initialTransaction?.id,
    type: initialTransaction?.type ?? initialType,
    title: initialTransaction?.title ?? "",
    description: initialTransaction?.description ?? "",
    amount: initialTransaction?.amount ?? 0,
    currency: initialTransaction?.currency ?? "EUR",
    transactionDate: initialTransaction?.transaction_date ?? toDateInputValue(new Date()),
    accountId: initialTransaction?.account_id ?? accounts[0]?.id ?? "",
    destinationAccountId:
      typeof transferMetadata?.destination_account_id === "string" ? transferMetadata.destination_account_id : "",
    categoryId: initialTransaction?.category_id ?? "",
    paidByUserId: initialTransaction?.paid_by_user_id ?? members[0]?.id ?? "",
    beneficiaryUserId: initialTransaction?.beneficiary_user_id ?? "",
    isShared: initialTransaction?.is_shared ?? false,
    splitMethod: initialTransaction?.split_method ?? "none",
    splits:
      initialTransaction?.splits.map((split) => ({
        userId: split.user_id,
        shareAmount: split.share_amount,
        sharePercent: split.share_percent ?? undefined,
        isDebtor: split.is_debtor
      })) ??
      members.map((member) => ({
        userId: member.id,
        shareAmount: 0,
        sharePercent: members.length ? 100 / members.length : 0,
        isDebtor: true
      })),
    note: String((transferMetadata as { note?: string } | undefined)?.note ?? ""),
    externalRef: initialTransaction?.external_ref ?? ""
  };

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues
  });

  const splitFields = useFieldArray({
    control: form.control,
    name: "splits"
  });
  const splitMethod = useWatch({ control: form.control, name: "splitMethod" });
  const isShared = useWatch({ control: form.control, name: "isShared" });
  const amount = useWatch({ control: form.control, name: "amount" });
  const type = useWatch({ control: form.control, name: "type" });
  const selectedAccountId = useWatch({ control: form.control, name: "accountId" });

  useEffect(() => {
    if (type === "transfer") {
      form.setValue("isShared", false);
      form.setValue("splitMethod", "none");
      form.setValue("categoryId", "");
      form.setValue("paidByUserId", "");
      form.setValue("beneficiaryUserId", "");
      return;
    }

    if (!isShared || type !== "expense") {
      form.setValue("splitMethod", "none");
      return;
    }

    if (form.getValues("splitMethod") === "none") {
      form.setValue("splitMethod", "equal");
    }

    if (!form.getValues("splits").length) {
      form.setValue(
        "splits",
        members.map((member) => ({
          userId: member.id,
          shareAmount: 0,
          sharePercent: members.length ? 100 / members.length : 0,
          isDebtor: true
        }))
      );
    }
  }, [form, isShared, members, type]);

  useEffect(() => {
    if (!isShared || type !== "expense" || splitMethod !== "equal") {
      return;
    }

    const total = Number(amount || 0);
    const splitCount = splitFields.fields.length;
    if (!splitCount) {
      return;
    }

    const even = Math.round((total / splitCount) * 100) / 100;
    splitFields.fields.forEach((field, index) => {
      const isLast = index === splitCount - 1;
      const value = isLast ? Math.round((total - even * index) * 100) / 100 : even;
      form.setValue(`splits.${index}.shareAmount`, value);
      form.setValue(`splits.${index}.sharePercent`, splitCount ? 100 / splitCount : 0);
    });
  }, [amount, form, isShared, splitFields.fields, splitMethod, type]);

  const categoryOptions = useMemo(
    () => categories.filter((category) => category.kind === "both" || category.kind === type),
    [categories, type]
  );
  const destinationAccounts = useMemo(
    () => accounts.filter((account) => account.id !== selectedAccountId),
    [accounts, selectedAccountId]
  );

  return (
    <Card className="p-4 sm:p-5 md:p-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <CardTitle>{initialTransaction ? "Editar movimiento" : "Nuevo movimiento"}</CardTitle>
          <CardDescription>
            Registra gastos, ingresos o transferencias entre cuentas para saber exactamente de dónde sale cada euro.
          </CardDescription>
        </div>
        <div className="grid w-full grid-cols-3 rounded-full bg-muted p-1 md:w-auto">
          {(
            [
              { value: "expense", label: "Gasto" },
              { value: "income", label: "Ingreso" },
              { value: "transfer", label: "Transferencia" }
            ] as const
          ).map((item) => (
            <button
              key={item.value}
              type="button"
              className={`rounded-full px-4 py-2.5 text-sm font-medium ${type === item.value ? "bg-card shadow-soft" : "text-muted-foreground"}`}
              onClick={() => form.setValue("type", item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <form
        className="space-y-5"
        onSubmit={form.handleSubmit((values) => {
          startTransition(async () => {
            const result = await saveTransactionAction(values);

            if (!result.ok) {
              toast.error(result.message);
              return;
            }

            toast.success(result.message);
            router.push("/transactions");
            router.refresh();
          });
        })}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Título" error={form.formState.errors.title?.message}>
            <Input
              placeholder={type === "transfer" ? "Ej: Aportación a NORA" : undefined}
              {...form.register("title")}
            />
          </FormField>
          <FormField label="Importe" error={form.formState.errors.amount?.message}>
            <Input type="number" step="0.01" inputMode="decimal" {...form.register("amount", { valueAsNumber: true })} />
          </FormField>
          <FormField label="Fecha" error={form.formState.errors.transactionDate?.message}>
            <Input type="date" {...form.register("transactionDate")} />
          </FormField>
          <FormField label={type === "transfer" ? "Cuenta de origen" : "Cuenta"} error={form.formState.errors.accountId?.message}>
            <Select {...form.register("accountId")}>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </FormField>

          {type === "transfer" ? (
            <FormField label="Cuenta de destino" error={form.formState.errors.destinationAccountId?.message}>
              <Select {...form.register("destinationAccountId")}>
                <option value="">Selecciona una cuenta</option>
                {destinationAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
            </FormField>
          ) : (
            <FormField label="Categoría" error={form.formState.errors.categoryId?.message}>
              <Select {...form.register("categoryId")}>
                <option value="">Sin categoría</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </FormField>
          )}

          {type !== "transfer" ? (
            <FormField label={type === "income" ? "Registrado por" : "Pagado por"} error={form.formState.errors.paidByUserId?.message}>
              <Select {...form.register("paidByUserId")}>
                <option value="">Selecciona una persona</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.label}
                  </option>
                ))}
              </Select>
            </FormField>
          ) : null}
        </div>

        <FormField label="Descripción" error={form.formState.errors.description?.message}>
          <Textarea
            rows={4}
            placeholder={
              type === "transfer"
                ? "Ej: Muevo dinero desde mi cuenta personal a la cuenta de NORA para cubrir gastos de empresa."
                : undefined
            }
            {...form.register("description")}
          />
        </FormField>

        {type === "expense" ? (
          <div className="space-y-4 rounded-[24px] border border-border bg-background/60 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold">Reparto</h3>
                <p className="text-sm text-muted-foreground">
                  El gasto original sigue siendo {formatCurrency(Number(amount || 0), form.getValues("currency"))}.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" {...form.register("isShared")} />
                Compartido
              </label>
            </div>
            <p className="text-sm text-muted-foreground">
              Márcalo solo si otra persona tiene que devolverte una parte. Si es un gasto solo tuyo, déjalo desactivado.
            </p>

            {isShared ? (
              <>
                <FormField label="Método de reparto" error={form.formState.errors.splitMethod?.message}>
                  <Select {...form.register("splitMethod")}>
                    <option value="equal">A partes iguales</option>
                    <option value="percentage">Porcentaje</option>
                    <option value="fixed">Importe fijo</option>
                  </Select>
                </FormField>
                <div className="space-y-3">
                  {splitFields.fields.map((field, index) => (
                    <div key={field.id} className="grid gap-3 rounded-2xl border border-border bg-card p-3 md:grid-cols-[1fr_160px_160px]">
                      <Select {...form.register(`splits.${index}.userId`)}>
                        {members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.label}
                          </option>
                        ))}
                      </Select>
                      <Input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        disabled={splitMethod === "equal"}
                        {...form.register(`splits.${index}.shareAmount`, { valueAsNumber: true })}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        disabled={splitMethod !== "percentage"}
                        {...form.register(`splits.${index}.sharePercent`, { valueAsNumber: true })}
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        {type === "transfer" ? (
          <div className="rounded-[24px] border border-border bg-background/60 p-4 text-sm text-muted-foreground">
            La transferencia resta saldo en la cuenta de origen y lo suma en la cuenta de destino. No cuenta como gasto
            ni como ingreso del hogar.
          </div>
        ) : null}

        <FormField label="Notas" error={form.formState.errors.note?.message}>
          <Textarea rows={3} {...form.register("note")} />
        </FormField>

        <div className="flex flex-col gap-3 border-t border-border pt-2 md:flex-row md:border-0 md:pt-0">
          <Button type="submit" disabled={isPending} className="w-full md:w-auto">
            Guardar movimiento
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()} className="w-full md:w-auto">
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
