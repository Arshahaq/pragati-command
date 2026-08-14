import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import {
  CITIZEN_LOCATION,
  SIM_EPOCH,
  seedAlerts,
  seedDrones,
  seedHospitals,
  seedIncidents,
  seedRecommendations,
  seedReliefCenters,
  seedResources,
  seedRoads,
  seedZones,
  t,
} from "./seed";
import { deriveRecommendations, prioritise, rankHospitals } from "./logic";
import type {
  AiRecommendation,
  DisasterZone,
  DroneMission,
  EmergencyRequest,
  EmergencyResource,
  Hospital,
  Incident,
  ReliefCenter,
  RoadSegment,
  Role,
  ScenarioEvent,
  Severity,
  SystemAlert,
  WhatIfState,
} from "./types";

export interface PragatiState {
  role: Role;
  scenarioActive: boolean;
  scenarioName: string | null;
  incidents: Incident[];
  hospitals: Hospital[];
  reliefCenters: ReliefCenter[];
  resources: EmergencyResource[];
  roads: RoadSegment[];
  zones: DisasterZone[];
  alerts: SystemAlert[];
  recommendations: AiRecommendation[];
  requests: EmergencyRequest[];
  drones: DroneMission[];
  events: ScenarioEvent[];
  whatIf: WhatIfState;
  activeHospitalId: string;
  activeReliefId: string;
  lastUpdated: string;
}

const initialState: PragatiState = {
  role: "government",
  scenarioActive: false,
  scenarioName: null,
  incidents: seedIncidents,
  hospitals: seedHospitals,
  reliefCenters: seedReliefCenters,
  resources: seedResources,
  roads: seedRoads,
  zones: seedZones,
  alerts: seedAlerts,
  recommendations: seedRecommendations,
  requests: [],
  drones: seedDrones,
  events: [
    { at: t(45), label: "Monitoring started", detail: "PRAGATI simulation baseline loaded for Bengaluru Urban.", level: "info" },
    { at: t(20), label: "Rainfall trend rising", detail: "Ward sensors report increasing accumulation in Zone 4 and Zone 7.", level: "info" },
  ],
  whatIf: {
    road17Closed: false,
    floodSeverity: 42,
    hospitalAvailabilityPct: 100,
    resourceAvailabilityPct: 100,
    incidentSeverityBias: 40,
  },
  activeHospitalId: "H3",
  activeReliefId: "R07",
  lastUpdated: new Date(SIM_EPOCH).toISOString(),
};

type Action =
  | { type: "setRole"; role: Role }
  | { type: "createIncident"; incident: Incident; request?: EmergencyRequest }
  | { type: "assignResource"; incidentId: string; resourceId: string }
  | { type: "setIncidentStatus"; incidentId: string; status: Incident["status"] }
  | { type: "updateHospital"; id: string; patch: Partial<Hospital> }
  | { type: "updateRelief"; id: string; patch: Partial<ReliefCenter> }
  | { type: "updateResource"; id: string; patch: Partial<EmergencyResource> }
  | { type: "setRoadStatus"; id: string; status: RoadSegment["status"]; severity?: Severity }
  | { type: "ackAlert"; id: string }
  | { type: "pushAlert"; alert: SystemAlert }
  | { type: "recStatus"; id: string; status: AiRecommendation["status"] }
  | { type: "refreshRecommendations" }
  | { type: "setWhatIf"; patch: Partial<WhatIfState> }
  | { type: "activateFlood" }
  | { type: "setActiveHospital"; id: string }
  | { type: "setActiveRelief"; id: string }
  | { type: "setDroneDetections"; missionId: string; detections: NonNullable<DroneMission["detections"]> }
  | { type: "reset" };

const nowIso = () => new Date().toISOString();

function withEvent(state: PragatiState, event: ScenarioEvent): PragatiState {
  return { ...state, events: [...state.events, event], lastUpdated: nowIso() };
}

function recompute(state: PragatiState): PragatiState {
  const fresh = deriveRecommendations({
    incidents: state.incidents,
    resources: state.resources,
    hospitals: state.hospitals,
    roads: state.roads,
    zones: state.zones,
    now: nowIso(),
  });
  const decided = new Map(state.recommendations.map((r) => [r.id, r.status]));
  const merged = fresh.map((r) => ({ ...r, status: decided.get(r.id) ?? r.status }));
  const keptManual = state.recommendations.filter(
    (r) => r.status !== "pending" && !merged.some((m) => m.id === r.id),
  );
  return { ...state, recommendations: [...merged, ...keptManual], lastUpdated: nowIso() };
}

