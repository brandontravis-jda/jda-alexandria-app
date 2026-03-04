export interface FooterLink {
  label: string;
  url: string;
  isExternal?: boolean;
}

export interface FooterColumn {
  title?: string;
  links: FooterLink[];
}

export interface FooterSocialLink {
  platform: string;
  url: string;
}

export interface FooterData {
  columns?: FooterColumn[];
  socialLinks?: FooterSocialLink[];
  copyrightText?: string;
}

export interface FooterProps {
  data: FooterData | null;
}
