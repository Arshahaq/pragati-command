/**
 * PRAGATI service layer.
 *
 * Every external dependency is behind an interface with a mock implementation.
 * To connect a real provider, implement the same interface and swap the export.
 * Secrets must be read server-side only (createServerFn / process.env) — never
 * hardcode keys or import them into client bundles.
 *
 *   weatherService        -> IMD / OpenWeather (server fn proxy)
 *   routingService        -> Mapbox Directions / OSRM / Google Routes
 *   geocodingService      -> Nominatim / MapmyIndia
 *   gisService            -> Bhuvan / state GIS layers (flood polygons)
 *   hospitalService       -> HMIS / district hospital registry
 *   resourceService       -> 108 / fleet telemetry
 *   incidentService       -> PRAGATI backend (Lovable Cloud)
 *   aiService             -> LLM decision support (Lovable AI Gateway)
 *   visionService         -> drone imagery CV pipeline
 *   notificationService   -> SMS / push / CAP alerts
 */
import {
  CITIZEN_LOCATION,
  seedDrones,
  seedHospitals,
  seedIncidents,
  seedReliefCenters,
  seedResources,
  seedRoads,
  seedZones,
} from "../seed";
import { planRoutes, rankHospitals, deriveRecommendations, prioritise } from "../logic";
import type {
  AiRecommendation,
  DisasterZone,
  DroneMission,
  EmergencyResource,
  GeoPoint,
  Hospital,
  Incident,
  ReliefCenter,
  RoadSegment,
  RouteOption,
  WeatherSnapshot,
} from "../types";

export type ServiceMode = "mock" | "live";

export interface ServiceMeta {
  name: string;
  mode: ServiceMode;
  provider: string;
  envVars: string[];
  description: string;
}

export const serviceRegistry: ServiceMeta[] = [
  { name: "weatherService", mode: "mock", provider: "IMD / OpenWeather", envVars: ["WEATHER_API_KEY"], description: "Rainfall, wind and flood advisories per ward." },
  { name: "routingService", mode: "mock", provider: "Mapbox Directions / OSRM", envVars: ["ROUTING_API_KEY"], description: "Multi-option routing with hazard-weighted costs." },
  { name: "geocodingService", mode: "mock", provider: "MapmyIndia / Nominatim", envVars: ["GEOCODING_API_KEY"], description: "Address ⇄ coordinate resolution for citizen reports." },
  { name: "gisService", mode: "mock", provider: "Bhuvan / State GIS", envVars: ["GIS_BASE_URL"], description: "Flood polygons, terrain and disaster zone layers." },
  { name: "hospitalService", mode: "mock", provider: "HMIS / District registry", envVars: ["HMIS_BASE_URL", "HMIS_TOKEN"], description: "Facility status, bed and ICU capacity." },
  { name: "resourceService", mode: "mock", provider: "108 fleet telemetry", envVars: ["FLEET_API_URL", "FLEET_API_KEY"], description: "Live ambulance / rescue unit positions and status." },
  { name: "incidentService", mode: "mock", provider: "PRAGATI backend", envVars: [], description: "Incident and emergency request persistence." },
  { name: "aiService", mode: "mock", provider: "Lovable AI Gateway", envVars: ["LOVABLE_API_KEY"], description: "Decision support: prioritisation, routing rationale, summaries." },
  { name: "visionService", mode: "mock", provider: "CV inference endpoint", envVars: ["VISION_API_URL"], description: "Drone imagery detection of people, vehicles, damage." },
  { name: "notificationService", mode: "mock", provider: "SMS / CAP gateway", envVars: ["SMS_API_KEY"], description: "Citizen alerts and responder dispatch notifications." },
];

/** All mock calls resolve; callers should still handle rejection so the UI never breaks. */
const ok = <T>(value: T, ms = 120): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

export const weatherService = {
  async getSnapshot(area = CITIZEN_LOCATION.area, floodSeverity = 42): Promise<WeatherSnapshot> {
    const risk = floodSeverity >= 75 ? "critical" : floodSeverity >= 55 ? "high" : floodSeverity >= 35 ? "medium" : "low";
    return ok({
      area,
      rainfallMmLastHour: Math.round(floodSeverity * 0.42 * 10) / 10,
      rainfallMm24h: Math.round(floodSeverity * 2.1),
      windKph: 18 + Math.round(floodSeverity * 0.2),
      temperatureC: 24,
      advisory:
        floodSeverity >= 55
          ? "Heavy to very heavy rainfall likely to continue for the next 6 hours (simulated)."
          : "Intermittent moderate rainfall expected (simulated).",
      floodRisk: risk,
    });
  },
};

export const routingService = {
  async getRoutes(from: GeoPoint, to: GeoPoint, roads: RoadSegment[], zones: DisasterZone[]): Promise<RouteOption[]> {
    return ok(planRoutes(from, to, roads, zones));
  },
};

export const geocodingService = {
  async reverse(point: GeoPoint): Promise<string> {
    return ok(`${point.lat.toFixed(4)}, ${point.lng.toFixed(4)} · Bengaluru Urban`);
  },
};

export const gisService = {
  async getZones(): Promise<DisasterZone[]> {
    return ok(seedZones);
  },
  async getRoads(): Promise<RoadSegment[]> {
    return ok(seedRoads);
  },
};

export const hospitalService = {
  async list(): Promise<Hospital[]> {
    return ok(seedHospitals);
  },
  async rankSafe(origin: GeoPoint, hospitals: Hospital[], roads: RoadSegment[], zones: DisasterZone[]) {
    return ok(rankHospitals(origin, hospitals, roads, zones));
  },
};

export const reliefService = {
  async list(): Promise<ReliefCenter[]> {
    return ok(seedReliefCenters);
  },
};

export const resourceService = {
  async list(): Promise<EmergencyResource[]> {
    return ok(seedResources);
  },
};

export const incidentService = {
  async list(): Promise<Incident[]> {
    return ok(seedIncidents);
  },
  nextId(existing: Incident[]): string {
    const numbers = existing
      .map((i) => Number.parseInt(i.id.replace("PRG-", ""), 10))
      .filter((n) => Number.isFinite(n));
    return `PRG-${Math.max(10320, ...numbers) + Math.floor(3 + Math.random() * 6)}`;
  },
};

export const aiService = {
  async recommend(args: Parameters<typeof deriveRecommendations>[0]): Promise<AiRecommendation[]> {
    return ok(deriveRecommendations(args));
  },
  async prioritise(...args: Parameters<typeof prioritise>) {
    return ok(prioritise(...args));
  },
};

export const visionService = {
  async analyse(mission: DroneMission): Promise<NonNullable<DroneMission["detections"]>> {
    const seed = mission.droneId.charCodeAt(1) + mission.area.length;
    return ok(
      {
        peopleDetected: 4 + (seed % 19),
        vehiclesStranded: seed % 6,
        damagedStructures: seed % 4,
        floodSeverity: seed % 3 === 0 ? "high" : seed % 3 === 1 ? "medium" : "critical",
      },
      700,
    );
  },
  async listMissions(): Promise<DroneMission[]> {
    return ok(seedDrones);
  },
};

export const notificationService = {
  async send(channel: "sms" | "push" | "cap", message: string) {
    // Simulated: real implementation posts to an SMS/CAP gateway via a server function.
    return ok({ channel, message, dispatchedAt: new Date().toISOString(), simulated: true });
  },
};