function reducer(state: PragatiState, action: Action): PragatiState {
  switch (action.type) {
    case "setRole":
      return { ...state, role: action.role };

    case "createIncident": {
      const next = withEvent(
        {
          ...state,
          incidents: [action.incident, ...state.incidents],
          requests: action.request ? [action.request, ...state.requests] : state.requests,
          alerts: [
            {
              id: `AL-${action.incident.id}`,
              level: action.incident.severity === "critical" ? "critical" : "warning",
              title: `New ${action.incident.severity} incident ${action.incident.id}`,
              detail: `${action.incident.type} reported in ${action.incident.area}. ${action.incident.peopleAffected} people affected.`,
              at: nowIso(),
              acknowledged: false,
              source: "Citizen Portal",
            },
            ...state.alerts,
          ],
        },
        {
          at: nowIso(),
          label: `Emergency request ${action.incident.id} received`,
          detail: `${action.incident.type} · ${action.incident.area} · severity ${action.incident.severity}`,
          level: action.incident.severity === "critical" ? "critical" : "warning",
        },
      );
      return recompute(next);
    }

    case "assignResource": {
      const resource = state.resources.find((r) => r.id === action.resourceId);
      const incident = state.incidents.find((i) => i.id === action.incidentId);
      if (!resource || !incident) return state;
      const eta = Math.max(4, Math.round(6 + Math.random() * 12));
      const next: PragatiState = {
        ...state,
        resources: state.resources.map((r) =>
          r.id === action.resourceId
            ? { ...r, status: "en_route", assignedIncidentId: action.incidentId, etaMinutes: eta }
            : r,
        ),
        incidents: state.incidents.map((i) =>
          i.id === action.incidentId
            ? {
                ...i,
                status: "en_route",
                assignedResourceId: action.resourceId,
                etaMinutes: eta,
                timeline: [
                  ...i.timeline,
                  { at: nowIso(), label: `${resource.callSign} dispatched (ETA ${eta} min)`, actor: "Command Center" },
                ],
              }
            : i,
        ),
      };
      return recompute(
        withEvent(next, {
          at: nowIso(),
          label: `${resource.callSign} assigned to ${action.incidentId}`,
          detail: `ETA ${eta} minutes to ${incident.area}.`,
          level: "info",
        }),
      );
    }

    case "setIncidentStatus":
      return recompute({
        ...state,
        incidents: state.incidents.map((i) =>
          i.id === action.incidentId
            ? {
                ...i,
                status: action.status,
                timeline: [...i.timeline, { at: nowIso(), label: `Status → ${action.status.replace("_", " ")}`, actor: "Operations" }],
              }
            : i,
        ),
      });

    case "updateHospital": {
      const hospital = state.hospitals.find((h) => h.id === action.id);
      const next: PragatiState = {
        ...state,
        hospitals: state.hospitals.map((h) =>
          h.id === action.id ? { ...h, ...action.patch, updatedAt: nowIso() } : h,
        ),
      };
      const detailBits = Object.keys(action.patch).join(", ");
      return recompute(
        withEvent(next, {
          at: nowIso(),
          label: `${hospital?.name ?? action.id} updated`,
          detail: `Fields changed: ${detailBits}.`,
          level: action.patch.accessAffected || action.patch.status === "overloaded" ? "warning" : "info",
        }),
      );
    }

    case "updateRelief": {
      const center = state.reliefCenters.find((r) => r.id === action.id);
      return withEvent(
        {
          ...state,
          reliefCenters: state.reliefCenters.map((r) =>
            r.id === action.id ? { ...r, ...action.patch, updatedAt: nowIso() } : r,
          ),
        },
        {
          at: nowIso(),
          label: `${center?.name ?? action.id} updated`,
          detail: `Relief centre record refreshed (${Object.keys(action.patch).join(", ")}).`,
          level: "info",
        },
      );
    }

    case "updateResource":
      return recompute({
        ...state,
        resources: state.resources.map((r) => (r.id === action.id ? { ...r, ...action.patch } : r)),
      });

    case "setRoadStatus": {
      const road = state.roads.find((r) => r.id === action.id);
      const next: PragatiState = {
        ...state,
        roads: state.roads.map((r) =>
          r.id === action.id
            ? { ...r, status: action.status, severity: action.severity ?? r.severity, updatedAt: nowIso() }
            : r,
        ),
      };
      return recompute(
        withEvent(next, {
          at: nowIso(),
          label: `${road?.name ?? action.id} → ${action.status.replace("_", " ")}`,
          detail: "Routing corridors and hospital access recalculated.",
          level: action.status === "clear" ? "info" : "warning",
        }),
      );
    }

    case "ackAlert":
      return {
        ...state,
        alerts: state.alerts.map((a) => (a.id === action.id ? { ...a, acknowledged: true } : a)),
      };

    case "pushAlert":
      return { ...state, alerts: [action.alert, ...state.alerts], lastUpdated: nowIso() };

    case "recStatus": {
      const rec = state.recommendations.find((r) => r.id === action.id);
      let next: PragatiState = {
        ...state,
        recommendations: state.recommendations.map((r) =>
          r.id === action.id ? { ...r, status: action.status } : r,
        ),
      };
      if (action.status === "accepted" && rec?.incidentId && rec.resourceId) {
        next = reducer(next, { type: "assignResource", incidentId: rec.incidentId, resourceId: rec.resourceId });
      }
      if (action.status === "accepted" && rec) {
        next = withEvent(next, {
          at: nowIso(),
          label: "AI recommendation accepted",
          detail: rec.headline,
          level: "info",
        });
      }
      return next;
    }

    case "refreshRecommendations":
      return recompute(state);

    case "setWhatIf": {
      let next: PragatiState = { ...state, whatIf: { ...state.whatIf, ...action.patch } };
      if (action.patch.road17Closed !== undefined) {
        next = reducer(next, {
          type: "setRoadStatus",
          id: "RD-17",
          status: action.patch.road17Closed ? "closed" : "clear",
          severity: action.patch.road17Closed ? "critical" : "medium",
        });
      }
      if (action.patch.floodSeverity !== undefined) {
        const sev = action.patch.floodSeverity;
        const risk: Severity = sev >= 75 ? "critical" : sev >= 55 ? "high" : sev >= 35 ? "medium" : "low";
        next = {
          ...next,
          zones: next.zones.map((z) => ({
            ...z,
            risk,
            evacuationRecommended: sev >= 75,
            radiusKm: Math.round((1.2 + sev / 55) * 10) / 10,
          })),
        };
      }
      if (action.patch.hospitalAvailabilityPct !== undefined) {
        const pct = action.patch.hospitalAvailabilityPct;
        next = {
          ...next,
          hospitals: next.hospitals.map((h, index) => {
            const shouldLimit = pct < 100 && index % 3 === 0;
            return {
              ...h,
              status: pct < 40 && shouldLimit ? "overloaded" : pct < 75 && shouldLimit ? "limited" : h.status === "offline" ? "offline" : h.status,
              emergencyBeds: {
                total: h.emergencyBeds.total,
                used: Math.min(
                  h.emergencyBeds.total,
                  Math.round(h.emergencyBeds.total * (1 - (pct / 100) * (h.emergencyBeds.total - h.emergencyBeds.used) / h.emergencyBeds.total)),
                ),
              },
            };
          }),
        };
      }
      if (action.patch.resourceAvailabilityPct !== undefined) {
        const pct = action.patch.resourceAvailabilityPct;
        next = {
          ...next,
          resources: next.resources.map((r, index) => {
            if (r.assignedIncidentId) return r;
            const cutoff = (index / next.resources.length) * 100;
            return { ...r, status: cutoff < pct ? "available" : "offline" };
          }),
        };
      }
      return recompute(next);
    }

    case "activateFlood": {
      const base = nowIso();
      const stamp = (m: number) => new Date(Date.parse(base) + m * 1000).toISOString();
      const floodIncidents: Incident[] = [
        {
          id: "PRG-10331",
          type: "Flood",
          severity: "critical",
          area: "KR Puram",
          location: { lat: 13.0049, lng: 77.6944 },
          description: "Simulated: 60+ residents stranded on first floors, water level 1.2 m in service lane.",
          peopleAffected: 62,
          reportedAt: stamp(1),
          status: "awaiting",
          source: "sensor",
          timeline: [{ at: stamp(1), label: "Flood sensor threshold breached", actor: "Ward sensor grid" }],
        },
        {
          id: "PRG-10334",
          type: "Trapped Person",
          severity: "critical",
          area: "Bellandur",
          location: { lat: 12.9295, lng: 77.6759 },
          description: "Simulated: family trapped in stilt parking as lake overflow rises.",
          peopleAffected: 4,
          reportedAt: stamp(2),
          status: "awaiting",
          source: "citizen",
          timeline: [{ at: stamp(2), label: "Citizen request received", actor: "Citizen Portal" }],
        },
        {
          id: "PRG-10337",
          type: "Road Blockage",
          severity: "high",
          area: "Bellandur",
          location: { lat: 12.9331, lng: 77.6812 },
          description: "Simulated: Outer Ring Road submerged, two-wheelers stalled across carriageway.",
          peopleAffected: 0,
          reportedAt: stamp(3),
          status: "awaiting",
          source: "police",
          timeline: [{ at: stamp(3), label: "Traffic control report", actor: "Bellandur PS" }],
        },
        {
          id: "PRG-10340",
          type: "Medical Emergency",
          severity: "high",
          area: "HSR Layout",
          location: { lat: 12.9105, lng: 77.6438 },
          description: "Simulated: dialysis patient unable to reach facility due to blocked lanes.",
          peopleAffected: 1,
          reportedAt: stamp(4),
          status: "awaiting",
          source: "citizen",
          timeline: [{ at: stamp(4), label: "Citizen request received", actor: "Citizen Portal" }],
        },
      ];

      const next: PragatiState = {
        ...state,
        scenarioActive: true,
        scenarioName: "Bengaluru Flood",
        whatIf: { ...state.whatIf, floodSeverity: 82 },
        incidents: [...floodIncidents, ...state.incidents],
        zones: [
          ...state.zones.map((z) => ({
            ...z,
            risk: "critical" as Severity,
            radiusKm: Math.round((z.radiusKm + 0.8) * 10) / 10,
            evacuationRecommended: true,
          })),
          {
            id: "Z9",
            name: "Zone 9 · Koramangala Storm Drain Belt",
            area: "Koramangala",
            center: { lat: 12.9312, lng: 77.6268 },
            radiusKm: 1.4,
            hazard: "flood",
            risk: "high",
            populationExposed: 9800,
            evacuationRecommended: false,
          },
        ],
        roads: state.roads.map((r) => {
          if (r.id === "RD-17") return { ...r, status: "closed", severity: "critical", updatedAt: stamp(0), note: "Simulated: submerged under 0.9 m of water" };
          if (r.id === "RD-14") return { ...r, status: "closed", severity: "critical", updatedAt: stamp(0), note: "Simulated: underpass fully submerged" };
          if (r.id === "RD-22") return { ...r, status: "flood_affected", severity: "high", updatedAt: stamp(0), note: "Simulated: single lane passable" };
          return r;
        }),
        hospitals: state.hospitals.map((h) => {
          if (h.id === "H1") return { ...h, accessAffected: true, floodRisk: "high" as Severity, updatedAt: stamp(0) };
          if (h.id === "H3") return { ...h, status: "overloaded" as const, emergencyBeds: { used: 28, total: 28 }, oxygenPct: 34, updatedAt: stamp(0) };
          if (h.id === "H4") return { ...h, floodRisk: "critical" as Severity, emergencyBeds: { used: 17, total: 22 }, updatedAt: stamp(0) };
          return h;
        }),
        reliefCenters: state.reliefCenters.map((r) => ({
          ...r,
          status: r.occupancy / r.capacity > 0.85 ? ("full" as const) : ("filling" as const),
          occupancy: Math.min(r.capacity, Math.round(r.occupancy * 1.55)),
          water: r.water === "adequate" ? "low" : r.water,
          updatedAt: stamp(0),
        })),
        resources: state.resources.map((r) =>
          r.status === "offline" ? { ...r, status: "available" as const } : r,
        ),
        drones: state.drones.map((d) =>
          d.droneId === "D09"
            ? { ...d, status: "active" as const, altitudeM: 88, startedAt: stamp(0), detections: { peopleDetected: 23, vehiclesStranded: 6, damagedStructures: 1, floodSeverity: "critical" as Severity } }
            : d,
        ),
        alerts: [
          { id: "AL-SC1", level: "critical", title: "Zone 7 evacuation recommended", detail: "Simulated flood severity critical; 12,600 residents exposed in KR Puram low-lying belt.", at: stamp(5), acknowledged: false, source: "Scenario Simulator" },
          { id: "AL-SC2", level: "critical", title: "Road 17 closed — Outer Ring Road", detail: "Simulated submersion; all ambulance corridors via ORR rerouted.", at: stamp(3), acknowledged: false, source: "Scenario Simulator" },
          { id: "AL-SC3", level: "warning", title: "Hospital H1 access road affected", detail: "Koramangala City Hospital reachable only via diverted route.", at: stamp(2), acknowledged: false, source: "Scenario Simulator" },
          ...state.alerts,
        ],
        events: [
          ...state.events,
          { at: stamp(0), label: "Heavy rainfall detected", detail: "IMD simulated nowcast: 48 mm in 3 hours over Bengaluru east.", level: "warning" },
          { at: stamp(1), label: "Zone 4 & Zone 7 flood risk raised to critical", detail: "Lake basin and low-lying belts breach threshold.", level: "critical" },
          { at: stamp(2), label: "Road 17 closed", detail: "Outer Ring Road submerged near Bellandur junction.", level: "critical" },
          { at: stamp(3), label: "Hospital H1 access affected", detail: "Primary approach via Road 14 impassable.", level: "warning" },
          { at: stamp(4), label: "4 new incidents ingested", detail: "Sensor, police and citizen reports created in the command queue.", level: "warning" },
          { at: stamp(5), label: "Relief centres activated", detail: "Occupancy rising across R04, R07, R08 and R11.", level: "info" },
          { at: stamp(6), label: "AI prioritisation refreshed", detail: "Resource allocation and safe-route recommendations recalculated.", level: "info" },
        ],
      };
      return recompute(next);
    }

    case "setActiveHospital":
      return { ...state, activeHospitalId: action.id };

    case "setActiveRelief":
      return { ...state, activeReliefId: action.id };

    case "setDroneDetections":
      return {
        ...state,
        drones: state.drones.map((d) =>
          d.id === action.missionId ? { ...d, detections: action.detections } : d,
        ),
      };

    case "reset":
      return { ...initialState, role: state.role };

    default:
      return state;
  }
}

