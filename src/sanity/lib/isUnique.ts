import type { SlugValidationContext } from "sanity";
import { client } from "./client";

export async function isUnique(
  slug: string,
  context: SlugValidationContext
): Promise<boolean> {
  const { document } = context;
  const id = document?._id?.replace(/^drafts\./, "");

  const params = {
    draft: `drafts.${id}`,
    published: id,
    slug,
    type: document?._type,
  };

  const query = `!defined(*[
    _type == $type &&
    slug.current == $slug &&
    !(_id in [$draft, $published])
  ][0]._id)`;

  const result = await client.fetch<boolean>(query, params);
  return result;
}
