import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Missing token" },
        { status: 400 }
      );
    }

    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
      return NextResponse.json(
        { success: false, error: "Turnstile not configured" },
        { status: 500 }
      );
    }

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token }),
      }
    );

    const data = await res.json();

    return NextResponse.json({
      success: data.success,
      error: data.success ? undefined : "Verification failed",
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Verification error" },
      { status: 500 }
    );
  }
}
