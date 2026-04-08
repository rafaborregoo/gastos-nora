import { redirect } from "next/navigation";

import { RegisterForm } from "@/features/auth/register-form";
import { getAuthenticatedUser } from "@/lib/queries/auth-queries";

export default async function RegisterPage({
  searchParams
}: {
  searchParams?: { email?: string; invite?: string };
}) {
  const user = await getAuthenticatedUser();

  if (user) {
    redirect("/");
  }

  return <RegisterForm initialEmail={searchParams?.email ?? ""} inviteFlow={searchParams?.invite === "1"} />;
}
