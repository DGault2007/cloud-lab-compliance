const STORAGE_KEY = "cloudLabComplianceSubmissions.v1";
const POLICY_PROFILES_KEY = "cloudLabCompliancePolicyProfiles.v1";

const threatLevels = {
  low: {
    label: "Low",
    status: "Auto-triaged",
    summary: "High confidence, low risk. Routine protocol screening result with no meaningful escalation triggers.",
    action: "Standard review or auto-triage"
  },
  moderate: {
    label: "Moderate",
    status: "Uncertain routine risk",
    summary: "Low confidence with low or medium risk. Usually caused by missing fields, unclear materials, or incomplete oversight metadata.",
    action: "Request more information"
  },
  elevated: {
    label: "Elevated",
    status: "Potentially serious concern",
    summary: "Low or medium confidence with high risk. Escalate because the workflow may be concerning even if the evidence is incomplete.",
    action: "Human review recommended"
  },
  flagged: {
    label: "Flagged",
    status: "Confirmed high concern",
    summary: "High confidence and high risk. The protocol should not proceed without explicit human compliance review.",
    action: "Mandatory human review"
  }
};

const defaultPolicyProfiles = {
  "Institutional Biosafety Committee": ["biosafety", "recombinant_na", "biosecurity"],
  "Chemical Hygiene Plan": ["chemical_hygiene", "hazardous_waste"],
  "Remote Cloud Lab Oversight": ["biosafety", "chemical_hygiene", "hazardous_waste", "shipping", "facility"],
  "Shipping and Transfer Review": ["shipping", "biosafety", "chemical_hygiene", "biosecurity"],
  "Full Safety Compliance Bundle": [
    "biosafety",
    "recombinant_na",
    "biosecurity",
    "chemical_hygiene",
    "hazardous_waste",
    "shipping",
    "human_materials",
    "facility"
  ]
};

const ruleDomains = {
  biosafety: {
    label: "Biosafety",
    description: "Biological materials, containment, propagation, and biohazardous waste signals."
  },
  recombinant_na: {
    label: "Recombinant NA",
    description: "Recombinant or synthetic nucleic-acid constructs and modification workflows."
  },
  biosecurity: {
    label: "Biosecurity",
    description: "Controlled, select-agent-like, toxin, or regulated-transfer terms."
  },
  chemical_hygiene: {
    label: "Chemical Hygiene",
    description: "Hazardous, flammable, toxic, corrosive, or solvent handling."
  },
  hazardous_waste: {
    label: "Hazardous Waste",
    description: "Biohazardous or hazardous waste streams and disposal metadata."
  },
  shipping: {
    label: "Shipping",
    description: "Shipment, transfer, or receipt of regulated materials or outputs."
  },
  human_materials: {
    label: "Human Materials",
    description: "Clinical, human-derived, or specimen-related review metadata."
  },
  facility: {
    label: "Facility Capability",
    description: "Declared site capability alignment for containment, hoods, and waste handling."
  }
};

const ruleCatalog = [
  { id: "recombinant-na-workflow", domain: "recombinant_na", label: "Recombinant or synthetic nucleic acid workflow" },
  { id: "biological-propagation", domain: "biosafety", label: "Biological material propagation" },
  { id: "human-derived-material", domain: "human_materials", label: "Human-derived material handling" },
  { id: "hazardous-chemical", domain: "chemical_hygiene", label: "Hazardous chemical handling" },
  { id: "waste-stream", domain: "hazardous_waste", label: "Regulated waste stream" },
  { id: "shipping-transfer", domain: "shipping", label: "Shipping or transfer review" },
  { id: "controlled-material", domain: "biosecurity", label: "Controlled material term detected" },
  { id: "facility-bsl-mismatch", domain: "facility", label: "Facility containment capability missing" },
  { id: "facility-chemical-mismatch", domain: "facility", label: "Chemical handling capability missing" },
  { id: "facility-waste-mismatch", domain: "facility", label: "Waste handling capability missing" }
];

const llmModelConfigs = {
  "gemini-2.5-flash": {
    provider: "google",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    note: "Uses the Gemini generateContent REST API directly."
  },
  "gpt-4.1-mini": {
    provider: "openai",
    endpoint: "https://api.openai.com/v1/responses",
    note: "Uses the OpenAI Responses API directly."
  },
  "gpt-4.1": {
    provider: "openai",
    endpoint: "https://api.openai.com/v1/responses",
    note: "Uses the OpenAI Responses API directly."
  },
  "o4-mini": {
    provider: "openai",
    endpoint: "https://api.openai.com/v1/responses",
    note: "Uses the OpenAI Responses API directly."
  },
  "claude-3-5-sonnet-latest": {
    provider: "anthropic",
    endpoint: "",
    note: "Use a backend proxy that accepts the OpenAI-compatible payload."
  },
  "gemini-1.5-pro": {
    provider: "google",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent",
    note: "Uses the Gemini generateContent REST API directly."
  },
  "custom-openai-compatible": {
    provider: "custom",
    endpoint: "",
    note: "Use any proxy or gateway that accepts the OpenAI Responses-style payload."
  }
};

let policyProfiles = loadPolicyProfiles();

