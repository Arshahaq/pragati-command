import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { usePragati } from "@/lib/pragati/store";
import type { GeoPoint, RouteOption } from "@/lib/pragati/types";
import { StatusPill, PrototypeTag, timeAgo } from "./primitives";
import {
  Ambulance,
  Building2,
  Flame,
  Layers,
  ShieldAlert,
  Tent,
  TriangleAlert,
  Users,
} from "lucide-react";

const BOUNDS = { west: 77.555, east: 77.725, north: 13.045, south: 12.885 };
const W = 1000;
const H = 640;

export function project(p: GeoPoint) {
  return {
    x: ((p.lng - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * W,
    y: ((BOUNDS.north - p.lat) / (BOUNDS.north - BOUNDS.south)) * H,
  };
}

export type MapSelection =
  | { kind: "incident"; id: string }
  | { kind: "hospital"; id: string }
  | { kind: "resource"; id: string }
  | { kind: "relief"; id: string }
  | { kind: "road"; id: string }
  | { kind: "zone"; id: string }
  | null;

interface Layers {
  zones: boolean;
  incidents: boolean;
  hospitals: boolean;
  resources: boolean;
  relief: boolean;
  roads: boolean;
}

const roadStroke = {
  clear: "var(--color-grid)",
  flood_affected: "var(--color-warning)",
  closed: "var(--color-critical)",
} as const;

export function MapCanvas({
  className,
  routes,
  origin,
  compact,
  onSelect,
  selection: controlledSelection,
}: {
  className?: string | undefined;
  routes?: RouteOption[] | undefined;
  origin?: GeoPoint | undefined;
  compact?: boolean | undefined;
  onSelect?: ((selection: MapSelection) => void) | undefined;
  selection?: MapSelection | undefined;
}) {
  const { state } = usePragati();
  const [internal, setInternal] = useState<MapSelection>(null);
  const selection = controlledSelection !== undefined ? controlledSelection : internal;
  const select = (next: MapSelection) => {
    if (controlledSelection === undefined) setInternal(next);
    onSelect?.(next);
  };

  const [layers, setLayers] = useState<Layers>({
    zones: true,
    incidents: true,
    hospitals: true,
    resources: true,
    relief: true,
    roads: true,
  });

  const gridLines = useMemo(() => {
    const v = Array.from({ length: 11 }, (_, i) => (i * W) / 10);
    const h = Array.from({ length: 7 }, (_, i) => (i * H) / 6);
    return { v, h };
  }, []);

  const detail = useDetail(selection);

  return (
    <div className={cn("panel relative overflow-hidden", className)}>
      <div className="absolute left-4 top-4 z-20 flex flex-wrap items-center gap-2">
        <PrototypeTag />
        <StatusPill tone={state.scenarioActive ? "critical" : "safe"}>
          {state.scenarioActive ? `${state.scenarioName} scenario active` : "Baseline monitoring"}
        </StatusPill>
      </div>

      {!compact && (
        <div className="panel-glass absolute right-4 top-4 z-20 w-44 p-3">
          <p className="label-eyebrow mb-2 flex items-center gap-1.5">
            <Layers className="size-3" /> Map layers
          </p>
          <div className="space-y-1.5">
            {(Object.keys(layers) as (keyof Layers)[]).map((key) => (
              <label key={key} className="flex cursor-pointer items-center gap-2 text-xs capitalize text-muted-foreground hover:text-foreground">
                <input
                  type="checkbox"
                  checked={layers[key]}
                  onChange={(e) => setLayers((l) => ({ ...l, [key]: e.target.checked }))}
                  className="size-3.5 accent-[var(--color-primary)]"
                />
                {key}
              </label>
            ))}
          </div>
        </div>
      )}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-full w-full"
        style={{ background: "var(--color-surface-2)", minHeight: compact ? 280 : 460 }}
        role="img"
        aria-label="Simulated Bengaluru disaster operations map"
      >
        <defs>
          <radialGradient id="zoneFlood" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-info)" stopOpacity="0.38" />
            <stop offset="100%" stopColor="var(--color-info)" stopOpacity="0.02" />
          </radialGradient>
          <radialGradient id="zoneCritical" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-critical)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--color-critical)" stopOpacity="0.03" />
          </radialGradient>
        </defs>

        {gridLines.v.map((x) => (
          <line key={`v${x}`} x1={x} y1={0} x2={x} y2={H} stroke="var(--color-grid)" strokeWidth={0.6} />
        ))}
        {gridLines.h.map((y) => (
          <line key={`h${y}`} x1={0} y1={y} x2={W} y2={y} stroke="var(--color-grid)" strokeWidth={0.6} />
        ))}

        {/* Simulated water bodies for orientation */}
        <ellipse cx={745} cy={430} rx={70} ry={34} fill="var(--color-info)" opacity={0.16} />
        <text x={745} y={434} textAnchor="middle" className="fill-muted-foreground" fontSize={11}>
          Bellandur Lake
        </text>
        <ellipse cx={318} cy={214} rx={44} ry={22} fill="var(--color-info)" opacity={0.14} />

        {layers.zones &&
          state.zones.map((zone) => {
            const c = project(zone.center);
            const r = (zone.radiusKm / 18.5) * W;
            const critical = zone.risk === "critical" || zone.risk === "high";
            return (
              <g key={zone.id} onClick={() => select({ kind: "zone", id: zone.id })} className="cursor-pointer">
                <circle cx={c.x} cy={c.y} r={r} fill={critical ? "url(#zoneCritical)" : "url(#zoneFlood)"} />
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={r}
                  fill="none"
                  strokeDasharray="6 5"
                  strokeWidth={1.4}
                  stroke={critical ? "var(--color-critical)" : "var(--color-info)"}
                  opacity={0.7}
                />
                <text x={c.x} y={c.y - r - 8} textAnchor="middle" fontSize={12} className="fill-foreground" opacity={0.85}>
                  {zone.id} · {zone.risk} {zone.hazard}
                </text>
              </g>
            );
          })}

        {layers.roads &&
          state.roads.map((road) => {
            const a = project(road.from);
            const b = project(road.to);
            const active = selection?.kind === "road" && selection.id === road.id;
            return (
              <g key={road.id} onClick={() => select({ kind: "road", id: road.id })} className="cursor-pointer">
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={16} />
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={roadStroke[road.status]}
                  strokeWidth={road.status === "clear" ? 3.5 : 5}
                  strokeLinecap="round"
                  strokeDasharray={road.status === "closed" ? "10 7" : undefined}
                  opacity={active ? 1 : road.status === "clear" ? 0.75 : 0.95}
                />
                {road.status !== "clear" && (
                  <text
                    x={(a.x + b.x) / 2}
                    y={(a.y + b.y) / 2 - 8}
                    textAnchor="middle"
                    fontSize={10.5}
                    fill={roadStroke[road.status]}
                  >
                    {road.id} {road.status === "closed" ? "CLOSED" : "FLOOD"}
                  </text>
                )}
              </g>
            );
          })}

        {routes?.map((route) => {
          const d = route.path.map(project).map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
          const color =
            route.label === "Safest"
              ? "var(--color-forest)"
              : route.label === "Emergency"
                ? "var(--color-saffron)"
                : "var(--color-info)";
          return (
            <g key={route.id}>
              <path d={d} fill="none" stroke={color} strokeWidth={route.recommended ? 6 : 3.5} opacity={route.recommended ? 0.95 : 0.55} strokeLinecap="round" />
              {route.recommended && <path d={d} fill="none" stroke={color} strokeWidth={14} opacity={0.14} />}
            </g>
          );
        })}

        {origin && <OriginMarker point={origin} />}

        {layers.relief &&
          state.reliefCenters.map((center) => {
            const p = project(center.location);
            return (
              <g key={center.id} className="cursor-pointer" onClick={() => select({ kind: "relief", id: center.id })}>
                <rect x={p.x - 8} y={p.y - 8} width={16} height={16} rx={4} fill="var(--color-forest)" stroke="var(--color-background)" strokeWidth={2} />
                <text x={p.x} y={p.y + 22} textAnchor="middle" fontSize={10} className="fill-muted-foreground">
                  {center.id}
                </text>
              </g>
            );
          })}

        {layers.hospitals &&
          state.hospitals.map((hospital) => {
            const p = project(hospital.location);
            const tone =
              hospital.status === "offline"
                ? "var(--color-critical)"
                : hospital.accessAffected || hospital.status === "overloaded"
                  ? "var(--color-warning)"
                  : "var(--color-safe)";
            return (
              <g key={hospital.id} className="cursor-pointer" onClick={() => select({ kind: "hospital", id: hospital.id })}>
                <circle cx={p.x} cy={p.y} r={11} fill="var(--color-background)" stroke={tone} strokeWidth={2.5} />
                <path d={`M${p.x - 5} ${p.y} H${p.x + 5} M${p.x} ${p.y - 5} V${p.y + 5}`} stroke={tone} strokeWidth={2.6} strokeLinecap="round" />
                <text x={p.x} y={p.y - 16} textAnchor="middle" fontSize={10} className="fill-foreground" opacity={0.8}>
                  {hospital.id}
                </text>
              </g>
            );
          })}

        {layers.resources &&
          state.resources
            .filter((r) => r.status !== "offline")
            .map((resource) => {
              const p = project(resource.location);
              const tone =
                resource.type === "Fire Truck"
                  ? "var(--color-saffron)"
                  : resource.type === "Ambulance"
                    ? "var(--color-info)"
                    : resource.type === "Police Unit"
                      ? "var(--color-primary)"
                      : "var(--color-forest)";
              return (
                <g key={resource.id} className="cursor-pointer" onClick={() => select({ kind: "resource", id: resource.id })}>
                  <polygon
                    points={`${p.x},${p.y - 7} ${p.x + 7},${p.y} ${p.x},${p.y + 7} ${p.x - 7},${p.y}`}
                    fill={tone}
                    stroke="var(--color-background)"
                    strokeWidth={1.6}
                    opacity={resource.status === "available" ? 1 : 0.65}
                  />
                  <text x={p.x} y={p.y + 19} textAnchor="middle" fontSize={9.5} className="fill-muted-foreground">
                    {resource.id}
                  </text>
                </g>
              );
            })}

        {layers.incidents &&
          state.incidents
            .filter((i) => i.status !== "resolved")
            .map((incident) => {
              const p = project(incident.location);
              const tone =
                incident.severity === "critical"
                  ? "var(--color-critical)"
                  : incident.severity === "high"
                    ? "var(--color-warning)"
                    : "var(--color-saffron)";
              const active = selection?.kind === "incident" && selection.id === incident.id;
              return (
                <g key={incident.id} className="cursor-pointer" onClick={() => select({ kind: "incident", id: incident.id })}>
                  {incident.severity === "critical" && (
                    <circle cx={p.x} cy={p.y} r={9} fill={tone} opacity={0.5} className="marker-pulse" />
                  )}
                  <circle cx={p.x} cy={p.y} r={active ? 10 : 7.5} fill={tone} stroke="var(--color-background)" strokeWidth={2} />
                  {active && <circle cx={p.x} cy={p.y} r={17} fill="none" stroke={tone} strokeWidth={1.5} />}
                </g>
              );
            })}
      </svg>

      <Legend compact={compact} />

      {detail && (
        <div className="panel-glass absolute bottom-4 left-4 z-20 w-[min(340px,calc(100%-2rem))] p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="label-eyebrow">{detail.eyebrow}</p>
              <h3 className="text-sm font-semibold text-foreground">{detail.title}</h3>
            </div>
            <button
              onClick={() => select(null)}
              className="rounded-md px-1.5 text-muted-foreground hover:text-foreground"
              aria-label="Close detail panel"
            >
              ✕
            </button>
          </div>
          <dl className="mt-3 space-y-1.5 text-xs">
            {detail.rows.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="text-right font-medium text-foreground">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

function OriginMarker({ point }: { point: GeoPoint }) {
  const p = project(point);
  return (
    <g>
      <circle cx={p.x} cy={p.y} r={10} fill="var(--color-primary)" opacity={0.35} className="marker-pulse" />
      <circle cx={p.x} cy={p.y} r={6} fill="var(--color-primary)" stroke="var(--color-background)" strokeWidth={2} />
      <text x={p.x} y={p.y - 14} textAnchor="middle" fontSize={10.5} className="fill-foreground">
        You
      </text>
    </g>
  );
}

function Legend({ compact }: { compact?: boolean | undefined }) {
  const items = [
    { icon: <TriangleAlert className="size-3 text-critical" />, label: "Incident" },
    { icon: <Building2 className="size-3 text-safe" />, label: "Hospital" },
    { icon: <Ambulance className="size-3 text-info" />, label: "Ambulance" },
    { icon: <ShieldAlert className="size-3 text-forest" />, label: "Rescue" },
    { icon: <Flame className="size-3 text-saffron" />, label: "Fire unit" },
    { icon: <Tent className="size-3 text-forest" />, label: "Relief centre" },
    { icon: <Users className="size-3 text-warning" />, label: "Hazard zone" },
  ];
  return (
    <div className={cn("panel-glass absolute bottom-4 right-4 z-10 flex flex-wrap gap-x-3 gap-y-1.5 p-2.5", compact && "hidden md:flex")}>
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {item.icon}
          {item.label}
        </span>
      ))}
    </div>
  );
}

function useDetail(selection: MapSelection) {
  const { state } = usePragati();
  if (!selection) return null;

  if (selection.kind === "incident") {
    const i = state.incidents.find((x) => x.id === selection.id);
    if (!i) return null;
    return {
      eyebrow: `Incident ${i.id}`,
      title: i.type,
      rows: [
        { label: "Severity", value: i.severity.toUpperCase() },
        { label: "Location", value: i.area },
        { label: "People affected", value: String(i.peopleAffected) },
        { label: "Status", value: i.status.replace("_", " ") },
        { label: "Assigned", value: i.assignedResourceId ?? "Awaiting response" },
        { label: "Reported", value: timeAgo(i.reportedAt) },
      ],
    };
  }
  if (selection.kind === "hospital") {
    const h = state.hospitals.find((x) => x.id === selection.id);
    if (!h) return null;
    return {
      eyebrow: `Hospital ${h.id}`,
      title: h.name,
      rows: [
        { label: "Status", value: h.status },
        { label: "Emergency capacity", value: `${h.emergencyBeds.total - h.emergencyBeds.used} beds free` },
        { label: "ICU", value: `${h.icu.used}/${h.icu.total}` },
        { label: "Ambulances", value: `${h.ambulancesAvailable}/${h.ambulances}` },
        { label: "Access road", value: h.accessAffected ? "Flood affected" : "Clear" },
        { label: "Flood risk", value: h.floodRisk },
        { label: "Updated", value: timeAgo(h.updatedAt) },
      ],
    };
  }
  if (selection.kind === "resource") {
    const r = state.resources.find((x) => x.id === selection.id);
    if (!r) return null;
    return {
      eyebrow: `Resource ${r.id}`,
      title: r.callSign,
      rows: [
        { label: "Type", value: r.type },
        { label: "Status", value: r.status.replace("_", " ") },
        { label: "Area", value: r.area },
        { label: "Crew", value: String(r.crew) },
        { label: "Mission", value: r.assignedIncidentId ?? "Unassigned" },
        { label: "ETA", value: r.etaMinutes ? `${r.etaMinutes} min` : "—" },
      ],
    };
  }
  if (selection.kind === "relief") {
    const c = state.reliefCenters.find((x) => x.id === selection.id);
    if (!c) return null;
    return {
      eyebrow: `Relief centre ${c.id}`,
      title: c.name,
      rows: [
        { label: "Status", value: c.status },
        { label: "Occupancy", value: `${c.occupancy}/${c.capacity}` },
        { label: "Food", value: c.food },
        { label: "Water", value: c.water },
        { label: "Medical support", value: c.medicalSupport ? "Available" : "Not available" },
        { label: "Updated", value: timeAgo(c.updatedAt) },
      ],
    };
  }
  if (selection.kind === "road") {
    const r = state.roads.find((x) => x.id === selection.id);
    if (!r) return null;
    return {
      eyebrow: `Road ${r.id}`,
      title: r.name,
      rows: [
        { label: "Status", value: r.status.replace("_", " ") },
        { label: "Severity", value: r.severity },
        { label: "Note", value: r.note ?? "—" },
        { label: "Last update", value: timeAgo(r.updatedAt) },
      ],
    };
  }
  const z = state.zones.find((x) => x.id === selection.id);
  if (!z) return null;
  return {
    eyebrow: `Disaster zone ${z.id}`,
    title: z.name,
    rows: [
      { label: "Hazard", value: z.hazard },
      { label: "Risk", value: z.risk },
      { label: "Radius", value: `${z.radiusKm} km` },
      { label: "Population exposed", value: z.populationExposed.toLocaleString("en-IN") },
      { label: "Evacuation", value: z.evacuationRecommended ? "Recommended" : "Not advised yet" },
    ],
  };
}