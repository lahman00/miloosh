import Image from "next/image";

const marks: Record<string, string> = {
  airtable: "airtable.svg",
  todoist: "todoist.svg",
  notion: "notion.svg",
  elevenlabs: "elevenlabs.svg",
  hubspot: "hubspot.svg",
  close: "close.png",
  setmore: "setmore.svg",
  pipedrive: "pipedrive.png",
  synthesia: "synthesia.png",
  jasper: "jasper.png",
};

export function SoftwareMark({ slug, name, tone = 0 }: { slug: string; name: string; tone?: number }) {
  const mark = marks[slug];
  return <span className={`software-monogram tone-${tone}`} aria-hidden="true">{mark ? <Image src={`/brands/${mark}`} alt="" width={25} height={25} unoptimized /> : name.slice(0,1)}</span>;
}
