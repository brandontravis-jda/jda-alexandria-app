import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { migrate, upsertUser } from "./schema";

let migrated = false;

// Azure AD groups gate authentication only — not capabilities.
// Capabilities are determined by the permissions matrix (user_roles / permissions tables).
const GROUP_ADMINS  = "cba99ef2-0d00-4753-9f3d-89ded870cba1"; // Portal admin access
const GROUP_EDITORS = "c85b685b-17e4-4902-ac2a-39e27f585f08"; // Legacy: practice_leader role backfill
const GROUP_USERS   = "6864b47f-e09f-4faf-bde2-738c1ac014c4"; // All practitioners

// Returns auth tier for gating portal admin screens only (users/roles management).
// Do NOT use this for capability decisions — use the permissions matrix.
function authTierFromGroups(groups: string[]): "admin" | "practice_leader" | "practitioner" | null {
  if (groups.includes(GROUP_ADMINS))  return "admin";
  if (groups.includes(GROUP_EDITORS)) return "practice_leader";
  if (groups.includes(GROUP_USERS))   return "practitioner";
  return null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      issuer: `https://login.microsoftonline.com/${process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID}/v2.0`,
      authorization: {
        params: { scope: "openid profile email User.Read GroupMember.Read.All" },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const objectId = (profile as Record<string, unknown>).oid as string;
        token.objectId = objectId;

        // Fetch group membership from Microsoft Graph — used only for auth gating
        let authTier: "admin" | "practice_leader" | "practitioner" | null = null;
        if (account.access_token) {
          try {
            const groupsRes = await fetch(
              "https://graph.microsoft.com/v1.0/me/memberOf?$select=id",
              { headers: { Authorization: `Bearer ${account.access_token}` } }
            );
            if (groupsRes.ok) {
              const groupsData = await groupsRes.json() as { value: { id: string }[] };
              const groups = groupsData.value.map((g) => g.id);
              authTier = authTierFromGroups(groups);
            }
          } catch (e) {
            console.error("Failed to fetch groups for portal sign-in:", e);
          }
        }

        // Reject sign-in if not in any authorized group
        if (authTier === null) return null;

        token.tier = authTier;

        if (!migrated) {
          await migrate();
          migrated = true;
        }

        // upsertUser only sets tier on first creation — subsequent logins do not overwrite
        await upsertUser({
          objectId,
          email: token.email,
          name: token.name,
          tier: authTier,
        });
      }
      return token;
    },
    async session({ session, token }) {
      if (token.objectId) {
        session.user.id = token.objectId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
});