interface PragatiContextValue {
  state: PragatiState;
  dispatch: React.Dispatch<Action>;
  kpis: {
    activeIncidents: number;
    criticalIncidents: number;
    availableAmbulances: number;
    availableRescueTeams: number;
    operationalHospitals: number;
    openReliefCenters: number;
    peopleAffected: number;
    unassigned: number;
  };
  priorities: ReturnType<typeof prioritise>;
  citizenHospitalRanking: ReturnType<typeof rankHospitals>;
  setRole: (role: Role) => void;
}

const PragatiContext = createContext<PragatiContextValue | null>(null);

export function PragatiProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const kpis = useMemo(() => {
    const open = state.incidents.filter((i) => i.status !== "resolved");
    return {
      activeIncidents: open.length,
      criticalIncidents: open.filter((i) => i.severity === "critical").length,
      availableAmbulances: state.resources.filter((r) => r.type === "Ambulance" && r.status === "available").length,
      availableRescueTeams: state.resources.filter((r) => r.type === "Rescue Team" && r.status === "available").length,
      operationalHospitals: state.hospitals.filter((h) => h.status === "operational" && !h.accessAffected).length,
      openReliefCenters: state.reliefCenters.filter((r) => r.status !== "closed").length,
      peopleAffected: open.reduce((sum, i) => sum + i.peopleAffected, 0),
      unassigned: open.filter((i) => !i.assignedResourceId).length,
    };
  }, [state.incidents, state.resources, state.hospitals, state.reliefCenters]);

  const priorities = useMemo(
    () => prioritise(state.incidents, state.resources, state.roads, state.zones),
    [state.incidents, state.resources, state.roads, state.zones],
  );

  const citizenHospitalRanking = useMemo(
    () => rankHospitals(CITIZEN_LOCATION, state.hospitals, state.roads, state.zones),
    [state.hospitals, state.roads, state.zones],
  );

  const setRole = useCallback((role: Role) => dispatch({ type: "setRole", role }), []);

  const value = useMemo(
    () => ({ state, dispatch, kpis, priorities, citizenHospitalRanking, setRole }),
    [state, kpis, priorities, citizenHospitalRanking, setRole],
  );

  return <PragatiContext.Provider value={value}>{children}</PragatiContext.Provider>;
}

export function usePragati() {
  const ctx = useContext(PragatiContext);
  if (!ctx) throw new Error("usePragati must be used inside PragatiProvider");
  return ctx;
}