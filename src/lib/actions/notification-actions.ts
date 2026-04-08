"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { errorResult, handleActionError, revalidateAppPaths, successResult, type ActionResult } from "@/lib/actions/shared";

export async function markNotificationAsReadAction(notificationId: string): Promise<ActionResult> {
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);

    if (error) {
      return errorResult(error.message);
    }

    revalidateAppPaths();
    return successResult("Notificación marcada como leída.");
  } catch (error) {
    return handleActionError(error);
  }
}

