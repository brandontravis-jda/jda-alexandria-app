"use server";

import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserByObjectId } from "@/lib/schema";

export async function signOutAction() {
  // Clear debug mode on all active MCP sessions before signing out,
  // so a fresh login always starts with owner bypass restored.
  try {
    const session = await auth();
    if (session?.user?.id) {
      const user = await getUserByObjectId(session.user.id);
      if (user) {
        await db`
          UPDATE oauth_sessions SET debug_role_id = NULL
          WHERE user_id = ${user.id as number} AND expires_at > NOW()
        `;
      }
    }
  } catch {
    // Non-fatal — proceed with sign-out regardless
  }

  await signOut({ redirectTo: "/sign-in" });
}
