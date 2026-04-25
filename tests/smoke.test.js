const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");

class MockClassList {
  constructor() {
    this.values = new Set();
  }

  add(value) {
    this.values.add(value);
  }

  remove(value) {
    this.values.delete(value);
  }

  toggle(value, force) {
    if (force === undefined ? !this.values.has(value) : force) {
      this.values.add(value);
      return true;
    }
    this.values.delete(value);
    return false;
  }

  contains(value) {
    return this.values.has(value);
  }
}

class MockElement {
  constructor(id = "") {
    this.id = id;
    this.value = "";
    this.textContent = "";
    this.innerHTML = "";
    this.className = "";
    this.disabled = false;
    this.style = {};
    this.dataset = {};
    this.classList = new MockClassList();
    this.listeners = {};
  }

  addEventListener(type, handler) {
    this.listeners[type] = handler;
  }

  querySelectorAll() {
    return [];
  }

  focus() {}

  click() {
    if (this.listeners.click) this.listeners.click({ target: this });
  }
}

const ids = [
  "protocol-format",
  "policy-profile",
  "llm-api-key",
  "llm-model",
  "llm-endpoint",
  "sample-select",
  "protocol-file",
  "file-name",
  "protocol-preview",
  "validation-summary",
  "load-sample",
  "validate-btn",
  "generate-graph-btn",
  "screen-btn",
  "schema-status",
  "run-chip",
  "paste-modal",
  "open-paste-modal",
  "close-paste-modal",
  "paste-area",
  "clear-paste",
  "use-paste",
  "results-panel",
  "graph-panel",
  "rules-panel",
  "overall-status",
  "confidence-text",
  "meter-fg",
  "result-heading",
  "result-summary",
  "protocol-title-metric",
  "protocol-user-metric",
  "llm-status-metric",
  "risk-metric",
  "findings-metric",
  "route-metric",
  "workflow-graph",
  "trigger-list",
  "rules-count",
  "submission-table",
  "submission-count",
  "review-queue",
  "queue-count",
  "approved-list",
  "approved-count",
  "export-report",
  "export-current-report",
  "policy-profile-editor",
  "policy-profile-name",
  "policy-domain-list",
  "policy-rules-list",
  "policy-rule-count",
  "policy-save-status",
  "new-policy-profile",
  "save-policy-profile",
  "reset-policies"
];

const elements = Object.fromEntries(ids.map((id) => [id, new MockElement(id)]));
elements["protocol-format"].value = "Native JSON";
elements["policy-profile"].value = "Full Safety Compliance Bundle";
elements["llm-api-key"].value = "";
elements["llm-model"].value = "gpt-4.1-mini";
elements["llm-endpoint"].value = "https://api.openai.com/v1/responses";

const navTabs = [new MockElement(), new MockElement(), new MockElement(), new MockElement()];
navTabs[0].dataset.view = "screening";
navTabs[1].dataset.view = "submissions";
navTabs[2].dataset.view = "policies";
navTabs[3].dataset.view = "help";

const views = [new MockElement("screening-view"), new MockElement("submissions-view"), new MockElement("policies-view"), new MockElement("help-view")];
const resultLabel = new MockElement();

const storage = new Map();
let fetchCalls = 0;
const context = {
  Blob: class Blob {
    constructor(parts, options) {
      this.parts = parts;
      this.options = options;
    }
  },
  URL: {
    createObjectURL: () => "blob:test",
    revokeObjectURL: () => {}
  },
  document: {
    createElement: () => new MockElement(),
    getElementById: (id) => elements[id] || new MockElement(id),
    querySelector: (selector) => {
      if (selector === ".result-label") return resultLabel;
      return new MockElement();
    },
    querySelectorAll: (selector) => {
      if (selector === ".nav-tab") return navTabs;
      if (selector === ".view") return views;
      return [];
    }
  },
  localStorage: {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value)
  },
  fetch: async () => {
    fetchCalls += 1;
    return {
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          summary: "LLM reviewer summary for compliance triage.",
          confidence: 0.86,
          threat_level: "flagged",
          rules_violated: [
            {
              rule: "IBC review",
              severity: "elevated",
              reason: "Recombinant workflow requires additional oversight metadata.",
              source_steps: ["op-2"]
            }
          ]
        })
      })
    };
  },
  console
};

vm.createContext(context);
const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
vm.runInContext(source, context);

(async () => {
  await vm.runInContext("validateProtocol(); screenProtocol();", context);

  const report = vm.runInContext("currentReport", context);
  assert.equal(report.title, "Routine buffer preparation");
  assert.equal(report.level, "low");
  assert.equal(report.llmReview.status, "not_configured");
  assert.equal(elements["overall-status"].textContent, "Low");
  assert.equal(elements["protocol-title-metric"].textContent, "Routine buffer preparation");
  assert.equal(elements["protocol-user-metric"].textContent, "Leo Vargas");
  assert.match(elements["workflow-graph"].innerHTML, /graph-node/);
  assert.match(elements["submission-table"].innerHTML, /Routine buffer preparation/);

  const sampleIds = vm.runInContext("sampleProtocols.map((sample) => sample.id)", context);
  for (const sampleId of sampleIds) {
    elements["sample-select"].value = sampleId;
    await vm.runInContext("loadSelectedSample(); validateProtocol(); screenProtocol();", context);
    const sampleReport = vm.runInContext("currentReport", context);
    assert.ok(sampleReport.title, `Expected report title for ${sampleId}`);
    assert.ok(["low", "moderate", "elevated", "flagged"].includes(sampleReport.level), `Expected known level for ${sampleId}`);
    assert.ok(sampleReport.confidence >= 35 && sampleReport.confidence <= 98, `Expected bounded confidence for ${sampleId}`);
  }

  elements["sample-select"].value = "recombinant-assay";
  elements["llm-api-key"].value = "test-key";
  await vm.runInContext("loadSelectedSample(); validateProtocol(); screenProtocol();", context);
  const llmReport = vm.runInContext("currentReport", context);
  assert.equal(fetchCalls, 1);
  assert.equal(llmReport.llmReview.status, "completed");
  assert.equal(llmReport.level, "flagged");
  assert.equal(elements["result-summary"].textContent, "LLM reviewer summary for compliance triage.");
  assert.match(elements["trigger-list"].innerHTML, /LLM: IBC review/);

  console.log("Smoke test passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
