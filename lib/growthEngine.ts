import { addDays, differenceInDays, format, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { Plant, Planting, PlantStatus, LunarDay, LunarPhase, LunarCalendarDay } from "./types";

/**
 * Calculate expected harvest date based on planting date and plant maturity
 */
export function calculateHarvestDate(
  plantedAt: Date,
  daysToMaturity: number,
  zone: number = 8 // USDA zone (8-9 for Occitanie)
): Date {
  // Adjust maturity based on climate zone
  // Warmer zones = faster growth, cooler zones = slower
  const zoneAdjustment = zone < 8 ? 1.15 : zone > 9 ? 0.9 : 1;
  const adjustedDays = Math.round(daysToMaturity * zoneAdjustment);

  return addDays(plantedAt, adjustedDays);
}

/**
 * Calculate growth stage percentage
 */
export function calculateGrowthStage(
  plantedAt: Date,
  daysToMaturity: number,
  currentDate: Date = new Date()
): number {
  const daysSincePlanted = differenceInDays(currentDate, plantedAt);
  const percentage = (daysSincePlanted / daysToMaturity) * 100;
  return Math.max(0, Math.min(100, Math.round(percentage)));
}

/**
 * Determine plant status based on growth stage
 */
export function determineStatus(
  growthStage: number,
  harvestedAt: Date | null,
  hasDisease: boolean
): PlantStatus {
  if (harvestedAt) return "harvested";
  if (hasDisease) return "dead"; // Simplified - could be more nuanced
  if (growthStage < 15) return "seedling";
  if (growthStage < 60) return "growing";
  if (growthStage < 90) return "flowering";
  return "ready";
}

/**
 * Check if it's a good time to plant based on sowing months
 */
export function isGoodTimeToSow(
  plant: Plant,
  currentMonth: number = new Date().getMonth() + 1
): boolean {
  return plant.sowingMonths.includes(currentMonth);
}

/**
 * Check if it's a good time to plant seedlings
 */
export function isGoodTimeToPlant(
  plant: Plant,
  currentMonth: number = new Date().getMonth() + 1
): boolean {
  return plant.plantingMonths.includes(currentMonth);
}

/**
 * Get season-based advice
 */
export function getSeasonAdvice(
  plant: Plant,
  currentMonth: number = new Date().getMonth() + 1
): string {
  if (plant.sowingMonths.includes(currentMonth)) {
    return `🌱 C'est le bon moment pour semer des ${plant.name.toLowerCase()}s`;
  }
  if (plant.plantingMonths.includes(currentMonth)) {
    return `🪴 C'est le bon moment pour planter des ${plant.name.toLowerCase()}s`;
  }
  if (plant.harvestMonths.includes(currentMonth)) {
    return `🌾 C'est la période de récolte des ${plant.name.toLowerCase()}s`;
  }

  // Find next good period
  const nextSowingMonth = plant.sowingMonths.find((m) => m > currentMonth) ||
    plant.sowingMonths[0];
  const monthName = format(new Date(2024, nextSowingMonth - 1, 1), "MMMM", {
    locale: fr,
  });

  return `⏳ Prochain semis possible en ${monthName}`;
}

/**
 * Get upcoming plantings needing attention
 */
export function getPlantingsNeedingAttention(
  plantings: Planting[],
  currentDate: Date = new Date()
): { planting: Planting; reason: string }[] {
  const results: { planting: Planting; reason: string }[] = [];

  for (const planting of plantings) {
    const plantedAt = planting.plantedAt instanceof Date
      ? planting.plantedAt
      : new Date(planting.plantedAt as unknown as string);

    const expectedHarvest = planting.expectedHarvestAt instanceof Date
      ? planting.expectedHarvestAt
      : new Date(planting.expectedHarvestAt as unknown as string);

    // Check if ready to harvest
    if (planting.status === "ready") {
      results.push({
        planting,
        reason: "🌾 Prêt à récolter !",
      });
      continue;
    }

    // Check if harvest is coming soon (within 7 days)
    const daysUntilHarvest = differenceInDays(expectedHarvest, currentDate);
    if (daysUntilHarvest > 0 && daysUntilHarvest <= 7) {
      results.push({
        planting,
        reason: `📅 Récolte prévue dans ${daysUntilHarvest} jour${daysUntilHarvest > 1 ? "s" : ""}`,
      });
      continue;
    }

    // Check for disease
    if (planting.disease?.hasDisease) {
      results.push({
        planting,
        reason: `🦠 Maladie détectée: ${planting.disease.name}`,
      });
      continue;
    }

    // Check if needs watering (no event in last 3 days in summer)
    const lastWatering = planting.events
      .filter((e) => e.type === "watered")
      .sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date : new Date(a.date as unknown as string);
        const dateB = b.date instanceof Date ? b.date : new Date(b.date as unknown as string);
        return dateB.getTime() - dateA.getTime();
      })[0];

    if (lastWatering) {
      const lastWateringDate = lastWatering.date instanceof Date
        ? lastWatering.date
        : new Date(lastWatering.date as unknown as string);
      const daysSinceWatering = differenceInDays(currentDate, lastWateringDate);
      const month = currentDate.getMonth();
      const isSummer = month >= 5 && month <= 8;

      if ((isSummer && daysSinceWatering >= 2) || daysSinceWatering >= 5) {
        results.push({
          planting,
          reason: `💧 Arrosage conseillé (${daysSinceWatering} jours)`,
        });
      }
    }
  }

  return results;
}

