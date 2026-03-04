import type { SanityImageSource } from "@/components/ui/SanityImage/types";

export interface TeamMemberData {
  _id: string;
  name: string;
  jobTitle?: string;
  photo?: SanityImageSource;
  bio?: string;
}

export interface TeamGridProps {
  _type: "teamGrid";
  _key: string;
  heading?: string;
  members: TeamMemberData[];
}
