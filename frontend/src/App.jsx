import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Biohazard,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  CloudUpload,
  Database,
  FileJson,
  FlaskConical,
  GitBranch,
  Layers3,
  Lock,
  Microscope,
  Network,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
  UserCheck,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const protocols = [
  {
    id: "P-2026-0001",
    title: "Reporter Assay in Non-Pathogenic Host",
    submitter: "researcher_123",
    status: "Additional Review",
    risk: "Moderate",
    confidence: 0.82,
    policyPack: "us_biosafety_pack_2026_04",
    submittedAt: "2026-04-24 09:12",
    findings: 3,
    missingInfo: 1,
  },
  {
    id: "P-2026-0002",
    title: "Commercial Enzyme Activity Assay",
    submitter: "chemist_044",
    status: "Standard Review",
    risk: "Low",
    confidence: 0.94,
    policyPack: "us_biosafety_pack_2026_04",
    submittedAt: "2026-04-24 10:05",
    findings: 0,
    missingInfo: 0,
  },
  {
    id: "P-2026-0003",
    title: "Environmental Sample Enrichment Screen",
    submitter: "field_lab_09",
    status: "Human Review Required",
    risk: "Elevated",
    confidence: 0.76,
    policyPack: "us_biosafety_pack_2026_04",
    submittedAt: "2026-04-24 10:41",
    findings: 5,
    missingInfo: 3,
  },
  {
    id: "P-2026-0004",
    title: "Fragment Order + Assembly Program",
    submitter: "researcher_123",
    status: "Coordinated Review",
    risk: "Flagged",
    confidence: 0.88,
    policyPack: "us_biosafety_pack_2026_04",
    submittedAt: "2026-04-24 11:03",
    findings: 7,
    missingInfo: 2,
  },
];

const findings = [
  {
    id: "F-001",
    severity: "additional_review_recommended",
    domain: "Biosafety",
    title: "Synthetic nucleic acid introduced into biological system",
    evidence: "op_2 introduces mat_construct_1 into biological host/system",
    route: "IBC / Biosafety Officer",
    confidence: 0.87,
  },
  {
    id: "F-002",
    severity: "insufficient_information",
    domain: "Sequence Screening",
    title: "Provider sequence-screening report is missing",
    evidence: "sequence_screening.result = unknown",
    route: "Sequence Screening Officer",
    confidence: 0.91,
  },
  {
    id: "F-003",
    severity: "mandatory_human_review",
    domain: "Multi-Protocol",
    title: "Related submissions may form one experimental program",
    evidence: "Same submitter, shared material lineage, 90-day window",
    route: "IBC / Biosecurity Review",
    confidence: 0.84,
  },
];

const queue = [
  {
    protocol: "P-2026-0004",
    owner: "Biosecurity Review",
    priority: "Urgent",
    due: "Today",
  },
  {
    protocol: "P-2026-0003",
    owner: "Biosafety Officer",
    priority: "High",
    due: "Tomorrow",
  },
  {
    protocol: "P-2026-0001",
    owner: "IBC Coordinator",
    priority: "Medium",
    due: "3 days",
  },
];

const threatLevels = [
  {
    name: "Low",
    summary: "Auto-triaged",
    description: "High confidence, low risk. Routine protocol screening result with no meaningful escalation triggers.",
    reviewAction: "Standard review or auto-triage",
    count: 8,
  },
  {
    name: "Moderate",
    summary: "Uncertain routine risk",
    description: "Low confidence with low or medium risk. Usually caused by missing fields, unclear materials, or incomplete oversight metadata.",
    reviewAction: "Request more information",
    count: 5,
  },
  {
    name: "Elevated",
    summary: "Potentially serious concern",
    description: "Low or medium confidence with high risk. Escalate because the workflow may be concerning even if the evidence is incomplete.",
    reviewAction: "Human review recommended",
    count: 3,
  },
  {
    name: "Flagged",
    summary: "Confirmed high concern",
    description: "High confidence and high risk. The protocol should not proceed without explicit human compliance review.",
    reviewAction: "Mandatory human review",
    count: 2,
  },
];

const riskDistribution = threatLevels.map(({ name, count }) => ({ name, count }));

const labProtocolSchemas = [
  {
    id: "native_json",
    label: "Native JSON",
    description: "Internal normalized JSON schema for hackathon demos and API submissions.",
    extension: ".json",
  },
  {
    id: "native_yaml",
    label: "Native YAML",
    description: "Readable YAML version of the internal protocol schema.",
    extension: ".yaml / .yml",
  },
  {
    id: "autoprotocol",
    label: "Autoprotocol",
    description: "JSON protocol format using refs and instructions for automated lab execution.",
    extension: ".json",
  },
  {
    id: "emerald_cloud_lab",
    label: "Emerald Cloud Lab",
    description: "ECL-style protocol objects and model/function-based experiment definitions.",
    extension: ".json / export",
  },
];

