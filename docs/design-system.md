# Clinical workspace design system — v0.4

## Sources and interpretation

The user requested UI/UX Pro Max. The skill was not installed in the available skill catalog, so its upstream instructions and search scripts were read and applied directly from the official repository at commit `bde080f4c6d546fea1313bff76960c99045b2ae7`.

- [UI/UX Pro Max instructions](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/bde080f4c6d546fea1313bff76960c99045b2ae7/.claude/skills/ui-ux-pro-max/SKILL.md)
- [Professional rules](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/bde080f4c6d546fea1313bff76960c99045b2ae7/.claude/skills/ui-ux-pro-max/references/pro-rules.md)
- [Google Fonts Heebo source and OFL license](https://github.com/google/fonts/tree/main/ofl/heebo)

Searches used: `healthcare operations dashboard` and `clinical data dashboard` with `--design-system --variance 3 --density 7`; `minimalism --domain style --rtl=full`; `medical records --domain product --rtl`; `data table navigation --domain ux`.

The relevant recommendations were minimal Swiss structure, clear clinical colors, strong hierarchy, accessible contrast, responsive tables and explicit focus treatment. The generated marketing patterns and non-Hebrew font suggestions were not suitable for hospital operations. The implementation uses a task-oriented workspace and a Hebrew font instead. These are design decisions, not a claim of a formal accessibility audit.

## Core tokens

| Role | Value | Use |
| --- | --- | --- |
| Primary | `#2459C4` | Main actions, active navigation, focus |
| Navy | `#162D50` | Headings and brand |
| Background | `#F4F7FC` | Workspace canvas |
| Surface | White | Forms, cards and tables |
| Success | `#24715A` | Approved state with text |
| Warning | `#875812` | Pending/review state with text |
| Danger | Red with pale background | Blocked state with text and icon |
| Typography | Heebo, Arial, sans-serif | Hebrew and Latin codes |
| Components | 8–14px radius, subtle borders and shadows | Operational clarity |

Body uses a 16px base; operational data, labels and secondary metadata use a deliberate hierarchy. The accent remains editable in Settings. Custom colors are not automatically contrast-certified.

## Layout and interaction

- RTL document and logical layout properties; identifiers use bidi isolation where mixed with Hebrew.
- White sidebar with operational groups, breadcrumb, local demo indicator and fast record search.
- Dashboard prioritizes real inventory and approvals, blocked-donor review, donor lookup and daily tasks.
- Recipient cards preserve personal, parents, relatives, partner, labs, IUI, pregnancy and document sections.
- Tables scroll in their own labelled regions. Narrow screens use an off-canvas navigation menu and stacked forms. No decorative photograph is used because records and actions are the main task.
- Focus-visible outlines, skip link, pressed/current semantics, labelled controls, modal error feedback and reduced-motion support.
- Status is never communicated by color alone. No invented trend, live-registry connection or clinical eligibility decision is added.

## Change points

Change palette and spacing in `dist/redesign.css`, shell/dashboard/search in `dist/workspace.js`, and fields/workflows in `dist/records.js` and `dist/app.js`. Keep `workspace.js` last in the HTML script order. Self-hosted font assets and their license live in `dist/assets/fonts/`.
