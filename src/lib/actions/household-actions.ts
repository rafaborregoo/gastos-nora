"use server";

import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "@/lib/constants";
import {
  getAppUrl,
  createSupabaseAdminClient,
  hasSupabaseAdminEnv,
  hasSupabaseServiceRoleEnv
} from "@/lib/supabase/admin";
import { getAppContext } from "@/lib/queries/household-queries";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  householdSetupSchema,
  invitationMutationSchema,
  invitationSchema,
  memberMutationSchema
} from "@/lib/validators/onboarding";
import { errorResult, handleActionError, revalidateAppPaths, successResult, type ActionResult } from "@/lib/actions/shared";
import type { HouseholdBundle } from "@/types/database";
import type { User } from "@supabase/supabase-js";

type OwnerContextResult =
  | {
      user: User;
      householdBundle: HouseholdBundle;
    }
  | {
      error: ActionResult;
    };

async function seedDefaultCategories(householdId: string, userId: string) {
  const supabase = createServerSupabaseClient();
  const { count, error } = await supabase
    .from("categories")
    .select("id", { head: true, count: "exact" })
    .eq("household_id", householdId);

  if (error) {
    throw new Error(error.message);
  }

  if ((count ?? 0) > 0) {
    return;
  }

  const records = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES].map((category) => ({
    household_id: householdId,
    created_by: userId,
    name: category.name,
    kind: category.kind,
    color: category.color ?? null,
    icon: category.icon ?? null,
    is_system: true
  }));

  const { error: insertError } = await supabase.from("categories").insert(records);

  if (insertError) {
    throw new Error(insertError.message);
  }
}

async function createInvitationRecord(params: {
  householdId: string;
  email: string;
  invitedBy: string;
  sendEmail: boolean;
}) {
  const admin = createSupabaseAdminClient();
  const normalizedEmail = params.email.toLowerCase();

  const { data: existingInvitation, error: existingInvitationError } = await admin
    .from("household_invitations")
    .select("id, status")
    .eq("household_id", params.householdId)
    .eq("email", normalizedEmail)
    .in("status", ["pending", "sent"])
    .maybeSingle();

  if (existingInvitationError) {
    throw new Error(existingInvitationError.message);
  }

  if (existingInvitation) {
    return { wasCreated: false, status: existingInvitation.status as string };
  }

  const invitePayload = {
    household_id: params.householdId,
    email: normalizedEmail,
    role: "member",
    invited_by: params.invitedBy,
    status: params.sendEmail ? "sent" : "pending",
    send_email: params.sendEmail
  };

  const { error: invitationError } = await admin.from("household_invitations").insert(invitePayload);

  if (invitationError) {
    throw new Error(invitationError.message);
  }

  if (params.sendEmail) {
    const redirectTo = `${getAppUrl()}/accept-invite?email=${encodeURIComponent(normalizedEmail)}`;
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
      redirectTo,
      data: {
        invited_to_household: params.householdId
      }
    });

    if (inviteError) {
      throw new Error(inviteError.message);
    }
  }

  return { wasCreated: true, status: params.sendEmail ? "sent" : "pending" };
}

async function requireOwnerContext(): Promise<OwnerContextResult> {
  const { user, householdBundle } = await getAppContext();

  if (!user || !householdBundle) {
    return { error: errorResult("No hay un hogar activo.") } as const;
  }

  if (householdBundle.household.owner_user_id !== user.id) {
    return { error: errorResult("Solo la persona propietaria puede gestionar miembros e invitaciones.") } as const;
  }

  return { user, householdBundle } as const;
}

