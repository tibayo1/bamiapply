import type {
  AchievementRecord,
  CareerProfile,
  ProfileClaim,
  RecordMeta,
} from "@/types/profile";

/**
 * Demo Career Profile. This is the ONE candidate-evidence source for the app:
 * Job Analysis reads these records instead of keeping its own evidence fixture.
 *
 * Content is deliberately conservative — only established facts, no invented
 * metrics, participant counts, funding, awards, publications or dates.
 *
 * A few statuses are intentionally NOT "verified" so the verification model is
 * visible on first load: one draft suggested rewording, one imported skill that
 * needs confirmation, and one unknown work authorization.
 */

const T0 = "2026-01-15T09:00:00.000Z";

const user: Pick<RecordMeta, "source" | "createdAt" | "updatedAt"> = {
  source: "user",
  createdAt: T0,
  updatedAt: T0,
};
const verifiedMeta: RecordMeta = { ...user, verificationStatus: "verified" };

function claim(
  id: string,
  text: string,
  sourceRecordId: string,
  extra: Partial<ProfileClaim> = {}
): ProfileClaim {
  return {
    id,
    text,
    verificationStatus: "verified",
    source: "user",
    sourceRecordId,
    ...extra,
  };
}

/** Stable ids so other features (Job Analysis) can reference records directly. */
export const ID = {
  expDoctoral: "exp-doctoral-researcher",
  expMarigold: "exp-biomedical-engineer",
  eduPhd: "edu-phd-kadir-has",
  eduMsc: "edu-msc-ibadan",
  eduBsc: "edu-bsc-oau",
  projHaptic: "haptic-vr-study",
  projVibro: "proj-fingertip-wrist-vibrotactile",
  projEeg: "proj-eeg-motor-imagery",
  storyHaptic: "story-haptic-vr-stiffness",
  skillExperimentalDesign: "skill-experimental-design",
  skillPsychophysics: "skill-psychophysics",
  skillVr: "skill-virtual-reality",
  skillHaptics: "skill-haptic-interfaces",
  skillStats: "skill-statistical-analysis",
  skillUnity: "skill-unity",
  skillArduino: "skill-arduino",
  skillEeg: "skill-eeg-analysis",
  skillBiomed: "skill-biomedical-engineering",
  skillSignal: "skill-signal-processing",
  skillMedEquipment: "skill-medical-equipment",
  skillTroubleshooting: "skill-technical-troubleshooting",
  skillStakeholder: "skill-stakeholder-communication",
  skillPython: "skill-python",
  authSwissEu: "wa-switzerland-eu-efta",
} as const;

const doctoralClaims = {
  design: "c-dr-design",
  humans: "c-dr-human-participants",
  stats: "c-dr-statistics",
  eeg: "c-dr-eeg",
  hardware: "c-dr-hardware",
} as const;

/** Stable claim ids that other features (Job Analysis) may link to. */
export const CLAIM = {
  design: doctoralClaims.design,
  humans: doctoralClaims.humans,
  stats: doctoralClaims.stats,
  eeg: doctoralClaims.eeg,
  hardware: doctoralClaims.hardware,
  marigoldClinical: "c-mh-clinical",
  marigoldTroubleshoot: "c-mh-troubleshoot",
} as const;

export const MARIGOLD_ORIGINAL_CLAIM = "c-mh-original";

