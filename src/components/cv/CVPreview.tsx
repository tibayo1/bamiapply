import { cvContactURL } from "@/lib/cv/export";
import type { CVContent } from "@/types/cv";

export function CVPreview({ content }: { content: CVContent }) {
  const personal = content.personal;
  const contactItems = [
    { text: personal.location },
    { text: personal.email },
    { text: personal.phone },
    { text: personal.linkedin, href: personal.linkedin ? cvContactURL(personal.linkedin) : null },
    { text: personal.website, href: personal.website ? cvContactURL(personal.website) : null },
  ].filter((item): item is { text: string; href?: string | null } => Boolean(item.text));
  return (
    <article aria-label="CV preview" className="mx-auto max-w-[800px] break-words rounded-lg border border-line bg-white px-5 py-7 text-[#17202a] shadow-sm sm:px-10 sm:py-10 [overflow-wrap:anywhere]">
      <header className="border-b border-[#d4d8de] pb-5">
        <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">{personal.name}</h1>
        {personal.headline ? <p className="mt-2 whitespace-pre-line text-base">{personal.headline}</p> : null}
        {contactItems.length ? (
          <ul aria-label="Contact details" className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#414b57]">
            {contactItems.map((item, index) => (
              <li key={index}>{item.href ? <a href={item.href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{item.text}</a> : item.text}</li>
            ))}
          </ul>
        ) : null}
      </header>
      {content.sections.filter((section) => section.entries.length).map((section) => (
        <section key={section.id} className="mt-7">
          <h2 className="mb-4 border-b border-[#d4d8de] pb-1 text-base font-semibold">{section.title}</h2>
          <div className="space-y-5">
            {section.entries.map((entry) => (
              <section key={entry.id}>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">{entry.title}</h3>
                    {entry.subtitle ? <p className="mt-1 whitespace-pre-line text-sm">{entry.subtitle}</p> : null}
                    {entry.location ? <p className="mt-1 text-xs text-[#414b57]">{entry.location}</p> : null}
                  </div>
                  {entry.dates ? <p className="text-xs text-[#414b57] sm:max-w-[35%] sm:text-right">{entry.dates}</p> : null}
                </div>
                {entry.paragraphs.map((paragraph, index) => <p key={index} className="mt-2 whitespace-pre-line text-sm leading-relaxed">{paragraph}</p>)}
                {entry.bullets.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed">{entry.bullets.map((bullet, index) => <li key={index} className="whitespace-pre-line">{bullet}</li>)}</ul> : null}
              </section>
            ))}
          </div>
        </section>
      ))}
      {content.skills.length ? <section className="mt-7"><h2 className="mb-3 border-b border-[#d4d8de] pb-1 text-base font-semibold">Skills</h2><p className="text-sm leading-relaxed">{content.skills.map((skill) => skill.name).join(" · ")}</p></section> : null}
    </article>
  );
}
