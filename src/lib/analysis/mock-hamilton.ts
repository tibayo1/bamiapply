import type { JobPosting, JobRequirementSpec, RequirementMatch } from "@/types/analysis";
import { CLAIM, ID } from "@/lib/profile/mock-profile";

/**
 * Hamilton Medical — Clinical Data & Trial Lead (parsed job, mock).
 *
 * JOB-SIDE data only: what the employer asks for, plus which Career Profile
 * records plausibly answer each requirement. There is NO candidate evidence
 * text here. Strength and gate status are derived from the profile by
 * applyProfileToRequirements, so the analysis always traces back to records
 * the user entered or confirmed.
 *
 * The `profileMatches` links are the mock stand-in for the future AI matcher.
 */

const direct = (
  recordType: RequirementMatch["link"]["recordType"],
  recordId: string,
  claimId?: string
): RequirementMatch => ({ link: { recordType, recordId, claimId }, relevance: "direct" });

const adjacent = (
  recordType: RequirementMatch["link"]["recordType"],
  recordId: string,
  claimId?: string
): RequirementMatch => ({ link: { recordType, recordId, claimId }, relevance: "adjacent" });

export const hamiltonRequirementSpecs: JobRequirementSpec[] = [
  // ── Critical gate ─────────────────────────────────────────────────────────
  {
    id: "req-crit-1",
    label: "Swiss / EU Work Authorization",
    description: "Eligible to work in Switzerland without requiring visa sponsorship.",
    sourceText:
      "Candidates must hold valid Swiss or EU/EFTA work authorization. Visa sponsorship is not offered for this role.",
    importance: "critical",
    category: "work_authorization",
    isHardBlocker: true,
    confirmationQuestion: "Do you hold valid, unrestricted Swiss or EU/EFTA work authorization?",
    rationale:
      "The employer states that Swiss or EU work authorization is mandatory and sponsorship is unavailable.",
    eligibility: {
      acceptedRegions: ["Switzerland", "EU", "EFTA"],
      sponsorshipAvailable: false,
    },
  },

  // ── Core (70% of scored fit) ──────────────────────────────────────────────
  {
    id: "req-core-1",
    label: "Experimental study design",
    description: "Formulation of research hypotheses, control structures, and testing protocols.",
    sourceText:
      "Demonstrated track record of designing rigorous experimental studies and validation protocols.",
    importance: "core",
    category: "experience",
    profileMatches: [
      direct("experience", ID.expDoctoral, CLAIM.design),
      direct("research_project", ID.projHaptic),
      direct("research_project", ID.projVibro),
    ],
  },
  {
    id: "req-core-2",
    label: "Human-subject research",
    description: "Conducting studies with human participants.",
    sourceText:
      "Extensive experience conducting human-subject trials in clinical or laboratory environments.",
    importance: "core",
    category: "experience",
    profileMatches: [
      direct("experience", ID.expDoctoral, CLAIM.humans),
      direct("research_project", ID.projVibro),
    ],
  },
  {
    id: "req-core-3",
    label: "Statistical analysis & quantitative methods",
    description: "Hypothesis testing, data modelling and inference.",
    sourceText:
      "Advanced proficiency in quantitative data analysis, ANOVA/regression, and scientific statistics using Python or R.",
    importance: "core",
    category: "skill",
    profileMatches: [
      direct("experience", ID.expDoctoral, CLAIM.stats),
      direct("research_project", ID.projHaptic),
    ],
  },
  {
    id: "req-core-4",
    label: "Biomedical & health-tech background",
    description: "Formal training or applied work in biomedical engineering or life sciences.",
    sourceText:
      "Degree or substantial background in Biomedical Engineering, Medical Technology, or adjacent scientific disciplines.",
    importance: "core",
    category: "education",
    profileMatches: [
      direct("education", ID.eduMsc),
      direct("experience", ID.expMarigold),
      adjacent("education", ID.eduPhd),
    ],
  },
  {
    id: "req-core-5",
    label: "Cross-functional collaboration",
    description: "Working across clinical, software, hardware and regulatory team members.",
    sourceText:
      "Ability to coordinate trials across cross-functional teams including engineering, clinical specialists, and data analysts.",
    importance: "core",
    category: "skill",
    profileMatches: [
      adjacent("experience", ID.expMarigold, CLAIM.marigoldClinical),
      adjacent("experience", ID.expMarigold, CLAIM.marigoldTroubleshoot),
    ],
    notes: {
      partial:
        "Your profile shows work with clinical teams while supporting hospital equipment, but not coordinating cross-functional trial teams.",
    },
  },
  {
    id: "req-core-6",
    label: "Research protocol documentation",
    description: "Writing study plans, standard operating procedures and ethics submissions.",
    sourceText:
      "Demonstrated capability in drafting clinical study protocols, ethics submissions, and documentation.",
    importance: "core",
    category: "experience",
    profileMatches: [],
    notes: {
      none: "No evidence found in your profile for protocol or ethics-submission writing. If you have done this work, you can add it.",
    },
  },
  {
    id: "req-core-7",
    label: "Physiological & quantitative data interpretation",
    description: "Extracting insight from sensor and physiological signals.",
    sourceText:
      "Experience interpreting sensory, respiratory, or physiological data in experimental trials.",
    importance: "core",
    category: "skill",
    profileMatches: [
      direct("research_project", ID.projEeg),
      direct("experience", ID.expDoctoral, CLAIM.eeg),
    ],
  },
  {
    id: "req-core-8",
    label: "Clinical trial leadership",
    description: "End-to-end management of regulated human clinical trials.",
    sourceText:
      "5+ years leading prospective clinical investigations or clinical trial work in med-tech.",
    importance: "core",
    category: "experience",
    profileMatches: [
      adjacent("experience", ID.expDoctoral, CLAIM.humans),
      adjacent("experience", ID.expDoctoral),
    ],
    notes: {
      partial:
        "Your profile shows human-participant research, but nothing about leading regulated clinical trials.",
    },
  },

  // ── Preferred (20%) ───────────────────────────────────────────────────────
  {
    id: "req-pref-1",
    label: "Medical device development",
    description: "Experience building or testing hardware/software medical apparatus.",
    sourceText:
      "Familiarity with medical device lifecycle, usability validation, and risk mitigation.",
    importance: "preferred",
    category: "industry",
    profileMatches: [
      adjacent("research_project", ID.projHaptic),
      adjacent("experience", ID.expMarigold, CLAIM.marigoldTroubleshoot),
    ],
    notes: {
      partial:
        "Related hardware and hospital-equipment work, but nothing on medical device development or validation.",
    },
  },
  {
    id: "req-pref-2",
    label: "Clinical data management",
    description: "Electronic data capture (EDC), clinical databases, and data cleaning routines.",
    sourceText:
      "Experience with EDC systems, REDCap, or clinical database management platforms.",
    importance: "preferred",
    category: "skill",
    profileMatches: [],
    notes: { none: "No evidence of EDC or clinical database work found in your profile." },
  },
  {
    id: "req-pref-3",
    label: "International study coordination",
    description: "Managing research across multi-site international facilities.",
    sourceText: "Experience coordinating multi-center or international trial sites.",
    importance: "preferred",
    category: "experience",
    profileMatches: [],
    notes: { none: "No multi-site or international coordination found in your profile." },
  },
  {
    id: "req-pref-4",
    label: "ISO 14155 / Good Clinical Practice (GCP)",
    description: "Clinical investigation of medical devices for human subjects standard.",
    sourceText: "Working knowledge of ISO 14155 and Good Clinical Practice (GCP) guidelines.",
    importance: "preferred",
    category: "certification",
    profileMatches: [],
    notes: { none: "No ISO 14155 or GCP training or certification found in your profile." },
  },

  // ── Contextual (10%) ──────────────────────────────────────────────────────
  {
    id: "req-cont-1",
    label: "Healthcare & clinical environment experience",
    description: "Familiarity with hospital workflows and clinical settings.",
    sourceText: "Exposure to hospital or clinical operational settings.",
    importance: "contextual",
    category: "industry",
    profileMatches: [direct("experience", ID.expMarigold)],
  },
  {
    id: "req-cont-2",
    label: "Academic-industry collaboration",
    description: "Bridging scientific research rigor with commercial deployment goals.",
    sourceText:
      "Comfort working at the interface between academic research and commercial engineering.",
    importance: "contextual",
    category: "experience",
    profileMatches: [
      adjacent("experience", ID.expDoctoral),
      adjacent("experience", ID.expMarigold),
    ],
    notes: {
      partial:
        "You have both academic research and hospital engineering experience, but nothing specific to commercial product work.",
    },
  },
];

export const hamiltonJob: JobPosting = {
  id: "hamilton-medical-001",
  company: "Hamilton Medical",
  role: "Clinical Data & Trial Lead",
  location: "Bonaduz, Switzerland",
  sourceUrl: "https://hamilton-medical.com/careers/clinical-data-trial-lead",
  requirements: hamiltonRequirementSpecs,
};