export function createDemoProfile(): CareerProfile {
  return {
    id: "profile-ayoade",
    personal: {
      ...verifiedMeta,
      name: "Ayoade Adeyemi",
      headline: "Biomedical Engineer & Doctoral Researcher",
      currentRole: "Doctoral Researcher, Kadir Has University",
      location: "Istanbul, Türkiye",
      website: "www.ayoadeadeyemi.com",
    },

    experiences: [
      {
        ...verifiedMeta,
        id: ID.expDoctoral,
        title: "Doctoral Researcher",
        organization: "Kadir Has University",
        location: "Istanbul, Türkiye",
        startDate: "2022",
        isCurrent: true,
        summary:
          "Doctoral research on haptic interfaces, psychophysics and EEG-based interaction.",
        responsibilities: [
          claim(
            doctoralClaims.design,
            "Designed haptic psychophysics experiments in virtual reality.",
            ID.expDoctoral
          ),
          claim(
            doctoralClaims.humans,
            "Ran human-participant perception studies.",
            ID.expDoctoral
          ),
          claim(
            doctoralClaims.stats,
            "Analysed experimental data using statistical methods.",
            ID.expDoctoral
          ),
          claim(
            doctoralClaims.eeg,
            "Analysed EEG recordings for motor imagery research.",
            ID.expDoctoral
          ),
          claim(
            doctoralClaims.hardware,
            "Integrated haptic hardware with Unity-based VR experiment software.",
            ID.expDoctoral
          ),
        ],
        achievementIds: [],
        skillIds: [
          ID.skillExperimentalDesign,
          ID.skillPsychophysics,
          ID.skillStats,
          ID.skillEeg,
          ID.skillUnity,
          ID.skillArduino,
          ID.skillHaptics,
        ],
      },
      {
        ...verifiedMeta,
        id: ID.expMarigold,
        title: "Biomedical Engineer",
        organization: "Marigold Hospital",
        summary: "Biomedical engineering role supporting hospital equipment.",
        responsibilities: [
          claim(MARIGOLD_ORIGINAL_CLAIM, "Worked with hospital equipment maintenance.", ID.expMarigold),
          claim("c-mh-maintained", "Maintained and supported biomedical equipment.", ID.expMarigold),
          claim("c-mh-troubleshoot", "Coordinated troubleshooting and repairs.", ID.expMarigold),
          claim("c-mh-clinical", "Worked with clinical teams.", ID.expMarigold),
          // Suggested rewording of the user's original statement. Stays a draft
          // until the user confirms it accurately represents their work.
          claim(
            "c-mh-suggested-pm",
            "Managed preventive maintenance activities across biomedical equipment.",
            ID.expMarigold,
            {
              verificationStatus: "draft",
              source: "suggested",
              derivedFromClaimId: MARIGOLD_ORIGINAL_CLAIM,
            }
          ),
        ],
        achievementIds: [],
        skillIds: [
          ID.skillBiomed,
          ID.skillMedEquipment,
          ID.skillTroubleshooting,
          ID.skillStakeholder,
        ],
      },
    ],

    education: [
      {
        ...verifiedMeta,
        id: ID.eduPhd,
        institution: "Kadir Has University",
        degree: "PhD",
        fieldOfStudy: "Computational Science and Engineering",
        startDate: "2022",
        isCurrent: true,
        location: "Istanbul, Türkiye",
      },
      {
        ...verifiedMeta,
        id: ID.eduMsc,
        institution: "University of Ibadan",
        degree: "MSc",
        fieldOfStudy: "Biomedical Engineering",
      },
      {
        ...verifiedMeta,
        id: ID.eduBsc,
        institution: "Obafemi Awolowo University",
        degree: "BSc",
        fieldOfStudy: "Mechanical Engineering",
      },
    ],

    researchProjects: [
      {
        ...verifiedMeta,
        id: ID.projHaptic,
        title: "Haptic VR psychophysics research",
        projectType: "research",
        organization: "Kadir Has University",
        objective:
          "Investigate how haptic feedback in virtual reality is perceived, including stiffness discrimination.",
        methods: ["Psychophysics experiments", "Experimental design", "Statistical analysis"],
        technologies: ["Unity", "Arduino", "Virtual reality", "Haptic interfaces"],
        role: "Researcher",
        outcomes: [
          claim(
            "c-hv-stiffness",
            "Ran haptic stiffness discrimination experiments in virtual reality.",
            ID.projHaptic
          ),
        ],
        skillIds: [
          ID.skillExperimentalDesign,
          ID.skillPsychophysics,
          ID.skillVr,
          ID.skillHaptics,
          ID.skillStats,
          ID.skillUnity,
          ID.skillArduino,
        ],
      },
      {
        ...verifiedMeta,
        id: ID.projVibro,
        title: "Fingertip vs wrist vibrotactile mapping",
        projectType: "research",
        organization: "Kadir Has University",
        objective: "Compare vibrotactile perception at the fingertip and at the wrist.",
        methods: ["Psychophysics experiments"],
        technologies: ["Haptic interfaces"],
        outcomes: [
          claim(
            "c-vm-compare",
            "Compared vibrotactile perception between the fingertip and the wrist.",
            ID.projVibro
          ),
        ],
        skillIds: [ID.skillPsychophysics, ID.skillHaptics],
      },
      {
        ...verifiedMeta,
        id: ID.projEeg,
        title: "EEG / motor imagery research",
        projectType: "research",
        organization: "Kadir Has University",
        objective: "Study EEG signals recorded during motor imagery.",
        methods: ["EEG signal analysis", "Signal processing"],
        technologies: [],
        outcomes: [
          claim("c-eeg-analysed", "Analysed EEG recordings from motor imagery tasks.", ID.projEeg),
        ],
        skillIds: [ID.skillEeg, ID.skillSignal],
      },
    ],

    skills: [
      skill(ID.skillExperimentalDesign, "Experimental design", "research", [
        { recordType: "experience", recordId: ID.expDoctoral, claimId: doctoralClaims.design },
        { recordType: "research_project", recordId: ID.projHaptic },
      ]),
      skill(ID.skillPsychophysics, "Psychophysics", "research", [
        { recordType: "research_project", recordId: ID.projHaptic },
        { recordType: "research_project", recordId: ID.projVibro },
      ]),
      skill(ID.skillVr, "Virtual reality", "technical", [
        { recordType: "research_project", recordId: ID.projHaptic },
      ]),
      skill(ID.skillHaptics, "Haptic interfaces", "technical", [
        { recordType: "research_project", recordId: ID.projHaptic },
        { recordType: "research_project", recordId: ID.projVibro },
      ]),
      skill(ID.skillStats, "Statistical analysis", "research", [
        { recordType: "experience", recordId: ID.expDoctoral, claimId: doctoralClaims.stats },
        { recordType: "research_project", recordId: ID.projHaptic },
      ]),
      skill(ID.skillUnity, "Unity", "software", [
        { recordType: "experience", recordId: ID.expDoctoral, claimId: doctoralClaims.hardware },
      ]),
      skill(ID.skillArduino, "Arduino", "engineering", [
        { recordType: "research_project", recordId: ID.projHaptic },
      ]),
      skill(ID.skillEeg, "EEG analysis", "research", [
        { recordType: "experience", recordId: ID.expDoctoral, claimId: doctoralClaims.eeg },
        { recordType: "research_project", recordId: ID.projEeg },
      ]),
      skill(ID.skillBiomed, "Biomedical engineering", "engineering", [
        { recordType: "experience", recordId: ID.expMarigold },
        { recordType: "education", recordId: ID.eduMsc },
      ]),
      skill(ID.skillSignal, "Signal processing", "technical", [
        { recordType: "research_project", recordId: ID.projEeg },
      ]),
      skill(ID.skillMedEquipment, "Medical equipment", "engineering", [
        { recordType: "experience", recordId: ID.expMarigold },
      ]),
      skill(ID.skillTroubleshooting, "Technical troubleshooting", "engineering", [
        { recordType: "experience", recordId: ID.expMarigold, claimId: "c-mh-troubleshoot" },
      ]),
      skill(ID.skillStakeholder, "Stakeholder communication", "professional", [
        { recordType: "experience", recordId: ID.expMarigold, claimId: "c-mh-clinical" },
      ]),
      // Imported but not yet confirmed. Typed in a CV, with no evidence behind it yet.
      {
        id: ID.skillPython,
        name: "Python",
        category: "software",
        evidenceLinks: [],
        source: "cv_import",
        verificationStatus: "needs_confirmation",
        createdAt: T0,
        updatedAt: T0,
      },
    ],

    // No achievements in the base profile: nothing has been established that
    // could be stated without inventing it. The empty state is intentional.
    achievements: [] as AchievementRecord[],

    careerStories: [
      {
        ...verifiedMeta,
        id: ID.storyHaptic,
        title: "Haptic VR Stiffness Study",
        context: "Doctoral research at Kadir Has University on haptic perception in virtual reality.",
        challenge:
          "Investigate how people discriminate stiffness through haptic feedback in virtual reality.",
        actions: [
          "Designed the psychophysics experiment.",
          "Integrated haptic hardware with the VR environment.",
          "Analysed participant responses statistically.",
        ],
        demonstrates: [
          "Research design",
          "Psychophysics",
          "Hardware integration",
          "Statistical analysis",
        ],
        usefulFor: ["Complex project", "Methodological challenge", "Problem solving"],
        skillIds: [
          ID.skillExperimentalDesign,
          ID.skillPsychophysics,
          ID.skillHaptics,
          ID.skillStats,
        ],
        evidenceLinks: [
          { recordType: "experience", recordId: ID.expDoctoral },
          { recordType: "research_project", recordId: ID.projHaptic },
        ],
      },
    ],

    workAuthorizations: [
      {
        id: ID.authSwissEu,
        countryOrRegion: "Switzerland / EU / EFTA",
        status: "unknown",
        source: "user",
        verificationStatus: "draft",
        createdAt: T0,
        updatedAt: T0,
      },
    ],

    preferences: {
      targetRoles: ["Research Scientist", "R&D Engineer", "Clinical Scientist"],
      industries: ["Medical devices", "Digital health", "HCI / XR"],
      preferredLocations: [],
      workStyles: [],
      employmentTypes: [],
      seniority: [],
      updatedAt: T0,
    },

    updatedAt: T0,
  };
}

function skill(
  id: string,
  name: string,
  category: CareerProfile["skills"][number]["category"],
  evidenceLinks: CareerProfile["skills"][number]["evidenceLinks"]
): CareerProfile["skills"][number] {
  return { ...verifiedMeta, id, name, category, evidenceLinks };
}
