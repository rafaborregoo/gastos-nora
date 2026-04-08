import { redirect } from "next/navigation";

import { OnboardingForm } from "@/features/onboarding/onboarding-form";
import { getAppContext } from "@/lib/queries/household-queries";

export default async function OnboardingPage() {
  const { user, profile, householdBundle } = await getAppContext();

  if (!user || !profile) {
    redirect("/login");
  }

  if (householdBundle) {
    redirect("/");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10">
      <OnboardingForm userId={user.id} userName={profile.full_name ?? profile.email ?? "Tu hogar"} />
    </main>
  );
}

