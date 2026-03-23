import type { StructureResolver } from "sanity/structure";

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Alexandria")
    .items([
      S.listItem()
        .title("Production Methodologies")
        .icon(() => "⚙️")
        .child(S.documentTypeList("productionMethodology").title("Production Methodologies")),
      S.listItem()
        .title("Client Brand Packages")
        .icon(() => "🎨")
        .child(S.documentTypeList("clientBrandPackage").title("Client Brand Packages")),
      S.divider(),
      S.listItem()
        .title("Practice Areas")
        .icon(() => "🏢")
        .child(S.documentTypeList("practiceArea").title("Practice Areas")),
      S.listItem()
        .title("Deliverable Classifications")
        .icon(() => "📋")
        .child(S.documentTypeList("deliverableClassification").title("Deliverable Classifications")),
    ]);
