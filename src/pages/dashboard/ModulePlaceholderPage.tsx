import { Clock3 } from "lucide-react";

type ModulePlaceholderPageProps = {
  title: string;
  section: "MONITORING" | "OPERATION" | "DIGITAL TWIN";
};

export default function ModulePlaceholderPage({ title, section }: ModulePlaceholderPageProps) {
  return (
    <section className="dashboard-page module-placeholder-page" aria-labelledby="module-title">
      <div className="dashboard-page-heading">
        <div className="dashboard-breadcrumb">ICS Digital Twin <span>/</span> {section}</div>
        <h1 id="module-title">{title}</h1>
      </div>
      <div className="module-placeholder-card">
        <span className="module-placeholder-icon"><Clock3 aria-hidden="true" size={20} /></span>
        <div>
          <h2>Module planned for a later phase</h2>
          <p>This area will be available in a future phase of the ICS Digital Twin platform.</p>
        </div>
        <span className="module-phase-tag">PLANNED</span>
      </div>
    </section>
  );
}
