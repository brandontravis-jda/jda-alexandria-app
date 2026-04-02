import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { migrate, upsertUser } from "./schema";

let migrated = false;

// Alexandria-Users is the single gate for authentication.
// All authorization (account_type, roles, permissions) is managed inside the app.
const GROUP_USERS = "6864b47f-e09f-4faf-bde2-738c1ac014c4"; // Alexandria-Users

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      issuer: `https://login.microsoftonline.com/${process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID}/v2.0`,
      authorization: {
        params: {
          scope: "openid profile email User.Read GroupMember.Read.All",
          prompt: "select_account",
        },
      },
    }),
  ],
  callbacks: {
    // signIn runs before jwt — returning false triggers the AccessDenied error page redirect
    async signIn({ account, profile }) {
      if (!account?.access_token || !profile) return false;

      try {
        const groupsRes = await fetch(
          "https://graph.microsoft.com/v1.0/me/memberOf?$select=id",
          { headers: { Authorization: `Bearer ${account.access_token}` } }
        );
        if (!groupsRes.ok) return false;
        const groupsData = await groupsRes.json() as { value: { id: string }[] };
        const groups = groupsData.value.map((g) => g.id);
        if (!groups.includes(GROUP_USERS)) return false;
      } catch (e) {
        console.error("Failed to fetch groups for portal sign-in:", e);
        return false;
      }

      return true;
    },

    async jwt({ token, account, profile }) {
      if (account && profile) {
        const objectId = (profile as Record<string, unknown>).oid as string;
        token.objectId = objectId;

        if (!migrated) {
          await migrate();
          migrated = true;
        }

        await upsertUser({
          objectId,
          email: token.email,
          name: token.name,
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