export async function createHouseholdAction(values: unknown): Promise<ActionResult<{ householdId: string }>> {
  try {
    const parsed = householdSetupSchema.parse(values);
    const { user, profile } = await getAppContext();

    if (!user || !profile) {
      return errorResult("Debes iniciar sesión.");
    }

    const supabase = createServerSupabaseClient();
    const persistedProfile = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();

    if (persistedProfile.error) {
      return errorResult(persistedProfile.error.message);
    }

    if (!persistedProfile.data) {
      return errorResult(
        "Falta tu fila en public.profiles. Con tu RLS actual la app no puede crearla. Ejecuta el SQL de sincronización auth.users -> public.profiles o añade una policy/trigger antes de crear el hogar."
      );
    }

    const normalizedInviteEmail = parsed.addMemberEmail?.toLowerCase() || "";
    const existingProfile =
      normalizedInviteEmail
        ? await supabase.from("profiles").select("id").eq("email", normalizedInviteEmail).maybeSingle()
        : null;

    if (existingProfile?.error) {
      return errorResult(existingProfile.error.message);
    }

    if (normalizedInviteEmail && !existingProfile?.data && !hasSupabaseAdminEnv()) {
      return errorResult(
        "Para guardar invitaciones pendientes o enviar correos necesitas APP_URL y SUPABASE_SERVICE_ROLE_KEY en el servidor."
      );
    }

    const { data: household, error: householdError } = await supabase
      .from("households")
      .insert({
        name: parsed.householdName,
        owner_user_id: user.id
      })
      .select("*")
      .single();

    if (householdError) {
      return errorResult(householdError.message);
    }

    const householdId = household.id as string;
    const { error: memberError } = await supabase.from("household_members").insert({
      household_id: householdId,
      user_id: user.id,
      role: "owner",
      status: "active"
    });

    if (memberError) {
      return errorResult(memberError.message);
    }

    const accounts = parsed.accounts.map((account) => ({
      household_id: householdId,
      owner_user_id: account.type === "shared" ? null : account.ownerUserId ?? user.id,
      name: account.name,
      type: account.type,
      currency: "EUR",
      is_active: true
    }));

    const { error: accountError } = await supabase.from("accounts").insert(accounts);

    if (accountError) {
      return errorResult(accountError.message);
    }

    let invitationMessage = "";

    if (normalizedInviteEmail) {
      if (existingProfile?.data?.id && existingProfile.data.id !== user.id) {
        const existingMember = await supabase
          .from("household_members")
          .select("id")
          .eq("household_id", householdId)
          .eq("user_id", existingProfile.data.id as string)
          .maybeSingle();

        if (existingMember.error) {
          return errorResult(existingMember.error.message);
        }

        if (!existingMember.data) {
          const { error: invitedMemberError } = await supabase.from("household_members").insert({
            household_id: householdId,
            user_id: existingProfile.data.id as string,
            role: "member",
            status: "active"
          });

          if (invitedMemberError) {
            return errorResult(invitedMemberError.message);
          }
        }

        invitationMessage = " La persona invitada ya estaba registrada y se ha añadido al hogar.";
      } else {
        try {
          const invitation = await createInvitationRecord({
            householdId,
            email: normalizedInviteEmail,
            invitedBy: user.id,
            sendEmail: parsed.sendInviteEmail ?? false
          });

          invitationMessage =
            invitation.status === "sent"
              ? " Se ha creado la invitación y se ha enviado el correo."
              : " Se ha creado la invitación pendiente sin enviar correo.";
        } catch (invitationError) {
          invitationMessage =
            invitationError instanceof Error
              ? ` El hogar se ha creado, pero la invitación no se pudo completar: ${invitationError.message}`
              : " El hogar se ha creado, pero la invitación no se pudo completar.";
        }
      }
    }

    await seedDefaultCategories(householdId, user.id);
    revalidateAppPaths();

    return successResult(`Hogar creado correctamente.${invitationMessage}`, { householdId });
  } catch (error) {
    return handleActionError(error);
  }
}

