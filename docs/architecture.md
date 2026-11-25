# Prototype architecture and next implementation steps

## Scope

This release is an editable, dependency-free browser prototype, not a hospital production system. All initial records are synthetic. Each browser stores its own JSON state in localStorage; there is no backend, server authorization, shared state, institution isolation or national registry integration. Hosting access, when supplied, is separate from application role authorization.

The GitHub repository is the source for ongoing development. The `dist` directory is the runnable application, with no build step. `npm run dev` serves it with Python. A private hosted preview may mirror the same files; GitHub pushes do not automatically deploy that preview.

## Record model

| Collection | Meaning | Relationships |
| --- | --- | --- |
| donors | Internal code, alias, origin, source bank and external code, arrival, donor status, confidential demo identity | Primary donor ID |
| doses | One row per physical vial, batch/session, donation/freezing/receipt dates, preparation, cryostorage location, disposition | Donor, optionally recipient |
| recipients | Recipient code, demo name, active/paused/completed case status | Referenced by treatments, doses, embryos, births |
| uses | Consumption of one vial for IUI, IVF or ICSI, date and cycle reference | Dose, donor, recipient |
| embryos | One reported cryopreserved embryo batch per donor/recipient/cycle, original frozen count, used, discarded, location | Donor, recipient, cycle |
| births | One child per row, birth/report dates, health information category and source narrative | Donor, recipient, cycle reference |
| approvals | Decision, decision date, receipt date, expiry, reference, reason; explicit release flag when applicable | Donor |
| transfers | Inbound/outbound bank movement, date, reference, exact dose IDs | Donor, doses |
| payments | Recorded payment to a local donor, date, amount and donation session/reference | Donor |
| mohUpdates | Manual/import receipt log | Reference and row count |
| audit | Local activity history; editable and not tamper resistant | Free text and timestamps |
| settings | Institution/unit labels and accent color | Applies to this browser |

Current donor origin denotes the original sourcing route. Inbound shipments are entered through vial intake and produce transfer records for non-local donors. Outbound transfers retain vial records with transferred disposition. Source bank aliases should be standardized into dedicated bank and donor-code-mapping tables for cross-hospital production use.

## Operational rules implemented

1. A new donor starts pending. An active donor additionally needs a currently valid latest effective approval before a new vial use can be registered.
2. A blocking decision prevents new vial use and outward shipment. An imported approval cannot release an existing block. A separate release form requires a reference, justification, decision and receipt dates, and current approval expiry.
3. Historical use dates also require an effective approval on the treatment date. Date-only decisions cannot establish ordering within the same calendar day; production needs effective timestamps.
4. Each physical vial can be consumed once. A reservation must match the recipient. The recipient case must be active.
5. Quarantine release requires a currently usable donor and recorded justification. Used/transferred/discarded vials cannot be returned to inventory through the management form.
6. Outbound transfers validate all requested vials before changing any of them; only available, unreserved vials from one eligible donor can move.
7. Embryo remaining count = initially frozen − used − discarded and cannot be negative. These are reported inventory counts, not instructions to transfer embryos. Embryos associated with a blocked donor are flagged for clinical review.
8. MOH CSV imports validate the full file, existing internal donor codes, dates, decisions and duplicates before application. A manual checkbox confirms source review. This is not authentication of the issuing authority. A blocking decision dominates other decisions in the same batch.
9. Backup restore checks schema, unique IDs, major foreign keys, counts and treatment/vial associations before replacing local data. It is not a security validation service and does not turn untrusted data into clinical records.
10. CSV outputs quote cells, preserve Hebrew with UTF-8 BOM, and prefix spreadsheet formula-like cells to mitigate formula execution.

## Metrics and reports

- Historical recipients: unique recipients with a documented treatment for the donor.
- Still in treatment: active recipient cases connected through treatment, reserved vial or positive frozen embryo inventory.
- Linked cases for a blocked donor also include reported births.
- No national or other-hospital usage counts are inferred. Counts update only from this browser's records.
- Period filters apply to treatment, birth, transfer and payment event dates. Stock, blocked-donor and embryo reports are current snapshots, not reconstructed historical stock.
- Donation-session count uses distinct local batch/session IDs. Payment amounts are synthetic examples and not a reimbursement tariff.

## Production work still required

