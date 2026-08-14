/**
 * PRAGATI core domain model.
 * These interfaces are the contract between UI, mock services and (later) real APIs.
 */

export type Role = "citizen" | "government" | "responder" | "hospital" | "relief";

export type Severity = "critical" | "high" | "medium" | "low";

export type IncidentType =
  | "Flood"
  | "Fire"
  | "Accident"
  | "Medical Emergency"
  | "Building Damage"
  | "Landslide"
  | "Trapped Person"
  | "Missing Person"
  | "Road Blockage";

export type IncidentStatus =
  | "awaiting"
  | "assigned"
  | "en_route"
  | "on_scene"
  | "resolved";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Incident {
  id: string;
  type: IncidentType;
  severity: Severity;
  area: string;
  location: GeoPoint;
  description: string;
  peopleAffected: number;
  reportedAt: string;
  status: IncidentStatus;
  assignedResourceId?: string;
  etaMinutes?: number;
  source: "citizen" | "field_team" | "sensor" | "drone" | "police";
  timeline: TimelineEntry[];
  photoCount?: number;
}

export interface TimelineEntry {
  at: string;
  label: string;
  actor?: string;
}

export type HospitalStatus = "operational" | "limited" | "overloaded" | "offline";

export interface Hospital {
  id: string;
  name: string;
  area: string;
  location: GeoPoint;
  status: HospitalStatus;
  emergencyBeds: { used: number; total: number };
  icu: { used: number; total: number };
  oxygenPct: number;
  bloodUnits: number;
  ambulances: number;
  ambulancesAvailable: number;
  accessAffected: boolean;
  floodRisk: Severity;
  updatedAt: string;
}

export interface ReliefCenter {
  id: string;
  name: string;
  area: string;
  location: GeoPoint;
  capacity: number;
  occupancy: number;
  food: "adequate" | "low" | "critical";
  water: "adequate" | "low" | "critical";
  medicalSupport: boolean;
  status: "open" | "filling" | "full" | "closed";
  updatedAt: string;
}

export type ResourceType =
  | "Ambulance"
  | "Fire Truck"
  | "Rescue Team"
  | "Police Unit"
  | "Drone"
  | "Boat"
  | "Medical Team";

export type ResourceStatus = "available" | "assigned" | "en_route" | "busy" | "offline";

export interface EmergencyResource {
  id: string;
  type: ResourceType;
  callSign: string;
  area: string;
  location: GeoPoint;
  status: ResourceStatus;
  assignedIncidentId?: string;
  etaMinutes?: number;
  crew: number;
  homeBase: string;
}

export interface RoadSegment {
  id: string;
  name: string;
  from: GeoPoint;
  to: GeoPoint;
  status: "clear" | "flood_affected" | "closed";
  severity: Severity;
  updatedAt: string;
  note?: string;
}

export interface DisasterZone {
  id: string;
  name: string;
  area: string;
  center: GeoPoint;
  radiusKm: number;
  hazard: "flood" | "fire" | "landslide";
  risk: Severity;
  populationExposed: number;
  evacuationRecommended: boolean;
}

export type AlertLevel = "critical" | "warning" | "info";

export interface SystemAlert {
  id: string;
  level: AlertLevel;
  title: string;
  detail: string;
  at: string;
  acknowledged: boolean;
  source: string;
}

export interface AiRecommendation {
  id: string;
  kind: "resource_allocation" | "capacity" | "route" | "evacuation" | "hospital_routing";
  headline: string;
  reason: string;
  suggestedAction: string;
  severity: Severity;
  at: string;
  confidence: number;
  status: "pending" | "accepted" | "dismissed";
  incidentId?: string;
  resourceId?: string;
  factors?: { label: string; value: string }[];
}

export interface EmergencyRequest {
  id: string;
  incidentId: string;
  requesterName: string;
  type: IncidentType;
  severity: Severity;
  area: string;
  description: string;
  people: number;
  hasPhoto: boolean;
  at: string;
  status: "received" | "triaged" | "dispatched" | "resolved";
}

export interface RouteOption {
  id: string;
  label: "Fastest" | "Safest" | "Emergency";
  minutes: number;
  distanceKm: number;
  riskScore: number;
  hazards: string[];
  path: GeoPoint[];
  recommended: boolean;
  reason: string;
}

export interface DroneMission {
  id: string;
  droneId: string;
  area: string;
  location: GeoPoint;
  status: "active" | "returning" | "idle" | "charging";
  altitudeM: number;
  batteryPct: number;
  startedAt: string;
  detections: {
    peopleDetected: number;
    vehiclesStranded: number;
    damagedStructures: number;
    floodSeverity: Severity;
  } | null;
}

export interface ScenarioEvent {
  at: string;
  label: string;
  detail: string;
  level: AlertLevel;
}

export interface WhatIfState {
  road17Closed: boolean;
  floodSeverity: number; // 0-100
  hospitalAvailabilityPct: number; // 0-100
  resourceAvailabilityPct: number; // 0-100
  incidentSeverityBias: number; // 0-100
}

export interface WeatherSnapshot {
  area: string;
  rainfallMmLastHour: number;
  rainfallMm24h: number;
  windKph: number;
  temperatureC: number;
  advisory: string;
  floodRisk: Severity;
}