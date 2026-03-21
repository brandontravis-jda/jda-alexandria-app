import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { migrate, upsertUser } from "./schema";

let migrated = false;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      tenantId: process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID!,
      issuer: `https://login.microsoftonline.com/${process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID}/v2.0`,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const objectId = (profile as Record<string, unknown>).oid as string;
        token.objectId = objectId;

        // Run migrations once, then upsert the user record
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
