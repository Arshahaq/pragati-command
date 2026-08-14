import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePragati } from "@/lib/pragati/store";
import { CITIZEN_LOCATION } from "@/lib/pragati/seed";
import { haversineKm, planRoutes, rankHospitals, riskLabel } from "@/lib/pragati/logic";
import { serviceRegistry, visionService } from "@/lib/pragati/services";
import type {
  GeoPoint,
  Incident,
  IncidentType,
  Severity,
} from "@/lib/pragati/types";
import { MapCanvas } from "./MapCanvas";
import { IncidentDrawer } from "./IncidentDrawer";
import { AiPanel } from "./AiPanel";
import {
  KpiCard,
  Panel,
  ProgressBar,
  SeverityBadge,
  StatusPill,
  clockTime,
  timeAgo,
} from "./primitives";
import {
  Activity,
  Ambulance,
  Bell,
  Building2,
  Search,
  ShieldAlert,
  Siren,
  Tent,
  TriangleAlert,
} from "lucide-react";

const INCIDENT_TYPES: IncidentType[] = [
  "Flood",
  "Fire",
  "Accident",
  "Medical Emergency",
  "Building Damage",
  "Landslide",
  "Trapped Person",
  "Missing Person",
  "Road Blockage",
];

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];

export function KpiRow() {
  const { kpis } = usePragati();
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <KpiCard label="Active incidents" value={kpis.activeIncidents} tone="info" hint={`${kpis.unassigned} awaiting assignment`} icon={<TriangleAlert className="size-4" />} />
      <KpiCard label="Critical incidents" value={kpis.criticalIncidents} tone="critical" hint={`${kpis.peopleAffected} people affected`} icon={<Siren className="size-4" />} />
      <KpiCard label="Available ambulances" value={kpis.availableAmbulances} tone="safe" hint="Ready for dispatch" icon={<Ambulance className="size-4" />} />
      <KpiCard label="Available rescue teams" value={kpis.availableRescueTeams} tone="safe" hint="Includes boat-capable units" icon={<ShieldAlert className="size-4" />} />
      <KpiCard label="Operational hospitals" value={kpis.operationalHospitals} tone="neutral" hint="Clear access + capacity" icon={<Building2 className="size-4" />} />
      <KpiCard label="Open relief centres" value={kpis.openReliefCenters} tone="neutral" hint="Accepting evacuees" icon={<Tent className="size-4" />} />
    </div>
  );
}

