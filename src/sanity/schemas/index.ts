import type { SchemaTypeDefinition } from "sanity";

// Documents
import globalSettings from "./documents/globalSettings";
import page from "./documents/page";
import blogPost from "./documents/blogPost";
import teamMember from "./documents/teamMember";
import navigation from "./documents/navigation";
import footer from "./documents/footer";
import formSubmission from "./documents/formSubmission";

// Objects
import link from "./objects/link";
import seo from "./objects/seo";
import textBlock from "./objects/textBlock";
import hero from "./objects/hero";
import cta from "./objects/cta";
import featureGrid from "./objects/featureGrid";
import imageGallery from "./objects/imageGallery";
import videoEmbed from "./objects/videoEmbed";
import statsCounter from "./objects/statsCounter";
import logoBar from "./objects/logoBar";
import testimonials from "./objects/testimonials";
import faq from "./objects/faq";
import teamGrid from "./objects/teamGrid";
import contactForm from "./objects/contactForm";
import pageBuilder from "./objects/pageBuilder";

export const schemaTypes: SchemaTypeDefinition[] = [
  // Documents
  globalSettings,
  page,
  blogPost,
  teamMember,
  navigation,
  footer,
  formSubmission,

  // Objects
  link,
  seo,
  textBlock,
  hero,
  cta,
  featureGrid,
  imageGallery,
  videoEmbed,
  statsCounter,
  logoBar,
  testimonials,
  faq,
  teamGrid,
  contactForm,
  pageBuilder,
];
