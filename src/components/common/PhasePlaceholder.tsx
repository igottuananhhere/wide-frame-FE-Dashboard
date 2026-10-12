import { Activity } from "lucide-react";
import ScopedDashboardLink from "./ScopedDashboardLink";

type PhasePlaceholderProps = {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
};

export default function PhasePlaceholder({
  title,
  description,
  actionLabel,
  actionHref,
}: PhasePlaceholderProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-text-primary">
      <section
        aria-labelledby="page-title"
        className="w-full max-w-2xl rounded-2xl border border-border bg-surface p-8 shadow-2xl shadow-black/20 sm:p-10"
      >
        <div className="mb-8 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Activity aria-hidden="true" size={22} />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-wide text-text-primary">
              ICS DIGITAL TWIN
            </p>
            <p className="text-xs font-medium text-text-secondary">
              PROJECT FOUNDATION · PHASE 0
            </p>
          </div>
        </div>

        <div className="mb-8 border-l-2 border-accent pl-5">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-accent">
            Floor 1 · ICS Headquarters
          </p>
          <h1 id="page-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-text-secondary">
            {description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-border bg-surface-secondary px-3 py-1.5 text-xs font-medium text-text-secondary">
            Foundation only
          </span>
          <ScopedDashboardLink
            className="inline-flex min-h-10 items-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            to={actionHref}
          >
            {actionLabel}
          </ScopedDashboardLink>
        </div>
      </section>
    </main>
  );
}