const policyPacks = [
  {
    id: "us_biosafety_pack_2026_04",
    label: "US Biosafety Pack 2026.04",
    description: "General hackathon policy pack covering biosafety, synthetic nucleic acids, human review routing, and cloud-lab workflow escalation.",
    rules: 42,
    domains: 6,
    status: "Active",
  },
  {
    id: "nih_recombinant_synthetic_na",
    label: "NIH Recombinant/Synthetic NA",
    description: "Focused review pack for recombinant or synthetic nucleic acid work, IBC routing, host/vector context, and missing oversight metadata.",
    rules: 24,
    domains: 4,
    status: "Draft",
  },
  {
    id: "hhs_sequence_screening",
    label: "HHS Sequence Screening",
    description: "Sequence-screening-oriented pack for synthetic nucleic acid provider attestations, SOC result handling, and unresolved screening escalation.",
    rules: 18,
    domains: 3,
    status: "Draft",
  },
  {
    id: "institutional_cloud_lab_review",
    label: "Institutional Cloud Lab Review",
    description: "Institution-level governance pack for multi-protocol correlation, remote execution review, missing approvals, and reviewer queue routing.",
    rules: 31,
    domains: 5,
    status: "Experimental",
  },
];

const graphNodes = [
  { id: "mat1", label: "Host System", x: 40, y: 100, type: "material" },
  { id: "seq1", label: "Synthetic NA", x: 40, y: 220, type: "material" },
  { id: "op1", label: "Introduce Construct", x: 310, y: 160, type: "operation" },
  { id: "out1", label: "Modified Sample", x: 585, y: 160, type: "material" },
  { id: "op2", label: "Assay", x: 820, y: 160, type: "operation" },
];

const graphEdges = [
  ["mat1", "op1"],
  ["seq1", "op1"],
  ["op1", "out1"],
  ["out1", "op2"],
];

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

