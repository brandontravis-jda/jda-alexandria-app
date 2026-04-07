/**
 * Deep-link into embedded Sanity Studio for a specific document.
 * @see https://www.sanity.io/docs/deep-linking-to-studio
 */
export function studioEditDocumentHref(documentId: string, schemaType: string): string {
  return `/studio/intent/edit/id=${encodeURIComponent(documentId)};type=${encodeURIComponent(schemaType)}`;
}
