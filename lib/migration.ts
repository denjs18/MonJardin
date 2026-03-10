import { GardenRow, Planting } from "./types";
import { generateId } from "./utils";

/**
 * Migration des anciennes rangées (Planting avec mode="row" et rowConfig)
 * vers le nouveau système (GardenRow + Planting individuels avec rowId)
 */
export function migrateOldRows(
  plantings: Planting[],
  existingRows: GardenRow[]
): {
  newRows: GardenRow[];
  newPlantings: Planting[];
  plantingsToRemove: string[];
} {
  const newRows: GardenRow[] = [];
  const newPlantings: Planting[] = [];
  const plantingsToRemove: string[] = [];

  // Trouver les plantings avec l'ancien format (mode="row" et rowConfig sans rowId)
  const oldRowPlantings = plantings.filter(
    (p) => p.mode === "row" && p.rowConfig && !p.rowId
  );

  for (const oldPlanting of oldRowPlantings) {
    if (!oldPlanting.rowConfig) continue;

    const { startX, startY, endX, endY, spacing, plantCount } = oldPlanting.rowConfig;

    // Creer une nouvelle GardenRow
    const newRow: GardenRow = {
      id: generateId(),
      spaceId: oldPlanting.spaceId,
      plotId: oldPlanting.plotId,
      startX,
      startY,
      endX,
      endY,
      color: "#8B4513",
      name: `Rangée de ${oldPlanting.plantName}`,
      createdAt: oldPlanting.plantedAt instanceof Date
        ? oldPlanting.plantedAt
        : new Date(oldPlanting.plantedAt as any),
    };
    newRows.push(newRow);

    // Creer des plantings individuels pour chaque plante de la rangee
    for (let i = 0; i < plantCount; i++) {
      const t = plantCount > 1 ? i / (plantCount - 1) : 0;
      const x = startX + t * (endX - startX);
      const y = startY + t * (endY - startY);

      const newPlanting: Planting = {
        id: generateId(),
        spaceId: oldPlanting.spaceId,
        plotId: oldPlanting.plotId,
        plantId: oldPlanting.plantId,
        plantName: oldPlanting.plantName,
        variety: oldPlanting.variety,
        mode: "single",
        position: { x, y },
        rowId: newRow.id,
        positionOnRow: t,
        plantedAt: oldPlanting.plantedAt,
        seedlingStartedAt: oldPlanting.seedlingStartedAt,
        expectedHarvestAt: oldPlanting.expectedHarvestAt,
        harvestedAt: oldPlanting.harvestedAt,
        status: oldPlanting.status,
        growthStage: oldPlanting.growthStage,
        events: [], // Les events ne sont pas dupliques
        disease: oldPlanting.disease,
        gardenId: oldPlanting.gardenId,
      };
      newPlantings.push(newPlanting);
    }

    // Marquer l'ancien planting pour suppression
    plantingsToRemove.push(oldPlanting.id);
  }

  return { newRows, newPlantings, plantingsToRemove };
}

/**
 * Verifie si une migration est necessaire
 */
export function needsMigration(plantings: Planting[]): boolean {
  return plantings.some((p) => p.mode === "row" && p.rowConfig && !p.rowId);
}
