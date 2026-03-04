import Container from "@/components/ui/Container";
import SanityImage from "@/components/ui/SanityImage";
import type { TeamGridProps } from "./types";

export default function TeamGrid({ heading, members }: TeamGridProps) {
  if (!members?.length) return null;

  return (
    <Container>
      {heading && (
        <h2 className="mb-12 text-center font-display text-3xl font-bold sm:text-4xl">
          {heading}
        </h2>
      )}

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {members.map((member) => (
          <div key={member._id} className="text-center">
            {member.photo?.asset && (
              <div className="mx-auto mb-4 h-40 w-40 overflow-hidden rounded-full">
                <SanityImage
                  image={member.photo}
                  width={320}
                  height={320}
                  className="h-full w-full"
                />
              </div>
            )}
            <h3 className="font-display text-lg font-semibold">{member.name}</h3>
            {member.jobTitle && (
              <p className="mt-1 text-sm text-brand-muted">{member.jobTitle}</p>
            )}
            {member.bio && (
              <p className="mt-2 text-sm text-brand-text">{member.bio}</p>
            )}
          </div>
        ))}
      </div>
    </Container>
  );
}