const sampleProtocols = [
  {
    id: "routine-buffer",
    label: "Low - Routine buffer prep",
    format: "Native JSON",
    content: {
      protocol_id: "demo-001",
      title: "Routine buffer preparation",
      user: "Leo Vargas",
      facility: {
        site: "cloud_lab_alpha",
        declared_capabilities: ["chemical_hood", "hazardous_waste_pickup"]
      },
      materials: [
        { id: "mat-1", type: "chemical", name: "water", hazard_class: "nonhazardous" },
        { id: "mat-2", type: "chemical", name: "buffer salts", hazard_class: "low" }
      ],
      operations: [
        { id: "op-1", type: "mix", inputs: ["mat-1", "mat-2"], outputs: ["buffer_solution"] },
        { id: "op-2", type: "store", inputs: ["buffer_solution"], parameters: { temperature: "room_temperature" } }
      ],
      oversight_metadata: {
        chemical_hygiene_plan: "CHP-2026",
        disposal_plan: "standard aqueous disposal"
      }
    }
  },
  {
    id: "recombinant-assay",
    label: "Elevated - Recombinant assay",
    format: "Native JSON",
    content: {
      protocol_id: "demo-004",
      title: "Reporter construct cell assay",
      user: "Maya Chen",
      facility: {
        site: "cloud_lab_alpha",
        declared_capabilities: ["bsl2", "chemical_hood", "biohazardous_waste"]
      },
      materials: [
        {
          id: "mat-1",
          type: "cell_line",
          name: "anonymized_mammalian_cell_line",
          biosafety_level: "BSL-2"
        },
        {
          id: "mat-2",
          type: "nucleic_acid_construct",
          recombinant_or_synthetic: true,
          sequence_provided: false
        }
      ],
      operations: [
        { id: "op-1", type: "culture", inputs: ["mat-1"], outputs: ["cultured_cells"] },
        {
          id: "op-2",
          type: "introduce_construct",
          inputs: ["cultured_cells", "mat-2"],
          outputs: ["modified_cells"]
        },
        { id: "op-3", type: "assay", inputs: ["modified_cells"], outputs: ["assay_readout"] },
        { id: "op-4", type: "dispose", inputs: ["modified_cells"], outputs: ["biohazard_waste"] }
      ],
      requested_execution: {
        remote: true,
        shipping_required: false
      },
      oversight_metadata: {
        ibc_protocol_id: null,
        disposal_plan: "destroy_after_assay"
      }
    }
  },
  {
    id: "missing-fields",
    label: "Moderate - Missing metadata",
    format: "Native JSON",
    content: {
      protocol_id: "demo-003",
      title: "Incomplete routine assay request",
      user: "Anika Shah",
      materials: [{ id: "mat-1", type: "chemical", name: "organic solvent", hazard_class: "flammable" }],
      operations: [
        { id: "op-1", type: "extract", inputs: ["mat-1"], outputs: ["extract"] },
        { id: "op-2", type: "analyze", inputs: ["extract"], outputs: ["result"] }
      ],
      oversight_metadata: {}
    }
  },
  {
    id: "transfer-review",
    label: "Elevated - Shipping review",
    format: "Native JSON",
    content: {
      protocol_id: "demo-009",
      title: "Remote transfer assay",
      user: "Priya Raman",
      facility: {
        site: "cloud_lab_beta",
        declared_capabilities: ["bsl2", "biohazardous_waste"]
      },
      materials: [
        { id: "mat-1", type: "clinical_sample", name: "deidentified human specimen", human_derived: true },
        { id: "mat-2", type: "reagent", name: "assay reagent", hazard_class: "low" }
      ],
      operations: [
        { id: "op-1", type: "receive", inputs: ["mat-1"], outputs: ["received_sample"] },
        { id: "op-2", type: "assay", inputs: ["received_sample", "mat-2"], outputs: ["assay_readout"] },
        { id: "op-3", type: "ship", inputs: ["assay_readout"], parameters: { destination: "external_collaborator" } }
      ],
      requested_execution: {
        remote: true,
        shipping_required: true
      },
      oversight_metadata: {
        irb_or_exemption_id: "IRB-EXEMPT-2026",
        shipping_sop: null,
        disposal_plan: "biohazardous waste pickup"
      }
    }
  },
  {
    id: "flagged-controlled",
    label: "Flagged - Controlled term",
    format: "Native JSON",
    content: {
      protocol_id: "demo-010",
      title: "Controlled material screening request",
      user: "Nora Blake",
      facility: {
        site: "cloud_lab_gamma",
        declared_capabilities: ["chemical_hood"]
      },
      materials: [
        { id: "mat-1", type: "biological_agent", name: "select agent placeholder", controlled_material: true }
      ],
      operations: [
        { id: "op-1", type: "store", inputs: ["mat-1"], outputs: ["stored_material"] },
        { id: "op-2", type: "transfer", inputs: ["stored_material"], outputs: ["regulated_transfer"] }
      ],
      oversight_metadata: {
        compliance_hold: true
      }
    }
  },
  {
    id: "autoprotocol",
    label: "Autoprotocol - Solvent extraction",
    format: "Autoprotocol",
    content: {
      protocol_id: "ap-002",
      title: "Autoprotocol solvent extraction",
      user: "Owen Brooks",
      refs: {
        solvent: { type: "chemical", name: "flammable solvent", hazard_class: "flammable" },
        sample: { type: "chemical", name: "analytical sample", hazard_class: "low" }
      },
      instructions: [
        { id: "ap-op-1", op: "mix", inputs: ["sample", "solvent"], outputs: ["extraction_mix"] },
        { id: "ap-op-2", op: "extract", inputs: ["extraction_mix"], outputs: ["organic_phase"] },
        { id: "ap-op-3", op: "dispose", inputs: ["organic_phase"], outputs: ["hazardous_waste"] }
      ],
      facility: {
        site: "cloud_lab_alpha",
        declared_capabilities: ["chemical_hood"]
      },
      oversight_metadata: {
        chemical_hygiene_plan: "CHP-2026"
      }
    }
  },
  {
    id: "ecl",
    label: "ECL - Plate reader QC",
    format: "Emerald Cloud Lab",
    content: {
      protocol_id: "ecl-001",
      title: "ECL plate reader QC run",
      user: "Sam Rivera",
      resources: [
        { id: "plate", type: "labware", name: "qc plate", hazard_class: "nonhazardous" },
        { id: "standard", type: "chemical", name: "fluorescent standard", hazard_class: "low" }
      ],
      steps: [
        { id: "ecl-op-1", action: "prepare_plate", inputs: ["plate", "standard"], outputs: ["prepared_plate"] },
        { id: "ecl-op-2", action: "assay", inputs: ["prepared_plate"], outputs: ["qc_readout"] },
        { id: "ecl-op-3", action: "dispose", inputs: ["prepared_plate"], outputs: ["standard_waste"] }
      ],
      facility: {
        site: "emerald_cloud_lab",
        declared_capabilities: ["chemical_hood", "hazardous_waste_pickup"]
      },
      oversight_metadata: {
        chemical_hygiene_plan: "ECL-CHP",
        disposal_plan: "standard low hazard waste"
      }
    }
  },
  {
    id: "yaml-human-sample",
    label: "YAML - Human sample prep",
    format: "Native YAML",
    content: `protocol_id: demo-008
title: Human specimen preparation
user: Jordan Lee
facility:
  site: cloud_lab_beta
  declared_capabilities:
    - bsl2
    - biohazardous_waste
materials:
  - id: mat-1
    type: clinical_sample
    name: deidentified human sample
    human_derived: true
    biosafety_level: BSL-2
operations:
  - id: op-1
    type: receive
    inputs:
      - mat-1
    outputs:
      - received_sample
  - id: op-2
    type: extract
    inputs:
      - received_sample
    outputs:
      - prepared_sample
  - id: op-3
    type: dispose
    inputs:
      - prepared_sample
    outputs:
      - biohazard_waste
requested_execution:
  remote: true
  shipping_required: false
oversight_metadata:
  irb_or_exemption_id: null
  disposal_plan: biohazardous waste pickup`
  }
];

const seedSubmissions = [
  {
    id: "seed-1",
    createdAt: "2026-04-24T10:15:00.000Z",
    user: "Maya Chen",
    protocol: "Reporter construct cell assay",
    status: "Human review recommended",
    risk: "Elevated",
    confidence: 82,
    findings: 3,
    policy: "Full Safety Compliance Bundle"
  },
  {
    id: "seed-2",
    createdAt: "2026-04-24T10:35:00.000Z",
    user: "Leo Vargas",
    protocol: "Routine buffer preparation",
    status: "Auto-triaged",
    risk: "Low",
    confidence: 96,
    findings: 0,
    policy: "Chemical Hygiene Plan"
  },
  {
    id: "seed-3",
    createdAt: "2026-04-24T10:48:00.000Z",
    user: "Anika Shah",
    protocol: "Incomplete routine assay request",
    status: "Request more information",
    risk: "Moderate",
    confidence: 58,
    findings: 2,
    policy: "Chemical Hygiene Plan"
  }
];

let loadedProtocol = "";
let parsedProtocol = null;
let validationResult = null;
let currentReport = null;
let submissions = loadSubmissions();

const els = {
  navTabs: document.querySelectorAll(".nav-tab"),
  views: document.querySelectorAll(".view"),
  protocolFormat: document.getElementById("protocol-format"),
  policyProfile: document.getElementById("policy-profile"),
  llmApiKey: document.getElementById("llm-api-key"),
  llmModel: document.getElementById("llm-model"),
  llmEndpoint: document.getElementById("llm-endpoint"),
  sampleSelect: document.getElementById("sample-select"),
  protocolFile: document.getElementById("protocol-file"),
  fileName: document.getElementById("file-name"),
  preview: document.getElementById("protocol-preview"),
  validationSummary: document.getElementById("validation-summary"),
  loadSample: document.getElementById("load-sample"),
  validateBtn: document.getElementById("validate-btn"),
  generateGraphBtn: document.getElementById("generate-graph-btn"),
  screenBtn: document.getElementById("screen-btn"),
  schemaStatus: document.getElementById("schema-status"),
  runChip: document.getElementById("run-chip"),
  pasteModal: document.getElementById("paste-modal"),
  openPasteModal: document.getElementById("open-paste-modal"),
  closePasteModal: document.getElementById("close-paste-modal"),
  pasteArea: document.getElementById("paste-area"),
  clearPaste: document.getElementById("clear-paste"),
  usePaste: document.getElementById("use-paste"),
  resultsPanel: document.getElementById("results-panel"),
  graphPanel: document.getElementById("graph-panel"),
  rulesPanel: document.getElementById("rules-panel"),
  overallStatus: document.getElementById("overall-status"),
  confidenceText: document.getElementById("confidence-text"),
  meterFg: document.getElementById("meter-fg"),
  resultHeading: document.getElementById("result-heading"),
  resultSummary: document.getElementById("result-summary"),
  protocolTitleMetric: document.getElementById("protocol-title-metric"),
  protocolUserMetric: document.getElementById("protocol-user-metric"),
  llmStatusMetric: document.getElementById("llm-status-metric"),
  riskMetric: document.getElementById("risk-metric"),
  findingsMetric: document.getElementById("findings-metric"),
  routeMetric: document.getElementById("route-metric"),
  workflowGraph: document.getElementById("workflow-graph"),
  triggerList: document.getElementById("trigger-list"),
  rulesCount: document.getElementById("rules-count"),
  submissionTable: document.getElementById("submission-table"),
  submissionCount: document.getElementById("submission-count"),
  reviewQueue: document.getElementById("review-queue"),
  queueCount: document.getElementById("queue-count"),
  approvedList: document.getElementById("approved-list"),
  approvedCount: document.getElementById("approved-count"),
  exportReport: document.getElementById("export-report"),
  exportCurrentReport: document.getElementById("export-current-report"),
  policyProfileEditor: document.getElementById("policy-profile-editor"),
  policyProfileName: document.getElementById("policy-profile-name"),
  policyDomainList: document.getElementById("policy-domain-list"),
  policyRulesList: document.getElementById("policy-rules-list"),
  policyRuleCount: document.getElementById("policy-rule-count"),
  policySaveStatus: document.getElementById("policy-save-status"),
  newPolicyProfile: document.getElementById("new-policy-profile"),
  savePolicyProfile: document.getElementById("save-policy-profile"),
  resetPolicies: document.getElementById("reset-policies")
};

