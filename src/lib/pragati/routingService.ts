import type { DisasterZone, GeoPoint, RoadSegment, RouteOption, RouteStep } from "./types";
import { haversineKm } from "./logic";

const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving";
const REQUEST_TIMEOUT_MS = 8_000;

type OsrmRoute = {
  distance: number;
  duration: number;
  geometry: { coordinates: [number, number][] };
  legs?: { steps?: { distance: number; duration: number; name?: string; maneuver?: { instruction?: string } }[] }[];
};

interface OsrmResponse {
  code: string;
  routes?: OsrmRoute[];
}

export interface RouteSafetyAnalysis {
  routeStatus: RouteOption["routeStatus"];
  riskScore: number;
  affectedZones: string[];
  affectedRoads: string[];
  warnings: string[];
  explanation: string;
}

function pointSegmentKm(point: GeoPoint, from: GeoPoint, to: GeoPoint) {
  const latScale = 111;
  const lngScale = 111 * Math.cos((point.lat * Math.PI) / 180);
  const px = point.lng * lngScale;
  const py = point.lat * latScale;
  const ax = from.lng * lngScale;
  const ay = from.lat * latScale;
  const bx = to.lng * lngScale;
  const by = to.lat * latScale;
  const dx = bx - ax;
  const dy = by - ay;
  const ratio = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1);
  const clamped = Math.max(0, Math.min(1, ratio));
  return Math.hypot(px - (ax + clamped * dx), py - (ay + clamped * dy));
}

export function analyzeRouteSafety(
  geometry: GeoPoint[],
  zones: DisasterZone[],
  roadClosures: RoadSegment[],
): RouteSafetyAnalysis {
  const affectedZones = new Set<string>();
  const affectedRoads = new Set<string>();
  let riskScore = 4;

  for (const point of geometry) {
    for (const zone of zones) {
      if (haversineKm(point, zone.center) <= zone.radiusKm) {
        affectedZones.add(zone.id);
        riskScore += zone.risk === "critical" ? 28 : zone.risk === "high" ? 20 : zone.risk === "medium" ? 11 : 4;
      }
    }
  }

  for (let index = 0; index < geometry.length - 1; index += 1) {
    const from = geometry[index];
    const to = geometry[index + 1];
    if (!from || !to) continue;
    for (const road of roadClosures.filter((candidate) => candidate.status !== "clear")) {
      const near = Math.min(
        pointSegmentKm(from, road.from, road.to),
        pointSegmentKm(to, road.from, road.to),
        pointSegmentKm(road.from, from, to),
      );
      if (near < 0.45) {
        affectedRoads.add(road.id);
        riskScore += road.status === "closed" ? 44 : 24;
      }
    }
  }

  riskScore = Math.min(100, riskScore);
  const routeStatus: RouteOption["routeStatus"] =
    affectedRoads.size > 0 && roadClosures.some((road) => road.status === "closed" && affectedRoads.has(road.id))
      ? "blocked"
      : riskScore >= 60
        ? "high_risk"
        : riskScore >= 30
          ? "caution"
          : "safe";
  const warnings = [
    ...[...affectedRoads].map((roadId) => `${roadId} is affected by a road closure or flooding.`),
    ...[...affectedZones].map((zoneId) => `${zoneId} is an active disaster zone along this route.`),
  ];
  const explanation =
    routeStatus === "safe"
      ? "Safe route available with no active closure detected on the road geometry."
      : routeStatus === "blocked"
        ? "Blocked route: an active road closure intersects the road geometry."
        : `Route has ${routeStatus.replace("_", " ")} conditions from disaster zones or affected roads.`;

  return {
    routeStatus,
    riskScore,
    affectedZones: [...affectedZones],
    affectedRoads: [...affectedRoads],
    warnings,
    explanation,
  };
}

function toGeoPoint(coordinate: [number, number]): GeoPoint {
  return { lng: coordinate[0], lat: coordinate[1] };
}

function convertSteps(route: OsrmRoute): RouteStep[] {
  return (route.legs ?? []).flatMap((leg) =>
    (leg.steps ?? []).map((step) => ({
      instruction: step.maneuver?.instruction ?? (step.name ? `Continue on ${step.name}` : "Continue on route"),
      distanceKm: Math.round((step.distance / 1000) * 10) / 10,
      durationMinutes: Math.max(1, Math.round(step.duration / 60)),
    })),
  );
}

