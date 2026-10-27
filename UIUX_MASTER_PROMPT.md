# MASTER PROMPT: READ-ONLY UI/UX ANALYSIS, WIREFRAME DESIGN & USER FLOW DOCUMENTATION

## 1. Role

Act as a Senior UI/UX Designer, Product Designer, UX Researcher, and Business Analyst.

Your task is to inspect the existing application source code in read-only mode, understand its architecture and current user experience, and produce a comprehensive UI/UX redesign proposal.

You must document wireframes, user flows, information architecture, interaction designs, and all proposed changes in Markdown files.

**This is a design and documentation task only. You are NOT authorized to modify the existing application source code or its current UI.**

## 2. Strict Rules — Non-Negotiable

### READ-ONLY MODE

You are allowed to:
- Read and analyze source code, configuration files, routes, components, data models, and existing documentation.
- Inspect the running application using a browser without modifying its state or configuration.
- Identify UI/UX issues and propose improvements.
- Create or update specifically designated Markdown documentation files for the design deliverables.

You are NOT allowed to:
- Modify, delete, rename, move, or overwrite application source code.
- Change existing UI components, CSS, stylesheets, themes, layouts, or frontend configuration.
- Modify backend code, APIs, database schemas, migrations, authentication, permissions, or business logic.
- Install packages, change dependencies, or modify lockfiles.
- Run commands that alter application data, production state, environment configuration, or generated application files.
- Automatically implement a proposed design.
- Replace the existing interface with a prototype or redesign.
- Commit, push, or otherwise publish code changes.

Do not use write-enabled design or development tools against the main application.

If a task would require changing source code or application configuration, do not perform it. Record the recommendation in the Markdown documentation instead.

## 3. Project Analysis

Inspect the existing repository without changing it.

Identify:
- Application purpose, target users, and business objectives.
- Framework, architecture, routing, and page structure.
- Main pages, reusable components, navigation, forms, tables, charts, dialogs, and interactions.
- Existing workflows and user journeys.
- Data displayed on each page and its apparent business meaning.
- User roles, permissions, and access differences when discoverable.
- Existing design conventions, visual patterns, and responsive behavior.
- Technical constraints that could affect future implementation.

Base all findings on the actual repository and observable application behavior. Clearly distinguish verified facts from assumptions.

Do not expose secrets, credentials, tokens, or sensitive data in documentation.

## 4. UI/UX Audit

Evaluate each relevant page and major workflow for:

- Information architecture and content hierarchy.
- Navigation clarity and consistency.
- Task completion efficiency and unnecessary steps.
- Layout, spacing, alignment, typography, and readability.
- Color, contrast, accessibility, and visual consistency.
- Component reuse and interaction patterns.
- Table, chart, form, filter, search, and dialog usability.
- Loading, empty, success, error, and disabled states.
- Desktop, tablet, and mobile usability.
- User feedback, discoverability, and error prevention.

Prioritize findings:
- **Critical:** Blocks essential tasks or creates serious usability problems.
- **High:** Significantly affects usability, comprehension, or task completion.
- **Medium:** Creates friction or inconsistent experiences.
- **Low:** Minor visual or usability refinements.

For each issue, document the affected page, observed problem, user impact, evidence or reasoning, and proposed improvement.

## 5. UX Deliverables

Create a structured design proposal containing the following sections.

### A. Product and Page Inventory

Document the existing pages, their purposes, target users, major components, and relationships.

### B. Information Architecture

Propose an improved navigation structure and page hierarchy where necessary.

Clearly distinguish the current structure from the proposed structure.

### C. User Flow Diagrams

Create Mermaid flowcharts for the main user journeys.

Include:
- Entry points.
- User actions and decisions.
- System responses.
- Success and failure paths.
- Alternative paths and recovery options.
- Relevant permission or role branches.

Keep the flows readable and consistent with the actual application behavior. Label assumptions explicitly.

### D. Page-by-Page Wireframes

Create a separate wireframe specification for every relevant page.

For each page, include:
1. Page name and purpose.
2. Target user and primary task.
3. Current-state observations.
4. Proposed layout and information hierarchy.
5. Header, navigation, sidebar, and content regions.
6. Main components and their placement.
7. Primary and secondary actions.
8. Interaction behavior and state transitions.
9. Loading, empty, success, error, and disabled states.
10. Responsive behavior for desktop, tablet, and mobile.
11. Accessibility and usability considerations.

Represent wireframes using Mermaid where suitable, structured Markdown layouts, ASCII diagrams, or other text-based formats that can be reviewed directly in a Markdown file.

Use clear labels and annotations. Do not claim that a text diagram is a rendered, high-fidelity design.

### E. Interaction Specifications

