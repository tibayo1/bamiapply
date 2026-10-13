<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Bámi Apply development

- Career Profile is the candidate's source of truth. Never invent experience, dates, employers, eligibility, achievements, or metrics.
- Preserve stable record/claim IDs, source metadata, and derivation links. An ordinary save must not promote imported or draft claims. Changed verified statements require fresh confirmation.
- A verified record and a verified claim are separate requirements for usable evidence. Imported facts start pending; suggested wording stays a draft.
- Fit percentages come from the deterministic scoring engine. Critical eligibility is a separate recommendation gate. AI may propose structured requirements or wording, not fit percentages or candidate facts.
- Analysis what-if overrides are temporary self-reports, not verified Profile evidence. Do not use them as factual application claims.
- Profile and Applications are separate domains. Saving an application must not rewrite the Profile; future documents must retain their evidence references and submission history.
- Validate data at import, form, reducer, and persistence boundaries. Preserve unreadable or unsupported saved data; never replace it silently with demo facts.
- Use the existing checkout and dependencies. Keep edits scoped, add regression coverage for changed behavior, and run `npm run check` before declaring a change complete.
- Applications own browser-local lifecycle state and immutable assessment history. Saving or reopening must not silently refresh evidence or downgrade an advanced status. Reassessment appends a snapshot after Profile or time-dependent eligibility changes.
- Reviewed Jobs are separate employer-side records. Keep the original posting and source quotes, require human review, and explicitly link verified Profile evidence. Unknown employer sponsorship stays unknown; do not infer candidate eligibility from a job description. Existing Application snapshots must survive later changes or loss of the Jobs store.
- Relevant React guidance is installed in `.agents/skills/vercel-composition-patterns/SKILL.md` and `.agents/skills/vercel-react-best-practices/SKILL.md`. Product evidence and data-preservation rules above take precedence over generic performance examples.
