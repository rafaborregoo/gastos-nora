"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { setActiveHouseholdAction } from "@/lib/actions/household-actions";

export function HouseholdSwitcher({
  households,
  activeHouseholdId
}: {
  households: Array<{ id: string; name: string; memberCount: number }>;
  activeHouseholdId?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Hogar activo</h2>
        <p className="text-sm text-muted-foreground">
          Elige en qué hogar quieres ver cuentas, gastos, balances e invitaciones.
        </p>
      </div>
      <FormField label="Hogar">
        <Select
          value={activeHouseholdId ?? households[0]?.id ?? ""}
          disabled={isPending || households.length <= 1}
          onChange={(event) => {
            const nextHouseholdId = event.target.value;
            startTransition(async () => {
              const result = await setActiveHouseholdAction(nextHouseholdId);

              if (!result.ok) {
                toast.error(result.message);
                return;
              }

              toast.success(result.message);
              router.refresh();
            });
          }}
        >
          {households.map((household) => (
            <option key={household.id} value={household.id}>
              {household.name} ({household.memberCount})
            </option>
          ))}
        </Select>
      </FormField>
    </Card>
  );
}
