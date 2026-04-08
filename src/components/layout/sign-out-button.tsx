"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

import { signOutAction } from "@/lib/actions/auth-actions";
import { Button, type ButtonProps } from "@/components/ui/button";

export function SignOutButton(props: ButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      {...props}
      disabled={isPending || props.disabled}
      onClick={() => {
        startTransition(async () => {
          const result = await signOutAction();

          if (!result.ok) {
            toast.error(result.message);
            return;
          }

          toast.success(result.message);
          router.replace("/login");
          router.refresh();
        });
      }}
    >
      <LogOut className="h-4 w-4" />
      Salir
    </Button>
  );
}

