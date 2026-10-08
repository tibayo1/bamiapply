import type {
  AchievementRecord,
  EducationRecord,
  ExperienceRecord,
  ResearchProjectRecord,
  SkillRecord,
} from "@/types/profile";

export interface StagedCvImport {
  experiences: ExperienceRecord[];
  education: EducationRecord[];
  researchProjects: ResearchProjectRecord[];
  skills: SkillRecord[];
  achievements: AchievementRecord[];
}

const T_IMPORT = "2026-02-01T10:00:00.000Z";

export function getMockCvExtractionFixture(): StagedCvImport {
  return {
    experiences: [
      {
        id: "imp-exp-kadir-has",
        title: "PhD Researcher", // Deliberately overlaps with existing "Doctoral Researcher" at Kadir Has University
        organization: "Kadir Has University",
        location: "Istanbul, Türkiye",
        startDate: "2022",
        isCurrent: true,
        summary:
          "Doctoral candidate conducting research in computational science, haptics, and sensory simulation.",
        responsibilities: [
          {
            id: "imp-c-dr-1",
            text: "Designed and built interactive psychophysics experiments.",
            verificationStatus: "needs_confirmation",
            source: "cv_import",
          },
          {
            id: "imp-c-dr-2",
            text: "Formulated statistical pipelines for experimental dataset processing.",
            verificationStatus: "needs_confirmation",
            source: "cv_import",
          },
        ],
        achievementIds: [],
        skillIds: ["imp-sk-matlab", "imp-sk-scipy"],
        source: "cv_import",
        verificationStatus: "needs_confirmation",
        createdAt: T_IMPORT,
        updatedAt: T_IMPORT,
      },
      {
        id: "imp-exp-intern",
        title: "Biomedical Engineering Intern",
        organization: "University College Hospital",
        location: "Ibadan, Nigeria",
        startDate: "2018",
        endDate: "2018",
        summary: "Supported hospital clinical engineering team with diagnostic equipment testing.",
        responsibilities: [
          {
            id: "imp-c-uch-1",
            text: "Assisted senior engineers with routine calibration of diagnostic monitors.",
            verificationStatus: "needs_confirmation",
            source: "cv_import",
          },
        ],
        achievementIds: [],
        skillIds: ["imp-sk-calibration"],
        source: "cv_import",
        verificationStatus: "needs_confirmation",
        createdAt: T_IMPORT,
        updatedAt: T_IMPORT,
      },
    ],

    education: [
      {
        id: "imp-edu-phd",
        institution: "Kadir Has University",
        degree: "PhD Candidate",
        fieldOfStudy: "Computational Science & Engineering",
        startDate: "2022",
        isCurrent: true,
        location: "Istanbul, Türkiye",
        source: "cv_import",
        verificationStatus: "needs_confirmation",
        createdAt: T_IMPORT,
        updatedAt: T_IMPORT,
      },
      {
        id: "imp-edu-msc",
        institution: "University of Ibadan",
        degree: "Master of Science",
        fieldOfStudy: "Biomedical Engineering",
        source: "cv_import",
        verificationStatus: "needs_confirmation",
        createdAt: T_IMPORT,
        updatedAt: T_IMPORT,
      },
    ],

    researchProjects: [
      {
        id: "imp-proj-sensorimotor",
        title: "Sensorimotor Adaptation in VR",
        projectType: "research",
        organization: "Kadir Has University",
        objective: "Assess user adaptation rates to force-feedback anomalies in virtual environments.",
        methods: ["Force feedback modelling", "Psychophysical staircases"],
        technologies: ["Unity", "C#"],
        outcomes: [
          {
            id: "imp-c-proj-1",
            text: "Demonstrated measurable adaptation latencies across participant trials.",
            verificationStatus: "needs_confirmation",
            source: "cv_import",
          },
        ],
        skillIds: [],
        source: "cv_import",
        verificationStatus: "needs_confirmation",
        createdAt: T_IMPORT,
        updatedAt: T_IMPORT,
      },
    ],

    skills: [
      {
        id: "imp-sk-matlab",
        name: "MATLAB",
        category: "software",
        evidenceLinks: [],
        source: "cv_import",
        verificationStatus: "needs_confirmation",
        createdAt: T_IMPORT,
        updatedAt: T_IMPORT,
      },
      {
        id: "imp-sk-scipy",
        name: "SciPy / NumPy",
        category: "software",
        evidenceLinks: [],
        source: "cv_import",
        verificationStatus: "needs_confirmation",
        createdAt: T_IMPORT,
        updatedAt: T_IMPORT,
      },
      {
        id: "imp-sk-timeseries",
        name: "Time-Series Signal Processing",
        category: "technical",
        evidenceLinks: [],
        source: "cv_import",
        verificationStatus: "needs_confirmation",
        createdAt: T_IMPORT,
        updatedAt: T_IMPORT,
      },
      {
        id: "imp-sk-calibration",
        name: "Sensor Calibration",
        category: "engineering",
        evidenceLinks: [],
        source: "cv_import",
        verificationStatus: "needs_confirmation",
        createdAt: T_IMPORT,
        updatedAt: T_IMPORT,
      },
      {
        id: "imp-sk-git",
        name: "Git / Version Control",
        category: "software",
        evidenceLinks: [],
        source: "cv_import",
        verificationStatus: "needs_confirmation",
        createdAt: T_IMPORT,
        updatedAt: T_IMPORT,
      },
    ],

    achievements: [
      {
        id: "imp-ach-symposium",
        title: "Presented Research Findings at Computational Perception Symposium",
        description: "Shared experimental results regarding multimodal haptic cues with international academic peers.",
        date: "2024",
        source: "cv_import",
        verificationStatus: "needs_confirmation",
        createdAt: T_IMPORT,
        updatedAt: T_IMPORT,
      },
    ],
  };
}
