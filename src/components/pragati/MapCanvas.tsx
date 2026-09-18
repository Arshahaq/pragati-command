import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import {
  Ambulance,
  Building2,
  Flame,
  Layers,
  LocateFixed,
  Maximize2,
  RotateCcw,
  ShieldAlert,
  Tent,
  TriangleAlert,
  Users,
} from "lucide-react";

import { CITIZEN_LOCATION } from "@/lib/pragati/seed";
import { usePragati } from "@/lib/pragati/store";
import type { GeoPoint, RouteOption } from "@/lib/pragati/types";
import { cn } from "@/lib/utils";
import { PrototypeTag, StatusPill, timeAgo } from "./primitives";

export type MapSelection =
  | { kind: "incident"; id: string }
  | { kind: "hospital"; id: string }
  | { kind: "resource"; id: string }
  | { kind: "relief"; id: string }
  | { kind: "road"; id: string }
  | { kind: "zone"; id: string }
  | null;

interface LayersConfig {
  zones: boolean;
  incidents: boolean;
  hospitals: boolean;
  resources: boolean;
  relief: boolean;
  roads: boolean;
}

const DEFAULT_CENTER: GeoPoint = { lat: 12.9716, lng: 77.5946 };

function colorForRoadStatus(status: string): string {
  switch (status) {
    case "clear":
      return "#22c55e";
    case "flood_affected":
      return "#f59e0b";
    case "closed":
      return "#ef4444";
    default:
      return "#60a5fa";
  }
}

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
  const [internalSelection, setInternalSelection] = useState<MapSelection>(null);
  const selection = controlledSelection ?? internalSelection;
  const [layers, setLayers] = useState<LayersConfig>({
    zones: true,
    incidents: true,
    hospitals: true,
    resources: true,
    relief: true,
    roads: true,
  });
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(origin ?? CITIZEN_LOCATION);
  const [leaflet, setLeaflet] = useState<typeof import("react-leaflet") | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([import("leaflet"), import("react-leaflet")])
      .then(([leafletLib, reactLeafletLib]) => {
        if (!active) return;
        if (typeof window !== "undefined" && leafletLib.Icon.Default) {
          leafletLib.Icon.Default.mergeOptions({
            iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
            iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
            shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
          });
        }
        setLeaflet(reactLeafletLib);
      })
      .catch(() => {
        if (active) setLeaflet(null);
      });

    return () => {
      active = false;
    };
  }, []);

  const select = (next: MapSelection) => {
    if (controlledSelection === undefined) setInternalSelection(next);
    onSelect?.(next);
  };

  const handleUseMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setUserLocation(origin ?? CITIZEN_LOCATION);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setUserLocation(origin ?? CITIZEN_LOCATION);
      },
      { enableHighAccuracy: true, timeout: 5000 },
    );
  };

  const detail = useDetail(selection);
  const effectiveOrigin = origin ?? userLocation ?? CITIZEN_LOCATION;

  if (!leaflet) {
    return (
      <div className={cn("panel relative flex min-h-[420px] items-center justify-center overflow-hidden", className)}>
        <div className="text-center text-sm text-muted-foreground">Loading Bengaluru map...</div>
      </div>
    );
  }

  const { MapContainer, TileLayer, Circle, CircleMarker, Polyline, Tooltip, useMap } = leaflet;
  const incidentPoints = state.incidents.filter((incident) => incident.status !== "resolved").map((incident) => incident.location);

  return (
    <div className={cn("panel relative overflow-hidden", className)}>
      <div className="absolute left-4 top-4 z-[500] flex flex-wrap items-center gap-2">
        <PrototypeTag />
        <StatusPill tone={state.scenarioActive ? "critical" : "safe"}>
          {state.scenarioActive ? `${state.scenarioName} scenario active` : "Baseline monitoring"}
        </StatusPill>
      </div>

      {!compact && (
        <div className="panel-glass absolute right-4 top-4 z-[500] w-44 p-3">
          <p className="label-eyebrow mb-2 flex items-center gap-1.5">
            <Layers className="size-3" /> Map layers
          </p>
          <div className="space-y-1.5">
            {(Object.keys(layers) as (keyof LayersConfig)[]).map((key) => (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-2 text-xs capitalize text-muted-foreground hover:text-foreground"
              >
                <input
                  type="checkbox"
                  checked={layers[key]}
                  onChange={(event) => setLayers((previous) => ({ ...previous, [key]: event.target.checked }))}
                  className="size-3.5 accent-[var(--color-primary)]"
                />
                {key}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="absolute right-4 top-20 z-[500]">
        <button
          type="button"
          onClick={handleUseMyLocation}
          className="panel-glass inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground shadow-sm transition hover:border-primary/60 hover:text-primary"
        >
          <LocateFixed className="size-3.5" /> Use My Location
        </button>
      </div>

      <MapContainer
        center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
        zoom={12}
        scrollWheelZoom
        zoomAnimation={false}
        fadeAnimation={false}
        markerZoomAnimation={false}
        className="h-full w-full"
        style={{ minHeight: compact ? 280 : 520, background: "#08131d" }}
      >
        <MapControls useMap={useMap} origin={effectiveOrigin} incidentPoints={incidentPoints} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {layers.zones &&
          state.zones.map((zone) => (
            <Circle
              key={zone.id}
              center={[zone.center.lat, zone.center.lng]}
              radius={zone.radiusKm * 1000}
              pathOptions={{
                color: zone.risk === "high" || zone.risk === "critical" ? "#ef4444" : "#60a5fa",
                fillColor: zone.risk === "high" || zone.risk === "critical" ? "#ef4444" : "#60a5fa",
                fillOpacity: 0.15,
                weight: 1.8,
                dashArray: "6 6",
              }}
              eventHandlers={{ click: () => select({ kind: "zone", id: zone.id }) }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                <div className="text-[11px] text-foreground">{zone.id}</div>
              </Tooltip>
            </Circle>
          ))}

        {layers.roads &&
          state.roads.map((road) => {
            const active = selection?.kind === "road" && selection.id === road.id;

            return (
              <Polyline
                key={road.id}
                positions={[
                  [road.from.lat, road.from.lng],
                  [road.to.lat, road.to.lng],
                ]}
                pathOptions={{
                  color: colorForRoadStatus(road.status),
                  weight: active ? 7 : road.status === "clear" ? 4 : 6,
                  opacity: road.status === "clear" ? 0.8 : 1,
                  dashArray: road.status === "closed" ? "8 8" : undefined,
                }}
                eventHandlers={{ click: () => select({ kind: "road", id: road.id }) }}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                  <div className="text-[11px] text-foreground">{road.id} · {road.status}</div>
                </Tooltip>
              </Polyline>
            );
          })}

        {routes?.map((route) => (
          <Polyline
            key={route.id}
            positions={route.path.map((point) => [point.lat, point.lng])}
            pathOptions={{
              color:
                route.routeStatus === "blocked"
                  ? "#ef4444"
                  : route.routeStatus === "high_risk"
                    ? "#f97316"
                    : route.routeStatus === "caution"
                      ? "#f59e0b"
                      : "#22c55e",
              weight: route.recommended ? 7 : 5,
              opacity: route.recommended ? 0.95 : 0.72,
              dashArray: route.routeStatus === "blocked" ? "10 8" : undefined,
            }}
          />
        ))}

        {effectiveOrigin && (
          <CircleMarker
            center={[effectiveOrigin.lat, effectiveOrigin.lng]}
            radius={10}
            pathOptions={{ color: "#4f46e5", fillColor: "#4f46e5", fillOpacity: 0.35, weight: 2 }}
          >
            <Tooltip direction="top" offset={[0, -12]} opacity={1}>
              <div className="text-[11px] text-foreground">You</div>
            </Tooltip>
          </CircleMarker>
        )}

        {layers.relief &&
          state.reliefCenters.map((center) => (
            <CircleMarker
              key={center.id}
              center={[center.location.lat, center.location.lng]}
              radius={9}
              pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 1, weight: 2 }}
              eventHandlers={{ click: () => select({ kind: "relief", id: center.id }) }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                <div className="text-[11px] text-foreground">{center.id}</div>
              </Tooltip>
            </CircleMarker>
          ))}

        {layers.hospitals &&
          state.hospitals.map((hospital) => {
            const tone =
              hospital.status === "offline"
                ? "#ef4444"
                : hospital.accessAffected || hospital.status === "overloaded"
                  ? "#f59e0b"
                  : "#22c55e";

            return (
              <CircleMarker
                key={hospital.id}
                center={[hospital.location.lat, hospital.location.lng]}
                radius={10}
                pathOptions={{ color: tone, fillColor: "#ffffff", fillOpacity: 1, weight: 2.5 }}
                eventHandlers={{ click: () => select({ kind: "hospital", id: hospital.id }) }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                  <div className="text-[11px] text-foreground">{hospital.id}</div>
                </Tooltip>
              </CircleMarker>
            );
          })}

        {layers.resources &&
          state.resources
            .filter((resource) => resource.status !== "offline")
            .map((resource) => {
              const tone =
                resource.type === "Fire Truck"
                  ? "#f59e0b"
                  : resource.type === "Ambulance"
                    ? "#60a5fa"
                    : resource.type === "Police Unit"
                      ? "#8b5cf6"
                      : "#22c55e";

              return (
                <CircleMarker
                  key={resource.id}
                  center={[resource.location.lat, resource.location.lng]}
                  radius={resource.type === "Rescue Team" ? 8 : 7}
                  pathOptions={{ color: tone, fillColor: tone, fillOpacity: 0.9, weight: 1.5 }}
                  eventHandlers={{ click: () => select({ kind: "resource", id: resource.id }) }}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                    <div className="text-[11px] text-foreground">{resource.id}</div>
                  </Tooltip>
                </CircleMarker>
              );
            })}

        {layers.incidents &&
          state.incidents
            .filter((incident) => incident.status !== "resolved")
            .map((incident) => {
              const tone =
                incident.severity === "critical"
                  ? "#ef4444"
                  : incident.severity === "high"
                    ? "#f59e0b"
                    : "#fbbf24";

              const active = selection?.kind === "incident" && selection.id === incident.id;

              return (
                <CircleMarker
                  key={incident.id}
                  center={[incident.location.lat, incident.location.lng]}
                  radius={active ? 10 : 8}
                  pathOptions={{ color: tone, fillColor: tone, fillOpacity: 0.95, weight: 2 }}
                  eventHandlers={{ click: () => select({ kind: "incident", id: incident.id }) }}
                >
                  <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                    <div className="text-[11px] text-foreground">{incident.id} · {incident.severity}</div>
                  </Tooltip>
                </CircleMarker>
              );
            })}
      </MapContainer>

      <Legend compact={compact} />

      {detail && (
        <div className="panel-glass absolute bottom-4 left-4 z-[500] w-[min(340px,calc(100%-2rem))] p-4">
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

function MapControls({
  useMap,
  origin,
  incidentPoints,
}: {
  useMap: typeof import("react-leaflet").useMap;
  origin: GeoPoint;
  incidentPoints: GeoPoint[];
}) {
  const map = useMap();
  return (
    <div className="absolute left-4 top-20 z-[500] flex flex-col gap-1">
      <button type="button" onClick={() => map.setView([origin.lat, origin.lng], 13)} className="panel-glass rounded-md border border-border p-2 text-muted-foreground hover:text-primary" title="Recenter on my location" aria-label="Recenter on my location">
        <LocateFixed className="size-3.5" />
      </button>
      <button type="button" onClick={() => incidentPoints.length > 0 && map.fitBounds(incidentPoints.map((point) => [point.lat, point.lng] as [number, number]), { padding: [28, 28] })} className="panel-glass rounded-md border border-border p-2 text-muted-foreground hover:text-primary" title="Fit incidents" aria-label="Fit incidents">
        <Maximize2 className="size-3.5" />
      </button>
      <button type="button" onClick={() => map.setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 12)} className="panel-glass rounded-md border border-border p-2 text-muted-foreground hover:text-primary" title="Reset map view" aria-label="Reset map view">
        <RotateCcw className="size-3.5" />
      </button>
    </div>
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
    <div
      className={cn(
        "panel-glass absolute bottom-4 right-4 z-[450] flex flex-wrap gap-x-3 gap-y-1.5 p-2.5",
        compact && "hidden md:flex",
      )}
    >
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
    const incident = state.incidents.find((item) => item.id === selection.id);
    if (!incident) return null;

    return {
      eyebrow: `Incident ${incident.id}`,
      title: incident.type,
      rows: [
        { label: "Severity", value: incident.severity.toUpperCase() },
        { label: "Location", value: incident.area },
        { label: "People affected", value: String(incident.peopleAffected) },
        { label: "Status", value: incident.status.replace("_", " ") },
        { label: "Assigned", value: incident.assignedResourceId ?? "Awaiting response" },
        { label: "Reported", value: timeAgo(incident.reportedAt) },
      ],
    };
  }

  if (selection.kind === "hospital") {
    const hospital = state.hospitals.find((item) => item.id === selection.id);
    if (!hospital) return null;

    return {
      eyebrow: `Hospital ${hospital.id}`,
      title: hospital.name,
      rows: [
        { label: "Status", value: hospital.status },
        { label: "Emergency capacity", value: `${hospital.emergencyBeds.total - hospital.emergencyBeds.used} beds free` },
        { label: "ICU", value: `${hospital.icu.used}/${hospital.icu.total}` },
        { label: "Ambulances", value: `${hospital.ambulancesAvailable}/${hospital.ambulances}` },
        { label: "Access road", value: hospital.accessAffected ? "Flood affected" : "Clear" },
        { label: "Flood risk", value: hospital.floodRisk },
        { label: "Updated", value: timeAgo(hospital.updatedAt) },
      ],
    };
  }

  if (selection.kind === "resource") {
    const resource = state.resources.find((item) => item.id === selection.id);
    if (!resource) return null;

    return {
      eyebrow: `Resource ${resource.id}`,
      title: resource.callSign,
      rows: [
        { label: "Type", value: resource.type },
        { label: "Status", value: resource.status.replace("_", " ") },
        { label: "Area", value: resource.area },
        { label: "Crew", value: String(resource.crew) },
        { label: "Mission", value: resource.assignedIncidentId ?? "Unassigned" },
        { label: "ETA", value: resource.etaMinutes ? `${resource.etaMinutes} min` : "—" },
      ],
    };
  }

  if (selection.kind === "relief") {
    const center = state.reliefCenters.find((item) => item.id === selection.id);
    if (!center) return null;

    return {
      eyebrow: `Relief centre ${center.id}`,
      title: center.name,
      rows: [
        { label: "Status", value: center.status },
        { label: "Occupancy", value: `${center.occupancy}/${center.capacity}` },
        { label: "Food", value: center.food },
        { label: "Water", value: center.water },
        { label: "Medical support", value: center.medicalSupport ? "Available" : "Not available" },
        { label: "Updated", value: timeAgo(center.updatedAt) },
      ],
    };
  }

  if (selection.kind === "road") {
    const road = state.roads.find((item) => item.id === selection.id);
    if (!road) return null;

    return {
      eyebrow: `Road ${road.id}`,
      title: road.name,
      rows: [
        { label: "Status", value: road.status.replace("_", " ") },
        { label: "Severity", value: road.severity },
        { label: "Note", value: road.note ?? "—" },
        { label: "Last update", value: timeAgo(road.updatedAt) },
      ],
    };
  }

  const zone = state.zones.find((item) => item.id === selection.id);
  if (!zone) return null;

  return {
    eyebrow: `Disaster zone ${zone.id}`,
    title: zone.name,
    rows: [
      { label: "Hazard", value: zone.hazard },
      { label: "Risk", value: zone.risk },
      { label: "Radius", value: `${zone.radiusKm} km` },
      { label: "Population exposed", value: zone.populationExposed.toLocaleString("en-IN") },
      { label: "Evacuation", value: zone.evacuationRecommended ? "Recommended" : "Not advised yet" },
    ],
  };
}