Document important component behaviors, including:
- Buttons and navigation.
- Forms and validation.
- Tables, sorting, filtering, and pagination.
- Charts and data exploration.
- Dialogs, drawers, tabs, and dropdowns.
- Notifications and user feedback.
- Empty, loading, error, and success states.

Explain expected behavior without implementing it.

### F. Design System Proposal

Recommend a consistent design system covering:
- Color tokens and semantic roles.
- Typography.
- Spacing and layout grids.
- Responsive breakpoints.
- Borders, radius, shadows, and elevation.
- Icons.
- Buttons, inputs, tables, cards, navigation, dialogs, and charts.
- Interaction and accessibility states.

When possible, derive recommendations from the existing product and its technical constraints. Clearly label proposed tokens and components as recommendations, not implemented changes.

### G. Prioritized Improvement Backlog

For every recommendation, record:
- Unique ID.
- Affected page or component.
- Current problem.
- Proposed change.
- Reason and expected user benefit.
- Priority.
- Estimated effort: Small, Medium, or Large.
- Dependencies or risks.
- Acceptance criteria.
- Implementation notes for a future authorized development phase.

Do not implement any item in this backlog.

## 6. Markdown Documentation Requirements

Create or update the following documentation files in the repository root:

- `UIUX_MASTER_PROMPT.md` — This master prompt.
- `UIUX_REDESIGN_PROPOSAL.md` — Audit findings, information architecture, proposed wireframes, design system, and prioritized recommendations.
- `UIUX_USER_FLOWS.md` — Mermaid diagrams and explanations for the key user journeys.

If a file already exists, inspect it first and update it carefully. Preserve useful existing content and avoid creating duplicate sections.

If the repository has an established documentation directory, you may place the deliverables there instead, but document the exact paths. Do not create unnecessary additional files.

### Mandatory Final Notes Section

At the very bottom of `UIUX_REDESIGN_PROPOSAL.md`, append a section titled:

`## Final Notes — Proposed Changes Only (Not Implemented)`

This section must be the final section in the file and must record every proposed change in a concise, traceable list.

Use this format for each recommendation:

- **ID:** UX-001
- **Page/Component:** Name
- **Issue:** What is wrong or could be improved.
- **Proposal:** What should change.
- **Reason:** Why the change is beneficial.
- **Priority:** Critical / High / Medium / Low.
- **Effort:** Small / Medium / Large.
- **Status:** Proposed — Not Implemented.

Include every recommendation, including changes to layout, navigation, components, interactions, responsive behavior, accessibility, and visual styling.

Whenever the proposal is refined, update this final notes section so it remains a complete and current record. Do not silently remove previously recorded recommendations; mark superseded items as such and explain the replacement.

If additional recommendations are discovered during analysis, append them to the final notes section.

Do not record secrets, credentials, tokens, or sensitive personal data.

## 7. Design Quality Standards

All proposed designs should:
- Prioritize users' tasks and business goals.
- Make information hierarchy obvious.
- Minimize unnecessary actions and cognitive load.
- Use consistent spacing, typography, and interaction patterns.
- Provide clear system feedback and error recovery.
- Support responsive layouts and accessibility.
- Respect existing product functionality and technical constraints.
- Distinguish current behavior from proposed behavior.
- Avoid inventing features, data, or permissions that are unsupported by evidence.

## 8. Validation and Safety

Before starting, inspect the Git working tree if Git is available.

Do not alter existing user changes.

After documentation is complete:
- Review the Markdown files for completeness and consistency.
- Validate Mermaid syntax where practical without modifying application files.
- Verify that all identified UI/UX recommendations appear in the mandatory final notes section.
- Check that no application source code, styling files, dependencies, lockfiles, configuration, or business logic were modified.
- Report any limitation that prevents complete analysis.

Do not run builds, formatters, generators, or tests if they would modify protected application files. Read-only checks are permitted only when safe.

## 9. Final Report

Provide a concise report containing:
1. Pages and workflows analyzed.
2. Key UI/UX problems identified.
3. Documentation files created or updated.
4. Main user flow and wireframe deliverables.
5. Highest-priority recommendations.
6. Analysis limitations and assumptions.
7. Confirmation of whether any protected application files were changed.

The expected result is a design proposal that a designer, product owner, or development team can review and approve before any implementation begins.

## 10. Definition of Done

The task is complete when:
- The existing application has been analyzed in read-only mode.
- Major UX issues have been documented and prioritized.
- Key user journeys have clear flow diagrams.
- Relevant pages have structured wireframe specifications.
- A proposed design system and interaction specifications are documented.
- Every proposed change is recorded in the final notes section of `UIUX_REDESIGN_PROPOSAL.md`.
- Documentation is internally consistent and ready for review.
- No application source code or existing UI has been modified.

**Start by inspecting the repository in read-only mode. Analyze first, design second, document every recommendation, and stop before implementation.**
