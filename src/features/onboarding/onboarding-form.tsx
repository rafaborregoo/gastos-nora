"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createHouseholdAction } from "@/lib/actions/household-actions";
import { householdSetupSchema } from "@/lib/validators/onboarding";
import type { HouseholdSetupValues } from "@/types/forms";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function OnboardingForm({ userId, userName }: { userId: string; userName: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<HouseholdSetupValues>({
    resolver: zodResolver(householdSetupSchema),
    defaultValues: {
      householdName: `${userName} y casa`,
      addMemberEmail: "",
      sendInviteEmail: true,
      accounts: [
        { name: "Cuenta personal", type: "personal", ownerUserId: userId },
        { name: "Cuenta compartida", type: "shared", ownerUserId: null }
      ]
    }
  });
  const accounts = useFieldArray({
    control: form.control,
    name: "accounts"
  });
  const hasInviteEmail = Boolean(form.watch("addMemberEmail"));

  return (
    <Card className="w-full p-8">
      <div className="mb-6 space-y-2">
        <CardTitle>Configura tu hogar</CardTitle>
        <CardDescription>
          Crea el espacio compartido, guarda una invitación pendiente y decide si quieres enviar el correo ahora o no.
        </CardDescription>
      </div>
      <form
        className="space-y-6"
        onSubmit={form.handleSubmit((values) => {
          startTransition(async () => {
            const result = await createHouseholdAction(values);

            if (!result.ok) {
              toast.error(result.message);
              return;
            }

            toast.success(result.message);
            router.replace("/");
            router.refresh();
          });
        })}
      >
        <FormField label="Nombre del hogar" error={form.formState.errors.householdName?.message}>
          <Input {...form.register("householdName")} />
        </FormField>

        <div className="space-y-3 rounded-[24px] border border-border bg-background/60 p-4">
          <FormField label="Email de otra persona (opcional)" error={form.formState.errors.addMemberEmail?.message}>
            <Input type="email" placeholder="pareja@email.com" {...form.register("addMemberEmail")} />
          </FormField>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" className="h-4 w-4" {...form.register("sendInviteEmail")} disabled={!hasInviteEmail} />
            Enviar correo de invitación si todavía no tiene cuenta
          </label>
          <p className="text-xs text-muted-foreground">
            Si no marcas esta opción, se guarda la invitación pendiente y podrás reenviarla más tarde desde Ajustes.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Cuentas iniciales</h3>
              <p className="text-sm text-muted-foreground">Crea cuentas personales o compartidas.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => accounts.append({ name: "", type: "bank", ownerUserId: null })}
            >
              <Plus className="h-4 w-4" />
              Añadir
            </Button>
          </div>
          <div className="space-y-3">
            {accounts.fields.map((field, index) => (
              <div key={field.id} className="grid gap-3 rounded-2xl border border-border bg-background/60 p-4 md:grid-cols-[1.4fr_0.8fr_auto]">
                <Input placeholder="Nombre" {...form.register(`accounts.${index}.name`)} />
                <Select {...form.register(`accounts.${index}.type`)}>
                  <option value="personal">Personal</option>
                  <option value="shared">Compartida</option>
                  <option value="cash">Efectivo</option>
                  <option value="bank">Banco</option>
                  <option value="savings">Ahorro</option>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={accounts.fields.length <= 1}
                  onClick={() => accounts.remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" className="w-full md:w-auto" disabled={isPending}>
          Crear hogar
        </Button>
      </form>
    </Card>
  );
}
