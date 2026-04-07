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

// --- Templates ---

export const allTemplatesQuery = groq`
  *[_type == "template"] | order(title asc) {
    _id,
    title,
    "slug": slug.current,
    formatType,
    status,
    previewUrl
  }
`;

export const templateBySlugQuery = groq`
  *[_type == "template" && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current,
    formatType,
    status,
    previewUrl,
    githubRawUrl,
    dropboxLink,
    useCases,
    featureList,
    fixedElements,
    variableElements,
    brandInjectionRules,
    clientAdaptationNotes,
    outputSpec,
    qualityChecks,
    includeFeedbackPrompt
  }
`;

// --- Client brand packages ---

export const allBrandPackagesQuery = groq`
  *[_type == "clientBrandPackage"] | order(clientName asc) {
    _id,
    clientName,
    "slug": slug.current,
    abbreviations,
    extractedDate,
    sourceDocument
  }
`;

export const brandPackageBySlugQuery = groq`
  *[_type == "clientBrandPackage" && slug.current == $slug][0] {
    _id,
    clientName,
    "slug": slug.current,
    abbreviations,
    extractedDate,
    sourceDocument,
    extractedBy,
    gaps,
    logoUsageRules,
    templateOverrides,
    identity,
    colorPalette,
    colorUsageRules,
    typography,
    webFonts,
    rawMarkdown
  }
`;

// --- Platform guide (singleton) ---

export const platformGuideBrowseQuery = groq`
  *[_type == "platformGuide"][0] {
    _id,
    platformIntro,
    canonicalEntryPrompts,
    examplePrompts,
    feedbackPrompt
  }
`;

// --- Dashboard aggregates ---

export const portalContentCountsQuery = groq`{
  "methodologyCount": count(*[_type == "productionMethodology"]),
  "templateActiveCount": count(*[_type == "template" && status == "active"]),
  "templateTotalCount": count(*[_type == "template"]),
  "brandPackageCount": count(*[_type == "clientBrandPackage"]),
  "capabilityCount": count(*[_type == "capabilityRecord"]),
  "practiceAreaCount": count(*[_type == "practiceArea"])
}`;

export const recentSanityDocumentsQuery = groq`
  *[_type in ["productionMethodology", "template", "clientBrandPackage"]] | order(_updatedAt desc) [0...8] {
    _type,
    _updatedAt,
    "title": select(
      _type == "productionMethodology" => name,
      _type == "template" => title,
      _type == "clientBrandPackage" => clientName
    ),
    "slug": select(
      _type == "productionMethodology" => slug.current,
      _type == "template" => slug.current,
      _type == "clientBrandPackage" => slug.current
    )
  }
`;
