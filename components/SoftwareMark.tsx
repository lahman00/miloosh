import Image from "next/image";

const available = new Set(["airtable", "todoist", "notion", "elevenlabs", "hubspot"]);
export function SoftwareMark({ slug, name, tone = 0 }: { slug: string; name: string; tone?: number }) {
  return <span className={`software-monogram tone-${tone}`} aria-hidden="true">{available.has(slug) ? <Image src={`/brands/${slug}.svg`} alt="" width={25} height={25} unoptimized /> : name.slice(0,1)}</span>;
}
