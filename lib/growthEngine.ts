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
 * Timing analysis - was the plant sown/planted at the right time?
 */
export type PlantingTiming = "ideal" | "early" | "late" | "off-season";

export interface TimingAnalysis {
  timing: PlantingTiming;
  label: string;
  description: string;
  growthModifier: number; // 1.0 = normal, >1 = slower, <1 = faster
}

export function analyzePlantingTiming(
  plant: Plant,
  plantedAt: Date,
  plantingType: "seed" | "seedling" = "seedling"
): TimingAnalysis {
  const month = plantedAt.getMonth() + 1;
  const relevantMonths = plantingType === "seed" ? plant.sowingMonths : plant.plantingMonths;

  if (relevantMonths.includes(month)) {
    return {
      timing: "ideal",
      label: "Période idéale",
      description: `Planté au bon moment pour une croissance optimale`,
      growthModifier: 1.0,
    };
  }

  // Check if within 1 month of ideal period
  const isNearIdeal = relevantMonths.some(m =>
    Math.abs(m - month) === 1 || Math.abs(m - month) === 11
  );

  if (isNearIdeal) {
    const isEarly = relevantMonths.some(m => m > month || (month > 10 && m < 3));
    return {
      timing: isEarly ? "early" : "late",
      label: isEarly ? "Un peu tôt" : "Un peu tard",
      description: isEarly
        ? "Planté légèrement en avance - croissance plus lente au début"
        : "Planté légèrement en retard - récolte potentiellement retardée",
      growthModifier: 1.15,
    };
  }

  return {
    timing: "off-season",
    label: "Hors saison",
    description: "Planté hors de la période recommandée - croissance difficile",
    growthModifier: 1.4,
  };
}

/**
 * Growth stage descriptions - what the plant should look like physically
 */
export interface GrowthStageInfo {
  stage: PlantStatus;
  percentage: number;
  title: string;
  physicalDescription: string;
  icon: string;
  tips: string[];
}

export function getGrowthStageInfo(
  plant: Plant,
  growthPercentage: number,
  hasDisease: boolean = false,
  isHarvested: boolean = false
): GrowthStageInfo {
  if (isHarvested) {
    return {
      stage: "harvested",
      percentage: 100,
      title: "Récolté",
      physicalDescription: "Cette plante a été récoltée avec succès.",
      icon: "🌾",
      tips: ["Pensez à noter vos observations pour l'année prochaine"],
    };
  }

  if (hasDisease) {
    return {
      stage: "dead",
      percentage: growthPercentage,
      title: "Problème de santé",
      physicalDescription: "La plante montre des signes de maladie ou de stress.",
      icon: "🦠",
      tips: ["Isolez la plante si possible", "Identifiez la maladie", "Traitez ou retirez si nécessaire"],
    };
  }

  // Generic descriptions based on plant type and growth stage
  const plantType = plant.type;

  if (growthPercentage < 15) {
    // Seedling stage
    return {
      stage: "seedling",
      percentage: growthPercentage,
      title: "Germination / Jeune pousse",
      physicalDescription: getPhysicalDescription(plantType, "seedling", plant.name),
      icon: "🌱",
      tips: [
        "Maintenir le sol humide mais pas détrempé",
        "Protéger des températures extrêmes",
        "Éviter le soleil direct intense",
      ],
    };
  }

  if (growthPercentage < 40) {
    // Early growing
    return {
      stage: "growing",
      percentage: growthPercentage,
      title: "Croissance végétative",
      physicalDescription: getPhysicalDescription(plantType, "growing-early", plant.name),
      icon: "🌿",
      tips: [
        "Arroser régulièrement",
        "Commencer à fertiliser légèrement",
        "Surveiller les nuisibles",
      ],
    };
  }

  if (growthPercentage < 60) {
    // Mid growing
    return {
      stage: "growing",
      percentage: growthPercentage,
      title: "Développement actif",
      physicalDescription: getPhysicalDescription(plantType, "growing-mid", plant.name),
      icon: "🪴",
      tips: [
        "Pailler pour conserver l'humidité",
        "Tuteurer si nécessaire",
        "Fertiliser selon les besoins",
      ],
    };
  }

  if (growthPercentage < 80) {
    // Flowering/fruiting
    return {
      stage: "flowering",
      percentage: growthPercentage,
      title: "Floraison / Fructification",
      physicalDescription: getPhysicalDescription(plantType, "flowering", plant.name),
      icon: "🌸",
      tips: [
        "Réduire l'azote, favoriser potassium et phosphore",
        "Maintenir un arrosage régulier",
        "Surveiller la formation des fruits/légumes",
      ],
    };
  }

  if (growthPercentage < 95) {
    // Almost ready
    return {
      stage: "flowering",
      percentage: growthPercentage,
      title: "Maturation",
      physicalDescription: getPhysicalDescription(plantType, "maturing", plant.name),
      icon: "🍅",
      tips: [
        "Réduire l'arrosage progressivement",
        "Vérifier la maturité régulièrement",
        "Préparer la récolte",
      ],
    };
  }

  // Ready to harvest
  return {
    stage: "ready",
    percentage: growthPercentage,
    title: "Prêt à récolter !",
    physicalDescription: getPhysicalDescription(plantType, "ready", plant.name),
    icon: "✨",
    tips: [
      "Récoltez par temps sec de préférence",
      "Récoltez le matin pour une meilleure fraîcheur",
      "Ne tardez pas trop pour garder la qualité",
    ],
  };
}