Use a transactional database and authenticated API. Separate donor identity from operational records and encrypt it with distinct access controls. Enforce institution tenancy and role permissions on the server. Use immutable audit records, supervised status transitions and clinician review where appropriate. Provide file/document management with provenance, approvals and original MOH documents, backup/restore exercises, barcode identity checks, concurrency controls and reconciliation across banks.

Replace free-text references with validated entities where the institution requires them. Add official MOH integration only after its protocol, authorized identifiers, allowed fields and access arrangements are confirmed. Importing a CSV is not a national registry integration. Define donor/family limits with current authoritative requirements and local governance; no arbitrary clinical thresholds are embedded here.

No CSV export or JSON backup should contain real clinical data in this prototype, and no patient backup belongs in this public source repository.

## Validation

`npm run check` performs JavaScript syntax checking. `npm test` runs workflow tests against a fresh synthetic state with the clock fixed at 25 November 2026. Checks include blocked/expired donor use, successful consumption, reservations, quarantines, atomic transfer validation, embryo counts, CSV parsing and backup relationships.

Browser QA also verifies rendered Hebrew RTL navigation, rejection of a blocked use, successful approved use and persistence after reload. This does not constitute clinical software validation or a security audit.

## Reference material

- https://www.gov.il/he/service/receiving-donor-sperm
- https://www.gov.il/he/service/sperm-donation
- https://www.gov.il/he/pages/med-inst-sperm_bank?chapterindex=1

Consulted for initial scoping on 25 November 2026. Local workflows described by the user are the primary functional specification. This prototype does not certify regulatory compliance.

## Version 0.2: Appendix D records and rejection evidence

`dist/records.js` extends the original workflows without clearing the existing localStorage key. Optional `recipient.card` groups hold personal, parent, appearance, partner, partner appearance, labs and family-history fields. Tests are stored verbatim with dates; lab values do not automatically determine eligibility. No patient data copied from the user's sample is embedded in source fixtures.

Local treatment records may carry `clinical` follow-up data. Updating it appends a previous-value/source history and never consumes another vial. `externalTreatments` hold explicitly labelled historical, external treatments without inventory changes or authorization of new clinical action. Delivery fields are treatment-level reported summaries; per-child birth reports remain separate records and are not generated automatically, avoiding duplicate child counts.

`documents` hold browser-local base64 content, metadata, owner and optional decision ID. Supported types are PDF, JPEG, PNG, WebP and plain text, with signature/byte checks. File content, filenames and reason text are escaped or restricted when rendered. HTML/SVG uploads are not supported. Local attachment limits are 1 MiB per file and 1,250 KiB total. Files are included in JSON backups and foreign-key/type checks run on restore. This does not provide server-side file scanning, institution document management, or cross-device synchronization. Camera capture is exposed by a file input with `capture=environment`; actual camera/scanner availability depends on the user's browser and device. There is no automatic OCR or desktop scanner integration. Users can paste text directly or import UTF-8 TXT text after review.

Rejection reasons remain multiline. New or updated reasons append a decision and preserve existing decisions/documents. An ordinary approval cannot silently release a blocked donor. The field map comes from the form supplied in the conversation and is not asserted to be an authenticated current regulatory template.

## Version 0.3: insemination follow-up and structured relatives

The recipient card now contains a focused IUI/AID table matching the user's seven-column page 3 form. `inseminationNumber` is stored on the underlying local or external treatment record and is unique per recipient across IUI/AID records. Existing unnumbered records receive the smallest unused number in chronological order during migration; once assigned, numbers are retained when a historical record is added. Updates may explicitly renumber a treatment after duplicate validation, with the previous number recorded in follow-up history. At least five visual slots are shown. Empty visual slots are not treatment records, and viewing/updating the table does not consume inventory.

`recipient.relatives` has optional `siblings` and `descendants` arrays. The UI provides 10 and 15 initial slots respectively, and supports up to 100 rows per section. A relative stores a stable ID and optional full name, relationship, parent name, birth year, identity and notes. These column labels are implementation choices because the corresponding user-supplied headings were blank. Only populated rows persist; all rows are validated before replacement, and the previous family record/source is retained in `relativesHistory`. Blank slots are not counted as people. Relatives and treatment numbers are included in JSON backup validation and dedicated CSV exports.

Full biological-father, biological-mother and stepfather names are additional fields in the existing parent group. A missing full name falls back to the original split given/family names; no existing fields are removed. The page 4 group derives from the form supplied in this conversation, without asserting regulatory completeness.