function populateSamples() {
  els.sampleSelect.innerHTML = sampleProtocols
    .map((sample) => `<option value="${escapeHtml(sample.id)}">${escapeHtml(sample.label)}</option>`)
    .join("");
}

function populatePolicyProfiles(selectedName = els.policyProfile.value || "Full Safety Compliance Bundle") {
  const names = Object.keys(policyProfiles);
  const options = names.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
  els.policyProfile.innerHTML = options;
  els.policyProfileEditor.innerHTML = options;

  const nextName = policyProfiles[selectedName] ? selectedName : names[0];
  els.policyProfile.value = nextName;
  els.policyProfileEditor.value = nextName;
  loadPolicyProfileIntoEditor(nextName);
}

function loadPolicyProfileIntoEditor(name) {
  const domains = policyProfiles[name] || [];
  els.policyProfileName.value = name || "";
  els.policyDomainList.innerHTML = Object.entries(ruleDomains)
    .map(
      ([domain, info]) => `
        <label class="domain-option">
          <input type="checkbox" value="${escapeHtml(domain)}" ${domains.includes(domain) ? "checked" : ""} />
          <span>
            <strong>${escapeHtml(info.label)}</strong>
            <p>${escapeHtml(info.description)}</p>
          </span>
        </label>
      `
    )
    .join("");
  renderPolicyRules(domains);
}

function renderPolicyRules(domains) {
  const rules = ruleCatalog.filter((rule) => domains.includes(rule.domain));
  els.policyRuleCount.textContent = `${rules.length} rules`;
  els.policyRulesList.innerHTML =
    rules
      .map(
        (rule) => `
        <article class="trigger-item ${getRuleDisplayLevel(rule)}">
          <strong>${escapeHtml(rule.label)}</strong>
          <p>${escapeHtml(ruleDomains[rule.domain]?.label || rule.domain)} domain - rule id ${escapeHtml(rule.id)}</p>
        </article>
      `
      )
      .join("") ||
    `<article class="trigger-item low"><strong>No rules selected</strong><p>Select at least one oversight domain to enable screening rules.</p></article>`;
}

function getRuleDisplayLevel(rule) {
  if (rule.domain === "biosecurity") return "flagged";
  if (["biosafety", "recombinant_na", "human_materials", "shipping"].includes(rule.domain)) return "elevated";
  return "moderate";
}

function setProtocolContent(content, label = "Pasted protocol", format = null) {
  loadedProtocol = String(content || "").trim();
  parsedProtocol = null;
  validationResult = null;
  currentReport = null;
  els.preview.textContent = loadedProtocol || "No protocol loaded.";
  els.fileName.textContent = label;
  els.schemaStatus.textContent = "Not validated";
  els.schemaStatus.className = "status-pill neutral";
  els.generateGraphBtn.disabled = true;
  els.screenBtn.disabled = true;
  setRunStatus("Draft");
  clearValidationSummary();
  hideScreenedCards();

  if (format) {
    els.protocolFormat.value = format;
  }
}

function hideScreenedCards() {
  els.resultsPanel.classList.add("hidden");
  els.graphPanel.classList.add("hidden");
  els.rulesPanel.classList.add("hidden");
}

function validateProtocol() {
  if (!loadedProtocol) {
    validationResult = {
      valid: false,
      errors: ["Load, upload, or paste a protocol before validation."],
      warnings: []
    };
    renderValidationSummary(validationResult);
    setSchemaStatus("Protocol missing", "moderate");
    return;
  }

  const parsed = parseProtocolText(loadedProtocol, els.protocolFormat.value);
  if (!parsed.ok) {
    validationResult = {
      valid: false,
      errors: [parsed.error],
      warnings: []
    };
    renderValidationSummary(validationResult);
    setSchemaStatus("Parse failed", "flagged");
    return;
  }

  const normalized = normalizeProtocol(parsed.data, els.protocolFormat.value);
  validationResult = validateNormalizedProtocol(normalized);
  parsedProtocol = normalized;
  renderValidationSummary(validationResult);

  if (!validationResult.valid) {
    setSchemaStatus("Needs fields", "moderate");
    els.generateGraphBtn.disabled = true;
    els.screenBtn.disabled = true;
    return;
  }

  setSchemaStatus(validationResult.warnings.length ? "Valid with warnings" : "Schema valid", validationResult.warnings.length ? "moderate" : "low");
  els.generateGraphBtn.disabled = false;
  els.screenBtn.disabled = false;
  setRunStatus("Validated");
}

function generateWorkflowGraphFromValidated() {
  if (!validationResult?.valid || !parsedProtocol) return;

  const graph = buildWorkflowGraph(parsedProtocol);
  renderGraph(graph, []);
  els.graphPanel.classList.remove("hidden");
  els.screenBtn.disabled = false;
  setRunStatus("Graph generated");
}

async function screenProtocol() {
  if (!validationResult?.valid || !parsedProtocol) return;

  els.screenBtn.disabled = true;
  currentReport = buildComplianceReport(parsedProtocol, validationResult, els.policyProfile.value);
  renderReport(currentReport);
  renderGraph(currentReport.graph, currentReport.triggers);
  renderTriggers(currentReport.triggers, currentReport.missingInformation, currentReport.llmReview);

  els.resultsPanel.classList.remove("hidden");
  els.graphPanel.classList.remove("hidden");
  els.rulesPanel.classList.remove("hidden");

  try {
    await enrichReportWithLlm(currentReport);
  } finally {
    renderReport(currentReport);
    renderTriggers(currentReport.triggers, currentReport.missingInformation, currentReport.llmReview);
    saveReportSubmission(currentReport);
    els.screenBtn.disabled = false;
    setRunStatus("Screened");
  }
}

function parseProtocolText(text, format) {
  if (format === "Native YAML") {
    try {
      return { ok: true, data: parseSimpleYaml(text) };
    } catch (error) {
      return { ok: false, error: `YAML parse error: ${error.message}` };
    }
  }

  try {
    return { ok: true, data: JSON.parse(text) };
  } catch (jsonError) {
    try {
      return { ok: true, data: parseSimpleYaml(text) };
    } catch {
      return { ok: false, error: `Unable to parse protocol as JSON or supported YAML: ${jsonError.message}` };
    }
  }
}

function parseSimpleYaml(text) {
  const lines = text
    .replace(/\t/g, "  ")
    .split(/\r?\n/)
    .map((raw) => ({ raw, trimmed: stripYamlComment(raw).trimEnd() }))
    .filter((line) => line.trimmed.trim());

  if (!lines.length) return {};

  const [value, nextIndex] = parseYamlBlock(lines, 0, getIndent(lines[0].trimmed));
  if (nextIndex < lines.length) {
    throw new Error(`Unexpected content near line ${nextIndex + 1}`);
  }
  return value;
}

function parseYamlBlock(lines, startIndex, indent) {
  const first = lines[startIndex];
  if (!first || getIndent(first.trimmed) < indent) return [{}, startIndex];
  const isArray = first.trimmed.slice(indent).startsWith("- ");
  return isArray ? parseYamlArray(lines, startIndex, indent) : parseYamlObject(lines, startIndex, indent);
}

function parseYamlArray(lines, startIndex, indent) {
  const result = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index].trimmed;
    const lineIndent = getIndent(line);
    if (lineIndent < indent) break;
    if (lineIndent !== indent || !line.slice(indent).startsWith("- ")) break;

    const itemText = line.slice(indent + 2).trim();
    if (!itemText) {
      const [child, nextIndex] = parseYamlBlock(lines, index + 1, indent + 2);
      result.push(child);
      index = nextIndex;
      continue;
    }

    if (itemText.includes(":")) {
      const item = {};
      assignYamlPair(item, itemText, lines, index, indent + 2);
      index += 1;

      while (index < lines.length && getIndent(lines[index].trimmed) >= indent + 2) {
        const nestedLine = lines[index].trimmed;
        if (getIndent(nestedLine) !== indent + 2) break;
        const body = nestedLine.slice(indent + 2).trim();
        if (body.startsWith("- ")) break;
        const consumed = assignYamlPair(item, body, lines, index, indent + 4);
        index = consumed;
      }
      result.push(item);
      continue;
    }

    result.push(parseYamlScalar(itemText));
    index += 1;
  }

  return [result, index];
}

