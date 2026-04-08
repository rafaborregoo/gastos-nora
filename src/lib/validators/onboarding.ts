import { z } from "zod";

export const accountSetupSchema = z.object({
  name: z.string().min(2, "El nombre de la cuenta es obligatorio."),
  type: z.enum(["personal", "shared", "cash", "bank", "savings"]),
  ownerUserId: z.string().uuid().nullable().optional()
});

export const householdSetupSchema = z.object({
  householdName: z.string().min(2, "El nombre del hogar es obligatorio."),
  addMemberEmail: z.string().email("Introduce un email valido.").optional().or(z.literal("")),
  sendInviteEmail: z.boolean().optional().default(false),
  accounts: z.array(accountSetupSchema).min(1, "Debes crear al menos una cuenta inicial.")
});

export const invitationSchema = z.object({
  email: z.string().email("Introduce un email valido."),
  sendEmail: z.boolean().optional().default(false)
});

export const memberMutationSchema = z.object({
  memberId: z.string().uuid("Miembro invalido.")
});

export const invitationMutationSchema = z.object({
  invitationId: z.string().uuid("Invitacion invalida.")
});
