const sampleProtocol = {
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
  oversight_metadata: {
    ibc_protocol_id: null,
    disposal_plan: "destroy_after_assay"
  }
};

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
    summary: "Low confidence with low or medium risk. Usually caused by missing fields or incomplete oversight metadata.",
    action: "Request more information"
  },
  elevated: {
    label: "Elevated",
    status: "Potentially serious concern",
    summary: "Low or medium confidence with high risk. Escalate because the workflow may be concerning even if evidence is incomplete.",
    action: "Human review recommended"
  },
  flagged: {
    label: "Flagged",
    status: "Confirmed high concern",
    summary: "High confidence and high risk. The protocol should not proceed without explicit human compliance review.",
    action: "Mandatory human review"
  }
};

const submissions = [
  {
    user: "Maya Chen",
    protocol: "Reporter construct cell assay",
    status: "Human review recommended",
    risk: "Elevated",
    confidence: 82,
    findings: 3
  },
  {
    user: "Leo Vargas",
    protocol: "Routine buffer preparation",
    status: "Auto-triaged",
    risk: "Low",
    confidence: 96,
    findings: 0
  },
  {
    user: "Anika Shah",
    protocol: "Solvent extraction workflow",
    status: "Request more information",
    risk: "Moderate",
    confidence: 58,
    findings: 2
  },
  {
    user: "Nora Blake",
    protocol: "Remote transfer assay",
    status: "Mandatory human review",
    risk: "Flagged",
    confidence: 91,
    findings: 5
  },
  {
    user: "Owen Brooks",
    protocol: "Plate reader QC run",
    status: "Auto-triaged",
    risk: "Low",
    confidence: 94,
    findings: 0
  },
  {
    user: "Priya Raman",
    protocol: "Human sample prep",
    status: "Human review recommended",
    risk: "Elevated",
    confidence: 73,
    findings: 4
  }
];

let loadedProtocol = "";
let validated = false;
let currentReport = null;

const els = {
  navTabs: document.querySelectorAll(".nav-tab"),
  views: document.querySelectorAll(".view"),
  protocolFile: document.getElementById("protocol-file"),
  fileName: document.getElementById("file-name"),
  preview: document.getElementById("protocol-preview"),
  loadSample: document.getElementById("load-sample"),
  validateBtn: document.getElementById("validate-btn"),
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
  exportReport: document.getElementById("export-report")
};

function setProtocolContent(content, label = "Pasted protocol") {
  loadedProtocol = content.trim();
  validated = false;
  currentReport = null;
  els.preview.textContent = loadedProtocol || "No protocol loaded.";
  els.fileName.textContent = label;
  els.schemaStatus.textContent = "Not validated";
  els.schemaStatus.className = "status-pill neutral";
  els.screenBtn.disabled = true;
  els.runChip.textContent = "Draft";
  hideScreenedCards();
}

function hideScreenedCards() {
  els.resultsPanel.classList.add("hidden");
  els.graphPanel.classList.add("hidden");
  els.rulesPanel.classList.add("hidden");
}

function validateProtocol() {
  if (!loadedProtocol) {
    els.schemaStatus.textContent = "Protocol missing";
    els.schemaStatus.className = "status-pill moderate";
    return;
  }

  const hasOperations = loadedProtocol.includes("operations") || loadedProtocol.includes('"actions"');
  const hasMaterials = loadedProtocol.includes("materials") || loadedProtocol.includes('"refs"');

  if (!hasOperations || !hasMaterials) {
    els.schemaStatus.textContent = "Needs fields";
    els.schemaStatus.className = "status-pill moderate";
    els.screenBtn.disabled = true;
    validated = false;
    return;
  }

  validated = true;
  els.schemaStatus.textContent = "Schema valid";
  els.schemaStatus.className = "status-pill low";
  els.screenBtn.disabled = false;
  els.runChip.textContent = "Validated";
}

