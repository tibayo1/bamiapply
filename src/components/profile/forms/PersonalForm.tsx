"use client";

import { useState } from "react";
import type { PersonalProfile } from "@/types/profile";

interface PersonalFormProps {
  initial: PersonalProfile;
  onSubmit: (data: Partial<PersonalProfile>) => void;
  formId?: string;
}

export function PersonalForm({
  initial,
  onSubmit,
  formId = "personal-form",
}: PersonalFormProps) {
  const [name, setName] = useState(initial.name || "");
  const [headline, setHeadline] = useState(initial.headline || "");
  const [currentRole, setCurrentRole] = useState(initial.currentRole || "");
  const [location, setLocation] = useState(initial.location || "");
  const [email, setEmail] = useState(initial.email || "");
  const [phone, setPhone] = useState(initial.phone || "");
  const [linkedin, setLinkedin] = useState(initial.linkedin || "");
  const [website, setWebsite] = useState(initial.website || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      headline: headline.trim(),
      currentRole: currentRole.trim() || undefined,
      location: location.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      linkedin: linkedin.trim() || undefined,
      website: website.trim() || undefined,
    });
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="per-name" className="block text-meta font-medium text-ink">
            Full Name <span className="text-danger">*</span>
          </label>
          <input
            id="per-name"
            required
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ayoade Adeyemi"
            className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="per-role" className="block text-meta font-medium text-ink">
            Current Position
          </label>
          <input
            id="per-role"
            type="text"
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value)}
            placeholder="e.g. Doctoral Researcher, Kadir Has University"
            className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="per-headline" className="block text-meta font-medium text-ink">
          Professional Headline <span className="text-danger">*</span>
        </label>
        <input
          id="per-headline"
          required
          type="text"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="e.g. Biomedical Engineer & Doctoral Researcher"
          className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="per-loc" className="block text-meta font-medium text-ink">
            Location
          </label>
          <input
            id="per-loc"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Istanbul, Türkiye"
            className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="per-web" className="block text-meta font-medium text-ink">
            Portfolio / Website
          </label>
          <input
            id="per-web"
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="e.g. www.ayoadeadeyemi.com"
            className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="per-email" className="block text-meta font-medium text-ink">
            Email
          </label>
          <input
            id="per-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. ayoade@example.com"
            className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="per-phone" className="block text-meta font-medium text-ink">
            Phone
          </label>
          <input
            id="per-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. +90 555 123 4567"
            className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="per-linkedin" className="block text-meta font-medium text-ink">
          LinkedIn URL
        </label>
        <input
          id="per-linkedin"
          type="text"
          value={linkedin}
          onChange={(e) => setLinkedin(e.target.value)}
          placeholder="e.g. linkedin.com/in/ayoade-adeyemi"
          className="mt-1.5 w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-body text-ink focus:border-brand focus:bg-surface focus:outline-none"
        />
      </div>
    </form>
  );
}
