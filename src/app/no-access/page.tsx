import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/sign-out/actions";

export default async function NoAccessPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const firstName = session.user.name?.split(/\s+/)[0] ?? "there";

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--color-jda-bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "520px",
        background: "var(--color-jda-bg-card)",
        border: "1px solid var(--color-jda-border)",
        borderRadius: "10px",
        padding: "40px",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
          <div style={{
            width: "40px",
            height: "40px",
            borderRadius: "6px",
            background: "var(--color-jda-red)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontSize: "14px",
            color: "white",
            letterSpacing: "-0.5px",
            flexShrink: 0,
          }}>
            JDA
          </div>
          <div>
            <div style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "20px",
              letterSpacing: "0.12em",
              color: "var(--color-jda-cream)",
              lineHeight: 1,
            }}>
              ALEXANDRIA
            </div>
            <div style={{
              fontFamily: "var(--font-display)",
              fontSize: "11px",
              letterSpacing: "0.2em",
              color: "var(--color-jda-warm-gray)",
              textTransform: "uppercase",
              marginTop: "3px",
              lineHeight: 1,
            }}>
              AI-Native Operations
            </div>
          </div>
        </div>

        <div style={{
          fontFamily: "var(--font-display)",
          fontWeight: 900,
          fontSize: "22px",
          color: "var(--color-jda-cream)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "20px",
        }}>
          Welcome to Alexandria, {firstName}
        </div>

        <p style={{
          fontSize: "14px",
          color: "var(--color-jda-cream-muted)",
          lineHeight: 1.7,
          marginBottom: "16px",
          fontFamily: "var(--font-body)",
        }}>
          Alexandria is JDA&apos;s AI intelligence layer that practitioners access
          through Claude. Through Claude, you have full access to your practice&apos;s
          methodologies, JDA templates, brand packages, and more.
        </p>

        <div style={{
          background: "var(--color-jda-bg-surface)",
          border: "1px solid var(--color-jda-border)",
          borderRadius: "8px",
          padding: "16px 18px",
          marginBottom: "16px",
        }}>
          <div style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "13px",
            color: "var(--color-jda-cream)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: "10px",
          }}>
            Getting started
          </div>
          <ol style={{
            fontSize: "13px",
            color: "var(--color-jda-cream-muted)",
            lineHeight: 1.7,
            fontFamily: "var(--font-body)",
            paddingLeft: "20px",
            margin: 0,
          }}>
            <li>Open <strong style={{ color: "var(--color-jda-cream)" }}>Claude</strong> (claude.ai or the desktop app)</li>
            <li>Connect to the <strong style={{ color: "var(--color-jda-cream)" }}>Alexandria MCP server</strong> through your team workspace</li>
            <li>Ask Claude to run <code style={{ background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: "4px", fontSize: "12px" }}>alexandria_help</code> to see what&apos;s available</li>
          </ol>
        </div>

        <p style={{
          fontSize: "13px",
          color: "var(--color-jda-warm-gray)",
          lineHeight: 1.6,
          marginBottom: "24px",
          fontFamily: "var(--font-body)",
        }}>
          The Alexandria Portal is used by content editors and administrators.
          If you need portal access, contact{" "}
          <a href="mailto:help@jdaworldwide.com" style={{ color: "var(--color-jda-red)", textDecoration: "underline" }}>
            help@jdaworldwide.com
          </a>{" "}
          or speak to your supervisor.
        </p>

        {/* Signed-in user info */}
        <div style={{
          background: "var(--color-jda-bg-surface)",
          border: "1px solid var(--color-jda-border)",
          borderRadius: "8px",
          padding: "14px 16px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: "13px", color: "var(--color-jda-cream)", fontWeight: 500 }}>
              {session.user.name ?? "Unknown"}
            </div>
            <div style={{ fontSize: "12px", color: "var(--color-jda-warm-gray)", marginTop: "2px" }}>
              {session.user.email ?? ""}
            </div>
          </div>
          <div style={{
            fontSize: "11px",
            fontFamily: "var(--font-display)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--color-jda-warm-gray)",
            background: "var(--color-jda-bg)",
            padding: "4px 10px",
            borderRadius: "4px",
          }}>
            Signed in
          </div>
        </div>

        <form action={signOutAction}>
          <button type="submit" style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px 16px",
            borderRadius: "8px",
            border: "1px solid var(--color-jda-border)",
            background: "transparent",
            color: "var(--color-jda-cream-muted)",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: "13px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}>
            Sign out and try a different account
          </button>
        </form>
      </div>
    </div>
  );
}
