export interface FAQItem {
  _key: string;
  question: string;
  answer: unknown[];
}

export interface FAQProps {
  _type: "faq";
  _key: string;
  heading?: string;
  items: FAQItem[];
}