function parseYamlObject(lines, startIndex, indent) {
  const result = {};
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index].trimmed;
    const lineIndent = getIndent(line);
    if (lineIndent < indent) break;
    if (lineIndent !== indent) break;
    const body = line.slice(indent).trim();
    if (body.startsWith("- ")) break;
    index = assignYamlPair(result, body, lines, index, indent + 2);
  }

  return [result, index];
}

function assignYamlPair(target, body, lines, index, childIndent) {
  const separatorIndex = body.indexOf(":");
  if (separatorIndex === -1) throw new Error(`Expected key/value pair near line ${index + 1}`);

  const key = body.slice(0, separatorIndex).trim();
  const rawValue = body.slice(separatorIndex + 1).trim();
  if (!key) throw new Error(`Missing key near line ${index + 1}`);

  if (rawValue) {
    target[key] = parseYamlScalar(rawValue);
    return index + 1;
  }

  if (index + 1 >= lines.length || getIndent(lines[index + 1].trimmed) < childIndent) {
    target[key] = null;
    return index + 1;
  }

  const [child, nextIndex] = parseYamlBlock(lines, index + 1, childIndent);
  target[key] = child;
  return nextIndex;
}

function stripYamlComment(line) {
  const hashIndex = line.indexOf("#");
  return hashIndex === -1 ? line : line.slice(0, hashIndex);
}

function getIndent(line) {
  const match = line.match(/^ */);
  return match ? match[0].length : 0;
}

