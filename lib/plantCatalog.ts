import { Plant, PlantType } from "./types";
import catalogData from "@/data/plant_catalog.json";

// Type assertion for the imported data
const plants: Plant[] = catalogData.plants as Plant[];

/**
 * Get all plants from the catalog
 */
export function getAllPlants(): Plant[] {
  return plants;
}

/**
 * Get a plant by ID
 */
export function getPlantById(id: string): Plant | undefined {
  return plants.find((p) => p.id === id);
}

/**
 * Get plants by type
 */
export function getPlantsByType(type: PlantType): Plant[] {
  return plants.filter((p) => p.type === type);
}

/**
 * Get plants by family
 */
export function getPlantsByFamily(family: string): Plant[] {
  return plants.filter((p) => p.family.toLowerCase() === family.toLowerCase());
}

/**
 * Search plants by name or description
 */
export function searchPlants(query: string): Plant[] {
  const q = query.toLowerCase();
  return plants.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.family.toLowerCase().includes(q)
  );
}

/**
 * Get plants that can be sown this month
 */
export function getPlantsSowableNow(month?: number): Plant[] {
  const currentMonth = month || new Date().getMonth() + 1;
  return plants.filter((p) => p.sowingMonths.includes(currentMonth));
}

/**
 * Get plants that can be planted this month
 */
export function getPlantsPlantableNow(month?: number): Plant[] {
  const currentMonth = month || new Date().getMonth() + 1;
  return plants.filter((p) => p.plantingMonths.includes(currentMonth));
}

/**
 * Get plants that can be harvested this month
 */
export function getPlantsHarvestableNow(month?: number): Plant[] {
  const currentMonth = month || new Date().getMonth() + 1;
  return plants.filter((p) => p.harvestMonths.includes(currentMonth));
}

/**
 * Get companions for a plant
 */
export function getPlantCompanions(plantId: string): Plant[] {
  const plant = getPlantById(plantId);
  if (!plant) return [];

  return plant.companions
    .map((id) => getPlantById(id))
    .filter((p): p is Plant => p !== undefined);
}

/**
 * Get enemies for a plant
 */
export function getPlantEnemies(plantId: string): Plant[] {
  const plant = getPlantById(plantId);
  if (!plant) return [];

  return plant.enemies
    .map((id) => getPlantById(id))
    .filter((p): p is Plant => p !== undefined);
}

/**
 * Get plants by water needs
 */
export function getPlantsByWaterNeeds(
  needs: "low" | "medium" | "high"
): Plant[] {
  return plants.filter((p) => p.waterNeeds === needs);
}

/**
 * Get plants by exposure
 */
export function getPlantsByExposure(
  exposure: "full-sun" | "partial" | "shade"
): Plant[] {
  return plants.filter((p) => p.exposure === exposure);
}

/**
 * Get all plant types with counts
 */
export function getPlantTypeCounts(): Record<PlantType, number> {
  return {
    legume: plants.filter((p) => p.type === "legume").length,
    herbe: plants.filter((p) => p.type === "herbe").length,
    fleur: plants.filter((p) => p.type === "fleur").length,
    fruit: plants.filter((p) => p.type === "fruit").length,
  };
}

/**
 * Get all unique families
 */
export function getAllFamilies(): string[] {
  const families = new Set(plants.map((p) => p.family));
  return Array.from(families).sort();
}

/**
 * Get plant type label in French
 */
export function getPlantTypeLabel(type: PlantType): string {
  const labels: Record<PlantType, string> = {
    legume: "Légume",
    herbe: "Herbe aromatique",
    fleur: "Fleur",
    fruit: "Fruit",
  };
  return labels[type];
}

/**
 * Get exposure label in French
 */
export function getExposureLabel(
  exposure: "full-sun" | "partial" | "shade"
): string {
  const labels = {
    "full-sun": "Plein soleil",
    partial: "Mi-ombre",
    shade: "Ombre",
  };
  return labels[exposure];
}

/**
 * Get water needs label in French
 */
export function getWaterNeedsLabel(needs: "low" | "medium" | "high"): string {
  const labels = {
    low: "Faible",
    medium: "Moyen",
    high: "Important",
  };
  return labels[needs];
}

/**
 * Get exposure icon
 */
export function getExposureIcon(
  exposure: "full-sun" | "partial" | "shade"
): string {
  const icons = {
    "full-sun": "☀️",
    partial: "⛅",
    shade: "🌥️",
  };
  return icons[exposure];
}

/**
 * Get water needs icon
 */
export function getWaterNeedsIcon(needs: "low" | "medium" | "high"): string {
  const icons = {
    low: "💧",
    medium: "💧💧",
    high: "💧💧💧",
  };
  return icons[needs];
}
