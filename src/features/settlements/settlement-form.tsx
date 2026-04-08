"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createSettlementAction } from "@/lib/actions/transaction-actions";
import { toDateInputValue } from "@/lib/utils";
import { settlementSchema } from "@/lib/validators/transactions";
import type { SettlementFormValues } from "@/types/forms";

export function SettlementForm({
  members,
  transactionId,
  defaultFromUserId,
  defaultToUserId
}: {
  members: Array<{ id: string; label: string }>;
  transactionId?: string;
  defaultFromUserId?: string;
  defaultToUserId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<SettlementFormValues>({
    resolver: zodResolver(settlementSchema),
    defaultValues: {
      transactionId,
      fromUserId: defaultFromUserId ?? members[0]?.id ?? "",
      toUserId: defaultToUserId ?? members[1]?.id ?? members[0]?.id ?? "",
      amount: 0,
      currency: "EUR",
      settlementDate: toDateInputValue(new Date()),
      method: "bizum",
      note: ""
    }
  });

  return (
    <Card className="p-6">
      <div className="mb-6 space-y-2">
        <CardTitle>Nueva liquidación</CardTitle>
        <CardDescription>Registra Bizums o pagos posteriores sin tocar el gasto original.</CardDescription>
      </div>
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((values) => {
          startTransition(async () => {
            const result = await createSettlementAction(values);

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
          <FormField label="Paga" error={form.formState.errors.fromUserId?.message}>
            <Select {...form.register("fromUserId")}>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Recibe" error={form.formState.errors.toUserId?.message}>
            <Select {...form.register("toUserId")}>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Importe" error={form.formState.errors.amount?.message}>
            <Input type="number" step="0.01" inputMode="decimal" {...form.register("amount", { valueAsNumber: true })} />
          </FormField>
          <FormField label="Fecha" error={form.formState.errors.settlementDate?.message}>
            <Input type="date" {...form.register("settlementDate")} />
          </FormField>
          <FormField label="Método" error={form.formState.errors.method?.message}>
            <Select {...form.register("method")}>
              <option value="bizum">Bizum</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Transferencia</option>
              <option value="card">Tarjeta</option>
              <option value="other">Otro</option>
            </Select>
          </FormField>
        </div>
        <FormField label="Nota" error={form.formState.errors.note?.message}>
          <Textarea rows={3} {...form.register("note")} />
        </FormField>
        <div className="flex flex-col gap-3 md:flex-row">
          <Button type="submit" disabled={isPending}>
            Registrar liquidación
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}

