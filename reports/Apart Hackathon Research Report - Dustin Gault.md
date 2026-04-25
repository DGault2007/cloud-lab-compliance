# Biosafety Workflow Analyzer: Cloud Lab Protocol Compliance Screening

Dustin Gault  
Independent Researcher  
Research conducted at the AIxBio Hackathon, April 2026  

## Abstract

Remote and automated cloud laboratories make experimental workflows easier to submit, scale, and execute, but they also make oversight harder when review systems focus on individual materials or isolated steps. This project builds a browser-based proof-of-concept called Biosafety Workflow Analyzer that screens structured experimental protocols for biosafety, biosecurity, chemical hygiene, shipping, hazardous waste, human-material, and facility-capability review triggers. The prototype parses JSON and a constrained YAML subset, normalizes Native JSON, Native YAML, Autoprotocol-like, and Emerald Cloud Lab-like inputs, generates workflow graphs, applies configurable policy profiles, and optionally enriches results using an LLM reviewer. The dashboard produces structured triage outputs including threat level, confidence, flagged steps, missing metadata, and human-review queues. Across eight bundled example protocols and ten deterministic rule checks, the system demonstrates how cloud lab submissions can be screened for oversight requirements before execution.

## 1. Introduction

Cloud laboratories and automated experimental platforms are making it easier for researchers to submit protocols as structured digital workflows. This creates a useful opportunity for reproducibility and access, but it also creates a biosecurity and biosafety challenge: a protocol that looks routine step-by-step may still require additional review when the full sequence is considered as an experiment. Oversight systems therefore need to evaluate aggregate workflow intent, material lineage, facility fit, metadata completeness, waste streams, and transfer conditions, not only individual keywords.

The problem addressed in this project is early-stage compliance triage for remote experimental protocols. The goal is not to replace institutional review committees, biosafety officers, or laboratory professionals. Instead, the goal is to provide a structured pre-screening layer that helps route protocols into the correct review path before execution.

The main contributions are:

1. A GitHub Pages-compatible dashboard for ingesting and screening structured cloud lab protocols.
2. A client-side normalization layer that maps multiple protocol styles into a common workflow model.
3. A configurable policy-profile system that exposes which rule domains are being applied.
4. A structured reporting interface with workflow graph, threat level, confidence, rule findings, missing metadata, queues, and optional LLM review.

## 2. Related Work

This project builds on the idea that biological safety assessment is contextual and workflow-dependent. The CDC/NIH Biosafety in Microbiological and Biomedical Laboratories (BMBL) emphasizes risk assessment based on agent, procedure, personnel, and facility factors rather than a single checklist item [1]. The NIH Guidelines for Research Involving Recombinant or Synthetic Nucleic Acid Molecules provide a governance model for recombinant and synthetic nucleic acid research and institutional review [2]. OSHA's Laboratory Standard highlights the need for laboratory chemical hygiene planning [3]. The Federal Select Agent Program provides regulatory expectations for controlled biological agents and toxins [4].

Protocol automation systems such as Autoprotocol-style schemas and commercial cloud lab platforms show that experiments can be represented as machine-readable sequences. However, many machine-readable protocol tools are optimized for execution, scheduling, or reproducibility rather than oversight triage. This project focuses on the review question: given a structured workflow, what oversight path should it enter?

LLMs are useful for summarizing structured evidence and identifying ambiguous intent, but they should not be used as autonomous compliance authorities. In this prototype, deterministic rules run first and the LLM layer is optional, constrained to a structured JSON response, and framed as reviewer assistance.

## 3. Methodology

The project is implemented as a static browser application so it can run on GitHub Pages without a backend. The main workflow is:

1. Ingest a protocol from a sample, uploaded file, or pasted text.
2. Parse the protocol as JSON or a constrained YAML subset.
3. Normalize supported protocol styles into a common model with materials, operations, facility information, requested execution metadata, and oversight metadata.
4. Validate required fields and surface missing or ambiguous metadata.
5. Generate a workflow graph from materials, operations, outputs, and dependencies.
6. Apply policy-profile rule domains to derive deterministic findings.
7. Score risk and confidence and route the submission to auto-triage, clarification, human review, or mandatory human review.
8. Optionally send a normalized screening packet to an LLM endpoint for a concise reviewer summary and additional suggested findings.

The current rule domains are biosafety, recombinant nucleic acid, biosecurity, chemical hygiene, hazardous waste, shipping, human materials, and facility capability. The rule catalog includes ten checks, including recombinant or synthetic nucleic acid workflows, biological material propagation, human-derived material handling, hazardous chemical handling, regulated waste streams, shipping or transfer review, controlled-material terms, and facility capability mismatches.

Policy profiles are editable in the dashboard and stored in browser localStorage. A policy profile is a named set of enabled rule domains. This design keeps policy configuration visible to users and avoids hiding screening behavior inside hardcoded code paths.

The LLM integration supports Gemini 2.5 Flash through the Gemini `generateContent` REST API and OpenAI-compatible Responses API calls. The LLM is asked to return only structured JSON containing a summary, confidence, threat level, and rules violated. If the LLM returns a threat level, the dashboard updates the final result to reflect that recommendation while still preserving deterministic findings.

## 4. Results

The prototype currently includes eight bundled example protocols covering routine low-risk work, incomplete metadata, recombinant/synthetic nucleic acid workflows, human-derived samples, shipping review, controlled-material terms, Autoprotocol-style input, Emerald Cloud Lab-style input, and YAML input.