function screenProtocol() {
  if (!validated) return;

  currentReport = buildMockReport(loadedProtocol);
  renderReport(currentReport);
  renderGraph();
  renderTriggers(currentReport.triggers);

  els.resultsPanel.classList.remove("hidden");
  els.graphPanel.classList.remove("hidden");
  els.rulesPanel.classList.remove("hidden");
  els.runChip.textContent = "Screened";
}

function buildMockReport(protocolText) {
  const lower = protocolText.toLowerCase();
  const triggers = [];

  if (lower.includes("recombinant") || lower.includes("construct") || lower.includes("introduce_construct")) {
    triggers.push({
      level: "elevated",
      title: "Recombinant or synthetic nucleic acid workflow",
      detail: "Protocol includes construct introduction into a biological system and lacks a linked IBC approval identifier."
    });
  }

  if (lower.includes("bsl-2") || lower.includes("biohazard")) {
    triggers.push({
      level: "elevated",
      title: "Containment and disposal dependency",
      detail: "Biological material handling depends on declared facility containment and biohazardous waste capability."
    });
  }

  if (lower.includes("sequence_provided: false") || lower.includes('"sequence_provided": false') || lower.includes("null")) {
    triggers.push({
      level: "moderate",
      title: "Incomplete oversight metadata",
      detail: "Important review fields are absent or unresolved, reducing confidence in automated screening."
    });
  }

  if (lower.includes("select agent") || lower.includes("toxin") || lower.includes("regulated transfer")) {
    triggers.push({
      level: "flagged",
      title: "Controlled material or transfer term detected",
      detail: "The submission contains terms that require mandatory specialist review before execution."
    });
  }

  if (!triggers.length) {
    triggers.push({
      level: "low",
      title: "No meaningful escalation trigger detected",
      detail: "The submitted workflow resembles routine low-risk screening based on available fields."
    });
  }

  const hasFlagged = triggers.some((trigger) => trigger.level === "flagged");
  const hasElevated = triggers.some((trigger) => trigger.level === "elevated");
  const hasModerate = triggers.some((trigger) => trigger.level === "moderate");
  const level = hasFlagged ? "flagged" : hasElevated ? "elevated" : hasModerate ? "moderate" : "low";
  const confidence = hasFlagged ? 91 : hasElevated ? 82 : hasModerate ? 61 : 95;

  return {
    level,
    confidence,
    risk: hasFlagged || hasElevated ? "High" : hasModerate ? "Medium" : "Low",
    route: hasFlagged ? "Compliance Hold" : hasElevated ? "IBC Queue" : hasModerate ? "Clarification Queue" : "Auto-Triage",
    triggers
  };
}

function renderReport(report) {
  const threat = threatLevels[report.level];
  els.overallStatus.textContent = threat.label;
  els.overallStatus.className = `status-pill ${report.level}`;
  els.resultHeading.textContent = threat.status;
  els.resultSummary.textContent = threat.summary;
  els.riskMetric.textContent = report.risk;
  els.findingsMetric.textContent = String(report.triggers.length);
  els.routeMetric.textContent = report.route;
  els.confidenceText.textContent = `${report.confidence}%`;

  const circumference = 302;
  els.meterFg.style.strokeDashoffset = String(circumference - (circumference * report.confidence) / 100);
  els.meterFg.style.stroke = getLevelColor(report.level);
  document.querySelector(".result-label").textContent = threat.action;
}

