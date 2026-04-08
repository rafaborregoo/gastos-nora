"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { deleteAccountAction, toggleAccountActiveAction, upsertAccountAction } from "@/lib/actions/catalog-actions";
import { formatCurrency } from "@/lib/formatters/currency";
import { accountSchema } from "@/lib/validators/accounts";
import type { AccountWithDetails } from "@/types/database";
import type { AccountFormValues } from "@/types/forms";

interface MemberOption {
  id: string;
  label: string;
}

function getDefaultValues(members: MemberOption[], account?: AccountWithDetails | null): AccountFormValues {
  const primaryMemberId = members[0]?.id ?? null;

  return {
    id: account?.id,
    name: account?.name ?? "",
    type: account?.type ?? "bank",
    ownerUserId: account?.owner_user_id ?? primaryMemberId,
    memberUserIds:
      account?.members.map((member) => member.user_id) ??
      (primaryMemberId ? [primaryMemberId] : []),
    currency: account?.currency ?? "EUR",
    initialBalance: account?.opening_balance ?? 0
  };
}

export function AccountManager({
  accounts,
  members
}: {
  accounts: AccountWithDetails[];
  members: MemberOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const editingAccount = useMemo(
    () => accounts.find((account) => account.id === editingAccountId) ?? null,
    [accounts, editingAccountId]
  );
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: getDefaultValues(members)
  });
  const selectedType = useWatch({ control: form.control, name: "type" });
  const selectedOwnerId = useWatch({ control: form.control, name: "ownerUserId" });
  const watchedMemberIds = useWatch({ control: form.control, name: "memberUserIds" });
  const selectedMemberIds = useMemo(() => watchedMemberIds ?? [], [watchedMemberIds]);

  useEffect(() => {
    form.reset(getDefaultValues(members, editingAccount));
  }, [editingAccount, form, members]);

  useEffect(() => {
    if (selectedType === "shared") {
      if (!selectedMemberIds.length && members.length) {
        form.setValue(
          "memberUserIds",
          members.map((member) => member.id),
          { shouldDirty: true }
        );
      }

      if (selectedOwnerId !== null) {
        form.setValue("ownerUserId", null, { shouldDirty: true });
      }
      return;
    }

    if (selectedOwnerId && !selectedMemberIds.includes(selectedOwnerId)) {
      const nextMembers = Array.from(new Set([selectedOwnerId, ...selectedMemberIds]));
      form.setValue("memberUserIds", nextMembers, { shouldDirty: true });
    }
  }, [form, members, selectedMemberIds, selectedOwnerId, selectedType]);

  const resetForm = () => {
    setEditingAccountId(null);
    form.reset(getDefaultValues(members));
  };

  const toggleMember = (memberId: string) => {
    const current = new Set(form.getValues("memberUserIds") ?? []);

    if (current.has(memberId)) {
      current.delete(memberId);
    } else {
      current.add(memberId);
    }

    form.setValue("memberUserIds", [...current], { shouldDirty: true, shouldValidate: true });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{editingAccount ? "Editar cuenta" : "Nueva cuenta"}</h2>
            <p className="text-sm text-muted-foreground">
              El saldo inicial se guarda como un movimiento de apertura, no como un número aislado.
            </p>
          </div>
          {editingAccount ? (
            <Button type="button" variant="outline" size="sm" onClick={resetForm}>
              Nueva
            </Button>
          ) : null}
        </div>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => {
            startTransition(async () => {
              const result = await upsertAccountAction(values);

              if (!result.ok) {
                toast.error(result.message);
                return;
              }

              toast.success(result.message);
              resetForm();
              router.refresh();
            });
          })}
        >
          <FormField label="Nombre" error={form.formState.errors.name?.message}>
            <Input {...form.register("name")} />
          </FormField>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Tipo" error={form.formState.errors.type?.message}>
              <Select {...form.register("type")}>
                <option value="personal">Personal</option>
                <option value="shared">Compartida</option>
                <option value="cash">Efectivo</option>
                <option value="bank">Banco</option>
                <option value="savings">Ahorro</option>
              </Select>
            </FormField>
            <FormField label="Moneda" error={form.formState.errors.currency?.message}>
              <Input maxLength={3} {...form.register("currency")} />
            </FormField>
          </div>
          {selectedType !== "shared" ? (
            <FormField label="Titular principal" error={form.formState.errors.ownerUserId?.message}>
              <Select {...form.register("ownerUserId")}>
                <option value="">Selecciona a una persona</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.label}
                  </option>
                ))}
              </Select>
            </FormField>
          ) : null}
          <FormField label="Saldo inicial" error={form.formState.errors.initialBalance?.message}>
            <Input
              type="number"
              step="0.01"
              inputMode="decimal"
              {...form.register("initialBalance", { valueAsNumber: true })}
            />
          </FormField>
          <FormField label="Personas vinculadas" error={form.formState.errors.memberUserIds?.message as string | undefined}>
            <div className="space-y-2 rounded-[24px] border border-border bg-background/70 p-3">
              {members.map((member) => {
                const checked =
                  selectedType === "shared"
                    ? selectedMemberIds.includes(member.id)
                    : member.id === selectedOwnerId || selectedMemberIds.includes(member.id);

                return (
                  <label key={member.id} className="flex items-center justify-between gap-3 rounded-2xl bg-card px-3 py-2">
                    <span className="text-sm">{member.label}</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={checked}
                      disabled={selectedType !== "shared" && member.id === selectedOwnerId}
                      onChange={() => toggleMember(member.id)}
                    />
                  </label>
                );
              })}
            </div>
          </FormField>
          <div className="flex flex-col gap-3 md:flex-row">
            <Button type="submit" disabled={isPending}>
              {editingAccount ? "Guardar cambios" : "Guardar cuenta"}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm}>
              Limpiar
            </Button>
          </div>
        </form>
      </Card>
      <div className="space-y-4">
        {accounts.map((account) => (
          <Card key={account.id} className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{account.name}</p>
                  <Badge intent={account.is_active ? "success" : "neutral"}>
                    {account.is_active ? "Activa" : "Archivada"}
                  </Badge>
                  <Badge>{account.type}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{account.currency}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingAccountId(account.id)}>
                  Editar
                </Button>
                <Button
                  type="button"
                  variant={account.is_active ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => {
                    startTransition(async () => {
                      const result = await toggleAccountActiveAction(account.id, !account.is_active);

                      if (!result.ok) {
                        toast.error(result.message);
                        return;
                      }

                      toast.success(result.message);
                      router.refresh();
                    });
                  }}
                >
                  {account.is_active ? "Archivar" : "Reactivar"}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={isPending}
                  onClick={() => {
                    const confirmed = window.confirm(
                      "Solo se puede borrar una cuenta sin movimientos reales. Si ya tiene historial, tendrás que archivarla. ¿Quieres continuar?"
                    );

                    if (!confirmed) {
                      return;
                    }

                    startTransition(async () => {
                      const result = await deleteAccountAction(account.id);

                      if (!result.ok) {
                        toast.error(result.message);
                        return;
                      }

                      if (editingAccountId === account.id) {
                        resetForm();
                      }

                      toast.success(result.message);
                      router.refresh();
                    });
                  }}
                >
                  Borrar
                </Button>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-border bg-background/70 p-4">
                <p className="text-sm text-muted-foreground">Saldo actual</p>
                <p className="mt-1 text-2xl font-semibold">{formatCurrency(account.current_balance, account.currency)}</p>
              </div>
              <div className="rounded-[24px] border border-border bg-background/70 p-4">
                <p className="text-sm text-muted-foreground">Saldo inicial</p>
                <p className="mt-1 text-2xl font-semibold">{formatCurrency(account.opening_balance, account.currency)}</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Personas vinculadas</p>
              <div className="flex flex-wrap gap-2">
                {account.members.length ? (
                  account.members.map((member) => (
                    <Badge key={`${account.id}-${member.user_id}`} intent="info">
                      {member.profile?.full_name ?? member.profile?.email ?? member.user_id}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">Sin personas vinculadas todavía.</span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
