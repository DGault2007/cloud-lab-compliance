# Biosafety Workflow Analyzer

Static GitHub Pages dashboard for screening structured cloud lab protocols for biosafety and compliance review triggers.

Live demo: https://dgault2007.github.io/cloud-lab-compliance/

## What It Does

- Parses JSON and a constrained YAML subset.
- Normalizes Native JSON, Native YAML, Autoprotocol-like, and Emerald Cloud Lab-like inputs.
- Validates required protocol fields and surfaces missing metadata.
- Generates workflow graphs from materials, operations, outputs, and dependencies.
- Screens protocols using editable policy profiles and deterministic rule domains.
- Optionally enriches results with Gemini 2.5 Flash or OpenAI-compatible LLM review.
- Exports submission CSVs and per-run JSON reports.

## Threat Levels

| Level | Meaning | Action |
| --- | --- | --- |
| Low | High confidence, low risk | Standard review or auto-triage |
| Moderate | Unclear routine risk or missing metadata | Request more information |
| Elevated | Potentially serious concern | Human review recommended |
| Flagged | Confirmed high concern | Mandatory human review |

## Run Locally

Open `index.html` in a browser, or run:

```bash
npm test
```

## Deploy

GitHub Pages is configured through `.github/workflows/pages.yml`. Push to `main` and set Pages source to **GitHub Actions**.

## Report

The hackathon report is included at:

```text
reports/Apart Hackathon Research Report - Dustin Gault.pdf
```

## Notes

This is a triage and reviewer-assistance prototype. It should not automatically approve, optimize, or execute laboratory work without appropriate human compliance review.

Copyright (c) Dustin Gault - 2026.