function getPhysicalDescription(
  plantType: string,
  stage: string,
  plantName: string
): string {
  const descriptions: Record<string, Record<string, string>> = {
    legume: {
      seedling: `Les premières feuilles (cotylédons) sont visibles. La tige est fine et fragile, haute de 2-5 cm.`,
      "growing-early": `Apparition des vraies feuilles caractéristiques. La plante mesure 5-15 cm et commence à s'étoffer.`,
      "growing-mid": `Feuillage bien développé et dense. La tige s'épaissit. Hauteur de 15-40 cm selon la variété.`,
      flowering: `Apparition des fleurs. Pour les légumes-fruits, les premiers fruits commencent à se former.`,
      maturing: `Les fruits/légumes grossissent et changent de couleur. Surveillez les signes de maturité.`,
      ready: `${plantName} prêt(e) à être récolté(e). Couleur, taille et fermeté optimales.`,
    },
    herbe: {
      seedling: `Fines pousses vertes émergent du sol, haute de 1-3 cm.`,
      "growing-early": `Les feuilles aromatiques se développent. Parfum caractéristique perceptible.`,
      "growing-mid": `Touffe bien formée avec de nombreuses feuilles. Hauteur de 10-20 cm.`,
      flowering: `Apparition des tiges florales. Pincez pour prolonger la récolte des feuilles.`,
      maturing: `Plante mature, feuillage abondant. Idéal pour la récolte.`,
      ready: `Prêt à être récolté. Cueillez les feuilles selon vos besoins.`,
    },
    fruit: {
      seedling: `Jeune plant avec ses premières feuilles. Très fragile à ce stade.`,
      "growing-early": `La plante s'établit et développe son système racinaire et son feuillage.`,
      "growing-mid": `Croissance vigoureuse. Branches et feuillage se développent.`,
      flowering: `Floraison en cours. Les abeilles sont essentielles pour la pollinisation.`,
      maturing: `Les fruits grossissent et commencent à mûrir. Couleur en évolution.`,
      ready: `Fruits mûrs, prêts à être cueillis. Vérifiez la fermeté et la couleur.`,
    },
    fleur: {
      seedling: `Petites pousses délicates émergent. Feuilles embryonnaires visibles.`,
      "growing-early": `Les feuilles se développent. La plante prend forme.`,
      "growing-mid": `Feuillage abondant. Les boutons floraux commencent à apparaître.`,
      flowering: `Floraison ! Les fleurs s'épanouissent dans toute leur beauté.`,
      maturing: `Floraison à son apogée. Profitez du spectacle.`,
      ready: `Fleurs épanouies. Récoltez pour bouquets ou laissez pour les pollinisateurs.`,
    },
  };

  const typeDescriptions = descriptions[plantType] || descriptions.legume;
  return typeDescriptions[stage] || `${plantName} en développement.`;
}

/**
 * Complete growth tracking info for a planting
 */
export interface GrowthTrackingInfo {
  // Basic info
  plantName: string;
  variety: string;
  emoji: string;

  // Dates
  plantedAt: Date;
  sowedAt: Date | null;
  expectedHarvestAt: Date;
  harvestedAt: Date | null;

  // Progress
  daysSincePlanted: number;
  daysUntilHarvest: number;
  growthPercentage: number;

  // Timing analysis
  timing: TimingAnalysis;

  // Stage info
  stageInfo: GrowthStageInfo;

  // Status
  status: PlantStatus;
  isHarvested: boolean;
  hasDisease: boolean;
  diseaseName: string | null;
}

export function getGrowthTrackingInfo(
  planting: Planting,
  plant: Plant
): GrowthTrackingInfo {
  const now = new Date();

  // Parse dates
  const plantedAt = planting.plantedAt instanceof Date
    ? planting.plantedAt
    : new Date(planting.plantedAt as unknown as string);

  const sowedAt = planting.seedlingStartedAt
    ? (planting.seedlingStartedAt instanceof Date
        ? planting.seedlingStartedAt
        : new Date(planting.seedlingStartedAt as unknown as string))
    : null;

  const expectedHarvestAt = planting.expectedHarvestAt instanceof Date
    ? planting.expectedHarvestAt
    : new Date(planting.expectedHarvestAt as unknown as string);

  const harvestedAt = planting.harvestedAt
    ? (planting.harvestedAt instanceof Date
        ? planting.harvestedAt
        : new Date(planting.harvestedAt as unknown as string))
    : null;

  // Calculate timing
  const referenceDate = sowedAt || plantedAt;
  const timing = analyzePlantingTiming(
    plant,
    referenceDate,
    planting.plantingType || "seedling"
  );

  // Adjusted days to maturity based on timing
  const adjustedDaysToMaturity = Math.round(plant.daysToMaturity * timing.growthModifier);

  // Calculate progress
  const daysSincePlanted = differenceInDays(now, referenceDate);
  const growthPercentage = Math.min(100, Math.max(0,
    Math.round((daysSincePlanted / adjustedDaysToMaturity) * 100)
  ));
  const daysUntilHarvest = Math.max(0, adjustedDaysToMaturity - daysSincePlanted);

  // Get stage info
  const isHarvested = planting.status === "harvested";
  const hasDisease = !!planting.disease?.hasDisease;
  const stageInfo = getGrowthStageInfo(plant, growthPercentage, hasDisease, isHarvested);

  return {
    plantName: planting.plantName,
    variety: planting.variety || "",
    emoji: plant.emoji,

    plantedAt,
    sowedAt,
    expectedHarvestAt,
    harvestedAt,

    daysSincePlanted,
    daysUntilHarvest,
    growthPercentage,

    timing,
    stageInfo,

    status: planting.status,
    isHarvested,
    hasDisease,
    diseaseName: planting.disease?.name || null,
  };
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
