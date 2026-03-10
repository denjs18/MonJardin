import { Timestamp } from "firebase/firestore";

// ============ Location Types ============

export interface Location {
  lat: number;
  lng: number;
  city: string;
}

// ============ Garden Space Types ============

export type EnvironmentType = "outdoor" | "greenhouse" | "indoor";

export interface GardenSpace {
  id: string;
  name: string;
  environment: EnvironmentType;
  width: number; // meters
  height: number; // meters
  location: Location | null;
  createdAt: Timestamp | Date;
}

// Legacy support
export interface Garden extends GardenSpace {}

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
  spaceId: string; // Reference to GardenSpace
  gardenId?: string; // Legacy support
  name: string;
  x: number; // Position in space (meters)
  y: number;
  width: number; // meters
  height: number; // meters
  rotation: number; // degrees
  soil: Soil;
  mulch: MulchType;
  mulchAppliedAt: Timestamp | Date | null;
  color?: string; // Visual color for the plot
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
  id: string;
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

// ============ Garden Row Types ============

export interface GardenRow {
  id: string;
  spaceId: string;
  plotId: string;
  startX: number;      // Position relative à la parcelle (mètres)
  startY: number;
  endX: number;
  endY: number;
  color?: string;      // Couleur de la ligne (défaut: marron)
  name?: string;       // Nom optionnel
  createdAt: Date | Timestamp;
}

// ============ Planting Types ============

export type PlantingMode = "single" | "row";

export interface PlantingPosition {
  x: number; // meters from plot origin
  y: number;
}

// For row plantings (deprecated - kept for migration)
export interface RowConfig {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  spacing: number; // cm between plants
  plantCount: number; // Auto-calculated or user-defined
}

export interface Planting {
  id: string;
  spaceId: string;
  plotId: string;
  plantId: string;
  plantName: string;
  variety: string;

  // Positioning
  mode: PlantingMode;
  position: PlantingPosition; // For single mode, this is the position
  rowConfig?: RowConfig; // Deprecated - kept for migration

  // NEW: Attachement à une rangée
  rowId?: string;           // Référence vers GardenRow (null = plante libre)
  positionOnRow?: number;   // Position sur la rangée: 0.0 (début) à 1.0 (fin)

  // Dates
  plantedAt: Timestamp | Date;
  seedlingStartedAt: Timestamp | Date | null;
  expectedHarvestAt: Timestamp | Date;
  harvestedAt: Timestamp | Date | null;

  // Status
  status: PlantStatus;
  growthStage: number; // 0 to 100
  events: PlantEvent[];
  disease: Disease | null;

  // Legacy support
  gardenId?: string;
}

// ============ Plant Reserve (Favorites) ============

export interface PlantReserveItem {
  id: string;
  plantId: string;
  addedAt: Timestamp | Date;
  notes?: string;
  defaultVariety?: string;
}

// ============ Plant Catalog Types ============

export type PlantType = "legume" | "herbe" | "fleur" | "fruit";
export type Exposure = "full-sun" | "partial" | "shade";
export type WaterNeeds = "low" | "medium" | "high";

export interface PlantSpacing {
  row: number; // cm between rows
  plant: number; // cm between plants in a row
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

// ============ Editor Types ============

export type EditorTool =
  | "select"
  | "pan"
  | "plot"
  | "row"           // Dessiner une rangée indépendante
  | "plant-single"
  | "plant-row"     // Planter SUR une rangée existante
  | "eraser";

export interface EditorState {
  tool: EditorTool;
  selectedPlotId: string | null;
  selectedPlantingId: string | null;
  selectedPlantId: string | null; // Plant from catalog to place
  selectedRowId: string | null;   // GardenRow sélectionnée
  zoom: number;
  panOffset: { x: number; y: number };
  showGrid: boolean;
  gridSize: number; // cm
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
