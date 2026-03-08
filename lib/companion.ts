import {
  Planting,
  Plant,
  Garden,
  PlacementRecommendation,
  CompatibilityLevel,
  CompanionRelation,
} from "./types";
import companionData from "@/data/companion_planting.json";

const relations = companionData.relations as CompanionRelation[];

/**
 * Get compatibility between two plants
 */
export function getCompatibility(
  plantId1: string,
  plantId2: string
): { level: CompatibilityLevel; reason: string } | null {
  const relation = relations.find(
    (r) =>
      (r.plant1 === plantId1 && r.plant2 === plantId2) ||
      (r.plant1 === plantId2 && r.plant2 === plantId1)
  );

  if (!relation) {
    return { level: "neutral", reason: "Aucune interaction connue" };
  }

  return {
    level: relation.compatibility as CompatibilityLevel,
    reason: relation.reason,
  };
}

/**
 * Calculate distance between two positions in cm
 */
function calculateDistance(
  pos1: { x: number; y: number },
  pos2: { x: number; y: number }
): number {
  const dx = (pos1.x - pos2.x) * 100; // Convert to cm
  const dy = (pos1.y - pos2.y) * 100;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Get neighbors within a radius (default 50cm)
 */
export function getNeighbors(
  plantings: Planting[],
  position: { x: number; y: number },
  radiusCm: number = 50
): Planting[] {
  return plantings.filter((p) => {
    const distance = calculateDistance(p.position, position);
    return distance > 0 && distance <= radiusCm;
  });
}

/**
 * Calculate placement score for a position
 */
export function calculatePlacementScore(
  existingPlantings: Planting[],
  newPlantId: string,
  position: { x: number; y: number },
  radiusCm: number = 50
): { score: number; reasons: string[]; warnings: string[]; tips: string[] } {
  const neighbors = getNeighbors(existingPlantings, position, radiusCm);

  if (neighbors.length === 0) {
    return {
      score: 70,
      reasons: ["Zone libre, pas de voisinage"],
      warnings: [],
      tips: ["Pensez aux associations bénéfiques pour les futures plantations"],
    };
  }

  let score = 50;
  const reasons: string[] = [];
  const warnings: string[] = [];
  const tips: string[] = [];

  for (const neighbor of neighbors) {
    const compat = getCompatibility(newPlantId, neighbor.plantId);

    if (!compat) continue;

    switch (compat.level) {
      case "excellent":
        score += 25;
        reasons.push(`✅ ${neighbor.plantName}: ${compat.reason}`);
        break;
      case "good":
        score += 15;
        reasons.push(`✅ ${neighbor.plantName}: ${compat.reason}`);
        break;
      case "neutral":
        // No change
        break;
      case "bad":
        score -= 20;
        warnings.push(`⚠️ ${neighbor.plantName}: ${compat.reason}`);
        break;
      case "terrible":
        score -= 35;
        warnings.push(`🚫 ${neighbor.plantName}: ${compat.reason}`);
        break;
    }
  }

  // Clamp score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  // Add tips based on neighbors
  if (score < 40) {
    tips.push("Choisissez un autre emplacement pour éviter les mauvaises associations");
  } else if (score >= 80) {
    tips.push("Excellent choix d'emplacement !");
  }

  return { score, reasons, warnings, tips };
}

/**
 * Get placement recommendations for all available positions
 */
export function getPlacementRecommendations(
  existingPlantings: Planting[],
  newPlant: Plant,
  garden: Garden,
  gridSizeMeters: number = 0.25 // 25cm grid
): PlacementRecommendation[] {
  const recommendations: PlacementRecommendation[] = [];

  // Generate grid positions
  for (let x = 0; x < garden.width; x += gridSizeMeters) {
    for (let y = 0; y < garden.height; y += gridSizeMeters) {
      const position = { x, y };

      // Check if position is already occupied
      const isOccupied = existingPlantings.some(
        (p) => calculateDistance(p.position, position) < 15 // 15cm minimum spacing
      );

      if (isOccupied) continue;

      const { score, reasons, warnings, tips } = calculatePlacementScore(
        existingPlantings,
        newPlant.id,
        position
      );

      recommendations.push({
        position,
        score,
        reasons,
        warnings,
        tips,
      });
    }
  }

  // Sort by score descending
  return recommendations.sort((a, b) => b.score - a.score);
}

/**
 * Get best positions (top 5)
 */
export function getBestPositions(
  existingPlantings: Planting[],
  newPlant: Plant,
  garden: Garden
): PlacementRecommendation[] {
  const all = getPlacementRecommendations(existingPlantings, newPlant, garden);
  return all.slice(0, 5);
}

/**
 * Get companions for a plant
 */
export function getCompanions(plantId: string): {
  excellent: string[];
  good: string[];
  enemies: string[];
} {
  const excellent: string[] = [];
  const good: string[] = [];
  const enemies: string[] = [];

  for (const relation of relations) {
    const otherPlant =
      relation.plant1 === plantId ? relation.plant2 :
      relation.plant2 === plantId ? relation.plant1 : null;

    if (!otherPlant) continue;

    switch (relation.compatibility) {
      case "excellent":
        excellent.push(otherPlant);
        break;
      case "good":
        good.push(otherPlant);
        break;
      case "bad":
      case "terrible":
        enemies.push(otherPlant);
        break;
    }
  }

  return { excellent, good, enemies };
}

/**
 * Generate companion planting tips
 */
export function generateCompanionTips(
  plantings: Planting[]
): { emoji: string; message: string; type: "success" | "warning" | "tip" }[] {
  const tips: { emoji: string; message: string; type: "success" | "warning" | "tip" }[] = [];

  for (let i = 0; i < plantings.length; i++) {
    for (let j = i + 1; j < plantings.length; j++) {
      const p1 = plantings[i];
      const p2 = plantings[j];
      const distance = calculateDistance(p1.position, p2.position);

      if (distance > 100) continue; // Only check nearby plants

      const compat = getCompatibility(p1.plantId, p2.plantId);
      if (!compat) continue;

      if (compat.level === "excellent") {
        tips.push({
          emoji: "✅",
          message: `${p1.plantName} + ${p2.plantName}: ${compat.reason}`,
          type: "success",
        });
      } else if (compat.level === "terrible" || compat.level === "bad") {
        tips.push({
          emoji: compat.level === "terrible" ? "🚫" : "⚠️",
          message: `${p1.plantName} + ${p2.plantName}: ${compat.reason}`,
          type: "warning",
        });
      }
    }
  }

  return tips;
}

/**
 * Get compatibility color for UI
 */
export function getCompatibilityColor(level: CompatibilityLevel): string {
  switch (level) {
    case "excellent":
      return "#22c55e"; // green-500
    case "good":
      return "#84cc16"; // lime-500
    case "neutral":
      return "#6b7280"; // gray-500
    case "bad":
      return "#f97316"; // orange-500
    case "terrible":
      return "#ef4444"; // red-500
    default:
      return "#6b7280";
  }
}

/**
 * Get compatibility emoji
 */
export function getCompatibilityEmoji(level: CompatibilityLevel): string {
  switch (level) {
    case "excellent":
      return "💚";
    case "good":
      return "✅";
    case "neutral":
      return "⚪";
    case "bad":
      return "⚠️";
    case "terrible":
      return "🚫";
    default:
      return "⚪";
  }
}
