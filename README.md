# Cloud Lab Protocol Compliance Screening

https://dgault2007.github.io/cloud-lab-compliance/

Frontend prototype for a laboratory safety compliance tool that screens structured cloud lab protocols, highlights workflow-level review triggers, and presents submission queues for human oversight.

## Features

- Protocol intake with format selection for Native JSON, Native YAML, Autoprotocol, and Emerald Cloud Lab exports.
- Policy profile selection for common oversight contexts.
- File upload and paste-modal protocol entry.
- Validation gate before screening.
- Workflow graph, rule triggers, overall status, risk level, and confidence display.
- Submissions dashboard with human review queue, auto-approved list, and CSV export.
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

To run the static checks:

```bash
npm test
```

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
`-- styles.css
```

## Current Scope

This is a frontend-only MVP. The screening logic is intentionally mocked in `app.js` so the interface can be demonstrated before the backend schema validator, rules engine, and LLM review service are added.

Recommended next backend pieces:

- JSON Schema or Pydantic protocol validation.
- Versioned policy-card rules engine.
- Workflow graph generation from parsed protocol operations.
- Structured LLM review output.
- Persistent submissions API and audit trail.

## Safety Note

This project is designed for triage and oversight support. It should not automatically approve, optimize, or execute laboratory work without appropriate human compliance review.
