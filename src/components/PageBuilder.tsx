import type { ComponentType } from "react";
import Hero from "./modules/Hero";
import TextBlock from "./modules/TextBlock";
import CTA from "./modules/CTA";
import FeatureGrid from "./modules/FeatureGrid";
import StatsCounter from "./modules/StatsCounter";
import LogoBar from "./modules/LogoBar";
import ImageGallery from "./modules/ImageGallery";
import VideoEmbed from "./modules/VideoEmbed";
import Testimonials from "./modules/Testimonials";
import FAQ from "./modules/FAQ";
import TeamGrid from "./modules/TeamGrid";
import ContactForm from "./modules/ContactForm";
import { JsonLd, faqPageSchema } from "@/lib/jsonLd";
import { toPlainText, type PortableTextBlock } from "@portabletext/react";

interface Module {
  _type: string;
  _key: string;
  [key: string]: unknown;
}

interface FAQModule extends Module {
  items?: Array<{ _key: string; question: string; answer: unknown[] }>;
}

interface PageBuilderProps {
  modules?: Module[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const moduleMap: Record<string, ComponentType<any>> = {
  hero: Hero,
  textBlock: TextBlock,
  cta: CTA,
  featureGrid: FeatureGrid,
  statsCounter: StatsCounter,
  logoBar: LogoBar,
  imageGallery: ImageGallery,
  videoEmbed: VideoEmbed,
  testimonials: Testimonials,
  faq: FAQ,
  teamGrid: TeamGrid,
  contactForm: ContactForm,
};

const fullBleedModules = new Set(["hero", "cta"]);

function buildFaqJsonLd(module: FAQModule) {
  if (!module.items?.length) return null;

  const items = module.items.map((item) => ({
    question: item.question,
    answer: toPlainText(item.answer as PortableTextBlock[]),
  }));

  return <JsonLd key={`${module._key}-jsonld`} data={faqPageSchema(items)} />;
}

export default function PageBuilder({ modules }: PageBuilderProps) {
  if (!modules?.length) return null;

  return (
    <>
      {modules.map((module) => {
        const Component = moduleMap[module._type];

        if (!Component) {
          if (process.env.NODE_ENV === "development") {
            console.warn(`No component found for module type: ${module._type}`);
          }
          return null;
        }

        if (fullBleedModules.has(module._type)) {
          return (
            <div key={module._key}>
              {module._type === "faq" && buildFaqJsonLd(module as FAQModule)}
              <Component {...module} />
            </div>
          );
        }

        return (
          <section key={module._key} className="py-section">
            {module._type === "faq" && buildFaqJsonLd(module as FAQModule)}
            <Component {...module} />
          </section>
        );
      })}
    </>
  );
}
