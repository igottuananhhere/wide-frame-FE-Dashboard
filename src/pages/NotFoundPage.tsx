import PhasePlaceholder from "../components/common/PhasePlaceholder";

export default function NotFoundPage() {
  return (
    <PhasePlaceholder
      title="Page not found"
      description="This address does not match a route in the Phase 0 application foundation."
      actionLabel="Go to dashboard"
      actionHref="/dashboard"
    />
  );
}