function statusTone(status) {
  switch (status) {
    case "Standard Review":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Additional Review":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "Human Review Required":
      return "border-orange-200 bg-orange-50 text-orange-800";
    case "Coordinated Review":
      return "border-red-200 bg-red-50 text-red-800";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function riskIcon(risk) {
  if (risk === "Low") return <ShieldCheck className="h-5 w-5" />;
  if (risk === "Moderate") return <AlertTriangle className="h-5 w-5" />;
  if (risk === "Elevated") return <ShieldAlert className="h-5 w-5" />;
  if (risk === "Flagged") return <Biohazard className="h-5 w-5" />;
  return <ShieldAlert className="h-5 w-5" />;
}

function Card({ children, className = "" }) {
  return (
    <section className={classNames("rounded-2xl border border-slate-800 bg-slate-900 shadow-sm shadow-black/20", className)}>
      {children}
    </section>
  );
}

function CardHeader({ icon, title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-slate-800 p-2 text-slate-100">{icon}</div>
        <div>
          <h2 className="text-base font-semibold text-slate-50">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function Pill({ children, className = "" }) {
  return (
    <span className={classNames("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium", className)}>
      {children}
    </span>
  );
}

function MetricCard({ icon, label, value, detail, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-700",
    blue: "bg-sky-100 text-sky-700",
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
      <div className="flex items-center justify-between">
        <div className={classNames("rounded-2xl p-2", tones[tone])}>{icon}</div>
        <ArrowRight className="h-4 w-4 text-slate-500" />
      </div>
      <div className="mt-5">
        <p className="text-sm text-slate-400">{label}</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-50">{value}</p>
        <p className="mt-1 text-sm text-slate-400">{detail}</p>
      </div>
    </div>
  );
}

function ResultsPanel({ screenedToday }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={<FlaskConical className="h-5 w-5" />}
        title="Results"
        subtitle="Current screening output for today’s cloud-lab protocol submissions."
      />
      <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
        <MetricCard
          icon={<FlaskConical className="h-5 w-5" />}
          label="Protocols screened today"
          value={screenedToday}
          detail="Increments when New screening is clicked"
          tone="blue"
        />
        <MetricCard
          icon={<ShieldAlert className="h-5 w-5" />}
          label="Need human review"
          value="6"
          detail="Elevated or Flagged protocols"
          tone="amber"
        />
        <MetricCard
          icon={<ShieldCheck className="h-5 w-5" />}
          label="Low threat"
          value="8"
          detail="Auto-triaged, high confidence low risk"
          tone="green"
        />
      </div>
    </Card>
  );
}

function UploadPanel({ selectedSchemaId, onSchemaChange, selectedPolicyPackId }) {
  const selectedSchema = labProtocolSchemas.find((schema) => schema.id === selectedSchemaId) ?? labProtocolSchemas[0];
  const selectedPolicyPack = policyPacks.find((pack) => pack.id === selectedPolicyPackId) ?? policyPacks[0];

  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={<CloudUpload className="h-5 w-5" />}
        title="Protocol Intake"
        subtitle="Choose a protocol schema, then upload or paste a protocol for screening."
        action={<Pill className="border-sky-200 bg-sky-50 text-sky-700">MVP parser</Pill>}
      />
      <div className="space-y-5 p-5">
        <div>
          <label htmlFor="lab-protocol-schema" className="text-sm font-semibold text-slate-950">
            Lab protocol schema
          </label>
          <div className="relative mt-2">
            <select
              id="lab-protocol-schema"
              value={selectedSchemaId}
              onChange={(event) => onSchemaChange(event.target.value)}
              className="w-full appearance-none rounded-2xl border border-slate-300 bg-white px-4 py-3 pr-10 text-sm font-semibold text-slate-950 shadow-sm outline-none transition hover:bg-slate-50 focus:border-slate-500function UploadPanel({ selectedSchemaId, onSchemaChange, selectedPolicyPackId, onPolicyPackChange }) {
  const selectedSchema = labProtocolSchemas.find((schema) => schema.id === selectedSchemaId) ?? labProtocolSchemas[0];
  const selectedPolicyPack = policyPacks.find((pack) => pack.id === selectedPolicyPackId) ?? policyPacks[0];

  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={<CloudUpload className="h-5 w-5" />}
        title="Protocol Intake"
        subtitle="Choose a protocol schema and policy pack, then upload or paste a protocol for screening."
      />
      <div className="space-y-5 p-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div>
            <label htmlFor="lab-protocol-schema" className="text-sm font-semibold text-slate-50">
              Lab protocol schema
            </label>
            <div className="relative mt-2">
              <select
                id="lab-protocol-schema"
                value={selectedSchemaId}
                onChange={(event) => onSchemaChange(event.target.value)}
                className="w-full appearance-none rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 pr-10 text-sm font-semibold text-slate-50 shadow-sm outline-none transition hover:bg-slate-800 focus:border-sky-500 focus:ring-4 focus:ring-slate-800"
              >
                {labProtocolSchemas.map((schema) => (
                  <option key={schema.id} value={schema.id}>
                    {schema.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
            <div className="mt-3 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-800/60 px-4 py-3">
              <p className="text-sm text-slate-400">{selectedSchema.description}</p>
              <Pill className="shrink-0 border-slate-800 bg-slate-900 text-slate-300">{selectedSchema.extension}</Pill>
            </div>
          </div>

          <div>
            <label htmlFor="policy-pack" className="text-sm font-semibold text-slate-50">
              Policy pack
            </label>
            <div className="relative mt-2">
              <select
                id="policy-pack"
                value={selectedPolicyPackId}
                onChange={(event) => onPolicyPackChange(event.target.value)}
                className="w-full appearance-none rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 pr-10 text-sm font-semibold text-slate-50 shadow-sm outline-none transition hover:bg-slate-800 focus:border-sky-500 focus:ring-4 focus:ring-slate-800"
              >
                {policyPacks.map((pack) => (
                  <option key={pack.id} value={pack.id}>
                    {pack.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
            <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-800/60 px-4 py-3">
              <p className="text-sm text-slate-400">{selectedPolicyPack.description}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-dashed border-slate-800 bg-slate-800/60 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-slate-100 shadow-sm">
            <Upload className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-slate-50">Drop {selectedSchema.label} protocol files here</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-400">
            Selected importer: {selectedSchema.label}. Screening will use {selectedPolicyPack.label}.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-800">
              Select file
            </button>
            <button className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 shadow-sm hover:bg-slate-800">
              Paste protocol
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ProtocolTableth>
              <th className="px-5 py-3 font-semibold">Findings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {protocols.map((protocol) => (
              <tr
                key={protocol.id}
                onClick={() => onSelect(protocol.id)}
                className={classNames(
                  "cursor-pointer hover:bg-slate-50",
                  selectedId === protocol.id && "bg-slate-50"
                )}
              >
                <td className="px-5 py-4">
                  <p className="font-medium text-slate-950">{protocol.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {protocol.id} · {protocol.submitter} · {protocol.submittedAt}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <Pill className={statusTone(protocol.status)}>{protocol.status}</Pill>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2 text-slate-700">
                    {riskIcon(protocol.risk)}
                    <span>{protocol.risk}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="w-28">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{Math.round(protocol.confidence * 100)}%</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-slate-900"
                        style={{ width: `${protocol.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-700">
                  {protocol.findings} findings · {protocol.missingInfo} missing
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function FindingsPanel() {
  return (
    <Card>
      <CardHeader
        icon={<ShieldAlert className="h-5 w-5" />}
        title="Flagged Findings"
        subtitle="Auditable rationale summaries produced from rule hits and protocol context."
      />
      <div className="divide-y divide-slate-100">
        {findings.map((finding) => (
          <div key={finding.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill className="border-slate-200 bg-slate-50 text-slate-700">{finding.id}</Pill>
                  <Pill className="border-amber-200 bg-amber-50 text-amber-800">{finding.domain}</Pill>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-slate-950">{finding.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{finding.evidence}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-slate-400">Confidence</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {Math.round(finding.confidence * 100)}%
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
              <span className="font-medium text-slate-900">Review route:</span> {finding.route}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ProtocolGraph() {
  const nodeById = useMemo(() => Object.fromEntries(graphNodes.map((node) => [node.id, node])), []);

  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={<Network className="h-5 w-5" />}
        title="Protocol Operation Graph"
        subtitle="Material and operation lineage used for aggregate workflow screening."
        action={<Pill className="border-purple-200 bg-purple-50 text-purple-700">Graph MVP</Pill>}
      />
      <div className="p-5">
        <div className="relative h-80 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 320">
            {graphEdges.map(([from, to]) => {
              const a = nodeById[from];
              const b = nodeById[to];
              return (
                <g key={`${from}-${to}`}>
                  <line
                    x1={a.x + 75}
                    y1={a.y + 30}
                    x2={b.x + 5}
                    y2={b.y + 30}
                    stroke="#cbd5e1"
                    strokeWidth="2"
                    markerEnd="url(#arrow)"
                  />
                </g>
              );
            })}
            <defs>
              <marker id="arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#cbd5e1" />
              </marker>
            </defs>
          </svg>

          {graphNodes.map((node) => (
            <div
              key={node.id}
              className={classNames(
                "absolute flex h-16 w-40 items-center justify-center rounded-2xl border px-3 text-center text-xs font-semibold shadow-sm",
                node.type === "material"
                  ? "border-sky-200 bg-sky-50 text-sky-800"
                  : "border-slate-300 bg-white text-slate-800"
              )}
              style={{ left: `${node.x / 10}%`, top: `${node.y}px` }}
            >
              {node.label}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function ReviewQueue() {
  return (
    <Card>
      <CardHeader
        icon={<UserCheck className="h-5 w-5" />}
        title="Human Review Queue"
        subtitle="Escalations routed to responsible institutional roles."
      />
      <div className="divide-y divide-slate-100">
        {queue.map((item) => (
          <div key={item.protocol} className="flex items-center justify-between gap-4 p-5">
            <div>
              <p className="text-sm font-semibold text-slate-950">{item.protocol}</p>
              <p className="mt-1 text-sm text-slate-500">{item.owner}</p>
            </div>
            <div className="text-right">
              <Pill
                className={classNames(
                  item.priority === "Urgent" && "border-red-200 bg-red-50 text-red-700",
                  item.priority === "High" && "border-orange-200 bg-orange-50 text-orange-700",
                  item.priority === "Medium" && "border-amber-200 bg-amber-50 text-amber-800"
                )}
              >
                {item.priority}
              </Pill>
              <p className="mt-1 text-xs text-slate-500">Due {item.due}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ThreatLevelPanel() {
  return (
    <Card>
      <CardHeader
        icon={<Layers3 className="h-5 w-5" />}
        title="Threat Levels"
        subtitle="Four-level triage model based on confidence and risk."
      />
      <div className="h-64 p-5">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={riskDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip cursor={{ fill: "rgba(15, 23, 42, 0.04)" }} />
            <Bar dataKey="count" radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="divide-y divide-slate-100 border-t border-slate-100">
        {threatLevels.map((level) => (
          <div key={level.name} className="p-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-2xl bg-slate-100 p-2 text-slate-700">{riskIcon(level.name)}</div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-950">{level.name}</p>
                  <Pill className="border-slate-200 bg-slate-50 text-slate-700">{level.summary}</Pill>
                </div>
                <p className="mt-1 text-sm text-slate-500">{level.description}</p>
                <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-400">{level.reviewAction}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PolicyPanel({ selectedPolicyPack }) {
  return (
    <Card>
      <CardHeader
        icon={<Database className="h-5 w-5" />}
        title="Policy Pack"
        subtitle="Versioned rules and citation-backed guidance snippets."
      />
      <div className="space-y-3 p-5">
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-950">{selectedPolicyPack.label}</p>

              </div>
              <p className="mt-1 text-xs text-slate-500">
                {selectedPolicyPack.rules} rules · {selectedPolicyPack.domains} review domains · {selectedPolicyPack.id}
              </p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-4 text-sm text-slate-600">{selectedPolicyPack.description}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="font-medium text-slate-900">Rules triggered</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">15</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="font-medium text-slate-900">Rules evaluated</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{selectedPolicyPack.rules * protocols.length}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function AuditPanel() {
  return (
    <Card>
      <CardHeader
        icon={<Lock className="h-5 w-5" />}
        title="Audit Trail"
        subtitle="Every report should be reproducible from protocol hash + policy version."
      />
      <div className="space-y-4 p-5">
        {[
          ["Schema validated", "Protocol fields normalized and graph built", CheckCircle2],
          ["Rule engine evaluated", "42 deterministic compliance rules checked", BadgeCheck],
          ["LLM summary generated", "Structured rationale only; no execution advice", Sparkles],
          ["Human review pending", "Escalated to IBC coordinator", AlertTriangle],
        ].map(([title, body, Icon]) => (
          <div key={title} className="flex gap-3">
            <div className="mt-0.5 rounded-full bg-slate-100 p-1.5 text-slate-600">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-950">{title}</p>
              <p className="mt-0.5 text-sm text-slate-500">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function CloudLabComplianceDashboard() {
  const [selectedId, setSelectedId] = useState(protocols[0].id);
  const [selectedPolicyPackId, setSelectedPolicyPackId] = useState(policyPacks[0].id);
  const [selectedSchemaId, setSelectedSchemaId] = useState(labProtocolSchemas[0].id);
  const [screenedToday, setScreenedToday] = useState(4);
  const selected = protocols.find((protocol) => protocol.id === selectedId) ?? protocols[0];
  const selectedPolicyPack = policyPacks.find((pack) => pack.id === selectedPolicyPackId) ?? policyPacks[0];

  const handleNewScreening = () => {
    setScreenedToday((current) => current + 1);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-6 py-1">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500 text-white shadow-sm shadow-sky-950/40">
              <Microscope className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-50">Cloud Lab Protocol Compliance</h1>
              <p className="text-[11px] font-medium text-slate-300">Protocol-level safety triage for remote experimental workflows</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <Pill className="border-emerald-200 bg-emerald-50 text-emerald-700">{selectedPolicyPack.label}</Pill>
            <button
              onClick={handleNewScreening}
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
            >
              New screening
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        <UploadPanel
          selectedSchemaId={selectedSchemaId}
          onSchemaChange={setSelectedSchemaId}
          selectedPolicyPackId={selectedPolicyPackId}
          onPolicyPackChange={setSelectedPolicyPackId}
        />

        <ResultsPanel screenedToday={screenedToday} />

        <ProtocolTable selectedId={selectedId} onSelect={setSelectedId} />

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Pill className={statusTone(selected.status)}>{selected.status}</Pill>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{selected.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {selected.id} · submitted by {selected.submitter} · {selected.submittedAt}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4 text-right">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Overall confidence</p>
                  <p className="mt-1 text-3xl font-semibold text-slate-950">{Math.round(selected.confidence * 100)}%</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Risk</p>
                  <div className="mt-2 flex items-center gap-2 font-semibold text-slate-950">
                    {riskIcon(selected.risk)} {selected.risk}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Policy pack</p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">{selected.policyPack}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Safe to auto-clear</p>
                  <div className="mt-2 flex items-center gap-2 font-semibold text-red-700">
                    <XCircle className="h-5 w-5" /> No
                  </div>
                </div>
              </div>
            </Card>
            <ProtocolGraph />
            <FindingsPanel />
          </div>

          <div className="space-y-6">
            <ReviewQueue />
            <ThreatLevelPanel />
            <PolicyPanel selectedPolicyPack={selectedPolicyPack} />
            <AuditPanel />
          </div>
        </section>
      </main>
    </div>
  );
}
