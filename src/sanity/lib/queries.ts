import { groq } from "next-sanity";

// --- Production Methodologies ---

export const allMethodologiesQuery = groq`
  *[_type == "productionMethodology"] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    "practice": practice->name,
    aiClassification,
    provenStatus,
    version,
    author
  }
`;

export const methodologyBySlugQuery = groq`
  *[_type == "productionMethodology" && slug.current == $slug][0] {
    _id,
    name,
    "slug": slug.current,
    description,
    "practice": practice->{ name, "slug": slug.current },
    aiClassification,
    toolsInvolved,
    requiredInputs,
    systemInstructions,
    steps,
    outputFormat,
    qualityChecks,
    failureModes,
    visionOfGood,
    tips,
    clientRefinements,
    provenStatus,
    version,
    author,
    validatedBy
  }
`;

export const methodologiesByPracticeQuery = groq`
  *[_type == "productionMethodology" && practice->slug.current == $practice] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    aiClassification,
    provenStatus,
    version
  }
`;

// --- Practice Areas ---

export const allPracticeAreasQuery = groq`
  *[_type == "practiceArea"] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    activationStatus
  }
`;

// --- Deliverable Classifications ---

export const allDeliverablesQuery = groq`
  *[_type == "deliverableClassification"] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    "practiceArea": practiceArea->name,
    aiClassification
  }
`;