function roadFollowingFallbackPath(origin: GeoPoint, destination: GeoPoint, roads: RoadSegment[], avoidClosed: boolean) {
  const candidates = roads
    .filter((road) => !avoidClosed || road.status !== "closed")
    .map((road) => ({
      road,
      relevance: Math.min(haversineKm(origin, road.from), haversineKm(origin, road.to)) +
        Math.min(haversineKm(destination, road.from), haversineKm(destination, road.to)),
    }))
    .sort((a, b) => a.relevance - b.relevance)
    .slice(0, 4)
    .map(({ road }) => road);
  const path: GeoPoint[] = [origin];
  const used = new Set<string>();
  let current = origin;

  for (let count = 0; count < candidates.length; count += 1) {
    const next = candidates
      .filter((road) => !used.has(road.id))
      .map((road) => ({
        road,
        start: haversineKm(current, road.from) <= haversineKm(current, road.to) ? road.from : road.to,
      }))
      .sort((a, b) => haversineKm(current, a.start) + haversineKm(a.road.from === a.start ? a.road.to : a.road.from, destination) - (haversineKm(current, b.start) + haversineKm(b.road.from === b.start ? b.road.to : b.road.from, destination)))[0];
    if (!next) break;
    const end = next.road.from === next.start ? next.road.to : next.road.from;
    path.push(next.start, end);
    current = end;
    used.add(next.road.id);
    if (haversineKm(current, destination) < 0.8) break;
  }
  path.push(destination);
  return path;
}

function toRouteOption(
  route: OsrmRoute,
  index: number,
  origin: GeoPoint,
  destination: GeoPoint,
  zones: DisasterZone[],
  roads: RoadSegment[],
): RouteOption {
  const path = route.geometry.coordinates.map(toGeoPoint);
  const safety = analyzeRouteSafety(path, zones, roads);
  return {
    id: `OSRM-${index + 1}`,
    label: index === 0 ? "Safest" : index === 1 ? "Fastest" : "Emergency",
    minutes: Math.max(1, Math.round(route.duration / 60)),
    distanceKm: Math.round((route.distance / 1000) * 10) / 10,
    riskScore: safety.riskScore,
    hazards: safety.warnings,
    path: path.length > 1 ? path : [origin, destination],
    recommended: false,
    reason: safety.explanation,
    routeStatus: safety.routeStatus,
    affectedZones: safety.affectedZones,
    affectedRoads: safety.affectedRoads,
    routeSource: "osrm",
    steps: convertSteps(route),
  };
}

function fallbackRoutes(
  origin: GeoPoint,
  destination: GeoPoint,
  roads: RoadSegment[],
  zones: DisasterZone[],
): RouteOption[] {
  const paths = [
    roadFollowingFallbackPath(origin, destination, roads, true),
    roadFollowingFallbackPath(origin, destination, roads, false),
  ];
  const routes = paths.map((path, index) => {
    const safety = analyzeRouteSafety(path, zones, roads);
    const distanceKm = Math.round(path.slice(0, -1).reduce((total, point, pointIndex) => total + haversineKm(point, path[pointIndex + 1]!), 0) * 10) / 10;
    const minutes = Math.max(4, Math.round(distanceKm * 2.5 + safety.riskScore * 0.12));
    return {
      id: `FALLBACK-${index + 1}`,
      label: index === 0 ? "Safest" : "Fastest",
      minutes,
      distanceKm,
      recommended: false,
      routeStatus: safety.routeStatus,
      riskScore: safety.riskScore,
      hazards: safety.warnings,
      reason: safety.explanation,
      path,
      affectedZones: safety.affectedZones,
      affectedRoads: safety.affectedRoads,
      routeSource: "fallback",
      steps: [],
    };
  });
  const recommended = [...routes].sort((a, b) => a.riskScore * 2 + a.minutes - (b.riskScore * 2 + b.minutes))[0];
  return routes.map((route) => ({ ...route, recommended: route.id === recommended?.id }));
}

export async function getRoadRoutes(
  origin: GeoPoint,
  destination: GeoPoint,
  roads: RoadSegment[],
  zones: DisasterZone[],
): Promise<RouteOption[]> {
  if (typeof window === "undefined" || typeof fetch === "undefined") {
    return fallbackRoutes(origin, destination, roads, zones);
  }

  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;

  try {
    const request = fetch(`${OSRM_BASE_URL}/${coordinates}?overview=full&geometries=geojson&steps=true&alternatives=true`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    const response = await Promise.race([
      request,
      new Promise<Response>((_, reject) => {
        globalThis.setTimeout(() => reject(new Error("OSRM request timed out")), REQUEST_TIMEOUT_MS);
      }),
    ]);
    if (!response.ok) throw new Error(`OSRM returned ${response.status}`);
    const payload = (await response.json()) as OsrmResponse;
    if (payload.code !== "Ok" || !payload.routes?.length) throw new Error("OSRM returned no routes");

    const routes = payload.routes.slice(0, 2).map((route, index) =>
      toRouteOption(route, index, origin, destination, zones, roads),
    );
    const recommended = [...routes].sort(
      (a, b) => a.riskScore * 2 + a.minutes - (b.riskScore * 2 + b.minutes),
    )[0];
    return routes.map((route) => ({ ...route, recommended: route.id === recommended?.id }));
  } catch {
    return fallbackRoutes(origin, destination, roads, zones);
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export const routingService = {
  getRoutes: getRoadRoutes,
};