export async function addHouseholdMemberAction(values: unknown): Promise<ActionResult> {
  try {
    const parsed = invitationSchema.parse(values);
    const ownerContext = await requireOwnerContext();

    if ("error" in ownerContext) {
      return ownerContext.error;
    }

    const { user, householdBundle } = ownerContext;

    const supabase = createServerSupabaseClient();
    const normalizedEmail = parsed.email.toLowerCase();
    const { data: memberProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (profileError) {
      return errorResult(profileError.message);
    }

    if (memberProfile) {
      const existingMember = await supabase
        .from("household_members")
        .select("id")
        .eq("household_id", householdBundle.household.id)
        .eq("user_id", memberProfile.id as string)
        .maybeSingle();

      if (existingMember.error) {
        return errorResult(existingMember.error.message);
      }

      const mutation = existingMember.data
        ? supabase
            .from("household_members")
            .update({ status: "active", role: "member" })
            .eq("id", existingMember.data.id as string)
        : supabase.from("household_members").insert({
            household_id: householdBundle.household.id,
            user_id: memberProfile.id as string,
            role: "member",
            status: "active"
          });
      const { error } = await mutation;

      if (error) {
        return errorResult(error.message);
      }

      revalidateAppPaths();
      return successResult("Miembro añadido al hogar.");
    }

    if (!hasSupabaseAdminEnv()) {
      return errorResult(
        "Para invitar por email necesitas APP_URL y SUPABASE_SERVICE_ROLE_KEY en el servidor."
      );
    }

    const invitation = await createInvitationRecord({
      householdId: householdBundle.household.id,
      email: normalizedEmail,
      invitedBy: user.id,
      sendEmail: parsed.sendEmail
    });

    revalidateAppPaths();
    return successResult(
      invitation.status === "sent"
        ? "Invitación creada y correo enviado."
        : "Invitación pendiente creada sin enviar correo."
    );
  } catch (error) {
    return handleActionError(error);
  }
}

export async function removeHouseholdMemberAction(values: unknown): Promise<ActionResult> {
  try {
    const parsed = memberMutationSchema.parse(values);
    const ownerContext = await requireOwnerContext();

    if ("error" in ownerContext) {
      return ownerContext.error;
    }

    if (!hasSupabaseServiceRoleEnv()) {
      return errorResult("Para eliminar miembros necesitas SUPABASE_SERVICE_ROLE_KEY en el servidor.");
    }

    const { user, householdBundle } = ownerContext;
    const admin = createSupabaseAdminClient();
    const { data: member, error } = await admin
      .from("household_members")
      .select("id, user_id, role, household_id")
      .eq("id", parsed.memberId)
      .eq("household_id", householdBundle.household.id)
      .maybeSingle();

    if (error) {
      return errorResult(error.message);
    }

    if (!member) {
      return errorResult("Ese miembro ya no existe en el hogar activo.");
    }

    if (member.user_id === user.id || member.role === "owner") {
      return errorResult("No puedes eliminar a la persona propietaria del hogar.");
    }

    const deleteResponse = await admin.from("household_members").delete().eq("id", parsed.memberId);

    if (deleteResponse.error) {
      return errorResult(deleteResponse.error.message);
    }

    revalidateAppPaths();
    return successResult("Miembro eliminado del hogar.");
  } catch (error) {
    return handleActionError(error);
  }
}

export async function revokeHouseholdInvitationAction(values: unknown): Promise<ActionResult> {
  try {
    const parsed = invitationMutationSchema.parse(values);
    const ownerContext = await requireOwnerContext();

    if ("error" in ownerContext) {
      return ownerContext.error;
    }

    if (!hasSupabaseServiceRoleEnv()) {
      return errorResult("Para gestionar invitaciones necesitas SUPABASE_SERVICE_ROLE_KEY en el servidor.");
    }

    const { householdBundle } = ownerContext;
    const admin = createSupabaseAdminClient();
    const { data: invitation, error } = await admin
      .from("household_invitations")
      .select("id, status")
      .eq("id", parsed.invitationId)
      .eq("household_id", householdBundle.household.id)
      .maybeSingle();

    if (error) {
      return errorResult(error.message);
    }

    if (!invitation) {
      return errorResult("La invitación ya no existe o no pertenece al hogar activo.");
    }

    const { error: updateError } = await admin
      .from("household_invitations")
      .update({
        status: "revoked",
        updated_at: new Date().toISOString()
      })
      .eq("id", parsed.invitationId);

    if (updateError) {
      return errorResult(updateError.message);
    }

    revalidateAppPaths();
    return successResult(invitation.status === "revoked" ? "La invitación ya estaba revocada." : "Invitación revocada.");
  } catch (error) {
    return handleActionError(error);
  }
}