The dashboard produces the following outputs:

- Schema validation status and warnings.
- Workflow graph generated from normalized protocol dependencies.
- Deterministic rules and triggers for the selected policy profile.
- Overall status, risk level, confidence score, review route, user, protocol title, and LLM review status.
- Human review queue, auto-approved list, submissions table, CSV export, and per-run JSON export.

The test suite includes a dependency-free smoke test that loads the application in a mocked DOM, validates the default sample, screens it, verifies all bundled samples produce bounded compliance reports, and checks both OpenAI-compatible and Gemini request paths. At the time of writing, `npm test` passes locally.

The most important result is that the prototype demonstrates a practical user flow for "experiment-level" review. A protocol is not only classified based on a single material field. The system also considers combinations such as biological material plus propagation, recombinant construct plus modification, human-derived material plus missing review metadata, shipment plus regulated material, and waste stream plus facility capability.

## 5. Discussion

Biosafety Workflow Analyzer is intended as a triage and reviewer-assistance layer. It helps a research institution ask, "Does this submitted cloud lab workflow require additional oversight?" rather than "Can this experiment be executed?" This distinction is important. Automated screening should support human review, not replace it.

The most promising aspect of the prototype is its transparency. Policy profiles expose which rule domains are active. Findings list which rule was triggered and why. The graph gives a quick visual representation of the workflow. The LLM layer is optional and structured; it cannot silently override the deterministic evidence without leaving a report trail.

With more time, the next step would be a backend service that stores policy profiles, validates protocols with JSON Schema or Pydantic, secures API keys, persists submissions, and records immutable audit logs. A production version should also integrate institution-specific policy cards and reviewer workflows.

## 6. Conclusion

This project demonstrates a lightweight approach to cloud lab protocol compliance screening. The core insight is that oversight should be evaluated at the workflow level. A digital protocol contains enough structure to derive material lineage, procedural combinations, missing metadata, facility mismatches, and likely review requirements before the work is executed.

The prototype is intentionally conservative: missing metadata and high-consequence signals route toward human review. This makes the tool more useful as a compliance aid and less likely to be misused as an automated approval system.

## Code and Artifacts

- GitHub repository: https://github.com/DGault2007/cloud-lab-compliance
- Live demo: https://dgault2007.github.io/cloud-lab-compliance/
- Primary artifact: browser dashboard implemented in HTML, CSS, and JavaScript
- Tests: `npm test`

## Author Contributions

Dustin Gault was the sole author and project developer. Dustin designed the concept, selected the compliance-screening workflow, reviewed the safety framing, implemented the dashboard, and prepared the submission report.

## LLM Usage Statement

OpenAI Codex was used as an implementation assistant for creating the dashboard, including frontend code, GitHub Pages deployment configuration, smoke tests, README revisions, and report drafting support. The project concept, final decisions, safety framing, and submission responsibility remain with Dustin Gault. Claims and results were reviewed against the implemented repository behavior.

## References

1. Centers for Disease Control and Prevention and National Institutes of Health. Biosafety in Microbiological and Biomedical Laboratories (BMBL), 6th Edition. https://www.cdc.gov/labs/bmbl/
2. National Institutes of Health. NIH Guidelines for Research Involving Recombinant or Synthetic Nucleic Acid Molecules. https://osp.od.nih.gov/policies/biosafety-and-biosecurity-policy/
3. Occupational Safety and Health Administration. Occupational Exposure to Hazardous Chemicals in Laboratories, 29 CFR 1910.1450. https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.1450
4. Federal Select Agent Program. Select Agents and Toxins Regulations. https://www.selectagents.gov/
5. Google AI for Developers. Gemini API Quickstart and generateContent REST examples. https://ai.google.dev/gemini-api/docs/quickstart

## Appendix: Limitations and Dual-Use Considerations

### Limitations

The current prototype is a frontend-only MVP. It uses a constrained YAML parser, localStorage persistence, and deterministic heuristics rather than institutionally validated compliance logic. False positives are likely when benign protocols contain words that resemble risk terms. False negatives are possible when users omit important material details, use nonstandard terminology, or submit protocols whose risk depends on context not represented in the schema. The workflow graph is useful for triage but not a complete provenance model. Scalability is also limited because there is no backend database, authentication, audit log, or reviewer assignment system.

### Dual-Use Risks

The tool is designed to identify protocols that need oversight, but any screening tool could be misused if attackers probe it to learn which terms or metadata cause escalation. To reduce this risk, the prototype avoids providing procedural optimization, execution instructions, or advice for bypassing review. The LLM prompt explicitly frames the model as a compliance reviewer and asks it not to provide experimental optimization.

### Responsible Disclosure

No real cloud lab vulnerability, institutional policy gap, or platform-specific bypass was discovered during this project. If future testing identifies weaknesses in a real provider's screening, access-control, or submission-review process, those findings should be reported privately to the provider and relevant institutional safety officials before public disclosure.

### Ethical Considerations

The system should be used to support appropriate human oversight, not to deny or approve research automatically. It should be transparent to researchers, configurable by qualified safety personnel, and auditable. It should also avoid collecting unnecessary sensitive data. In production, API keys and protocol submissions should not be handled entirely in the browser.

### Future Improvements

Future work should add backend validation, role-based access control, persistent audit trails, institution-specific policy cards, reviewer workflows, better protocol standards support, richer graph provenance, calibration on expert-labeled examples, and careful red-team testing for both false negatives and misuse resistance.
