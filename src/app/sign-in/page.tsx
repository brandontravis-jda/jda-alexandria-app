import { signInWithMicrosoft } from "./actions";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = error
    ? error === "AccessDenied"
      ? "Your Microsoft account is not authorized to access Alexandria. Contact your administrator."
      : "Sign-in failed. Please try again."
    : null;
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
        maxWidth: "380px",
        background: "var(--color-jda-bg-card)",
        border: "1px solid var(--color-jda-border)",
        borderRadius: "10px",
        padding: "40px",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" }}>
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
          fontSize: "28px",
          color: "var(--color-jda-cream)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "6px",
        }}>
          Sign In
        </div>
        <p style={{
          fontSize: "14px",
          color: "var(--color-jda-warm-gray)",
          marginBottom: errorMessage ? "16px" : "32px",
          fontFamily: "var(--font-body)",
          textTransform: "none",
          letterSpacing: 0,
        }}>
          Access is restricted to JDA staff.
        </p>

        {errorMessage && (
          <div style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "24px",
            fontSize: "13px",
            color: "#f87171",
            fontFamily: "var(--font-body)",
            lineHeight: 1.5,
          }}>
            {errorMessage}
          </div>
        )}

        <form action={signInWithMicrosoft}>
          <button type="submit" style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            padding: "12px 16px",
            borderRadius: "8px",
            border: "none",
            background: "var(--color-jda-red)",
            color: "white",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: "13px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}>
            <MicrosoftIcon />
            Sign in with Microsoft
          </button>
        </form>
      </div>
    </div>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}
