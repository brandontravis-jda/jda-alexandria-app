import { sanityFetch } from "@/sanity/lib/client";
import { navigationQuery, footerQuery, settingsQuery } from "@/sanity/lib/queries";
import Navigation from "@/components/global/Navigation";
import Footer from "@/components/global/Footer";
import type { NavigationData } from "@/components/global/Navigation/types";
import type { FooterData } from "@/components/global/Footer/types";

interface GlobalSettings {
  siteTitle?: string;
}

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [navigation, footer, settings] = await Promise.all([
    sanityFetch<NavigationData | null>({
      query: navigationQuery,
      tags: ["navigation"],
    }),
    sanityFetch<FooterData | null>({
      query: footerQuery,
      tags: ["footer"],
    }),
    sanityFetch<GlobalSettings | null>({
      query: settingsQuery,
      tags: ["globalSettings"],
    }),
  ]);

  return (
    <>
      <Navigation data={navigation} siteTitle={settings?.siteTitle} />
      <main id="main-content">{children}</main>
      <Footer data={footer} />
    </>
  );
}