function renderGraph() {
  els.workflowGraph.innerHTML = `
    <svg viewBox="0 0 720 310" aria-hidden="true">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#7d95a1"></path>
        </marker>
      </defs>
      <line class="graph-line" x1="150" y1="92" x2="260" y2="92"></line>
      <line class="graph-line" x1="370" y1="92" x2="480" y2="92"></line>
      <line class="graph-line" x1="590" y1="92" x2="590" y2="178"></line>
      <line class="graph-line" x1="480" y1="210" x2="370" y2="210"></line>
      <g class="graph-node" transform="translate(34 58)">
        <rect width="116" height="68" rx="8"></rect>
        <text x="58" y="31">Materials</text>
        <text x="58" y="49">BSL-2 cells</text>
      </g>
      <g class="graph-node flagged" transform="translate(260 58)">
        <rect width="116" height="68" rx="8"></rect>
        <text x="58" y="31">Introduce</text>
        <text x="58" y="49">Construct</text>
      </g>
      <g class="graph-node flagged" transform="translate(480 58)">
        <rect width="116" height="68" rx="8"></rect>
        <text x="58" y="31">Modified</text>
        <text x="58" y="49">Cells</text>
      </g>
      <g class="graph-node" transform="translate(532 178)">
        <rect width="116" height="68" rx="8"></rect>
        <text x="58" y="31">Assay</text>
        <text x="58" y="49">Readout</text>
      </g>
      <g class="graph-node flagged" transform="translate(254 178)">
        <rect width="116" height="68" rx="8"></rect>
        <text x="58" y="31">Waste</text>
        <text x="58" y="49">Review</text>
      </g>
    </svg>
  `;
}

function renderTriggers(triggers) {
  els.rulesCount.textContent = `${triggers.length} flagged`;
  els.rulesCount.className = `status-pill ${currentReport.level}`;
  els.triggerList.innerHTML = triggers
    .map(
      (trigger) => `
        <article class="trigger-item ${trigger.level}">
          <strong>${trigger.title}</strong>
          <p>${trigger.detail}</p>
        </article>
      `
    )
    .join("");
}

function renderSubmissions() {
  els.submissionCount.textContent = `${submissions.length} records`;
  els.submissionTable.innerHTML = submissions
    .map(
      (item) => `
        <tr>
          <td>${item.user}</td>
          <td>${item.status}</td>
          <td><span class="risk-badge ${item.risk.toLowerCase()}">${item.risk}</span></td>
          <td class="confidence-cell">${item.confidence}%</td>
          <td>${item.findings}</td>
        </tr>
      `
    )
    .join("");

  const reviewItems = submissions.filter((item) => !["Auto-triaged"].includes(item.status));
  const approvedItems = submissions.filter((item) => item.status === "Auto-triaged");

  els.queueCount.textContent = String(reviewItems.length);
  els.approvedCount.textContent = String(approvedItems.length);
  els.reviewQueue.innerHTML = reviewItems.map(renderQueueItem).join("");
  els.approvedList.innerHTML = approvedItems.map(renderQueueItem).join("");
}

function renderQueueItem(item) {
  return `
    <article class="queue-item ${item.risk.toLowerCase()}">
      <strong>${item.protocol}</strong>
      <p>${item.user} - ${item.confidence}% confidence - ${item.findings} findings</p>
    </article>
  `;
}

function exportReport() {
  const rows = [
    ["User", "Protocol", "Status", "Risk", "Confidence", "Findings"],
    ...submissions.map((item) => [
      item.user,
      item.protocol,
      item.status,
      item.risk,
      `${item.confidence}%`,
      String(item.findings)
    ])
  ];
  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "protocol-submissions-report.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function getLevelColor(level) {
  return {
    low: "#16803a",
    moderate: "#a15c07",
    elevated: "#b45309",
    flagged: "#b91c1c"
  }[level];
}

function switchView(viewName) {
  els.navTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === viewName));
  els.views.forEach((view) => view.classList.toggle("active", view.id === `${viewName}-view`));
}

els.navTabs.forEach((tab) => tab.addEventListener("click", () => switchView(tab.dataset.view)));

els.protocolFile.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  const text = await file.text();
  setProtocolContent(text, file.name);
});

els.loadSample.addEventListener("click", () => {
  setProtocolContent(JSON.stringify(sampleProtocol, null, 2), "Sample protocol loaded");
});

els.validateBtn.addEventListener("click", validateProtocol);
els.screenBtn.addEventListener("click", screenProtocol);

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

els.exportReport.addEventListener("click", exportReport);

renderSubmissions();
