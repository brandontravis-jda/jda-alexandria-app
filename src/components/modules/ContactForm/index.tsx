"use client";

import { useState, useRef, useCallback, useEffect, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import type { ContactFormProps } from "./types";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface FormState {
  name: string;
  email: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

export default function ContactForm({
  heading,
  description,
  recipientEmail,
  successMessage = "Thank you! Your message has been sent.",
}: ContactFormProps) {
  const [values, setValues] = useState<FormState>({
    name: "",
    email: "",
    message: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [serverError, setServerError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const renderWidget = useCallback(() => {
    if (!siteKey || !turnstileRef.current || !window.turnstile) return;
    if (widgetIdRef.current) return;

    widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
      sitekey: siteKey,
      callback: (token: string) => setTurnstileToken(token),
      "expired-callback": () => setTurnstileToken(null),
      "error-callback": () => setTurnstileToken(null),
    });
  }, [siteKey]);

  useEffect(() => {
    if (!siteKey) return;

    if (window.turnstile) {
      renderWidget();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = renderWidget;
    document.head.appendChild(script);

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, renderWidget]);

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!values.name.trim()) errs.name = "Name is required";
    if (!values.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
      errs.email = "Please enter a valid email";
    if (!values.message.trim()) errs.message = "Message is required";
    return errs;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (siteKey && !turnstileToken) {
      setServerError("Please complete the verification challenge.");
      return;
    }

    setStatus("submitting");
    setServerError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          recipientEmail,
          turnstileToken,
          sourcePage: window.location.pathname,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      setStatus("success");
      setValues({ name: "", email: "", message: "" });
      setTurnstileToken(null);
    } catch (err) {
      setStatus("error");
      setServerError(err instanceof Error ? err.message : "Something went wrong.");
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
        setTurnstileToken(null);
      }
    }
  }

  function handleChange(field: keyof FormState, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  return (
    <Container>
      <div className="mx-auto max-w-2xl">
        {heading && (
          <h2 className="mb-4 text-center font-display text-3xl font-bold sm:text-4xl">
            {heading}
          </h2>
        )}
        {description && (
          <p className="mb-8 text-center text-brand-muted">{description}</p>
        )}

        {status === "success" ? (
          <div
            className="rounded bg-green-50 p-6 text-center text-green-800"
            role="alert"
            aria-live="polite"
          >
            <p className="font-semibold">{successMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {serverError && (
              <div
                className="mb-6 rounded bg-red-50 p-4 text-sm text-red-700"
                role="alert"
                aria-live="assertive"
              >
                {serverError}
              </div>
            )}

            <div className="space-y-6">
              <FormField
                id="contact-name"
                label="Name"
                required
                error={errors.name}
              >
                <input
                  id="contact-name"
                  type="text"
                  value={values.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "contact-name-error" : undefined}
                  className={cn(
                    "w-full rounded border px-4 py-3 text-brand-text outline-none transition-colors focus-visible:border-brand-secondary focus-visible:ring-1 focus-visible:ring-brand-secondary",
                    errors.name ? "border-red-500" : "border-brand-border"
                  )}
                />
              </FormField>

              <FormField
                id="contact-email"
                label="Email"
                required
                error={errors.email}
              >
                <input
                  id="contact-email"
                  type="email"
                  value={values.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "contact-email-error" : undefined}
                  className={cn(
                    "w-full rounded border px-4 py-3 text-brand-text outline-none transition-colors focus-visible:border-brand-secondary focus-visible:ring-1 focus-visible:ring-brand-secondary",
                    errors.email ? "border-red-500" : "border-brand-border"
                  )}
                />
              </FormField>

              <FormField
                id="contact-message"
                label="Message"
                required
                error={errors.message}
              >
                <textarea
                  id="contact-message"
                  rows={5}
                  value={values.message}
                  onChange={(e) => handleChange("message", e.target.value)}
                  aria-invalid={!!errors.message}
                  aria-describedby={errors.message ? "contact-message-error" : undefined}
                  className={cn(
                    "w-full resize-y rounded border px-4 py-3 text-brand-text outline-none transition-colors focus-visible:border-brand-secondary focus-visible:ring-1 focus-visible:ring-brand-secondary",
                    errors.message ? "border-red-500" : "border-brand-border"
                  )}
                />
              </FormField>

              {siteKey && (
                <div ref={turnstileRef} className="flex justify-center" />
              )}

              <Button
                type="submit"
                disabled={status === "submitting" || (!!siteKey && !turnstileToken)}
                aria-busy={status === "submitting"}
                aria-disabled={status === "submitting"}
                className="w-full"
              >
                {status === "submitting" ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Container>
  );
}

function FormField({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-brand-text-heading">
        {label}
        {required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