export function IncidentsView({ compactFilters }: { compactFilters?: boolean | undefined }) {
  const { state, priorities } = usePragati();
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [severity, setSeverity] = useState("all");
  const [type, setType] = useState("all");
  const [area, setArea] = useState("all");
  const [status, setStatus] = useState("all");
  const [assigned, setAssigned] = useState("all");

  const areas = useMemo(() => [...new Set(state.incidents.map((i) => i.area))].sort(), [state.incidents]);

  const rows = state.incidents.filter((i) => {
    if (severity !== "all" && i.severity !== severity) return false;
    if (type !== "all" && i.type !== type) return false;
    if (area !== "all" && i.area !== area) return false;
    if (status !== "all" && i.status !== status) return false;
    if (assigned === "assigned" && !i.assignedResourceId) return false;
    if (assigned === "unassigned" && i.assignedResourceId) return false;
    if (q && !`${i.id} ${i.type} ${i.area} ${i.description}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <Panel
        eyebrow={`${rows.length} of ${state.incidents.length} records`}
        title="Incident register"
        bodyClassName="p-0"
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <label className="flex min-w-48 flex-1 items-center gap-2 rounded-md border border-border bg-surface-2 px-2.5 py-1.5">
            <Search className="size-3.5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search ID, type, area…"
              className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            />
          </label>
          <Select value={severity} onChange={setSeverity} options={["all", ...SEVERITIES]} label="Severity" />
          <Select value={type} onChange={setType} options={["all", ...INCIDENT_TYPES]} label="Type" />
          {!compactFilters && <Select value={area} onChange={setArea} options={["all", ...areas]} label="Area" />}
          <Select value={status} onChange={setStatus} options={["all", "awaiting", "assigned", "en_route", "on_scene", "resolved"]} label="Status" />
          <Select value={assigned} onChange={setAssigned} options={["all", "assigned", "unassigned"]} label="Allocation" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                {["ID", "Type", "Location", "Severity", "Reported", "Status", "Assigned", "ETA", "Priority"].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((incident) => {
                const score = priorities.find((p) => p.incident.id === incident.id)?.score;
                return (
                  <tr
                    key={incident.id}
                    onClick={() => setOpen(incident.id)}
                    className="cursor-pointer transition-colors hover:bg-surface-2"
                  >
                    <td className="tabular px-3 py-2.5 font-medium text-foreground">{incident.id}</td>
                    <td className="px-3 py-2.5">{incident.type}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{incident.area}</td>
                    <td className="px-3 py-2.5"><SeverityBadge severity={incident.severity} /></td>
                    <td className="px-3 py-2.5 text-muted-foreground">{timeAgo(incident.reportedAt)}</td>
                    <td className="px-3 py-2.5">
                      <StatusPill tone={incident.status === "awaiting" ? "warning" : incident.status === "resolved" ? "safe" : "info"}>
                        {incident.status.replace("_", " ")}
                      </StatusPill>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{incident.assignedResourceId ?? "—"}</td>
                    <td className="tabular px-3 py-2.5 text-muted-foreground">{incident.etaMinutes ? `${incident.etaMinutes} min` : "—"}</td>
                    <td className="tabular px-3 py-2.5 font-semibold text-foreground">{score ?? "—"}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">No incidents match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
      <IncidentDrawer incidentId={open} onClose={() => setOpen(null)} />
    </>
  );
}

function Select({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  label: string;
}) {
  return (
    <label className="flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2 py-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-foreground outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-surface text-foreground">
            {o.replace("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}

export function PriorityQueue({ limit }: { limit?: number | undefined }) {
  const { priorities, dispatch } = usePragati();
  const rows = (limit ? priorities.slice(0, limit) : priorities).filter((r) => r.incident.status !== "resolved");
  return (
    <Panel eyebrow="Rule-based scoring · severity, exposure, distance, availability, route risk" title="AI resource prioritisation" bodyClassName="p-0">
      <ol className="divide-y divide-border">
        {rows.map((row, index) => (
          <li key={row.incident.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Priority #{index + 1} · score {row.score}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                  {row.incident.id} <SeverityBadge severity={row.incident.severity} />
                </p>
                <p className="text-xs text-muted-foreground">
                  {row.incident.type} · {row.incident.area} · {row.incident.peopleAffected} affected
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Recommended resource</p>
                <p className="text-sm font-semibold text-foreground">{row.resource?.callSign ?? "None available"}</p>
                {row.resource && (
                  <button
                    onClick={() => {
                      dispatch({ type: "assignResource", incidentId: row.incident.id, resourceId: row.resource!.id });
                      toast.success(`${row.resource!.callSign} assigned to ${row.incident.id}`);
                    }}
                    className="mt-1.5 rounded-md border border-primary/50 bg-primary/12 px-2.5 py-1 text-xs font-medium text-primary"
                  >
                    Assign now
                  </button>
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {row.breakdown.map((b) => (
                <span key={b.label} className="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[10.5px] text-muted-foreground">
                  {b.label}: {b.value} ({b.points >= 0 ? "+" : ""}{b.points})
                </span>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

export function ResourcesView() {
  const { state, dispatch } = usePragati();
  const [selected, setSelected] = useState<string | null>(state.resources[0]?.id ?? null);
  const [filter, setFilter] = useState("all");
  const resource = state.resources.find((r) => r.id === selected);
  const rows = state.resources.filter((r) => filter === "all" || r.type === filter);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
      <Panel
        eyebrow={`${rows.length} units`}
        title="Emergency resources"
        actions={<Select value={filter} onChange={setFilter} options={["all", "Ambulance", "Fire Truck", "Rescue Team", "Police Unit", "Drone", "Boat", "Medical Team"]} label="Type" />}
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="border-b border-border text-muted-foreground">
              <tr>{["ID", "Type", "Location", "Status", "Mission", "ETA"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} onClick={() => setSelected(r.id)} className={cn("cursor-pointer hover:bg-surface-2", selected === r.id && "bg-surface-2")}>
                  <td className="tabular px-3 py-2.5 font-medium text-foreground">{r.id}</td>
                  <td className="px-3 py-2.5">{r.type}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.area}</td>
                  <td className="px-3 py-2.5">
                    <StatusPill tone={r.status === "available" ? "safe" : r.status === "offline" ? "neutral" : "info"}>
                      {r.status.replace("_", " ")}
                    </StatusPill>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.assignedIncidentId ?? "—"}</td>
                  <td className="tabular px-3 py-2.5 text-muted-foreground">{r.etaMinutes ? `${r.etaMinutes} min` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel eyebrow="Unit detail" title={resource?.callSign ?? "Select a unit"}>
        {resource ? (
          <div className="space-y-3 text-xs">
            <Rows
              rows={[
                { label: "Type", value: resource.type },
                { label: "Crew", value: String(resource.crew) },
                { label: "Home base", value: resource.homeBase },
                { label: "Coordinates", value: `${resource.location.lat.toFixed(4)}, ${resource.location.lng.toFixed(4)}` },
                { label: "Status", value: resource.status.replace("_", " ") },
                { label: "Assigned incident", value: resource.assignedIncidentId ?? "None" },
              ]}
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {(["available", "busy", "offline"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => dispatch({ type: "updateResource", id: resource.id, patch: { status: s } })}
                  className="rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Set {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Choose a unit from the table.</p>
        )}
      </Panel>
    </div>
  );
}

export function Rows({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="space-y-1.5">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-3 text-xs">
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="max-w-[62%] text-right font-medium text-foreground">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function HospitalsView() {
  const { state } = usePragati();
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {state.hospitals.map((h) => {
        const free = h.emergencyBeds.total - h.emergencyBeds.used;
        return (
          <Panel key={h.id} eyebrow={`${h.id} · ${h.area}`} title={h.name}>
            <div className="mb-3 flex flex-wrap gap-2">
              <StatusPill tone={h.status === "operational" ? "safe" : h.status === "offline" ? "critical" : "warning"}>{h.status}</StatusPill>
              {h.accessAffected && <StatusPill tone="critical">Access road affected</StatusPill>}
              <StatusPill tone={h.floodRisk === "low" ? "safe" : h.floodRisk === "medium" ? "warning" : "critical"}>Flood risk {h.floodRisk}</StatusPill>
            </div>
            <div className="space-y-2.5">
              <Meter label="Emergency beds" used={h.emergencyBeds.used} total={h.emergencyBeds.total} />
              <Meter label="ICU" used={h.icu.used} total={h.icu.total} />
              <div>
                <div className="mb-1 flex justify-between text-[11px] text-muted-foreground"><span>Oxygen reserve</span><span className="tabular">{h.oxygenPct}%</span></div>
                <ProgressBar value={h.oxygenPct} total={100} tone={h.oxygenPct < 45 ? "critical" : "safe"} />
              </div>
            </div>
            <Rows
              rows={[
                { label: "Emergency capacity", value: free > 0 ? `${free} beds available` : "Full" },
                { label: "Blood units", value: String(h.bloodUnits) },
                { label: "Ambulances", value: `${h.ambulancesAvailable}/${h.ambulances}` },
                { label: "Updated", value: timeAgo(h.updatedAt) },
              ]}
            />
          </Panel>
        );
      })}
    </div>
  );
}

function Meter({ label, used, total }: { label: string; used: number; total: number }) {
  const free = total - used;
  const tone = free <= 2 ? "critical" : free <= 6 ? "warning" : "safe";
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        <span className="tabular">{used}/{total}</span>
      </div>
      <ProgressBar value={used} total={total} tone={tone} />
    </div>
  );
}

export function ReliefView() {
  const { state } = usePragati();
  return (
    <Panel eyebrow={`${state.reliefCenters.length} centres`} title="Relief centres" bodyClassName="p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="border-b border-border text-muted-foreground">
            <tr>{["Centre", "Location", "Capacity", "Occupancy", "Food", "Water", "Medical", "Status"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border">
            {state.reliefCenters.map((c) => (
              <tr key={c.id}>
                <td className="px-3 py-2.5 font-medium text-foreground">{c.id} · {c.name}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{c.area}</td>
                <td className="tabular px-3 py-2.5">{c.capacity}</td>
                <td className="px-3 py-2.5">
                  <span className="tabular">{c.occupancy}</span>
                  <div className="mt-1 w-24"><ProgressBar value={c.occupancy} total={c.capacity} tone={c.occupancy / c.capacity > 0.85 ? "critical" : "info"} /></div>
                </td>
                <td className="px-3 py-2.5"><StatusPill tone={c.food === "adequate" ? "safe" : c.food === "low" ? "warning" : "critical"}>{c.food}</StatusPill></td>
                <td className="px-3 py-2.5"><StatusPill tone={c.water === "adequate" ? "safe" : c.water === "low" ? "warning" : "critical"}>{c.water}</StatusPill></td>
                <td className="px-3 py-2.5 text-muted-foreground">{c.medicalSupport ? "Yes" : "No"}</td>
                <td className="px-3 py-2.5"><StatusPill tone={c.status === "full" ? "critical" : c.status === "filling" ? "warning" : "safe"}>{c.status}</StatusPill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function RoutePlanner({ origin }: { origin?: GeoPoint | undefined }) {
  const { state } = usePragati();
  const from = origin ?? CITIZEN_LOCATION;
  const destinations = [
    ...state.hospitals.map((h) => ({ id: h.id, label: `${h.name} (hospital)`, point: h.location })),
    ...state.reliefCenters.map((r) => ({ id: r.id, label: `${r.name} (relief centre)`, point: r.location })),
  ];
  const [destId, setDestId] = useState(destinations[0]?.id ?? "");
  const destination = destinations.find((d) => d.id === destId) ?? destinations[0];
  const routes = useMemo(
    () => (destination ? planRoutes(from, destination.point, state.roads, state.zones) : []),
    [from, destination, state.roads, state.zones],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <MapCanvas className="min-h-[420px]" routes={routes} origin={from} compact />
      <div className="space-y-4">
        <Panel eyebrow="Simulated routing engine" title="Plan a route">
          <div className="space-y-3 text-xs">
            <div>
              <p className="label-eyebrow mb-1">From</p>
              <div className="rounded-md border border-border bg-surface-2 px-2.5 py-2">Current location · {CITIZEN_LOCATION.area}</div>
            </div>
            <div>
              <p className="label-eyebrow mb-1">To</p>
              <select
                value={destId}
                onChange={(e) => setDestId(e.target.value)}
                className="w-full rounded-md border border-border bg-surface-2 px-2.5 py-2 text-foreground outline-none"
              >
                {destinations.map((d) => (
                  <option key={d.id} value={d.id} className="bg-surface">{d.label}</option>
                ))}
              </select>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Routes are generated from simulated hazard-weighted costs. Replace{" "}
              <code className="text-foreground">routingService</code> with a real directions API to
              use live road geometry.
            </p>
          </div>
        </Panel>

        {routes.map((route) => {
          const risk = riskLabel(route.riskScore);
          return (
            <Panel
              key={route.id}
              eyebrow={`${route.distanceKm} km · risk ${route.riskScore}/100`}
              title={
                <span className="flex items-center gap-2">
                  {route.label} route · {route.minutes} min
                  {route.recommended && <StatusPill tone="safe">Recommended</StatusPill>}
                </span>
              }
            >
              <StatusPill tone={risk.tone === "safe" ? "safe" : risk.tone === "warning" ? "warning" : "critical"}>{risk.label}</StatusPill>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{route.reason}</p>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

export function SafeHospitalList({ compact }: { compact?: boolean | undefined }) {
  const { citizenHospitalRanking } = usePragati();
  const list = compact ? citizenHospitalRanking.slice(0, 3) : citizenHospitalRanking;
  const best = citizenHospitalRanking[0];
  const nearest = [...citizenHospitalRanking].sort((a, b) => a.distanceKm - b.distanceKm)[0];

  return (
    <div className="space-y-3">
      {best && nearest && best.hospital.id !== nearest.hospital.id && (
        <div className="panel border-forest/40 bg-forest/8 p-4">
          <p className="label-eyebrow text-forest">Why not the nearest hospital?</p>
          <p className="mt-1 text-sm leading-relaxed text-foreground">
            {best.hospital.name} is recommended because {nearest.hospital.name} is closer (
            {nearest.distanceKm} km) but{" "}
            {nearest.hospital.accessAffected ? "its access road is currently flood affected" : "its emergency capacity is nearly exhausted"}.
          </p>
        </div>
      )}
      {list.map((item) => (
        <article key={item.hospital.id} className={cn("panel p-4", item.recommended && "border-forest/50")}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{item.hospital.name}</h3>
              <p className="text-xs text-muted-foreground">{item.hospital.area} · {item.distanceKm} km away</p>
            </div>
            <StatusPill tone={item.recommended ? "safe" : "neutral"}>
              {item.recommended ? "Recommended: YES" : "Recommended: NO"}
            </StatusPill>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusPill tone={item.hospital.accessAffected ? "critical" : "safe"}>
              {item.hospital.accessAffected ? "Access affected" : "Access clear"}
            </StatusPill>
            <StatusPill tone={item.capacityFree > 4 ? "safe" : item.capacityFree > 0 ? "warning" : "critical"}>
              Emergency capacity: {item.capacityFree > 0 ? `${item.capacityFree} beds` : "full"}
            </StatusPill>
            <StatusPill tone={riskLabel(item.riskScore).tone === "safe" ? "safe" : riskLabel(item.riskScore).tone === "warning" ? "warning" : "critical"}>
              Route safety: {riskLabel(item.riskScore).label}
            </StatusPill>
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">{item.reason}</p>
        </article>
      ))}
    </div>
  );
}

export function HelpRequestForm() {
  const { state, dispatch } = usePragati();
  const [type, setType] = useState<IncidentType>("Medical Emergency");
  const [severity, setSeverity] = useState<Severity>("critical");
  const [description, setDescription] = useState("");
  const [people, setPeople] = useState(1);
  const [photo, setPhoto] = useState(false);
  const [created, setCreated] = useState<Incident | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = description.trim();
    if (trimmed.length < 10) {
      toast.error("Please describe the emergency in at least 10 characters.");
      return;
    }
    if (people < 1 || people > 5000) {
      toast.error("Number of people must be between 1 and 5000.");
      return;
    }
    const id = `PRG-${10340 + state.incidents.length * 3 + Math.floor(Math.random() * 7)}`;
    const now = new Date().toISOString();
    const incident: Incident = {
      id,
      type,
      severity,
      area: "Koramangala",
      location: { lat: CITIZEN_LOCATION.lat + (Math.random() - 0.5) * 0.006, lng: CITIZEN_LOCATION.lng + (Math.random() - 0.5) * 0.006 },
      description: trimmed.slice(0, 400),
      peopleAffected: people,
      reportedAt: now,
      status: "awaiting",
      source: "citizen",
      photoCount: photo ? 1 : 0,
      timeline: [
        { at: now, label: "Emergency request received", actor: "Citizen Portal" },
        { at: now, label: `Auto-triaged as ${severity}`, actor: "PRAGATI triage rules" },
      ],
    };
    dispatch({
      type: "createIncident",
      incident,
      request: {
        id: `REQ-${id}`,
        incidentId: id,
        requesterName: "Demo Citizen",
        type,
        severity,
        area: "Koramangala",
        description: trimmed.slice(0, 400),
        people,
        hasPhoto: photo,
        at: now,
        status: "received",
      },
    });
    setCreated(incident);
    setDescription("");
    toast.success(`Request ${id} submitted`, { description: "Visible now in the Government Command Center." });
  };

  if (created) {
    const rec = state.recommendations.find((r) => r.incidentId === created.id);
    return (
      <Panel eyebrow="Request submitted" title={`Request ${created.id}`}>
        <div className="space-y-3">
          <StatusPill tone="safe">Request received</StatusPill>
          <Rows
            rows={[
              { label: "Priority", value: created.severity.toUpperCase() },
              { label: "Location shared", value: CITIZEN_LOCATION.area },
              { label: "Response team", value: rec?.resourceId ? `${rec.resourceId} recommended` : "Being identified" },
              { label: "Submitted", value: clockTime(created.reportedAt) },
            ]}
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Your request has entered the command centre incident queue and is being scored against
            other active incidents. Track progress under “My Requests”.
          </p>
          <button onClick={() => setCreated(null)} className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
            Submit another request
          </button>
        </div>
      </Panel>
    );
  }

  return (
    <Panel eyebrow="Emergency request · simulated dispatch" title="I need help">
      <form onSubmit={submit} className="space-y-3 text-xs">
        <div>
          <p className="label-eyebrow mb-1.5">Emergency type</p>
          <div className="flex flex-wrap gap-2">
            {(["Medical Emergency", "Trapped Person", "Flood", "Fire", "Missing Person", "Building Damage"] as IncidentType[]).map((option) => (
              <button
                type="button"
                key={option}
                onClick={() => setType(option)}
                className={cn(
                  "rounded-md border px-2.5 py-1.5 transition-colors",
                  type === option ? "border-primary/60 bg-primary/12 font-semibold text-foreground" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="label-eyebrow mb-1.5">Severity</p>
          <div className="flex flex-wrap gap-2">
            {SEVERITIES.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setSeverity(s)}
                className={cn(
                  "rounded-md border px-2.5 py-1.5 capitalize",
                  severity === s ? "border-primary/60 bg-primary/12 font-semibold text-foreground" : "border-border text-muted-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="label-eyebrow">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={400}
            rows={3}
            required
            placeholder="What is happening? Include landmarks if possible."
            className="mt-1 w-full rounded-md border border-border bg-surface-2 px-2.5 py-2 text-foreground outline-none focus:border-primary/60"
          />
        </label>

        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="label-eyebrow">Number of people</span>
            <input
              type="number"
              min={1}
              max={5000}
              value={people}
              onChange={(e) => setPeople(Number(e.target.value))}
              className="tabular mt-1 w-28 rounded-md border border-border bg-surface-2 px-2.5 py-2 text-foreground outline-none"
            />
          </label>
          <label className="flex items-center gap-2 pb-2 text-muted-foreground">
            <input type="checkbox" checked={photo} onChange={(e) => setPhoto(e.target.checked)} className="size-3.5 accent-[var(--color-primary)]" />
            Attach a photo (simulated)
          </label>
        </div>

        <div className="rounded-md border border-border bg-surface-2 px-2.5 py-2 text-muted-foreground">
          Location captured automatically: <span className="text-foreground">{CITIZEN_LOCATION.area}</span> ·{" "}
          <span className="tabular">{CITIZEN_LOCATION.lat.toFixed(4)}, {CITIZEN_LOCATION.lng.toFixed(4)}</span>
        </div>

        <button type="submit" className="w-full rounded-lg bg-critical px-4 py-2.5 text-sm font-semibold text-critical-foreground">
          REQUEST HELP
        </button>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Prototype only — this does not contact 112, 108 or any emergency service. In a real
          emergency call the official helpline.
        </p>
      </form>
    </Panel>
  );
}

export function MyRequests() {
  const { state } = usePragati();
  if (state.requests.length === 0) {
    return (
      <Panel eyebrow="No requests yet" title="My requests">
        <p className="text-xs text-muted-foreground">
          Submit an emergency request from “Find Help” and it will appear here and in the command
          centre incident queue.
        </p>
      </Panel>
    );
  }
  return (
    <div className="space-y-3">
      {state.requests.map((req) => {
        const incident = state.incidents.find((i) => i.id === req.incidentId);
        return (
          <Panel key={req.id} eyebrow={`Submitted ${timeAgo(req.at)}`} title={`${req.incidentId} · ${req.type}`}>
            <div className="flex flex-wrap gap-2">
              <SeverityBadge severity={req.severity} />
              <StatusPill tone={incident?.assignedResourceId ? "safe" : "warning"}>
                {incident?.assignedResourceId ? `Team ${incident.assignedResourceId} assigned` : "Response team being identified"}
              </StatusPill>
              {incident?.etaMinutes ? <StatusPill tone="info">ETA {incident.etaMinutes} min</StatusPill> : null}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{req.description}</p>
            {incident && (
              <ol className="mt-3 space-y-2">
                {incident.timeline.map((entry, i) => (
                  <li key={i} className="flex gap-2 text-[11px]">
                    <span className="tabular w-10 text-muted-foreground">{clockTime(entry.at)}</span>
                    <span className="text-foreground">{entry.label}</span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        );
      })}
    </div>
  );
}

export function AlertsView() {
  const { state, dispatch } = usePragati();
  return (
    <div className="space-y-3">
      {state.alerts.map((alert) => (
        <article key={alert.id} className={cn("panel flex flex-wrap items-start justify-between gap-3 p-4", alert.acknowledged && "opacity-60")}>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={alert.level === "critical" ? "critical" : alert.level === "warning" ? "warning" : "info"}>
                {alert.level}
              </StatusPill>
              <span className="text-[11px] text-muted-foreground">{alert.source} · {timeAgo(alert.at)}</span>
            </div>
            <h3 className="mt-1.5 text-sm font-semibold text-foreground">{alert.title}</h3>
            <p className="text-xs text-muted-foreground">{alert.detail}</p>
          </div>
          {!alert.acknowledged && (
            <button
              onClick={() => dispatch({ type: "ackAlert", id: alert.id })}
              className="rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Acknowledge
            </button>
          )}
        </article>
      ))}
    </div>
  );
}

export function ScenarioSimulator() {
  const { state, dispatch } = usePragati();
  const w = state.whatIf;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-4">
        <Panel eyebrow="Scenario library" title="Disaster scenario simulator">
          <div className="space-y-3">
            <button
              onClick={() => {
                dispatch({ type: "activateFlood" });
                toast.warning("Bengaluru Flood scenario activated", { description: "Zones, roads, hospitals, incidents and AI guidance updated." });
              }}
              disabled={state.scenarioActive}
              className="w-full rounded-lg bg-critical px-4 py-3 text-sm font-semibold text-critical-foreground disabled:opacity-50"
            >
              {state.scenarioActive ? "FLOOD SCENARIO ACTIVE" : "ACTIVATE FLOOD SCENARIO"}
            </button>
            <div className="grid gap-2 sm:grid-cols-2">
              {["Urban Fire", "Landslide", "Major Road Accident", "Custom Disaster"].map((s) => (
                <button key={s} disabled className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                  {s} · planned
                </button>
              ))}
            </div>
            <button
              onClick={() => { dispatch({ type: "reset" }); toast.success("Simulation reset to baseline"); }}
              className="w-full rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Reset simulation to baseline
            </button>
          </div>
        </Panel>

        <Panel eyebrow="What-if controls" title="Live condition overrides">
          <div className="space-y-4">
            <label className="flex items-center justify-between gap-3 text-xs">
              <span className="text-foreground">Road 17 closed (Outer Ring Road)</span>
              <input
                type="checkbox"
                checked={w.road17Closed}
                onChange={(e) => dispatch({ type: "setWhatIf", patch: { road17Closed: e.target.checked } })}
                className="size-4 accent-[var(--color-critical)]"
              />
            </label>
            <Slider label="Flood severity" value={w.floodSeverity} onChange={(v) => dispatch({ type: "setWhatIf", patch: { floodSeverity: v } })} />
            <Slider label="Hospital availability" value={w.hospitalAvailabilityPct} onChange={(v) => dispatch({ type: "setWhatIf", patch: { hospitalAvailabilityPct: v } })} />
            <Slider label="Resource availability" value={w.resourceAvailabilityPct} onChange={(v) => dispatch({ type: "setWhatIf", patch: { resourceAvailabilityPct: v } })} />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Every change recalculates routing, hospital recommendations, ETAs and AI guidance
              across all roles.
            </p>
          </div>
        </Panel>
      </div>

      <Panel eyebrow="Event timeline" title="Scenario events" bodyClassName="p-0">
        <ol className="max-h-[560px] divide-y divide-border overflow-y-auto">
          {[...state.events].reverse().map((event, i) => (
            <li key={`${event.at}-${i}`} className="flex gap-3 p-3">
              <span className="tabular w-12 shrink-0 text-[11px] text-muted-foreground">{clockTime(event.at)}</span>
              <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", event.level === "critical" ? "bg-critical" : event.level === "warning" ? "bg-warning" : "bg-primary")} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">{event.label}</p>
                <p className="text-[11px] text-muted-foreground">{event.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block text-xs">
      <span className="mb-1 flex justify-between">
        <span className="text-foreground">{label}</span>
        <span className="tabular text-muted-foreground">{value}%</span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-primary)]"
      />
    </label>
  );
}

export function DronesView() {
  const { state, dispatch } = usePragati();
  const [busy, setBusy] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="panel border-saffron/40 bg-saffron/8 p-3 text-xs text-muted-foreground">
        Simulated field intelligence. PRAGATI is not processing live drone feeds; detection values
        come from a mock computer-vision service.
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {state.drones.map((mission) => (
          <Panel key={mission.id} eyebrow={`${mission.id} · ${mission.area}`} title={`Drone ${mission.droneId}`}>
            <div className="mb-3 flex flex-wrap gap-2">
              <StatusPill tone={mission.status === "active" ? "info" : "neutral"}>{mission.status}</StatusPill>
              <StatusPill tone="neutral">Battery {mission.batteryPct}%</StatusPill>
              <StatusPill tone="neutral">Alt {mission.altitudeM} m</StatusPill>
            </div>
            {mission.detections ? (
              <Rows
                rows={[
                  { label: "People detected", value: String(mission.detections.peopleDetected) },
                  { label: "Vehicles stranded", value: String(mission.detections.vehiclesStranded) },
                  { label: "Damaged structures", value: String(mission.detections.damagedStructures) },
                  { label: "Flood severity", value: mission.detections.floodSeverity },
                ]}
              />
            ) : (
              <p className="text-xs text-muted-foreground">No imagery analysed for this mission yet.</p>
            )}
            <button
              onClick={async () => {
                setBusy(mission.id);
                try {
                  const detections = await visionService.analyse(mission);
                  dispatch({ type: "setDroneDetections", missionId: mission.id, detections });
                  toast.success(`Analysis complete for ${mission.droneId}`, { description: "Mock computer-vision output." });
                } catch {
                  toast.error("Vision service unavailable — previous results retained.");
                } finally {
                  setBusy(null);
                }
              }}
              className="mt-3 w-full rounded-md border border-border px-3 py-2 text-xs text-foreground hover:border-primary/60"
            >
              {busy === mission.id ? "Analysing imagery…" : "Analyse image (simulated)"}
            </button>
          </Panel>
        ))}
      </div>
    </div>
  );
}

export function ServiceRegistryView() {
  return (
    <Panel eyebrow="API-ready architecture" title="Service integration status" bodyClassName="p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="border-b border-border text-muted-foreground">
            <tr>{["Service", "Mode", "Intended provider", "Environment variables", "Purpose"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border">
            {serviceRegistry.map((svc) => (
              <tr key={svc.name}>
                <td className="px-3 py-2.5 font-medium text-foreground">{svc.name}</td>
                <td className="px-3 py-2.5"><StatusPill tone={svc.mode === "mock" ? "warning" : "safe"}>{svc.mode}</StatusPill></td>
                <td className="px-3 py-2.5 text-muted-foreground">{svc.provider}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{svc.envVars.length ? svc.envVars.join(", ") : "—"}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{svc.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function HospitalConsole({ view }: { view: "status" | "capacity" | "requests" | "ambulances" | "updates" }) {
  const { state, dispatch } = usePragati();
  const hospital = state.hospitals.find((h) => h.id === state.activeHospitalId) ?? state.hospitals[0];
  if (!hospital) return null;
  const patch = (p: Parameters<typeof dispatch>[0] extends never ? never : Partial<typeof hospital>) =>
    dispatch({ type: "updateHospital", id: hospital.id, patch: p });

  const incoming = state.incidents.filter(
    (i) => i.status !== "resolved" && ["Medical Emergency", "Accident", "Trapped Person"].includes(i.type),
  );

  return (
    <div className="space-y-4">
      <Panel
        eyebrow="Facility profile"
        title={hospital.name}
        actions={
          <select
            value={hospital.id}
            onChange={(e) => dispatch({ type: "setActiveHospital", id: e.target.value })}
            className="rounded-md border border-border bg-surface-2 px-2 py-1 text-xs text-foreground outline-none"
          >
            {state.hospitals.map((h) => <option key={h.id} value={h.id} className="bg-surface">{h.name}</option>)}
          </select>
        }
      >
        <div className="flex flex-wrap gap-2">
          <StatusPill tone={hospital.status === "operational" ? "safe" : hospital.status === "offline" ? "critical" : "warning"}>{hospital.status}</StatusPill>
          <StatusPill tone="neutral">{hospital.area}</StatusPill>
          {hospital.accessAffected && <StatusPill tone="critical">Access road affected</StatusPill>}
          <StatusPill tone="neutral">Updated {timeAgo(hospital.updatedAt)}</StatusPill>
        </div>
      </Panel>

      {(view === "status" || view === "capacity") && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard label="Emergency beds free" value={hospital.emergencyBeds.total - hospital.emergencyBeds.used} tone={hospital.emergencyBeds.total - hospital.emergencyBeds.used <= 2 ? "critical" : "safe"} hint={`${hospital.emergencyBeds.used}/${hospital.emergencyBeds.total} occupied`} />
          <KpiCard label="ICU free" value={hospital.icu.total - hospital.icu.used} tone={hospital.icu.total - hospital.icu.used <= 1 ? "critical" : "info"} hint={`${hospital.icu.used}/${hospital.icu.total} occupied`} />
          <KpiCard label="Oxygen reserve" value={`${hospital.oxygenPct}%`} tone={hospital.oxygenPct < 45 ? "warning" : "safe"} />
          <KpiCard label="Blood units" value={hospital.bloodUnits} tone="neutral" />
          <KpiCard label="Ambulances" value={`${hospital.ambulancesAvailable}/${hospital.ambulances}`} tone="info" hint="Available / fleet" />
        </div>
      )}

      {(view === "status" || view === "capacity") && (
        <Panel eyebrow="Facility controls · updates propagate platform-wide" title="Update hospital record">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="label-eyebrow">Status</p>
              <div className="flex flex-wrap gap-2">
                {(["operational", "limited", "overloaded", "offline"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => { patch({ status: s }); toast.success(`${hospital.name} marked ${s}`); }}
                    className={cn("rounded-md border px-2.5 py-1.5 text-xs capitalize", hospital.status === s ? "border-primary/60 bg-primary/12 text-foreground" : "border-border text-muted-foreground")}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { patch({ accessAffected: !hospital.accessAffected }); toast.warning(`Access road marked ${hospital.accessAffected ? "clear" : "affected"}`, { description: "Citizen safe-hospital recommendations recalculated." }); }}
                className="mt-1 w-full rounded-md border border-warning/50 bg-warning/12 px-3 py-2 text-xs font-medium text-warning"
              >
                {hospital.accessAffected ? "Mark access road clear" : "Mark access road affected"}
              </button>
              <button
                onClick={() => { patch({ status: "overloaded", emergencyBeds: { ...hospital.emergencyBeds, used: hospital.emergencyBeds.total } }); toast.error("Emergency overload declared"); }}
                className="w-full rounded-md border border-critical/50 bg-critical/12 px-3 py-2 text-xs font-medium text-critical"
              >
                Mark emergency overload
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <NumberField label="Emergency beds occupied" value={hospital.emergencyBeds.used} max={hospital.emergencyBeds.total} onChange={(v) => patch({ emergencyBeds: { ...hospital.emergencyBeds, used: v } })} />
              <NumberField label="ICU occupied" value={hospital.icu.used} max={hospital.icu.total} onChange={(v) => patch({ icu: { ...hospital.icu, used: v } })} />
              <NumberField label="Oxygen reserve %" value={hospital.oxygenPct} max={100} onChange={(v) => patch({ oxygenPct: v })} />
              <NumberField label="Ambulances available" value={hospital.ambulancesAvailable} max={hospital.ambulances} onChange={(v) => patch({ ambulancesAvailable: v })} />
            </div>
          </div>
        </Panel>
      )}

      {view === "requests" && (
        <Panel eyebrow={`${incoming.length} incoming casualties (simulated)`} title="Emergency requests routed to this facility" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {incoming.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-xs">
                <span className="font-medium text-foreground">{i.id} · {i.type}</span>
                <SeverityBadge severity={i.severity} />
                <span className="text-muted-foreground">{i.area} · {i.peopleAffected} affected</span>
                <StatusPill tone={i.assignedResourceId ? "info" : "warning"}>{i.assignedResourceId ?? "unassigned"}</StatusPill>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {view === "ambulances" && (
        <Panel eyebrow="Fleet based at this facility" title="Ambulances" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {state.resources.filter((r) => r.type === "Ambulance" && r.homeBase === hospital.id).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 p-3 text-xs">
                <span className="font-medium text-foreground">{r.callSign}</span>
                <StatusPill tone={r.status === "available" ? "safe" : "info"}>{r.status.replace("_", " ")}</StatusPill>
                <span className="text-muted-foreground">{r.assignedIncidentId ?? "No mission"}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {view === "updates" && <AlertsView />}
    </div>
  );
}

function NumberField({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="label-eyebrow">{label}</span>
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(max, Number(e.target.value))))}
        className="tabular mt-1 w-full rounded-md border border-border bg-surface-2 px-2.5 py-2 text-foreground outline-none"
      />
    </label>
  );
}

export function ReliefConsole({ view }: { view: "overview" | "occupancy" | "updates" }) {
  const { state, dispatch } = usePragati();
  const center = state.reliefCenters.find((c) => c.id === state.activeReliefId) ?? state.reliefCenters[0];
  if (!center) return null;

  return (
    <div className="space-y-4">
      <Panel
        eyebrow="Relief centre profile"
        title={center.name}
        actions={
          <select
            value={center.id}
            onChange={(e) => dispatch({ type: "setActiveRelief", id: e.target.value })}
            className="rounded-md border border-border bg-surface-2 px-2 py-1 text-xs text-foreground outline-none"
          >
            {state.reliefCenters.map((c) => <option key={c.id} value={c.id} className="bg-surface">{c.name}</option>)}
          </select>
        }
      >
        <div className="flex flex-wrap gap-2">
          <StatusPill tone={center.status === "full" ? "critical" : center.status === "filling" ? "warning" : "safe"}>{center.status}</StatusPill>
          <StatusPill tone="neutral">{center.area}</StatusPill>
          <StatusPill tone="neutral">Updated {timeAgo(center.updatedAt)}</StatusPill>
        </div>
      </Panel>

      {view !== "updates" && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Capacity" value={center.capacity} tone="neutral" />
          <KpiCard label="Current occupancy" value={center.occupancy} tone={center.occupancy / center.capacity > 0.85 ? "critical" : "info"} hint={`${Math.round((center.occupancy / center.capacity) * 100)}% utilised`} />
          <KpiCard label="Food supply" value={center.food} tone={center.food === "adequate" ? "safe" : "warning"} />
          <KpiCard label="Water supply" value={center.water} tone={center.water === "adequate" ? "safe" : "warning"} />
        </div>
      )}

      {view !== "updates" && (
        <Panel eyebrow="Updates propagate to the citizen portal and command centre" title="Update centre record">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 text-xs">
              <NumberField label="Current occupancy" value={center.occupancy} max={center.capacity} onChange={(v) => dispatch({ type: "updateRelief", id: center.id, patch: { occupancy: v, status: v / center.capacity > 0.95 ? "full" : v / center.capacity > 0.6 ? "filling" : "open" } })} />
              <label className="flex items-center gap-2 text-muted-foreground">
                <input type="checkbox" checked={center.medicalSupport} onChange={(e) => dispatch({ type: "updateRelief", id: center.id, patch: { medicalSupport: e.target.checked } })} className="size-3.5 accent-[var(--color-primary)]" />
                Medical support available
              </label>
            </div>
            <div className="space-y-3 text-xs">
              {(["food", "water"] as const).map((key) => (
                <div key={key}>
                  <p className="label-eyebrow mb-1 capitalize">{key} level</p>
                  <div className="flex flex-wrap gap-2">
                    {(["adequate", "low", "critical"] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => dispatch({ type: "updateRelief", id: center.id, patch: { [key]: level } })}
                        className={cn("rounded-md border px-2.5 py-1.5 capitalize", center[key] === level ? "border-primary/60 bg-primary/12 text-foreground" : "border-border text-muted-foreground")}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                {(["open", "filling", "full", "closed"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => { dispatch({ type: "updateRelief", id: center.id, patch: { status: s } }); toast.success(`${center.name} marked ${s}`); }}
                    className={cn("rounded-md border px-2.5 py-1.5 capitalize", center.status === s ? "border-primary/60 bg-primary/12 text-foreground" : "border-border text-muted-foreground")}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      )}

      {view === "updates" ? <AlertsView /> : <ReliefView />}
    </div>
  );
}

export function ResponderMissions() {
  const { state, dispatch } = usePragati();
  const missions = state.incidents.filter((i) => i.assignedResourceId && i.status !== "resolved");
  return (
    <div className="space-y-3">
      {missions.length === 0 && (
        <Panel eyebrow="No active missions" title="Standing by">
          <p className="text-xs text-muted-foreground">Accept an AI recommendation or assign a unit from the command centre to create a mission.</p>
        </Panel>
      )}
      {missions.map((incident) => {
        const resource = state.resources.find((r) => r.id === incident.assignedResourceId);
        const hospitals = rankHospitals(incident.location, state.hospitals, state.roads, state.zones);
        const best = hospitals[0];
        return (
          <Panel
            key={incident.id}
            eyebrow={`${incident.id} · ${incident.area}`}
            title={`${incident.type} · ${resource?.callSign ?? "unit"}`}
            actions={<SeverityBadge severity={incident.severity} />}
          >
            <Rows
              rows={[
                { label: "Status", value: incident.status.replace("_", " ") },
                { label: "ETA", value: incident.etaMinutes ? `${incident.etaMinutes} min` : "—" },
                { label: "People affected", value: String(incident.peopleAffected) },
                { label: "Receiving hospital", value: best ? `${best.hospital.name} (${best.distanceKm} km)` : "—" },
                { label: "Distance from unit", value: resource ? `${haversineKm(resource.location, incident.location)} km` : "—" },
              ]}
            />
            <p className="mt-2 text-xs text-muted-foreground">{incident.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["en_route", "on_scene", "resolved"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => { dispatch({ type: "setIncidentStatus", incidentId: incident.id, status: s }); toast.success(`${incident.id} → ${s.replace("_", " ")}`); }}
                  className="rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Mark {s.replace("_", " ")}
                </button>
              ))}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

export function OverviewGrid() {
  const [selection, setSelection] = useState<Parameters<typeof MapCanvas>[0]["selection"]>(null);
  return (
    <div className="space-y-4">
      <KpiRow />
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <MapCanvas className="min-h-[520px]" selection={selection ?? null} onSelect={setSelection} />
        <div className="space-y-4">
          <AiPanel limit={3} />
          <Panel eyebrow="Latest signals" title="Alert feed" bodyClassName="p-0">
            <ul className="max-h-64 divide-y divide-border overflow-y-auto">
              {usePragatiAlerts().map((alert) => (
                <li key={alert.id} className="flex items-start gap-2 p-3">
                  <Bell className={cn("mt-0.5 size-3.5", alert.level === "critical" ? "text-critical" : alert.level === "warning" ? "text-warning" : "text-primary")} />
                  <div>
                    <p className="text-xs font-medium text-foreground">{alert.title}</p>
                    <p className="text-[11px] text-muted-foreground">{timeAgo(alert.at)} · {alert.source}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <PriorityQueue limit={4} />
        <Panel eyebrow="Operations" title="Situation summary">
          <SituationSummary />
        </Panel>
      </div>
    </div>
  );
}

function usePragatiAlerts() {
  const { state } = usePragati();
  return state.alerts.slice(0, 8);
}

function SituationSummary() {
  const { state, kpis } = usePragati();
  const blockedRoads = state.roads.filter((r) => r.status !== "clear");
  const affectedHospitals = state.hospitals.filter((h) => h.accessAffected || h.status !== "operational");
  return (
    <div className="space-y-3 text-xs">
      <Rows
        rows={[
          { label: "Disaster zones monitored", value: `${state.zones.length} (${state.zones.filter((z) => z.risk === "critical").length} critical)` },
          { label: "Roads flood affected or closed", value: String(blockedRoads.length) },
          { label: "Hospitals with degraded service", value: String(affectedHospitals.length) },
          { label: "People affected (open incidents)", value: String(kpis.peopleAffected) },
          { label: "Relief occupancy", value: `${state.reliefCenters.reduce((s, c) => s + c.occupancy, 0)} / ${state.reliefCenters.reduce((s, c) => s + c.capacity, 0)}` },
          { label: "Open AI recommendations", value: String(state.recommendations.filter((r) => r.status === "pending").length) },
        ]}
      />
      <div className="rounded-lg border border-border bg-surface-2 p-3">
        <p className="label-eyebrow flex items-center gap-1.5"><Activity className="size-3" /> Operating posture</p>
        <p className="mt-1 leading-relaxed text-muted-foreground">
          {state.scenarioActive
            ? "Flood scenario active. Prioritise Zone 4 and Zone 7 evacuation readiness, keep two rescue teams uncommitted for escalation, and hold Road 17 corridors closed."
            : "Baseline monitoring. Capacity and access are stable; continue routine surveillance of low-lying wards."}
        </p>
      </div>
    </div>
  );
}
export function CitizenHome() {
  const { state, kpis } = usePragati();
  const actions = [
    { to: "/citizen/help", label: "Request emergency help", desc: "Send your location and situation to the command centre", icon: <Siren className="size-4" /> },
    { to: "/citizen/hospitals", label: "Find a safe hospital", desc: "Ranked by access safety and live capacity", icon: <Building2 className="size-4" /> },
    { to: "/citizen/relief-centers", label: "Find a relief center", desc: "Open shelters with food, water and medical support", icon: <Tent className="size-4" /> },
    { to: "/citizen/safe-route", label: "Plan a safe route", desc: "Avoid flooded and closed roads", icon: <Search className="size-4" /> },
    { to: "/citizen/report", label: "Report an incident", desc: "Flag flooding, damage or a trapped person", icon: <TriangleAlert className="size-4" /> },
    { to: "/citizen/requests", label: "My requests", desc: "Track status and assigned teams", icon: <Activity className="size-4" /> },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {actions.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="group rounded-lg border border-border bg-surface-2 p-4 transition-colors hover:border-primary/60"
          >
            <p className="flex items-center gap-2 text-sm font-semibold">{a.icon} {a.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{a.desc}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Situation near you" eyebrow={state.scenarioActive ? "Flood scenario active" : "Baseline monitoring"}>
          <Rows
            rows={[
              { label: "Active incidents in city", value: String(kpis.activeIncidents) },
              { label: "Roads flooded or closed", value: String(state.roads.filter((r) => r.status !== "clear").length) },
              { label: "Relief centres open", value: String(state.reliefCenters.length) },
              { label: "Hospitals accepting patients", value: String(kpis.operationalHospitals) },
            ]}
          />
        </Panel>
        <SafeHospitalList compact />
      </div>

      <AlertsView />
    </div>
  );
}
