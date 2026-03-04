export interface ContactFormProps {
  _type: "contactForm";
  _key: string;
  heading?: string;
  description?: string;
  recipientEmail: string;
  successMessage?: string;
}