function parseYamlScalar(value) {
  if (value === "null" || value === "~") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (value.startsWith("[") && value.endsWith("]")) {
    return value
      .slice(1, -1)
      .split(",")
      .map((item) => parseYamlScalar(item.trim()))
      .filter((item) => item !== "");
  }
  return value.replace(/^["']|["']$/g, "");
}

function normalizeProtocol(raw, format) {
  const operations = raw.operations || raw.instructions || raw.actions || raw.steps || [];
  const materialInput = raw.materials || raw.resources || raw.refs || [];
  const materials = Array.isArray(materialInput)
    ? materialInput
    : Object.entries(materialInput).map(([id, material]) => ({ id, ...material }));

  return {
    sourceFormat: format,
    protocolId: raw.protocol_id || raw.id || raw.name || "unspecified-protocol",
    title: raw.title || raw.name || raw.protocol_name || "Untitled protocol",
    user: raw.user || raw.submitter?.name || raw.submitter?.id || "Unknown user",
    facility: raw.facility || {},
    materials: materials.map((material, index) => normalizeMaterial(material, index)),
    operations: operations.map((operation, index) => normalizeOperation(operation, index)),
    requestedExecution: raw.requested_execution || raw.execution || {},
    oversightMetadata: raw.oversight_metadata || raw.approvals || raw.metadata || {},
    raw
  };
}

function normalizeMaterial(material, index) {
  const normalized = material || {};
  const id = String(normalized.id || normalized.name || `mat-${index + 1}`);
  return {
    ...normalized,
    id,
    label: String(normalized.name || normalized.label || id),
    type: String(normalized.type || normalized.kind || "unknown").toLowerCase(),
    hazardClass: String(normalized.hazard_class || normalized.hazard || "").toLowerCase(),
    biosafetyLevel: String(normalized.biosafety_level || normalized.bsl || "").toUpperCase(),
    recombinantOrSynthetic: Boolean(normalized.recombinant_or_synthetic || normalized.recombinant || normalized.synthetic),
    humanDerived: Boolean(normalized.human_derived || normalized.human_material || normalized.type === "clinical_sample"),
    controlledMaterial: Boolean(normalized.controlled_material || normalized.select_agent || normalized.regulated)
  };
}

function normalizeOperation(operation, index) {
  const normalized = operation || {};
  const id = String(normalized.id || normalized.name || `op-${index + 1}`);
  const type = String(normalized.type || normalized.op || normalized.action || "unknown").toLowerCase();
  return {
    ...normalized,
    id,
    type,
    label: toTitle(type.replaceAll("_", " ")),
    inputs: normalizeList(normalized.inputs || normalized.refs || normalized.source || []),
    outputs: normalizeList(normalized.outputs || normalized.destination || normalized.product || []),
    parameters: normalized.parameters || normalized.params || {}
  };
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.map(String);
  if (value === null || value === undefined || value === "") return [];
  return [String(value)];
}

function validateNormalizedProtocol(protocol) {
  const errors = [];
  const warnings = [];

  if (!protocol.title || protocol.title === "Untitled protocol") warnings.push("Protocol title is missing or generic.");
  if (!protocol.user || protocol.user === "Unknown user") warnings.push("Submitter or user identity is missing.");
  if (!protocol.materials.length) errors.push("Protocol must include at least one material, resource, or ref.");
  if (!protocol.operations.length) errors.push("Protocol must include at least one operation, instruction, action, or step.");

  protocol.operations.forEach((operation) => {
    if (!operation.type || operation.type === "unknown") warnings.push(`Operation ${operation.id} is missing a recognized type.`);
    if (!operation.inputs.length && !operation.outputs.length) warnings.push(`Operation ${operation.id} has no inputs or outputs.`);
  });

  const materialIds = new Set(protocol.materials.map((material) => material.id));
  const producedIds = new Set(protocol.operations.flatMap((operation) => operation.outputs));
  protocol.operations.forEach((operation) => {
    operation.inputs.forEach((input) => {
      if (!materialIds.has(input) && !producedIds.has(input)) {
        warnings.push(`Operation ${operation.id} references unresolved input "${input}".`);
      }
    });
  });

  if (!protocol.facility.site) warnings.push("Facility site is missing.");
  if (!Array.isArray(protocol.facility.declared_capabilities)) {
    warnings.push("Facility declared capabilities are missing or not an array.");
  }

  return { valid: errors.length === 0, errors, warnings };
}

function buildComplianceReport(protocol, validation, policyName) {
  const activeDomains = getPolicyDomains(policyName);
  const graph = buildWorkflowGraph(protocol);
  const facts = deriveFacts(protocol, graph);
  const triggerCandidates = evaluateRules(protocol, facts);
  const triggers = triggerCandidates.filter((trigger) => activeDomains.includes(trigger.domain));
  const missingInformation = deriveMissingInformation(protocol, facts, activeDomains, validation);
  const scoring = scoreReport(triggers, missingInformation, validation);
  const threat = threatLevels[scoring.level];

  return {
    id: `run-${Date.now()}`,
    createdAt: new Date().toISOString(),
    protocolId: protocol.protocolId,
    title: protocol.title,
    user: protocol.user,
    policy: policyName,
    status: threat.action,
    statusTitle: threat.status,
    level: scoring.level,
    risk: scoring.risk,
    riskScore: scoring.riskScore,
    confidence: scoring.confidence,
    route: scoring.route,
    summary: threat.summary,
    llmReview: {
      status: "not_configured",
      model: "",
      summary: "",
      threatLevel: "",
      rulesViolated: [],
      confidence: null,
      error: ""
    },
    facts,
    triggers,
    missingInformation,
    graph,
    validation
  };
}

async function enrichReportWithLlm(report) {
  const config = getLlmConfig();
  if (!config.apiKey) {
    report.llmReview = {
      status: "not_configured",
      model: config.model,
      summary: "",
      threatLevel: "",
      rulesViolated: [],
      confidence: null,
      error: ""
    };
    return;
  }

  report.llmReview = {
    status: "pending",
    model: config.model,
    summary: "",
    threatLevel: "",
    rulesViolated: [],
    confidence: null,
    error: ""
  };
  setRunStatus("LLM reviewing");
  renderReport(report);

  try {
    const llmReview = await requestLlmReview(report, config);
    report.llmReview = {
      status: "completed",
      model: config.model,
      summary: llmReview.summary || "",
      threatLevel: normalizeLevel(llmReview.threat_level || ""),
      rulesViolated: Array.isArray(llmReview.rules_violated) ? llmReview.rules_violated : [],
      confidence: typeof llmReview.confidence === "number" ? llmReview.confidence : null,
      error: ""
    };
    applyLlmThreatToReport(report);
  } catch (error) {
    report.llmReview = {
      status: "failed",
      model: config.model,
      summary: "",
      threatLevel: "",
      rulesViolated: [],
      confidence: null,
      error: error.message || "LLM review failed."
    };
  }
}

function getLlmConfig() {
  const modelInfo = llmModelConfigs[els.llmModel.value] || llmModelConfigs["gemini-2.5-flash"];
  return {
    apiKey: els.llmApiKey.value.trim(),
    model: els.llmModel.value.trim() || "gemini-2.5-flash",
    provider: modelInfo.provider,
    endpoint: els.llmEndpoint.value.trim() || modelInfo.endpoint
  };
}

function applyLlmThreatToReport(report) {
  const llmLevel = normalizeLevel(report.llmReview.threatLevel);
  if (!llmLevel) return;

  report.level = llmLevel;
  report.risk = llmLevel === "low" ? "Low" : llmLevel === "moderate" ? "Medium" : "High";
  report.route = {
    low: "Auto-Triage",
    moderate: "Clarification Queue",
    elevated: "Compliance Review Queue",
    flagged: "Mandatory Human Review"
  }[llmLevel];

  if (typeof report.llmReview.confidence === "number") {
    report.confidence = clamp(Math.round(report.llmReview.confidence * 100), 35, 98);
  }
}

async function requestLlmReview(report, config) {
  if (!config.endpoint) {
    throw new Error(`${toTitle(config.provider)} models need a configured proxy endpoint for browser-safe review.`);
  }

  const payload = buildLlmPayload(report, config);
  const headers = {
    "Content-Type": "application/json"
  };

  if (config.provider === "google") {
    headers["x-goog-api-key"] = config.apiKey;
  } else {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM request failed (${response.status}): ${errorText.slice(0, 180)}`);
  }

  const data = await response.json();
  const outputText = extractResponseText(data);
  if (!outputText) throw new Error("LLM response did not include text output.");

  try {
    return JSON.parse(stripJsonFence(outputText));
  } catch {
    throw new Error("LLM response was not valid JSON.");
  }
}

function buildLlmPayload(report, config) {
  const prompt = buildLlmPrompt(report);
  const schema = getLlmReviewSchema();

  if (config.provider === "google") {
    return {
      system_instruction: {
        parts: [{ text: getLlmInstructions() }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    };
  }

  return {
    model: config.model,
    instructions: getLlmInstructions(),
    input: prompt,
    text: {
      format: {
        type: "json_schema",
        name: "lab_compliance_review",
        strict: true,
        schema
      }
    }
  };
}

function getLlmInstructions() {
  return "You are a laboratory compliance screening assistant. Review only for oversight and triage. Do not provide procedural optimization, experimental instructions, or operational troubleshooting. Return concise JSON for human reviewers.";
}

function getLlmReviewSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: {
        type: "string",
        description: "One to three sentence compliance-focused summary."
      },
      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1
      },
      threat_level: {
        type: "string",
        enum: ["low", "moderate", "elevated", "flagged"],
        description: "Final LLM-recommended threat level for this protocol."
      },
      rules_violated: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            rule: { type: "string" },
            severity: {
              type: "string",
              enum: ["low", "moderate", "elevated", "flagged"]
            },
            reason: { type: "string" },
            source_steps: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["rule", "severity", "reason", "source_steps"]
        }
      }
    },
    required: ["summary", "confidence", "threat_level", "rules_violated"]
  };
}

function buildLlmPrompt(report) {
  const reviewPacket = {
    protocol: {
      id: report.protocolId,
      title: report.title,
      user: report.user,
      policy: report.policy
    },
    deterministic_screening: {
      level: report.level,
      risk: report.risk,
      confidence: report.confidence,
      route: report.route,
      triggers: report.triggers.map((trigger) => ({
        id: trigger.id,
        domain: trigger.domain,
        level: trigger.level,
        title: trigger.title,
        detail: trigger.detail,
        source_steps: trigger.sourceSteps
      })),
      missing_information: report.missingInformation
    },
    workflow_facts: {
      has_remote_execution: report.facts.hasRemoteExecution,
      has_shipping: report.facts.hasShipping,
      has_biohazard_waste: report.facts.hasBiohazardWaste,
      has_hazardous_waste: report.facts.hasHazardousWaste,
      has_propagation: report.facts.hasPropagation,
      has_modification: report.facts.hasModification,
      recombinant_material_count: report.facts.recombinantMaterials.length,
      biological_material_count: report.facts.biologicalMaterials.length,
      hazardous_chemical_count: report.facts.hazardousChemicals.length,
      human_material_count: report.facts.humanMaterials.length,
      controlled_material_count: report.facts.controlledMaterials.length
    },
    operations: parsedProtocol.operations.map((operation) => ({
      id: operation.id,
      type: operation.type,
      inputs: operation.inputs,
      outputs: operation.outputs
    }))
  };

  return `Review this normalized compliance screening packet and return the requested JSON only.\n${JSON.stringify(reviewPacket, null, 2)}`;
}

function extractResponseText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  if (Array.isArray(data.candidates)) {
    const parts = data.candidates.flatMap((candidate) => candidate.content?.parts || []);
    const text = parts.map((part) => part.text || "").join("\n").trim();
    if (text) return text;
  }
  const textParts = [];
  (data.output || []).forEach((item) => {
    (item.content || []).forEach((content) => {
      if (typeof content.text === "string") textParts.push(content.text);
      if (typeof content.output_text === "string") textParts.push(content.output_text);
    });
  });
  return textParts.join("\n").trim();
}

function stripJsonFence(text) {
  return String(text)
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function deriveFacts(protocol, graph) {
  const materialText = protocol.materials.map((material) => JSON.stringify(material).toLowerCase()).join(" ");
  const operationText = protocol.operations.map((operation) => JSON.stringify(operation).toLowerCase()).join(" ");
  const metadataText = JSON.stringify(protocol.oversightMetadata || {}).toLowerCase();
  const allText = `${materialText} ${operationText} ${metadataText}`;

  const recombinantMaterials = protocol.materials.filter(
    (material) =>
      material.recombinantOrSynthetic ||
      includesAny(materialSearchText(material), ["recombinant", "synthetic", "construct", "plasmid"])
  );
  const biologicalMaterials = protocol.materials.filter((material) =>
    includesAny(`${material.type} ${material.biosafetyLevel} ${material.label}`.toLowerCase(), [
      "cell",
      "biological",
      "clinical",
      "human",
      "bsl-2",
      "bsl2",
      "microbial"
    ])
  );
  const controlledMaterials = protocol.materials.filter(
    (material) => material.controlledMaterial || includesAny(materialSearchText(material), ["select agent", "controlled", "toxin"])
  );
  const hazardousChemicals = protocol.materials.filter(isHazardousChemical);
  const humanMaterials = protocol.materials.filter(
    (material) => material.humanDerived || includesAny(`${material.type} ${material.label}`.toLowerCase(), ["human", "clinical"])
  );

  return {
    recombinantMaterials,
    biologicalMaterials,
    controlledMaterials,
    hazardousChemicals,
    humanMaterials,
    hasRemoteExecution: Boolean(protocol.requestedExecution.remote),
    hasShipping: Boolean(protocol.requestedExecution.shipping_required) || includesAny(operationText, ["ship", "transfer", "receive"]),
    hasBiohazardWaste: includesAny(allText, ["biohazard", "bsl-2", "bsl2"]),
    hasHazardousWaste:
      includesAny(operationText, ["hazardous_waste", "hazardous waste"]) ||
      hazardousChemicals.some((material) => includesAny(`${material.hazardClass} ${material.label}`.toLowerCase(), ["flammable", "solvent"])),
    hasPropagation: protocol.operations.some((operation) => includesAny(operation.type, ["culture", "propagate", "amplify"])),
    hasModification: protocol.operations.some((operation) =>
      includesAny(operation.type, ["introduce_construct", "transfect", "modify", "clone", "express", "synthesize"])
    ),
    missingNullMetadata: Object.values(protocol.oversightMetadata || {}).some((value) => value === null || value === ""),
    graphNodeCount: graph.nodes.length
  };
}

function evaluateRules(protocol, facts) {
  const triggers = [];
  const operationsByType = (terms) => protocol.operations.filter((operation) => includesAny(operation.type, terms)).map((operation) => operation.id);

  if (facts.recombinantMaterials.length && (facts.hasModification || facts.hasPropagation)) {
    triggers.push({
      id: "recombinant-na-workflow",
      domain: "recombinant_na",
      level: "elevated",
      severity: 8,
      confidenceImpact: 8,
      title: "Recombinant or synthetic nucleic acid workflow",
      detail: "Material metadata and operations indicate construct use, modification, or propagation that should be routed through biosafety oversight.",
      sourceSteps: operationsByType(["introduce_construct", "transfect", "modify", "clone", "express", "synthesize", "culture"])
    });
  }

  if (facts.biologicalMaterials.length && facts.hasPropagation) {
    triggers.push({
      id: "biological-propagation",
      domain: "biosafety",
      level: "elevated",
      severity: 7,
      confidenceImpact: 6,
      title: "Biological material propagation",
      detail: "The workflow handles biological material and includes culture or propagation steps that require containment alignment.",
      sourceSteps: operationsByType(["culture", "propagate", "amplify"])
    });
  }

  if (facts.humanMaterials.length) {
    triggers.push({
      id: "human-derived-material",
      domain: "human_materials",
      level: "elevated",
      severity: 7,
      confidenceImpact: 6,
      title: "Human-derived material handling",
      detail: "Human or clinical sample metadata was detected. Institutional sample-use documentation should be verified.",
      sourceSteps: protocol.operations.map((operation) => operation.id)
    });
  }

  if (facts.hazardousChemicals.length) {
    triggers.push({
      id: "hazardous-chemical",
      domain: "chemical_hygiene",
      level: "moderate",
      severity: 5,
      confidenceImpact: 7,
      title: "Hazardous chemical handling",
      detail: "Chemical metadata indicates flammable, toxic, corrosive, solvent, or hazardous material handling.",
      sourceSteps: operationsByType(["mix", "extract", "analyze", "dispose"])
    });
  }

  if (facts.hasBiohazardWaste || facts.hasHazardousWaste) {
    triggers.push({
      id: "waste-stream",
      domain: "hazardous_waste",
      level: facts.hasBiohazardWaste ? "elevated" : "moderate",
      severity: facts.hasBiohazardWaste ? 7 : 5,
      confidenceImpact: 6,
      title: "Regulated waste stream",
      detail: "Protocol outputs or materials imply biohazardous or hazardous waste handling that should match site disposal capability.",
      sourceSteps: operationsByType(["dispose", "extract", "assay"])
    });
  }

  if (facts.hasShipping && (facts.biologicalMaterials.length || facts.hazardousChemicals.length || facts.humanMaterials.length)) {
    triggers.push({
      id: "shipping-transfer",
      domain: "shipping",
      level: "elevated",
      severity: 7,
      confidenceImpact: 6,
      title: "Shipping or transfer review",
      detail: "The workflow combines shipment or transfer with biological, human-derived, or hazardous materials.",
      sourceSteps: operationsByType(["ship", "transfer", "receive"])
    });
  }

  if (facts.controlledMaterials.length) {
    triggers.push({
      id: "controlled-material",
      domain: "biosecurity",
      level: "flagged",
      severity: 10,
      confidenceImpact: 10,
      title: "Controlled material term detected",
      detail: "Material metadata contains controlled, select-agent-like, toxin, or regulated-transfer terms. Execution should be blocked pending specialist review.",
      sourceSteps: protocol.operations.map((operation) => operation.id)
    });
  }

  const facilityTriggers = evaluateFacilityCapability(protocol, facts);
  triggers.push(...facilityTriggers);

  if (!triggers.length) {
    triggers.push({
      id: "no-escalation-trigger",
      domain: "facility",
      level: "low",
      severity: 1,
      confidenceImpact: 8,
      title: "No meaningful escalation trigger detected",
      detail: "The workflow resembles routine low-risk screening based on available schema fields and selected policy profile.",
      sourceSteps: []
    });
  }

  return triggers;
}

function isHazardousChemical(material) {
  const text = `${material.type} ${material.hazardClass} ${material.label}`.toLowerCase();
  if (includesAny(text, ["nonhazardous", "non-hazardous", "low"])) return false;
  return includesAny(text, ["flammable", "corrosive", "toxic", "solvent", "hazardous"]);
}

function materialSearchText(material) {
  return [
    material.type,
    material.label,
    material.name,
    material.hazardClass,
    material.hazard_class,
    material.biosafetyLevel,
    material.biosafety_level
  ]
    .filter((value) => value !== undefined && value !== null)
    .join(" ")
    .toLowerCase();
}

function evaluateFacilityCapability(protocol, facts) {
  const capabilities = new Set((protocol.facility.declared_capabilities || []).map((capability) => String(capability).toLowerCase()));
  const triggers = [];

  if (facts.biologicalMaterials.length && !capabilities.has("bsl2") && !capabilities.has("bsl-2")) {
    triggers.push({
      id: "facility-bsl-mismatch",
      domain: "facility",
      level: "elevated",
      severity: 7,
      confidenceImpact: 5,
      title: "Facility containment capability missing",
      detail: "Biological materials were detected, but the facility does not declare matching BSL-2 containment capability.",
      sourceSteps: []
    });
  }

  if (facts.hazardousChemicals.length && !capabilities.has("chemical_hood")) {
    triggers.push({
      id: "facility-chemical-mismatch",
      domain: "facility",
      level: "moderate",
      severity: 5,
      confidenceImpact: 5,
      title: "Chemical handling capability missing",
      detail: "Hazardous chemical handling was detected without a declared chemical hood capability.",
      sourceSteps: []
    });
  }

  if ((facts.hasBiohazardWaste || facts.hasHazardousWaste) && !Array.from(capabilities).some((capability) => capability.includes("waste"))) {
    triggers.push({
      id: "facility-waste-mismatch",
      domain: "facility",
      level: "moderate",
      severity: 5,
      confidenceImpact: 5,
      title: "Waste handling capability missing",
      detail: "The protocol appears to generate regulated waste without a declared site waste-handling capability.",
      sourceSteps: []
    });
  }

  return triggers;
}

function deriveMissingInformation(protocol, facts, activeDomains, validation) {
  const missing = [...validation.warnings];
  const metadata = protocol.oversightMetadata || {};

  if (activeDomains.includes("recombinant_na") && facts.recombinantMaterials.length && !metadata.ibc_protocol_id) {
    missing.push("IBC protocol identifier is missing for recombinant or synthetic nucleic-acid workflow.");
  }

  if (activeDomains.includes("human_materials") && facts.humanMaterials.length && !metadata.irb_or_exemption_id) {
    missing.push("IRB or exemption identifier is missing for human-derived material.");
  }

  if (activeDomains.includes("chemical_hygiene") && facts.hazardousChemicals.length && !metadata.chemical_hygiene_plan) {
    missing.push("Chemical Hygiene Plan reference is missing for hazardous chemical handling.");
  }

  if (activeDomains.includes("hazardous_waste") && (facts.hasBiohazardWaste || facts.hasHazardousWaste) && !metadata.disposal_plan) {
    missing.push("Disposal plan is missing for regulated waste stream.");
  }

  if (activeDomains.includes("shipping") && facts.hasShipping && !metadata.shipping_sop) {
    missing.push("Shipping or transfer SOP reference is missing.");
  }

  if (facts.missingNullMetadata) {
    missing.push("One or more oversight metadata values are explicitly null or blank.");
  }

  return [...new Set(missing)];
}

function scoreReport(triggers, missingInformation, validation) {
  const maxSeverity = Math.max(...triggers.map((trigger) => trigger.severity), 0);
  const explicitConfidence = Math.max(...triggers.map((trigger) => trigger.confidenceImpact), 0);
  const warningPenalty = validation.warnings.length * 5 + missingInformation.length * 4;
  const confidence = clamp(Math.round(88 + explicitConfidence - warningPenalty), 35, 98);
  const riskScore = clamp(maxSeverity + Math.min(triggers.length - 1, 3), 1, 10);

  let risk = "Low";
  if (riskScore >= 8) risk = "High";
  else if (riskScore >= 4) risk = "Medium";

  let level = "low";
  if (risk === "High" && confidence >= 80) level = "flagged";
  else if (risk === "High") level = "elevated";
  else if (risk === "Medium" || confidence < 75 || missingInformation.length) level = "moderate";

  if (triggers.some((trigger) => trigger.level === "flagged")) level = confidence >= 75 ? "flagged" : "elevated";
  if (triggers.some((trigger) => trigger.level === "elevated") && level === "low") level = "elevated";

  const route = {
    low: "Auto-Triage",
    moderate: "Clarification Queue",
    elevated: "Compliance Review Queue",
    flagged: "Mandatory Human Review"
  }[level];

  return { level, risk, riskScore, confidence, route };
}

function buildWorkflowGraph(protocol) {
  const nodes = [];
  const edges = [];

  protocol.materials.slice(0, 6).forEach((material) => {
    nodes.push({
      id: material.id,
      label: material.label,
      sublabel: toTitle(material.type),
      kind: "material",
      level: "neutral"
    });
  });

  protocol.operations.forEach((operation) => {
    nodes.push({
      id: operation.id,
      label: operation.label,
      sublabel: operation.id,
      kind: "operation",
      level: "neutral"
    });

    operation.inputs.forEach((input) => edges.push({ from: input, to: operation.id }));
    operation.outputs.forEach((output) => {
      nodes.push({
        id: output,
        label: output.replaceAll("_", " "),
        sublabel: "output",
        kind: "output",
        level: "neutral"
      });
      edges.push({ from: operation.id, to: output });
    });
  });

  return { nodes: dedupeNodes(nodes), edges };
}

function dedupeNodes(nodes) {
  const seen = new Set();
  return nodes.filter((node) => {
    if (seen.has(node.id)) return false;
    seen.add(node.id);
    return true;
  });
}

function renderReport(report) {
  const threat = threatLevels[report.level];
  els.overallStatus.textContent = threat.label;
  els.overallStatus.className = `status-pill ${report.level}`;
  els.resultHeading.textContent = threat.status;
  els.resultSummary.textContent = getReportSummary(report);
  els.protocolTitleMetric.textContent = report.title;
  els.protocolUserMetric.textContent = report.user;
  els.llmStatusMetric.textContent = getLlmStatusText(report.llmReview);
  els.riskMetric.textContent = report.risk;
  els.findingsMetric.textContent = String(getFindingCount(report));
  els.routeMetric.textContent = report.route;
  els.confidenceText.textContent = `${report.confidence}%`;

  const circumference = 302;
  els.meterFg.style.strokeDashoffset = String(circumference - (circumference * report.confidence) / 100);
  els.meterFg.style.stroke = getLevelColor(report.level);
  document.querySelector(".result-label").textContent = threat.action;
}

function getReportSummary(report) {
  if (report.llmReview?.status === "completed" && report.llmReview.summary) {
    return report.llmReview.summary;
  }
  if (report.llmReview?.status === "pending") {
    return "Deterministic screening is complete. LLM review is running for a reviewer-oriented summary and additional policy findings.";
  }
  if (report.llmReview?.status === "failed") {
    return `${report.summary} LLM review failed: ${report.llmReview.error}`;
  }
  return report.summary;
}

function getLlmStatusText(llmReview) {
  if (!llmReview || llmReview.status === "not_configured") return "Not configured";
  if (llmReview.status === "pending") return "Reviewing";
  if (llmReview.status === "failed") return "Failed";
  if (llmReview.status === "completed") {
    const confidence = typeof llmReview.confidence === "number" ? `, ${Math.round(llmReview.confidence * 100)}%` : "";
    const threat = llmReview.threatLevel ? `, ${toTitle(llmReview.threatLevel)}` : "";
    return `Completed (${llmReview.model}${confidence}${threat})`;
  }
  return "Not configured";
}

function getFindingCount(report) {
  const deterministic = report.triggers.filter((trigger) => trigger.level !== "low").length;
  const llm = report.llmReview?.status === "completed" ? report.llmReview.rulesViolated.length : 0;
  return deterministic + llm;
}

function renderGraph(graph, triggers) {
  const sourceLevels = new Map();
  triggers.forEach((trigger) => {
    trigger.sourceSteps.forEach((stepId) => {
      const current = sourceLevels.get(stepId);
      sourceLevels.set(stepId, strongestLevel(current, trigger.level));
    });
  });

  const nodeLimit = 12;
  const visibleNodes = graph.nodes.slice(0, nodeLimit);
  const nodeMap = new Map(visibleNodes.map((node, index) => [node.id, { ...node, index }]));
  const width = Math.max(720, visibleNodes.length * 150);
  const height = 330;
  const yByKind = { material: 70, operation: 160, output: 250 };

  const nodeMarkup = visibleNodes
    .map((node, index) => {
      const x = 34 + index * 140;
      const y = yByKind[node.kind] || 160;
      const level = sourceLevels.get(node.id) || "neutral";
      return `
        <g class="graph-node ${level}" transform="translate(${x} ${y})">
          <rect width="116" height="62" rx="8"></rect>
          <text x="58" y="27">${escapeSvg(truncate(node.label, 16))}</text>
          <text x="58" y="45">${escapeSvg(truncate(node.sublabel, 16))}</text>
        </g>
      `;
    })
    .join("");

  const edgeMarkup = graph.edges
    .filter((edge) => nodeMap.has(edge.from) && nodeMap.has(edge.to))
    .map((edge) => {
      const from = nodeMap.get(edge.from);
      const to = nodeMap.get(edge.to);
      const fromX = 34 + from.index * 140 + 116;
      const fromY = (yByKind[from.kind] || 160) + 31;
      const toX = 34 + to.index * 140;
      const toY = (yByKind[to.kind] || 160) + 31;
      return `<line class="graph-line" x1="${fromX}" y1="${fromY}" x2="${toX}" y2="${toY}"></line>`;
    })
    .join("");

  els.workflowGraph.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" aria-hidden="true">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#7d95a1"></path>
        </marker>
      </defs>
      ${edgeMarkup}
      ${nodeMarkup}
    </svg>
  `;
}

function renderTriggers(triggers, missingInformation, llmReview = null) {
  const visibleTriggers = triggers.filter((trigger) => trigger.level !== "low");
  const displayTriggers = visibleTriggers.length ? visibleTriggers : triggers;
  const llmFindingCount = llmReview?.status === "completed" ? llmReview.rulesViolated.length : 0;
  els.rulesCount.textContent = `${visibleTriggers.length + llmFindingCount} flagged`;
  els.rulesCount.className = `status-pill ${currentReport.level}`;

  const triggerMarkup = displayTriggers
    .map(
      (trigger) => `
        <article class="trigger-item ${trigger.level}">
          <strong>${escapeHtml(trigger.title)}</strong>
          <p>${escapeHtml(trigger.detail)}</p>
        </article>
      `
    )
    .join("");

  const missingMarkup = missingInformation.length
    ? `
      <article class="trigger-item moderate">
        <strong>Missing or incomplete information</strong>
        <p>${escapeHtml(missingInformation.join(" "))}</p>
      </article>
    `
    : "";

  const llmMarkup =
    llmReview?.status === "completed" && llmReview.rulesViolated.length
      ? llmReview.rulesViolated
          .map(
            (finding) => `
        <article class="trigger-item ${normalizeLevel(finding.severity, "moderate")}">
          <strong>LLM: ${escapeHtml(finding.rule)}</strong>
          <p>${escapeHtml(finding.reason)}${finding.source_steps?.length ? ` Steps: ${escapeHtml(finding.source_steps.join(", "))}.` : ""}</p>
        </article>
      `
          )
          .join("")
      : "";

  const llmErrorMarkup =
    llmReview?.status === "failed"
      ? `
        <article class="trigger-item moderate">
          <strong>LLM review unavailable</strong>
          <p>${escapeHtml(llmReview.error)}</p>
        </article>
      `
      : "";

  els.triggerList.innerHTML = triggerMarkup + missingMarkup + llmMarkup + llmErrorMarkup;
}

function renderValidationSummary(result) {
  const rows = [];
  if (result.errors.length) {
    rows.push(`<strong>Blocking schema issues</strong><ul>${result.errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul>`);
  }
  if (result.warnings.length) {
    rows.push(`<strong>Review warnings</strong><ul>${result.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>`);
  }
  if (!rows.length) {
    rows.push("<strong>Validation passed</strong><div>Protocol includes the minimum fields needed for screening.</div>");
  }

  els.validationSummary.innerHTML = rows.join("");
  els.validationSummary.classList.add("active");
}

function clearValidationSummary() {
  els.validationSummary.innerHTML = "";
  els.validationSummary.classList.remove("active");
}

function setSchemaStatus(text, level) {
  els.schemaStatus.textContent = text;
  els.schemaStatus.className = `status-pill ${level}`;
}

function setRunStatus(text) {
  if (els.runChip) {
    els.runChip.textContent = text;
  }
}

function renderSubmissions() {
  els.submissionCount.textContent = `${submissions.length} records`;
  els.submissionTable.innerHTML = submissions
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.user)}</td>
          <td>${escapeHtml(item.protocol)}</td>
          <td>${escapeHtml(item.status)}</td>
          <td><span class="risk-badge ${item.risk.toLowerCase()}">${escapeHtml(item.risk)}</span></td>
          <td class="confidence-cell">${item.confidence}%</td>
          <td>${item.findings}</td>
        </tr>
      `
    )
    .join("");

  const reviewItems = submissions.filter((item) => item.status !== threatLevels.low.action);
  const approvedItems = submissions.filter((item) => item.status === threatLevels.low.action);

  els.queueCount.textContent = String(reviewItems.length);
  els.approvedCount.textContent = String(approvedItems.length);
  els.reviewQueue.innerHTML = reviewItems.map(renderQueueItem).join("") || `<article class="queue-item low"><strong>Queue clear</strong><p>No protocols require human review.</p></article>`;
  els.approvedList.innerHTML =
    approvedItems.map(renderQueueItem).join("") || `<article class="queue-item moderate"><strong>No auto-triaged protocols</strong><p>Run a low-risk protocol to populate this list.</p></article>`;
}

function renderQueueItem(item) {
  return `
    <article class="queue-item ${item.risk.toLowerCase()}">
      <strong>${escapeHtml(item.protocol)}</strong>
      <p>${escapeHtml(item.user)} - ${item.confidence}% confidence - ${item.findings} findings</p>
    </article>
  `;
}

function saveReportSubmission(report) {
  const submission = {
    id: report.id,
    createdAt: report.createdAt,
    user: report.user,
    protocol: report.title,
    status: threatLevels[report.level].action,
    risk: threatLevels[report.level].label,
    confidence: report.confidence,
    findings: getFindingCount(report),
    policy: report.policy
  };

  submissions = [submission, ...submissions].slice(0, 25);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
  renderSubmissions();
}

function loadSubmissions() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : seedSubmissions;
  } catch {
    return seedSubmissions;
  }
}

function loadPolicyProfiles() {
  try {
    const stored = localStorage.getItem(POLICY_PROFILES_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    if (parsed && typeof parsed === "object" && Object.keys(parsed).length) {
      return { ...defaultPolicyProfiles, ...parsed };
    }
  } catch {
    // Fall through to defaults.
  }
  return { ...defaultPolicyProfiles };
}

function persistPolicyProfiles() {
  localStorage.setItem(POLICY_PROFILES_KEY, JSON.stringify(policyProfiles));
}

function getPolicyDomains(policyName) {
  return policyProfiles[policyName] || policyProfiles["Full Safety Compliance Bundle"] || Object.keys(ruleDomains);
}

function getCheckedPolicyDomains() {
  return Array.from(els.policyDomainList.querySelectorAll("input[type='checkbox']"))
    .filter((input) => input.checked)
    .map((input) => input.value);
}

function savePolicyProfileFromEditor() {
  const name = els.policyProfileName.value.trim();
  const domains = getCheckedPolicyDomains();
  if (!name || !domains.length) {
    els.policySaveStatus.textContent = "Needs name/rules";
    els.policySaveStatus.className = "status-pill moderate";
    return;
  }

  policyProfiles[name] = domains;
  persistPolicyProfiles();
  populatePolicyProfiles(name);
  els.policySaveStatus.textContent = "Saved locally";
  els.policySaveStatus.className = "status-pill low";
}

function resetPolicyProfiles() {
  policyProfiles = { ...defaultPolicyProfiles };
  persistPolicyProfiles();
  populatePolicyProfiles("Full Safety Compliance Bundle");
  els.policySaveStatus.textContent = "Defaults restored";
  els.policySaveStatus.className = "status-pill low";
}

function exportSubmissionsReport() {
  const rows = [
    ["User", "Protocol", "Status", "Risk", "Confidence", "Findings", "Policy", "Created At"],
    ...submissions.map((item) => [
      item.user,
      item.protocol,
      item.status,
      item.risk,
      `${item.confidence}%`,
      String(item.findings),
      item.policy || "",
      item.createdAt || ""
    ])
  ];
  downloadText("protocol-submissions-report.csv", rows.map((row) => row.map(escapeCsv).join(",")).join("\n"), "text/csv");
}

function exportCurrentReport() {
  if (!currentReport) return;
  downloadText(
    `${slugify(currentReport.title)}-compliance-report.json`,
    JSON.stringify(currentReport, null, 2),
    "application/json"
  );
}

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function getLevelColor(level) {
  return {
    neutral: "#7d95a1",
    low: "#16803a",
    moderate: "#a15c07",
    elevated: "#b45309",
    flagged: "#b91c1c"
  }[level];
}

function normalizeLevel(level, fallback = "") {
  return ["low", "moderate", "elevated", "flagged"].includes(level) ? level : fallback;
}

function strongestLevel(current = "neutral", next = "neutral") {
  const rank = { neutral: 0, low: 1, moderate: 2, elevated: 3, flagged: 4 };
  return rank[next] > rank[current] ? next : current;
}

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function toTitle(value) {
  return String(value)
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function truncate(value, maxLength) {
  const text = String(value || "");
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}.` : text;
}

function slugify(value) {
  return String(value || "report")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeSvg(value) {
  return escapeHtml(value);
}

function switchView(viewName) {
  els.navTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === viewName));
  els.views.forEach((view) => view.classList.toggle("active", view.id === `${viewName}-view`));
}