/**
 * Calculate lunar phase for a given date
 * Simplified calculation - in production, use a proper library
 */
export function getLunarPhase(date: Date): LunarPhase {
  // Synodic month is approximately 29.53 days
  const SYNODIC_MONTH = 29.53;
  // Known new moon: January 11, 2024
  const knownNewMoon = new Date(2024, 0, 11);
  const daysSinceNewMoon = differenceInDays(date, knownNewMoon);
  const lunarAge = ((daysSinceNewMoon % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;

  if (lunarAge < 1.85) return "new-moon";
  if (lunarAge < 7.38) return "waxing-crescent";
  if (lunarAge < 9.23) return "first-quarter";
  if (lunarAge < 14.77) return "waxing-gibbous";
  if (lunarAge < 16.61) return "full-moon";
  if (lunarAge < 22.15) return "waning-gibbous";
  if (lunarAge < 23.99) return "last-quarter";
  return "waning-crescent";
}

/**
 * Get lunar day type for gardening
 */
export function getLunarDayType(date: Date): LunarDay {
  // Simplified: based on lunar cycle position
  const phase = getLunarPhase(date);
  const dayOfMonth = date.getDate();

  // Rotation through the 4 types based on day
  const typeIndex = dayOfMonth % 4;
  const types: LunarDay[] = ["feuilles", "fruits", "racines", "fleurs"];

  return types[typeIndex];
}

/**
 * Get lunar calendar day info
 */
export function getLunarCalendarDay(date: Date): LunarCalendarDay {
  const phase = getLunarPhase(date);
  const dayType = getLunarDayType(date);

  // Best planting during waxing moon for above-ground crops
  const isWaxingMoon = ["waxing-crescent", "first-quarter", "waxing-gibbous"].includes(phase);
  const isWaningMoon = ["waning-gibbous", "last-quarter", "waning-crescent"].includes(phase);

  let isGoodForPlanting = false;
  let recommendation = "";

  switch (dayType) {
    case "feuilles":
      recommendation = "🥬 Jour feuilles - Idéal pour laitues, épinards, choux";
      isGoodForPlanting = isWaxingMoon;
      break;
    case "fruits":
      recommendation = "🍅 Jour fruits - Idéal pour tomates, courgettes, haricots";
      isGoodForPlanting = isWaxingMoon;
      break;
    case "racines":
      recommendation = "🥕 Jour racines - Idéal pour carottes, radis, pommes de terre";
      isGoodForPlanting = isWaningMoon;
      break;
    case "fleurs":
      recommendation = "🌸 Jour fleurs - Idéal pour les semis de fleurs";
      isGoodForPlanting = isWaxingMoon;
      break;
  }

  if (phase === "new-moon" || phase === "full-moon") {
    isGoodForPlanting = false;
    recommendation = phase === "new-moon"
      ? "🌑 Nouvelle lune - Repos du jardin conseillé"
      : "🌕 Pleine lune - Évitez les plantations";
  }

  return {
    date,
    phase,
    dayType,
    isGoodForPlanting,
    recommendation,
  };
}

/**
 * Get lunar phase emoji
 */
export function getLunarPhaseEmoji(phase: LunarPhase): string {
  const emojis: Record<LunarPhase, string> = {
    "new-moon": "🌑",
    "waxing-crescent": "🌒",
    "first-quarter": "🌓",
    "waxing-gibbous": "🌔",
    "full-moon": "🌕",
    "waning-gibbous": "🌖",
    "last-quarter": "🌗",
    "waning-crescent": "🌘",
  };
  return emojis[phase];
}

/**
 * Get status color for UI
 */
export function getStatusColor(status: PlantStatus): string {
  const colors: Record<PlantStatus, string> = {
    seedling: "#90EE90",
    growing: "#228B22",
    flowering: "#FFD700",
    ready: "#FF8C00",
    harvested: "#8B4513",
    dead: "#696969",
  };
  return colors[status];
}

/**
 * Get status label in French
 */
export function getStatusLabel(status: PlantStatus): string {
  const labels: Record<PlantStatus, string> = {
    seedling: "Semis",
    growing: "En croissance",
    flowering: "Floraison",
    ready: "Prêt à récolter",
    harvested: "Récolté",
    dead: "Mort",
  };
  return labels[status];
}

/**
 * Calculate rotation recommendation
 * Don't plant same family in same spot for 3 years
 */
export function checkRotation(
  plotHistory: { year: number; family: string }[],
  newPlantFamily: string,
  currentYear: number = new Date().getFullYear()
): { ok: boolean; warning?: string } {
  const recentYears = plotHistory.filter(
    (h) => currentYear - h.year < 3 && h.family === newPlantFamily
  );

  if (recentYears.length > 0) {
    const lastYear = Math.max(...recentYears.map((h) => h.year));
    return {
      ok: false,
      warning: `⚠️ Famille ${newPlantFamily} cultivée ici en ${lastYear}. Attendez ${3 - (currentYear - lastYear)} an(s) de plus.`,
    };
  }

  return { ok: true };
}
