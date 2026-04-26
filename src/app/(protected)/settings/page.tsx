import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { HouseholdSwitcher } from "@/features/settings/household-switcher";
import { MemberManager } from "@/features/settings/member-manager";
import { ThemeManager } from "@/features/settings/theme-manager";
import { isAiThemeGenerationEnabled } from "@/lib/openai";
import { getAuthenticatedUser } from "@/lib/queries/auth-queries";
import { getCurrentHouseholdBundle, getUserHouseholdBundles } from "@/lib/queries/household-queries";
import { getCurrentHouseholdInvitations } from "@/lib/queries/invitation-queries";
import { getCurrentUserThemePreference } from "@/lib/queries/theme-queries";

export default async function SettingsPage() {
  const [householdBundle, householdBundles, invitations, themePreference, user] = await Promise.all([
    getCurrentHouseholdBundle(),
    getUserHouseholdBundles(),
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
      <PageHeader title="Ajustes" description="Configuración del hogar activo, miembros y personalización visual." />
      {householdBundles.length ? (
        <HouseholdSwitcher
          activeHouseholdId={householdBundle?.household.id}
          households={householdBundles.map((bundle) => ({
            id: bundle.household.id,
            name: bundle.household.name,
            memberCount: bundle.members.length
          }))}
        />
      ) : (
        <Card className="space-y-2">
          <h2 className="text-lg font-semibold">Hogar activo</h2>
          <p className="text-sm text-muted-foreground">Todavía no tienes un hogar activo.</p>
        </Card>
      )}
      <ThemeManager themePreference={themePreference} aiThemeGenerationEnabled={isAiThemeGenerationEnabled()} />
      <MemberManager members={members} invitations={invitations} isOwner={Boolean(isOwner)} currentUserId={user?.id} />
    </div>
  );
}
