import type { JobRequirementDraft } from "@/types/job";

export const MAX_JOB_DESCRIPTION_LENGTH = 30000;
export const MAX_JOB_REQUIREMENTS = 30;

export function createRequirementDraft(id = `requirement-${crypto.randomUUID()}`): JobRequirementDraft {
  return { id, label: "", sourceText: "", importance: "core", category: "other", profileMatches: [],
    isHardBlocker: false, acceptedRegions: "", sponsorship: "unknown" };
}

type Section = "unknown" | "core" | "preferred" | "contextual" | "excluded";
const HEADINGS: [RegExp, Section | "inherit"][] = [
  [/^(?:(?:job|key|main|primary|your) )?(?:responsibilities|duties|accountabilities)(?: and (?:duties|accountabilities|responsibilities))?$|^(?:what you(?:'ll| will) do|your role|the role|role overview|what you will be doing)$/i, "core"],
  [/^(?:(?:minimum|required|essential|basic|key|job|candidate) )?(?:qualifications|requirements|criteria)(?: and (?:skills|experience))?$|^(?:what you bring|what we(?:'re| are) looking for|who you are|your profile|about you|must haves)$/i, "core"],
  [/^(?:preferred|desirable|additional) (?:qualifications|requirements|skills|experience)$|^(?:nice to have|nice to haves|bonus skills|desired qualifications)$/i, "preferred"],
  [/^(?:eligibility(?: requirements| conditions)?|work authori[sz]ation|right to work|work arrangements|working arrangements|travel requirements|work location)$/i, "contextual"],
  [/^(?:about us|about (?:the|our) company|company overview|who we are|our mission|our values|our culture|(?:employee )?benefits(?: and (?:perks|rewards))?|perks|compensation(?: and benefits)?|what we offer|what you(?:'ll| will) get|why join us|how to apply|application process|equal (?:employment )?opportunit(?:y|ies)|diversity and inclusion)$/i, "excluded"],
  [/^(?:education(?: and experience)?|skills|experience|languages|competencies|technical skills|soft skills|personal qualities|professional experience)$/i, "inherit"],
];
const ACTION = /^(?:(?:you(?:'ll| will)|the candidate will|the role will)\s+)?(?:owns?|drives?|leads?|designs?|conducts?|manages?|develops?|oversees?|ensures?|delivers?|collaborates?|coordinates?|supports?|maintains?|implements?|builds?|evaluates?|analyses?|analyzes?|plans?|provides?|works?)\b/i;
const QUALIFICATION = /^(?:(?:a|an)\s+)?(?:must|required|at least|minimum|\d+(?:\.\d+)?\+?\s*(?:years?|months?)|experience|knowledge|proficiency|ability|understanding|familiarity|strong|excellent|fluent|fluency|bachelor|master|ph\.?d|doctorate|degree|current professional|professional licen[sc]e|current licen[sc]e)\b/i;
const REQUIREMENT_CUE = /\b(?:experience|proficien(?:cy|t)|knowledge|skills?|ability|qualifications?|required|must|mandatory|preferred|degree|bachelor|master|ph\.?d|years?|work authori[sz]ation|right to work|visa|sponsorship|work permit|eligible to work|licen[sc]e|certification|travel)\b/i;
const META = /^(?:job title|position title|company|location|salary|salary range|job id|requisition id|employment type|apply (?:now|here)|learn more|visit (?:our|the))\s*:/i;
const MARKER = /^(?:\s*[-*•·▪◦–—]\s+|\s*\d+[.)]\s+)/;

function heading(value: string): Section | "inherit" | undefined {
  const normalized = value.trim().replace(/^#{1,6}\s*/, "").replace(/^[*_]+|[*_]+$/g, "")
    .replace(/[’‘]/g, "'").replace(/[\s:：]+$/, "").replace(/\s+/g, " ");
  return HEADINGS.find(([pattern]) => pattern.test(normalized))?.[1];
}

function sentenceQuotes(source: string): string[] {
  const quotes: string[] = [];
  let start = 0;
  for (const match of source.matchAll(/[.!?]\s+(?=[A-Z])/g)) {
    const end = match.index! + 1;
    if (/(?:\b(?:e\.g|i\.e|b\.sc|m\.sc|ph\.d|m\.d|b\.a|m\.a|dr|mr|ms|etc))\.$/i.test(source.slice(start, end))) continue;
    quotes.push(source.slice(start, end).trim());
    start = match.index! + match[0].length;
  }
  quotes.push(source.slice(start).trim());
  return quotes.filter(Boolean);
}

function category(quote: string): JobRequirementDraft["category"] {
  const negatedAuthorization = /\b(?:no (?:work authori[sz]ation|visa|sponsorship|work permit) (?:is )?required|(?:work authori[sz]ation|visa|sponsorship|work permit) (?:is )?not required)\b/i.test(quote);
  if (!negatedAuthorization && /\b(?:work authori[sz]ation|right to work|authori[sz](?:ed|ation) to work|visa|sponsorship|work permit|eligible to work)\b/i.test(quote)) return "work_authorization";
  const negatedLicense = /\b(?:no (?:\w+\s+){0,3}licen[sc]e (?:is )?required|licen[sc]e (?:is )?not required)\b/i.test(quote);
  if (!negatedLicense && /\b(?:professional|nursing|medical|driving|driver'?s?|valid|current|active|registered)\s+(?:\w+\s+){0,2}licen[sc]e\b|\blicen[sc]ed\s+(?:nurse|physician|professional|practitioner)\b|\blicen[sc](?:e|ed) to practi[cs]e\b|\bmust (?:\w+\s+){0,3}(?:hold|possess|have) (?:a |an )?licen[sc]e\b/i.test(quote)) return "license";
  if (/\b(?:degree|bachelor|master|ph\.?d|doctorate|diploma)\b/i.test(quote)) return "education";
  if (/\b(?:certification|certified)\b/i.test(quote)) return "certification";
  if (/\b(?:fluent|fluency|language|english|german|french)\b/i.test(quote)) return "language";
  if (/\b(?:on-site|onsite|remote|hybrid|relocation|relocate|travel|location)\b/i.test(quote)) return "location";
  if (ACTION.test(quote) || /\b(?:years?|experience|clinical|trial|study|research|governance|regulatory|collaborat\w*)\b/i.test(quote)) return "experience";
  return "skill";
}

function conciseLabel(quote: string): string {
  // Numbers, alternatives and negations need the condition, not just its topic.
  if (/\d|\b(?:not|no|without|unless|except|or|either|at least|minimum|must|required|mandatory)\b/i.test(quote)) {
    return quote.length <= 300 ? quote : `${quote.slice(0, 267).trimEnd()}… (review full condition)`;
  }
  const topics = [
    /\bclinical evidence strategy\b/i,
    /\bclinical development\b/i,
    /\b(?:protocol development|clinical trials?|trial oversight)\b/i,
    /\b(?:regulatory submissions?|regulatory acceptance|regulatory compliance)\b/i,
    /\b(?:real-world evidence|real world evidence)\b/i,
    /\b(?:cross-functional collaboration|cross-functional leadership|program governance)\b/i,
    /\b(?:data analysis|statistical analysis|study design|experiment design)\b/i,
  ];
  const found = topics.map((pattern) => quote.match(pattern)?.[0]).filter((value): value is string => Boolean(value));
  if (found.length) {
    const label = found.slice(0, 2).join(" · ");
    return label[0].toUpperCase() + label.slice(1);
  }
  const trimmed = quote.replace(/^(?:Requirements|Qualifications)\s*:\s*/i, "")
    .replace(/^(?:you(?:'ll| will)\s+|the candidate will\s+)/i, "");
  return trimmed.length <= 160 ? trimmed[0].toUpperCase() + trimmed.slice(1) : `${trimmed.slice(0, 137).trimEnd()}… (review wording)`;
}

export interface RequirementSuggestions {
  requirements: JobRequirementDraft[];
  totalSuggestions: number;
  omittedCount: number;
}

/** Conservative, section-aware suggestions; review remains explicit and no Profile facts are inferred. */
export function suggestJobRequirementsDetailed(description: string): RequirementSuggestions {
  if (typeof description !== "string" || description.length > MAX_JOB_DESCRIPTION_LENGTH)
    return { requirements: [], totalSuggestions: 0, omittedCount: 0 };
  let section: Section = "unknown";
  let pending: { start: number; end: number; section: Section; indent: number } | undefined;
  const candidates: { sourceText: string; section: Section }[] = [];
  function flush() {
    if (pending && pending.section !== "excluded") {
      for (const sourceText of sentenceQuotes(description.slice(pending.start, pending.end))) {
        if (sourceText.length >= 3 && heading(sourceText) === undefined && !META.test(sourceText)
          && (pending.section !== "unknown" || ACTION.test(sourceText) || REQUIREMENT_CUE.test(sourceText))) {
          candidates.push({ sourceText, section: pending.section });
        }
      }
    }
    pending = undefined;
  }
  for (const line of description.matchAll(/[^\r\n]+/g)) {
    const raw = line[0];
    const indent = raw.length - raw.trimStart().length;
    const marker = raw.match(MARKER);
    const textStart = line.index! + (marker?.[0].length ?? raw.length - raw.trimStart().length);
    const text = description.slice(textStart, line.index! + raw.trimEnd().length);
    if (!text.trim()) continue;
    const mode = heading(text);
    if (mode !== undefined) {
      flush();
      if (mode !== "inherit") section = mode;
      continue;
    }
    const inline = text.match(/^([^:]{3,50}):\s+(.+)$/);
    const inlineMode = inline ? heading(inline[1]) : undefined;
    if (inlineMode !== undefined) {
      flush();
      if (inlineMode !== "inherit") section = inlineMode;
    }
    if (section === "excluded" || META.test(text)) { flush(); continue; }
    const separated = pending && /\r?\n\s*\r?\n/.test(description.slice(pending.end, textStart));
    const continuation = pending && indent > pending.indent && !marker && inlineMode === undefined && !separated;
    if (marker || inlineMode !== undefined || separated || (!continuation && (ACTION.test(text) || QUALIFICATION.test(text)))) flush();
    if (!pending) pending = { start: textStart, end: line.index! + raw.trimEnd().length, section, indent };
    else pending.end = line.index! + raw.trimEnd().length;
  }
  flush();

  const seen = new Set<string>();
  const drafts: JobRequirementDraft[] = [];
  for (const candidate of candidates) {
    const quote = candidate.sourceText;
    // Statements expressly saying a qualification is unnecessary are not candidate requirements.
    if (/^(?:no (?:\w+\s+){0,4}(?:experience|degree|licen[sc]e|certification) (?:is )?required|(?:\w+\s+){0,3}(?:experience|degree|licen[sc]e|certification) (?:is )?not required)(?: for (?:this|the) (?:role|position))?[.!]?$/i.test(quote)) continue;
    // A standalone employer sponsorship policy is not a scored candidate capability.
    if (/^(?:(?:visa )?sponsorship (?:is |will be )?(?:not available|unavailable|available|offered)|no (?:visa )?sponsorship (?:is )?(?:available|offered))[.!]?$/i.test(quote)) continue;
    const required = /\b(?:must|required|mandatory|essential)\b/i.test(quote) && !/\bnot (?:required|mandatory|essential)\b/i.test(quote);
    const preferred = /\b(?:preferred|desirable|nice to have|bonus|advantage)\b/i.test(quote);
    const draft = createRequirementDraft(`requirement-${drafts.length + 1}`);
    draft.sourceText = quote;
    draft.label = conciseLabel(quote);
    draft.category = category(quote);
    draft.importance = preferred || (candidate.section === "preferred" && !required) ? "preferred"
      : draft.category === "location" || candidate.section === "contextual" ? "contextual" : "core";
    if (!preferred && required && ["work_authorization", "license"].includes(draft.category)) {
      draft.importance = "critical";
      draft.isHardBlocker = true;
    }
    // Only identical wording with the same interpretation is redundant; distinct conditions stay separate.
    const key = JSON.stringify([quote.toLowerCase().replace(/\s+/g, " ").replace(/[.!;]+$/, ""), draft.importance, draft.category]);
    if (seen.has(key)) continue;
    seen.add(key);
    drafts.push(draft);
  }
  // A long posting must not silently lose a late eligibility gate.
  const critical = drafts.filter((draft) => draft.importance === "critical");
  const selected = new Set([...critical, ...drafts.filter((draft) => draft.importance !== "critical")].slice(0, MAX_JOB_REQUIREMENTS));
  const requirements = drafts.filter((draft) => selected.has(draft));
  return { requirements, totalSuggestions: drafts.length, omittedCount: drafts.length - requirements.length };
}

export function suggestJobRequirements(description: string): JobRequirementDraft[] {
  return suggestJobRequirementsDetailed(description).requirements;
}
