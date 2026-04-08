import { redirect } from "next/navigation";

import { LoginForm } from "@/features/auth/login-form";
import { getAuthenticatedUser } from "@/lib/queries/auth-queries";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: { email?: string };
}) {
  const user = await getAuthenticatedUser();

  if (user) {
    redirect("/");
  }

  return <LoginForm initialEmail={searchParams?.email ?? ""} />;
}
