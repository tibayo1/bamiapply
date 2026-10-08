"use client";

import { useState } from "react";
import {
  Briefcase,
  GraduationCap,
  FlaskConical,
  Wrench,
  Award,
  BookOpen,
  Sliders,
  UploadCloud,
  RotateCcw,
  ShieldCheck,
  AlertCircle,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useProfile } from "@/lib/profile/context";
import { SECTIONS, type SectionId } from "@/lib/profile/sections";
import { getProfileSignals } from "@/lib/profile/selectors";
import type {
  PersonalProfile,
  CareerPreferences,
  ExperienceRecord,
  EducationRecord,
  ResearchProjectRecord,
  SkillRecord,
  AchievementRecord,
  CareerStory,
  WorkAuthorization,
} from "@/types/profile";

// Sections
import { OverviewSection } from "./OverviewSection";
import { ExperienceSection } from "./ExperienceSection";
import { EducationSection } from "./EducationSection";
import { ResearchProjectsSection } from "./ResearchProjectsSection";
import { SkillsSection } from "./SkillsSection";
import { AchievementsSection } from "./AchievementsSection";
import { CareerStoriesSection } from "./CareerStoriesSection";
import { PreferencesSection } from "./PreferencesSection";

// Modals / Drawers
import { ProfileSearch } from "./ProfileSearch";
import { ImportCvDialog } from "./ImportCvDialog";
import { RecordDrawer } from "./RecordDrawer";

// Forms
import { PersonalForm } from "./forms/PersonalForm";
import { ExperienceForm } from "./forms/ExperienceForm";
import { EducationForm } from "./forms/EducationForm";
import { ResearchProjectForm } from "./forms/ResearchProjectForm";
import { SkillForm } from "./forms/SkillForm";
import { AchievementForm } from "./forms/AchievementForm";
import { CareerStoryForm } from "./forms/CareerStoryForm";
import { WorkAuthForm } from "./forms/WorkAuthForm";
import { PreferencesForm } from "./forms/PreferencesForm";

type DrawerType =
  | "personal"
  | "experience"
  | "education"
  | "research"
  | "skill"
  | "achievement"
  | "story"
  | "workAuth"
  | "preferences";

interface DrawerState {
  open: boolean;
  type: DrawerType;
  record?: unknown;
}

const SECTION_ICONS: Record<SectionId, React.ComponentType<{ className?: string }>> = {
  overview: LayoutDashboard,
  experience: Briefcase,
  education: GraduationCap,
  research: FlaskConical,
  skills: Wrench,
  achievements: Award,
  stories: BookOpen,
  preferences: Sliders,
};