function loadSelectedSample() {
  const sample = sampleProtocols.find((item) => item.id === els.sampleSelect.value) || sampleProtocols[0];
  const content = typeof sample.content === "string" ? sample.content : JSON.stringify(sample.content, null, 2);
  setProtocolContent(content, `${sample.label} loaded`, sample.format);
}

els.navTabs.forEach((tab) => tab.addEventListener("click", () => switchView(tab.dataset.view)));

els.protocolFile.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  const text = await file.text();
  const extension = file.name.split(".").pop()?.toLowerCase();
  const inferredFormat = extension === "yaml" || extension === "yml" ? "Native YAML" : null;
  setProtocolContent(text, file.name, inferredFormat);
});

els.loadSample.addEventListener("click", loadSelectedSample);
els.validateBtn.addEventListener("click", validateProtocol);
els.generateGraphBtn.addEventListener("click", generateWorkflowGraphFromValidated);
els.screenBtn.addEventListener("click", screenProtocol);
els.llmModel.addEventListener("change", () => {
  const modelInfo = llmModelConfigs[els.llmModel.value];
  if (modelInfo?.endpoint) {
    els.llmEndpoint.value = modelInfo.endpoint;
  } else {
    els.llmEndpoint.value = "";
  }
});
els.policyProfileEditor.addEventListener("change", () => loadPolicyProfileIntoEditor(els.policyProfileEditor.value));
els.policyDomainList.addEventListener("change", () => renderPolicyRules(getCheckedPolicyDomains()));
els.newPolicyProfile.addEventListener("click", () => {
  els.policyProfileEditor.value = "";
  els.policyProfileName.value = "New policy profile";
  els.policyDomainList.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.checked = false;
  });
  renderPolicyRules([]);
  els.policySaveStatus.textContent = "Draft";
  els.policySaveStatus.className = "status-pill neutral";
});
els.savePolicyProfile.addEventListener("click", savePolicyProfileFromEditor);
els.resetPolicies.addEventListener("click", resetPolicyProfiles);

els.openPasteModal.addEventListener("click", () => {
  els.pasteArea.value = loadedProtocol;
  els.pasteModal.classList.remove("hidden");
  els.pasteArea.focus();
});

els.closePasteModal.addEventListener("click", () => els.pasteModal.classList.add("hidden"));
els.clearPaste.addEventListener("click", () => {
  els.pasteArea.value = "";
  els.pasteArea.focus();
});
els.usePaste.addEventListener("click", () => {
  setProtocolContent(els.pasteArea.value, "Pasted protocol");
  els.pasteModal.classList.add("hidden");
});
els.pasteModal.addEventListener("click", (event) => {
  if (event.target === els.pasteModal) els.pasteModal.classList.add("hidden");
});

els.exportReport.addEventListener("click", exportSubmissionsReport);
els.exportCurrentReport.addEventListener("click", exportCurrentReport);

populateSamples();
populatePolicyProfiles("Full Safety Compliance Bundle");
loadSelectedSample();
renderSubmissions();
