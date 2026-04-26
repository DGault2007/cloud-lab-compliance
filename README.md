# Biosafety Cloud Lab Compliance Screener

This proof of concept was created to screen scientific and cloud lab protocols for biosafety and compliance review triggers.
The purpose is to be used as a tool to help triage biosecurity compliance.
It was created for the Apart Hackathon April 2026.

Live demo: https://dgault2007.github.io/cloud-lab-compliance/

## What It Does

- Takes a scientific protocol and analyzes the threat risk

1- Normalizes different inputs like Native JSON, Native YAML, Autoprotocol, and Emerald Cloud Lab
2- Validates required protocol fields and surfaces missing metadata
3- Generates workflow graphs from materials, operations, outputs, and dependencies
4- Screens protocols using editable policy profiles and deterministic rule domains
5- Can optionally enrich results with LLM review
6- Exports submission CSVs and per-run JSON reports for auditing

## Run Locally

Open `index.html` in a browser.

## Deploy

GitHub Pages is configured through `.github/workflows/pages.yml`. Push to `main` and set Pages source to **GitHub Actions**.

This is a triage and reviewer-assistance prototype proof of concept.

___

Copyright (c) Dustin Gault - 2026.
