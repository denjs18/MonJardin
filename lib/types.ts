import { Timestamp } from "firebase/firestore";

// ============ Garden Types ============

export interface Location {
  lat: number;
  lng: number;
  city: string;
}

export interface Garden {
  id: string;
  name: string;
  location: Location;
  width: number; // meters
  height: number; // meters
  createdAt: Timestamp | Date;
}

// ============ Plot Types ============

export type SoilType = "normal" | "enriched" | "compost";
export type MulchType = "none" | "paille" | "bache" | "ecorce";

export interface Soil {
  type: SoilType;
  enrichedAt: Timestamp | Date | null;
  notes: string;
}

export interface Plot {
  id: string;
  gardenId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  soil: Soil;
  mulch: MulchType;
  mulchAppliedAt: Timestamp | Date | null;
}

// ============ Plant Status ============

export type PlantStatus =
  | "seedling"
  | "growing"
  | "flowering"
  | "ready"
  | "harvested"
  | "dead";

export type EventType =
  | "watered"
  | "fertilized"
  | "pruned"
  | "disease"
  | "pest"
  | "harvested"
  | "mulched"
  | "note";

export interface PlantEvent {
  date: Timestamp | Date;
  type: EventType;
  note: string;
  quantity?: string;
  treatment?: string;
}

export interface Disease {
  hasDisease: boolean;
  name: string;
  detectedAt: Timestamp | Date;
}

// ============ Planting Types ============

export interface Planting {
  id: string;
  gardenId: string;
  plotId: string;
  plantId: string;
  plantName: string;
  variety: string;
  position: { x: number; y: number };
  plantedAt: Timestamp | Date;
  seedlingStartedAt: Timestamp | Date | null;
  expectedHarvestAt: Timestamp | Date;
  status: PlantStatus;
  harvestedAt: Timestamp | Date | null;
  events: PlantEvent[];
  disease: Disease | null;
  growthStage: number; // 0 to 100
}

// ============ Plant Catalog Types ============

export type PlantType = "legume" | "herbe" | "fleur" | "fruit";
export type Exposure = "full-sun" | "partial" | "shade";
export type WaterNeeds = "low" | "medium" | "high";

export interface PlantSpacing {
  row: number; // cm
  plant: number; // cm
}

export interface Plant {
  id: string;
  name: string;
  emoji: string;
  type: PlantType;
  family: string;
  sowingMonths: number[]; // 1-12
  plantingMonths: number[]; // 1-12
  harvestMonths: number[]; // 1-12
  daysToMaturity: number;
  spacing: PlantSpacing;
  exposure: Exposure;
  waterNeeds: WaterNeeds;
  soilType: string[];
  companions: string[]; // beneficial plants
  enemies: string[]; // plants to avoid
  repels: string[]; // insects repelled
  attracts: string[]; // pollinators/insects attracted
  tips: string[]; // 3 practical tips
  description: string;
}

// ============ Weather Types ============

export interface CurrentWeather {
  temperature: number;
  precipitation: number;
  windSpeed: number;
  humidity: number;
}

export interface DailyWeather {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitationSum: number;
  et0: number; // evapotranspiration
}

export interface WeatherData {
  current: CurrentWeather;
  daily: DailyWeather[];
  fetchedAt: Date;
}

export interface WeatherCache {
  id: string;
  location: string;
  fetchedAt: Timestamp | Date;
  data: WeatherData;
}

// ============ Compost Types ============

export type LayerType = "verts" | "bruns";
export type CompostStatus = "active" | "mature" | "used";

export interface CompostLayer {
  date: Timestamp | Date;
  type: LayerType;
  description: string;
}

export interface Composter {
  id: string;
  gardenId: string;
  name: string;
  startedAt: Timestamp | Date;
  layers: CompostLayer[];
  estimatedReadyAt: Timestamp | Date;
  status: CompostStatus;
  lastTurnedAt: Timestamp | Date | null;
  usedOnPlotId: string | null;
  usedAt: Timestamp | Date | null;
}

// ============ Advice Types ============

export type AdviceType =
  | "watering"
  | "weeding"
  | "harvest"
  | "planting"
  | "protection"
  | "general";

export interface DailyAdvice {
  type: AdviceType;
  emoji: string;
  message: string;
  priority: "high" | "medium" | "low";
}

// ============ Companion Planting Types ============

export type CompatibilityLevel =
  | "excellent"
  | "good"
  | "neutral"
  | "bad"
  | "terrible";

export interface PlacementRecommendation {
  position: { x: number; y: number };
  score: number; // 0-100
  reasons: string[];
  warnings: string[];
  tips: string[];
}

export interface CompanionRelation {
  plant1: string;
  plant2: string;
  compatibility: CompatibilityLevel;
  reason: string;
}

// ============ Lunar Calendar Types ============

export type LunarPhase =
  | "new-moon"
  | "waxing-crescent"
  | "first-quarter"
  | "waxing-gibbous"
  | "full-moon"
  | "waning-gibbous"
  | "last-quarter"
  | "waning-crescent";

export type LunarDay = "fruits" | "racines" | "feuilles" | "fleurs";

export interface LunarCalendarDay {
  date: Date;
  phase: LunarPhase;
  dayType: LunarDay;
  isGoodForPlanting: boolean;
  recommendation: string;
}

// ============ UI Types ============

export interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
}

export interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  duration?: number;
}
