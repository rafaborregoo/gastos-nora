import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { MemberManager } from "@/features/settings/member-manager";
import { ThemeManager } from "@/features/settings/theme-manager";
import { isAiThemeGenerationEnabled } from "@/lib/openai";
import { getAuthenticatedUser } from "@/lib/queries/auth-queries";
import { getCurrentHouseholdBundle } from "@/lib/queries/household-queries";
import { getCurrentHouseholdInvitations } from "@/lib/queries/invitation-queries";
import { getCurrentUserThemePreference } from "@/lib/queries/theme-queries";

export default async function SettingsPage() {
  const [householdBundle, invitations, themePreference, user] = await Promise.all([
    getCurrentHouseholdBundle(),
    getCurrentHouseholdInvitations(),
    getCurrentUserThemePreference(),
    getAuthenticatedUser()
  ]);
  const members =
    householdBundle?.members.map((member) => ({
      id: member.id,
      userId: member.user_id,
      label: member.profile?.full_name ?? member.profile?.email ?? member.user_id,
      email: member.profile?.email,
      role: member.role
    })) ?? [];
  const isOwner = householdBundle?.household.owner_user_id === user?.id;

  return (
    <div className="space-y-6">
      <PageHeader title="Ajustes" description="Configuracion del espacio activo, miembros y supuestos tecnicos visibles." />
      <Card className="space-y-2">
        <h2 className="text-lg font-semibold">Supuesto actual de household</h2>
        <p className="text-sm text-muted-foreground">
          Si un usuario pertenece a mas de un household, NORA Gastos usa el primer membership activo por fecha de creacion.
        </p>
      </Card>
      <ThemeManager
        themePreference={themePreference}
        aiThemeGenerationEnabled={isAiThemeGenerationEnabled()}
      />
      <MemberManager members={members} invitations={invitations} isOwner={Boolean(isOwner)} currentUserId={user?.id} />
    </div>
  );
}
