"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  addHouseholdMemberAction,
  removeHouseholdMemberAction,
  revokeHouseholdInvitationAction
} from "@/lib/actions/household-actions";
import type { HouseholdInvitation } from "@/types/database";

export function MemberManager({
  members,
  invitations,
  isOwner,
  currentUserId
}: {
  members: Array<{ id: string; userId: string; label: string; email?: string | null; role: string }>;
  invitations: HouseholdInvitation[];
  isOwner: boolean;
  currentUserId?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      {isOwner ? (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold">Invitar a una persona</h2>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 md:flex-row">
              <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="persona@email.com" type="email" />
              <Button
                disabled={isPending || !email}
                onClick={() => {
                  startTransition(async () => {
                    const result = await addHouseholdMemberAction({ email, sendEmail });

                    if (!result.ok) {
                      toast.error(result.message);
                      return;
                    }

                    toast.success(result.message);
                    setEmail("");
                    router.refresh();
                  });
                }}
              >
                Guardar invitación
              </Button>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4" checked={sendEmail} onChange={(event) => setSendEmail(event.target.checked)} />
              Enviar correo ahora si la persona aún no tiene cuenta
            </label>
          </div>
        </Card>
      ) : (
        <Card className="space-y-2">
          <h2 className="text-lg font-semibold">Gestión del hogar</h2>
          <p className="text-sm text-muted-foreground">
            Solo la persona que ha creado el hogar puede invitar, eliminar miembros o revocar invitaciones.
          </p>
        </Card>
      )}

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Miembros del hogar</h2>
        <div className="space-y-3">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
              <div>
                <p className="font-medium">{member.label}</p>
                <p className="text-sm text-muted-foreground">{member.email ?? "Sin correo visible"}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{member.role}</span>
                {isOwner && member.role !== "owner" && member.userId !== currentUserId ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        const result = await removeHouseholdMemberAction({ memberId: member.id });

                        if (!result.ok) {
                          toast.error(result.message);
                          return;
                        }

                        toast.success(result.message);
                        router.refresh();
                      });
                    }}
                  >
                    Eliminar
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Invitaciones pendientes</h2>
        <div className="space-y-3">
          {invitations.length ? (
            invitations.map((invitation) => (
              <div key={invitation.id} className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
                <div>
                  <p className="font-medium">{invitation.email}</p>
                  <p className="text-sm text-muted-foreground">
                    Estado: {invitation.status} · correo {invitation.send_email ? "activado" : "no enviado"}
                  </p>
                </div>
                {isOwner && invitation.status !== "accepted" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        const result = await revokeHouseholdInvitationAction({ invitationId: invitation.id });

                        if (!result.ok) {
                          toast.error(result.message);
                          return;
                        }

                        toast.success(result.message);
                        router.refresh();
                      });
                    }}
                  >
                    Revocar
                  </Button>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No hay invitaciones pendientes ahora mismo.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
