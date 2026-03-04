export interface NavLink {
  label: string;
  url: string;
  isExternal?: boolean;
}

export interface NavItem {
  label: string;
  url: string;
  isExternal?: boolean;
  children?: NavLink[];
}

export interface NavigationData {
  items: NavItem[];
}

export interface NavigationProps {
  data: NavigationData | null;
  siteTitle?: string;
}
