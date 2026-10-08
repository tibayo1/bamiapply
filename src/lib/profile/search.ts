import type { CareerProfile } from "@/types/profile";
import type { SectionId } from "./sections";

export interface ProfileSearchResult {
  id: string;
  section: SectionId;
  title: string;
  subtitle: string;
  matchText: string;
}

export function searchProfile(
  profile: CareerProfile,
  query: string
): ProfileSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: ProfileSearchResult[] = [];

  // 1. Experiences
  for (const exp of profile.experiences) {
    const claimsText = exp.responsibilities.map((r) => r.text).join(" ");
    const full = `${exp.title} ${exp.organization} ${exp.summary || ""} ${claimsText}`.toLowerCase();
    if (full.includes(q)) {
      results.push({
        id: exp.id,
        section: "experience",
        title: exp.title,
        subtitle: exp.organization,
        matchText: exp.summary || exp.responsibilities[0]?.text || exp.organization,
      });
    }
  }

  // 2. Education
  for (const edu of profile.education) {
    const full = `${edu.degree} ${edu.fieldOfStudy} ${edu.institution} ${edu.thesisTitle || ""}`.toLowerCase();
    if (full.includes(q)) {
      results.push({
        id: edu.id,
        section: "education",
        title: `${edu.degree}, ${edu.fieldOfStudy}`,
        subtitle: edu.institution,
        matchText: edu.thesisTitle || edu.institution,
      });
    }
  }

  // 3. Research Projects
  for (const proj of profile.researchProjects) {
    const methods = proj.methods.join(" ");
    const techs = proj.technologies.join(" ");
    const outcomes = proj.outcomes.map((o) => o.text).join(" ");
    const full = `${proj.title} ${proj.objective || ""} ${methods} ${techs} ${outcomes}`.toLowerCase();
    if (full.includes(q)) {
      results.push({
        id: proj.id,
        section: "research",
        title: proj.title,
        subtitle: proj.projectType,
        matchText: proj.objective || proj.outcomes[0]?.text || proj.title,
      });
    }
  }

  // 4. Skills
  for (const s of profile.skills) {
    if (s.name.toLowerCase().includes(q)) {
      results.push({
        id: s.id,
        section: "skills",
        title: s.name,
        subtitle: `${s.category} skill`,
        matchText: `Category: ${s.category}`,
      });
    }
  }

  // 5. Achievements
  for (const ach of profile.achievements) {
    const full = `${ach.title} ${ach.description} ${ach.metric?.value || ""}`.toLowerCase();
    if (full.includes(q)) {
      results.push({
        id: ach.id,
        section: "achievements",
        title: ach.title,
        subtitle: ach.date || "Achievement",
        matchText: ach.description,
      });
    }
  }

  // 6. Career Stories
  for (const story of profile.careerStories) {
    const actions = story.actions.join(" ");
    const demons = story.demonstrates.join(" ");
    const full = `${story.title} ${story.context || ""} ${story.challenge || ""} ${actions} ${demons}`.toLowerCase();
    if (full.includes(q)) {
      results.push({
        id: story.id,
        section: "stories",
        title: story.title,
        subtitle: "Career Story",
        matchText: story.challenge || story.actions[0] || story.title,
      });
    }
  }

  return results.slice(0, 8);
}