export function ProfileWorkspace() {
  const { profile, dispatch } = useProfile();
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const [importOpen, setImportOpen] = useState(false);
  const [drawer, setDrawer] = useState<DrawerState>({
    open: false,
    type: "experience",
  });

  const signals = getProfileSignals(profile);
  const totalItems = signals.verifiedItems + signals.needsConfirmation + signals.drafts;
  const completionPercentage =
    totalItems > 0 ? Math.round((signals.verifiedItems / totalItems) * 100) : 0;

  const getRecordCount = (id: SectionId) => {
    switch (id) {
      case "experience":
        return profile.experiences.length;
      case "education":
        return profile.education.length;
      case "research":
        return profile.researchProjects.length;
      case "skills":
        return profile.skills.length;
      case "achievements":
        return profile.achievements.length;
      case "stories":
        return profile.careerStories.length;
      case "preferences":
        return profile.workAuthorizations.length;
      default:
        return null;
    }
  };

  const openAddDrawer = (type: DrawerType) => {
    setDrawer({ open: true, type, record: undefined });
  };

  const openEditDrawer = (type: DrawerType, record: unknown) => {
    setDrawer({ open: true, type, record });
  };

  const closeDrawer = () => {
    setDrawer((prev) => ({ ...prev, open: false }));
  };

  const handleResetProfile = () => {
    if (
      window.confirm(
        "Reset your career profile back to the baseline demo data? Any unsaved edits will be lost."
      )
    ) {
      dispatch({ type: "RESET_PROFILE" });
    }
  };

  // Drawer Form Submission handler
  const handleSaveForm = (data: unknown) => {
    const { type, record } = drawer;
    const existingId = (record as { id?: string } | undefined)?.id;

    switch (type) {
      case "personal":
        dispatch({
          type: "UPDATE_PERSONAL",
          personal: data as Partial<PersonalProfile>,
        });
        break;

      case "preferences":
        dispatch({
          type: "UPDATE_PREFERENCES",
          preferences: data as Partial<CareerPreferences>,
        });
        break;

      case "experience": {
        const expData = data as Partial<ExperienceRecord>;
        dispatch({
          type: "UPSERT_RECORD",
          collection: "experiences",
          record: {
            ...expData,
            id: existingId || expData.id || `exp-${Date.now()}`,
          } as ExperienceRecord,
        });
        break;
      }

      case "education": {
        const eduData = data as Partial<EducationRecord>;
        dispatch({
          type: "UPSERT_RECORD",
          collection: "education",
          record: {
            ...eduData,
            id: existingId || eduData.id || `edu-${Date.now()}`,
          } as EducationRecord,
        });
        break;
      }

      case "research": {
        const projData = data as Partial<ResearchProjectRecord>;
        dispatch({
          type: "UPSERT_RECORD",
          collection: "researchProjects",
          record: {
            ...projData,
            id: existingId || projData.id || `proj-${Date.now()}`,
          } as ResearchProjectRecord,
        });
        break;
      }

      case "skill": {
        const skillData = data as Partial<SkillRecord>;
        dispatch({
          type: "UPSERT_RECORD",
          collection: "skills",
          record: {
            ...skillData,
            id: existingId || skillData.id || `skill-${Date.now()}`,
          } as SkillRecord,
        });
        break;
      }

      case "achievement": {
        const achData = data as Partial<AchievementRecord>;
        dispatch({
          type: "UPSERT_RECORD",
          collection: "achievements",
          record: {
            ...achData,
            id: existingId || achData.id || `ach-${Date.now()}`,
          } as AchievementRecord,
        });
        break;
      }

      case "story": {
        const storyData = data as Partial<CareerStory>;
        dispatch({
          type: "UPSERT_RECORD",
          collection: "careerStories",
          record: {
            ...storyData,
            id: existingId || storyData.id || `story-${Date.now()}`,
          } as CareerStory,
        });
        break;
      }

      case "workAuth": {
        const authData = data as Partial<WorkAuthorization>;
        dispatch({
          type: "UPSERT_RECORD",
          collection: "workAuthorizations",
          record: {
            ...authData,
            id: existingId || authData.id || `auth-${Date.now()}`,
          } as WorkAuthorization,
        });
        break;
      }
    }

    closeDrawer();
  };

  const getDrawerConfig = () => {
    const isEdit = Boolean(drawer.record);
    switch (drawer.type) {
      case "personal":
        return {
          title: "Personal & Contact Details",
          description: "Candidate name, contact, and public professional links.",
          formId: "personal-form",
        };
      case "experience":
        return {
          title: isEdit ? "Edit Experience" : "Add Experience",
          description: "Employment history and responsibilities.",
          formId: "experience-form",
        };
      case "education":
        return {
          title: isEdit ? "Edit Education" : "Add Education",
          description: "Degrees, institutions, and coursework.",
          formId: "education-form",
        };
      case "research":
        return {
          title: isEdit ? "Edit Research Project" : "Add Research Project",
          description: "Methodologies, technologies, and verified project outcomes.",
          formId: "research-project-form",
        };
      case "skill":
        return {
          title: isEdit ? "Edit Skill" : "Add Skill",
          description: "Technical or clinical skills tied to verifiable proof points.",
          formId: "skill-form",
        };
      case "achievement":
        return {
          title: isEdit ? "Edit Achievement" : "Add Achievement",
          description: "Stand-alone milestone or impact with verbatim metrics preserved.",
          formId: "achievement-form",
        };
      case "story":
        return {
          title: isEdit ? "Edit Career Story" : "Add Career Story",
          description: "STAR narrative for behavioral interview questions.",
          formId: "story-form",
        };
      case "workAuth":
        return {
          title: isEdit ? "Edit Work Authorization" : "Add Work Authorization",
          description: "Factual legal work rights per country or economic region.",
          formId: "work-auth-form",
        };
      case "preferences":
        return {
          title: "Career Preferences",
          description: "Aspirational target roles, preferred locations, and work styles.",
          formId: "preferences-form",
        };
    }
  };

  const drawerConfig = getDrawerConfig();

  return (
    <div className="space-y-6">
      {/* ── TOP HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 font-mono text-micro font-semibold uppercase tracking-wider text-brand">
            <span className="font-bold text-brand mr-0.5">/</span>
            CAREER PROFILE
          </div>
          <h1 className="mt-1 text-display-sm font-semibold tracking-tight text-ink">
            Career Evidence Workspace
          </h1>
          <p className="mt-1 text-meta text-ink-secondary max-w-2xl">
            The structured source of truth for your applications, tailored CVs, and deterministic job fit analysis. Every claim is tracked and verifiable.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ProfileSearch
            profile={profile}
            onSelectResult={(section) => setActiveSection(section)}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => setImportOpen(true)}
          >
            <UploadCloud className="h-4 w-4 mr-1.5" />
            Import CV
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleResetProfile}
            title="Reset profile to baseline demo data"
          >
            <RotateCcw className="h-4 w-4 mr-1 text-ink-muted" />
            Reset demo
          </Button>
        </div>
      </div>

      {/* ── MOBILE HORIZONTAL TAB RAIL ──────────────────────────────────────── */}
      <div className="flex lg:hidden overflow-x-auto no-scrollbar gap-2 pb-2 border-b border-line">
        {SECTIONS.map((sec) => {
          const Icon = SECTION_ICONS[sec.id];
          const count = getRecordCount(sec.id);
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSection(sec.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-meta whitespace-nowrap transition-ui ${
                isActive
                  ? "bg-brand text-white font-medium shadow-xs"
                  : "bg-surface text-ink-secondary border border-line hover:bg-canvas"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{sec.label}</span>
              {count !== null && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-micro font-mono ${
                    isActive ? "bg-white/20 text-white" : "bg-inset text-ink-muted"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── WORKSPACE GRID ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Sticky Sidebar Rail (Desktop) */}
        <aside className="hidden lg:block lg:col-span-3 sticky top-6 space-y-4">
          <nav className="rounded-xl border border-line bg-surface p-2 shadow-xs space-y-1">
            {SECTIONS.map((sec) => {
              const Icon = SECTION_ICONS[sec.id];
              const count = getRecordCount(sec.id);
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveSection(sec.id)}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-meta text-left transition-ui group ${
                    isActive
                      ? "bg-brand-subtle text-brand font-semibold"
                      : "text-ink-secondary hover:bg-canvas hover:text-ink"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`h-4 w-4 ${
                        isActive
                          ? "text-brand"
                          : "text-ink-muted group-hover:text-ink"
                      }`}
                    />
                    <span>{sec.label}</span>
                  </div>
                  {count !== null && (
                    <span
                      className={`font-mono text-micro px-2 py-0.5 rounded-full ${
                        isActive
                          ? "bg-brand text-white"
                          : "bg-inset text-ink-muted"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Verification Health summary widget */}
          <div className="rounded-xl border border-line bg-surface p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-micro font-semibold uppercase tracking-wider text-ink-muted">
                PROFILE READINESS
              </span>
              <span className="font-mono text-micro font-bold text-brand tabular-nums">
                {completionPercentage}%
              </span>
            </div>

            <div className="h-1.5 w-full rounded-full bg-inset overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>

            <div className="space-y-1.5 pt-1 text-micro">
              <div className="flex items-center justify-between text-ink-secondary">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-success" />
                  Verified items
                </span>
                <span className="font-mono font-medium text-ink tabular-nums">
                  {signals.verifiedItems}
                </span>
              </div>
              <div className="flex items-center justify-between text-ink-secondary">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-warning" />
                  Needs confirmation
                </span>
                <span className="font-mono font-medium text-ink tabular-nums">
                  {signals.needsConfirmation}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="lg:col-span-9 min-h-[500px]">
          {activeSection === "overview" && (
            <OverviewSection
              profile={profile}
              onEditPersonal={() => openEditDrawer("personal", profile.personal)}
              onOpenImport={() => setImportOpen(true)}
              onSelectSection={(sec) => setActiveSection(sec)}
            />
          )}

          {activeSection === "experience" && (
            <ExperienceSection
              profile={profile}
              onAdd={() => openAddDrawer("experience")}
              onEdit={(rec) => openEditDrawer("experience", rec)}
              onDelete={(id) =>
                dispatch({
                  type: "REMOVE_RECORD",
                  collection: "experiences",
                  id,
                })
              }
              onConfirmRecord={(id: string) =>
                dispatch({
                  type: "SET_VERIFICATION_STATUS",
                  collection: "experiences",
                  id,
                  status: "verified",
                })
              }
              onConfirmClaim={(recordId: string, claimId: string) =>
                dispatch({
                  type: "SET_VERIFICATION_STATUS",
                  collection: "experiences",
                  id: recordId,
                  claimId,
                  status: "verified",
                })
              }
            />
          )}

          {activeSection === "education" && (
            <EducationSection
              profile={profile}
              onAdd={() => openAddDrawer("education")}
              onEdit={(rec) => openEditDrawer("education", rec)}
              onDelete={(id) =>
                dispatch({
                  type: "REMOVE_RECORD",
                  collection: "education",
                  id,
                })
              }
              onConfirm={(id) =>
                dispatch({
                  type: "SET_VERIFICATION_STATUS",
                  collection: "education",
                  id,
                  status: "verified",
                })
              }
            />
          )}

          {activeSection === "research" && (
            <ResearchProjectsSection
              profile={profile}
              onAdd={() => openAddDrawer("research")}
              onEdit={(rec) => openEditDrawer("research", rec)}
              onDelete={(id) =>
                dispatch({
                  type: "REMOVE_RECORD",
                  collection: "researchProjects",
                  id,
                })
              }
              onConfirmRecord={(id: string) =>
                dispatch({
                  type: "SET_VERIFICATION_STATUS",
                  collection: "researchProjects",
                  id,
                  status: "verified",
                })
              }
              onConfirmClaim={(recordId: string, claimId: string) =>
                dispatch({
                  type: "SET_VERIFICATION_STATUS",
                  collection: "researchProjects",
                  id: recordId,
                  claimId,
                  status: "verified",
                })
              }
            />
          )}

          {activeSection === "skills" && (
            <SkillsSection
              profile={profile}
              onAdd={() => openAddDrawer("skill")}
              onEdit={(rec) => openEditDrawer("skill", rec)}
              onDelete={(id) =>
                dispatch({
                  type: "REMOVE_RECORD",
                  collection: "skills",
                  id,
                })
              }
              onConfirm={(id) =>
                dispatch({
                  type: "SET_VERIFICATION_STATUS",
                  collection: "skills",
                  id,
                  status: "verified",
                })
              }
            />
          )}

          {activeSection === "achievements" && (
            <AchievementsSection
              profile={profile}
              onAdd={() => openAddDrawer("achievement")}
              onEdit={(rec) => openEditDrawer("achievement", rec)}
              onDelete={(id) =>
                dispatch({
                  type: "REMOVE_RECORD",
                  collection: "achievements",
                  id,
                })
              }
              onConfirm={(id) =>
                dispatch({
                  type: "SET_VERIFICATION_STATUS",
                  collection: "achievements",
                  id,
                  status: "verified",
                })
              }
            />
          )}

          {activeSection === "stories" && (
            <CareerStoriesSection
              profile={profile}
              onAdd={() => openAddDrawer("story")}
              onEdit={(rec) => openEditDrawer("story", rec)}
              onDelete={(id) =>
                dispatch({
                  type: "REMOVE_RECORD",
                  collection: "careerStories",
                  id,
                })
              }
              onConfirm={(id) =>
                dispatch({
                  type: "SET_VERIFICATION_STATUS",
                  collection: "careerStories",
                  id,
                  status: "verified",
                })
              }
            />
          )}

          {activeSection === "preferences" && (
            <PreferencesSection
              profile={profile}
              onAddWorkAuth={() => openAddDrawer("workAuth")}
              onEditWorkAuth={(rec) => openEditDrawer("workAuth", rec)}
              onDeleteWorkAuth={(id) =>
                dispatch({
                  type: "REMOVE_RECORD",
                  collection: "workAuthorizations",
                  id,
                })
              }
              onConfirmWorkAuth={(id) =>
                dispatch({
                  type: "SET_VERIFICATION_STATUS",
                  collection: "workAuthorizations",
                  id,
                  status: "verified",
                })
              }
              onEditPreferences={() =>
                openEditDrawer("preferences", profile.preferences)
              }
            />
          )}
        </main>
      </div>

      {/* ── RECORD DRAWER FOR ALL RECORD FORMS ──────────────────────────────── */}
      <RecordDrawer
        open={drawer.open}
        onOpenChange={(open) => setDrawer((prev) => ({ ...prev, open }))}
        title={drawerConfig.title}
        description={drawerConfig.description}
        formId={drawerConfig.formId}
      >
        {drawer.type === "personal" && (
          <PersonalForm
            initial={(drawer.record as PersonalProfile) || profile.personal}
            onSubmit={handleSaveForm}
            formId={drawerConfig.formId}
          />
        )}
        {drawer.type === "experience" && (
          <ExperienceForm
            initial={drawer.record as Partial<ExperienceRecord> | undefined}
            onSubmit={handleSaveForm}
            formId={drawerConfig.formId}
          />
        )}
        {drawer.type === "education" && (
          <EducationForm
            initial={drawer.record as Partial<EducationRecord> | undefined}
            onSubmit={handleSaveForm}
            formId={drawerConfig.formId}
          />
        )}
        {drawer.type === "research" && (
          <ResearchProjectForm
            initial={drawer.record as Partial<ResearchProjectRecord> | undefined}
            onSubmit={handleSaveForm}
            formId={drawerConfig.formId}
          />
        )}
        {drawer.type === "skill" && (
          <SkillForm
            initial={drawer.record as Partial<SkillRecord> | undefined}
            profile={profile}
            onSubmit={handleSaveForm}
            formId={drawerConfig.formId}
          />
        )}
        {drawer.type === "achievement" && (
          <AchievementForm
            initial={drawer.record as Partial<AchievementRecord> | undefined}
            onSubmit={handleSaveForm}
            formId={drawerConfig.formId}
          />
        )}
        {drawer.type === "story" && (
          <CareerStoryForm
            initial={drawer.record as Partial<CareerStory> | undefined}
            onSubmit={handleSaveForm}
            formId={drawerConfig.formId}
          />
        )}
        {drawer.type === "workAuth" && (
          <WorkAuthForm
            initial={drawer.record as Partial<WorkAuthorization> | undefined}
            onSubmit={handleSaveForm}
            formId={drawerConfig.formId}
          />
        )}
        {drawer.type === "preferences" && (
          <PreferencesForm
            initial={(drawer.record as CareerPreferences) || profile.preferences}
            onSubmit={handleSaveForm}
            formId={drawerConfig.formId}
          />
        )}
      </RecordDrawer>

      {/* ── CV IMPORT SIMULATION MODAL ─────────────────────────────────────── */}
      <ImportCvDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
