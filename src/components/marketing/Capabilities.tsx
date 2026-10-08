const progression = [
  {
    step: "01",
    title: "Understand the role",
    description: "See what matters before you spend time applying.",
    detail: "Fit score · Gap analysis · Risk check",
  },
  {
    step: "02",
    title: "Use your experience",
    description: "Bámi finds the evidence in your career history.",
    detail: "Verified history · Proof points · Zero fluff",
  },
  {
    step: "03",
    title: "Build the application",
    description: "Tailor your CV, letter and application answers.",
    detail: "Role-specific CV · Cover letter · Q&A",
  },
  {
    step: "04",
    title: "Track what happens",
    description: "Keep every opportunity and outcome together.",
    detail: "Pipeline · Interviews · Offers",
  },
];

/**
 * Editorial narrative progression replacing generic feature cards.
 * Uses deliberate typography, oversized sequence numbers, and fine dividing rules.
 */
export function Capabilities() {
  return (
    <section
      aria-labelledby="capabilities-heading"
      className="border-t border-line bg-surface py-20 sm:py-28"
    >
      <div className="mx-auto w-full max-w-wide xl:max-w-6xl 2xl:max-w-[82rem] px-4 sm:px-6 lg:px-10">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 pb-12">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 font-mono text-micro font-semibold uppercase tracking-wider text-brand">
              <span className="font-bold text-brand mr-1">/</span>
              THE PROGRESSION
            </div>
            <h2
              id="capabilities-heading"
              className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-[-0.03em] text-ink break-words leading-tight"
            >
              One profile. Every application.
            </h2>
          </div>
          <p className="max-w-md text-body text-ink-secondary leading-relaxed">
            A systematic career copilot that evaluates opportunities first, then constructs targeted materials strictly from confirmed experience.
          </p>
        </div>

        {/* Narrative Flow: 01 to 04 */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 min-w-0">
          {progression.map(({ step, title, description, detail }) => (
            <div
              key={step}
              className="flex flex-col justify-between pt-6 border-t border-line-strong min-w-0"
            >
              <div className="min-w-0">
                <span className="font-mono text-3xl sm:text-4xl font-light text-ink-muted/50 tracking-tight block">
                  {step}
                </span>
                <h3 className="mt-3 text-heading font-semibold text-ink tracking-tight break-words">
                  {title}
                </h3>
                <p className="mt-2 text-body text-ink-secondary leading-relaxed">
                  {description}
                </p>
              </div>

              <div className="mt-8 pt-3 border-t border-line flex items-center gap-1.5 font-mono text-[0.72rem] text-ink-muted min-w-0">
                <span className="text-brand font-bold shrink-0">/</span>
                <span className="leading-tight break-words">{detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
