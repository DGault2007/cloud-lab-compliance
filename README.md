# Cloud Lab Protocol Compliance Screening

Frontend prototype for a laboratory safety compliance tool that screens structured cloud lab protocols, highlights workflow-level review triggers, and presents submission queues for human oversight.

Live demo: https://dgault2007.github.io/cloud-lab-compliance/

## Features

- Protocol intake with format selection for Native JSON, Native YAML, Autoprotocol, and Emerald Cloud Lab exports.
- Policy profile selection for common oversight contexts.
- File upload and paste-modal protocol entry.
- Client-side parser for JSON plus a small supported YAML subset.
- Validation gate before screening with blocking errors and review warnings.
- Deterministic policy-rule screening for biosafety, recombinant nucleic-acid, chemical hygiene, hazardous waste, shipping, human-material, facility, and biosecurity patterns.
- Generated workflow graph, rule triggers, overall status, risk level, confidence, and review route.
- Optional OpenAI-compatible LLM review after screening, with Card 4 summary enrichment and Card 3 policy findings.
- Protocol title, user, and LLM review status in the overall results card.
- Separate workflow graph generation step between validation and screening.
- Editable policy profiles stored in browser localStorage, with visible rule-domain mapping.
- Help tab explaining the app, screening flow, scoring, and policy profiles.
- LLM model dropdown with OpenAI, Claude, Gemini, and custom proxy-oriented options.
- Built-in sample protocols covering low, moderate, elevated, flagged, Autoprotocol, Emerald Cloud Lab, and YAML cases.
- Persistent browser-local submission history with human review queue, auto-approved list, CSV export, and per-run JSON report export.
- GitHub Pages deployment for static hosting.

## Threat Levels

| Level | Meaning | Action |
| --- | --- | --- |
| Low | High confidence, low risk. Routine screening result with no meaningful escalation triggers. | Standard review or auto-triage |
| Moderate | Low confidence with low or medium risk, often from missing fields or unclear materials. | Request more information |
| Elevated | Low or medium confidence with high risk. Workflow may be concerning even if evidence is incomplete. | Human review recommended |
| Flagged | High confidence and high risk. Protocol should not proceed without explicit compliance review. | Mandatory human review |

## Run Locally

Open `index.html` directly in a browser for the fastest local demo.

To run the static checks and smoke tests:

```bash
npm test
```

The smoke test loads the app in a mocked DOM, validates the default sample, screens it, and then verifies every bundled sample can produce a bounded compliance report.

## Screening Workflow

The current GitHub Pages-compatible implementation runs the full MVP flow in the browser:

1. Parse protocol text as JSON or supported YAML.
2. Normalize Native JSON, Native YAML, Autoprotocol, or Emerald Cloud Lab style inputs into a common model.
3. Validate required materials and operations.
4. Generate a workflow graph from materials, operations, outputs, and dependencies.
5. Derive workflow facts from materials, operations, requested execution, facility capabilities, and oversight metadata.
6. Evaluate rules enabled by the selected editable policy profile.
7. Score risk and confidence.
8. Optionally send the normalized screening packet to an OpenAI-compatible LLM endpoint.
9. Update the final result when the LLM returns a threat level, summary, confidence, and rule findings.
10. Render findings, missing information, result status, LLM summary, and queues.

## Policy Profiles

Policy profiles are editable in the **Policy Profiles** tab. Each profile enables one or more rule domains:

- Biosafety
- Recombinant nucleic acid
- Biosecurity
- Chemical hygiene
- Hazardous waste
- Shipping
- Human materials
- Facility capability

Profile changes are saved locally in the browser. The selected profile controls which deterministic rules are active during screening.

## LLM Review

The GitHub Pages build includes an optional runtime LLM call using the OpenAI Responses API format.

- Endpoint defaults to `https://api.openai.com/v1/responses`.
- Model defaults to `gpt-4.1-mini`.
- API keys are entered at runtime and are not committed to the repository.
- Claude, Gemini, and custom options are included for proxy-backed deployments. In the browser-only GitHub Pages build, non-OpenAI providers require a configured proxy endpoint.
- If the LLM returns a `threat_level`, the final Card 4 status updates to that LLM-recommended level.
- For production, route LLM calls through a small backend proxy so browser clients never handle long-lived API keys.

If no API key is entered, deterministic screening still runs and the LLM status displays as `Not configured`.

## Deploy With GitHub Pages

This repository includes a GitHub Actions workflow that deploys the static site from the repository root to GitHub Pages whenever changes are pushed to `main`.

After pushing to GitHub:

1. Open the repository settings.
2. Go to **Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Push to `main` and wait for the **Deploy static site to Pages** workflow to finish.

The deployed URL will usually look like:

```text
https://YOUR_USERNAME.github.io/YOUR_REPOSITORY/
```

## Optional Docker Run

Build and run the container:

```bash
docker build -t cloud-lab-compliance-screening-ui .
docker run --rm -p 8080:8080 cloud-lab-compliance-screening-ui
```

Then open:

```text
http://localhost:8080
```

Or use Docker Compose:

```bash
docker compose up --build
```

## Project Structure

```text
.
|-- .github/workflows/
|   |-- ci.yml
|   `-- pages.yml
|-- app.js
|-- docker-compose.yml
|-- Dockerfile
|-- index.html
|-- nginx.conf
|-- package.json
|-- README.md
|-- tests/
|   `-- smoke.test.js
`-- styles.css
```

## Current Scope

This is a frontend-only MVP with real client-side parsing, validation, editable policies, deterministic rules, graph generation, scoring, optional LLM review, persistence, and exports. It is suitable for a GitHub Pages hackathon demo.

Recommended next backend pieces:

- JSON Schema or Pydantic validation that mirrors the browser validator.
- Versioned policy-card rules stored outside the UI bundle.
- Server-side structured LLM review output with API keys stored outside the browser.
- Persistent submissions API and audit trail.

## Safety Note

This project is designed for triage and oversight support. It should not automatically approve, optimize, or execute laboratory work without appropriate human compliance review.
