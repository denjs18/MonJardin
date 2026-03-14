"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Leaf,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Sprout,
  Calendar,
  Rows3,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { WeatherWidget } from "@/components/weather/WeatherWidget";
import { useGardenStore, useCatalogStore } from "@/lib/store";
import { getPlantingsNeedingAttention } from "@/lib/growthEngine";
import { getStatusLabel, getStatusColor } from "@/lib/growthEngine";
import { formatShortDate, daysUntil } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Planting, GardenRow } from "@/lib/types";

export default function DashboardPage() {
  const { plantings, rows, gardens, currentGardenId, getReadyToHarvest, deletePlanting, deleteRow, getPlantingsByRow } =
    useGardenStore();
  const { getPlantById } = useCatalogStore();
  const [attentionItems, setAttentionItems] = useState<
    ReturnType<typeof getPlantingsNeedingAttention>
  >([]);

  const readyToHarvest = getReadyToHarvest();
  const currentGarden = gardens.find((g) => g.id === currentGardenId);

  useEffect(() => {
    const items = getPlantingsNeedingAttention(plantings);
    setAttentionItems(items);
  }, [plantings]);

  // Get disease alerts
  const diseaseAlerts = plantings.filter((p) => p.disease?.hasDisease);

  // Group plantings by row vs individual
  const { rowGroups, individualPlantings } = useMemo(() => {
    const individual: Planting[] = [];
    const rowMap = new Map<string, { row: GardenRow; plantings: Planting[] }>();

    // Build a map of rows
    rows.forEach((row) => {
      rowMap.set(row.id, { row, plantings: [] });
    });

    // Group plantings
    plantings.forEach((p) => {
      if (p.status === "harvested") return; // Skip harvested

      if (p.rowId && rowMap.has(p.rowId)) {
        rowMap.get(p.rowId)!.plantings.push(p);
      } else if (!p.rowId) {
        individual.push(p);
      }
    });

    // Convert map to array, filter out empty rows
    const groups = Array.from(rowMap.values()).filter((g) => g.plantings.length > 0);

    return { rowGroups: groups, individualPlantings: individual };
  }, [plantings, rows]);

  // Handle row deletion
  const handleDeleteRow = (rowId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Supprimer cette rangée et toutes ses plantes ?")) {
      // Delete all plantings in the row first
      const rowPlantings = plantings.filter((p) => p.rowId === rowId);
      rowPlantings.forEach((p) => deletePlanting(p.id));
      // Then delete the row
      deleteRow(rowId);
    }
  };

  // Handle individual planting deletion
  const handleDeletePlanting = (plantingId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Supprimer cette plantation ?")) {
      deletePlanting(plantingId);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Weather Widget */}
      <WeatherWidget />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/20">
                <Leaf className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{plantings.length}</p>
                <p className="text-xs text-muted-foreground">Plantations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-500/10 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-orange-500/20">
                <CheckCircle2 className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{readyToHarvest.length}</p>
                <p className="text-xs text-muted-foreground">À récolter</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Disease Alerts */}
      {diseaseAlerts.length > 0 && (
        <Card className="border-red-500/50 bg-red-50 dark:bg-red-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Alertes maladies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {diseaseAlerts.map((plant) => (
                <Link
                  key={plant.id}
                  href={`/plants/${plant.id}`}
                  className="flex items-center justify-between p-2 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {getPlantById(plant.plantId)?.emoji || "🌱"}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{plant.plantName}</p>
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {plant.disease?.name}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ready to Harvest */}
      {readyToHarvest.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-xl">🌾</span>
              Prêts à récolter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {readyToHarvest.slice(0, 4).map((plant) => {
                const catalogPlant = getPlantById(plant.plantId);
                return (
                  <Link
                    key={plant.id}
                    href={`/plants/${plant.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-950/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {catalogPlant?.emoji || "🌱"}
                      </span>
                      <div>
                        <p className="font-medium">{plant.plantName}</p>
                        {plant.variety && (
                          <p className="text-xs text-muted-foreground">
                            {plant.variety}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="ready">Récolte</Badge>
                  </Link>
                );
              })}
            </div>
            {readyToHarvest.length > 4 && (
              <Link href="/plants?status=ready">
                <Button variant="ghost" size="sm" className="w-full mt-2">
                  Voir tout ({readyToHarvest.length})
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Attention Items */}
      {attentionItems.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              À surveiller
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {attentionItems.slice(0, 5).map(({ planting, reason }) => {
                const catalogPlant = getPlantById(planting.plantId);
                return (
                  <Link
                    key={planting.id}
                    href={`/plants/${planting.id}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {catalogPlant?.emoji || "🌱"}
                      </span>
                      <div>
                        <p className="font-medium text-sm">
                          {planting.plantName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {reason}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Plantings - Rows */}
      {rowGroups.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Rows3 className="h-5 w-5 text-primary" />
              Rangées ({rowGroups.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rowGroups.map(({ row, plantings: rowPlantings }) => {
                const firstPlanting = rowPlantings[0];
                const catalogPlant = firstPlanting ? getPlantById(firstPlanting.plantId) : null;
                const avgGrowth = rowPlantings.length > 0
                  ? Math.round(rowPlantings.reduce((sum, p) => sum + p.growthStage, 0) / rowPlantings.length)
                  : 0;

                return (
                  <div
                    key={row.id}
                    className="block p-3 rounded-lg hover:bg-muted/50 transition-colors border"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {catalogPlant?.emoji || "🌱"}
                        </span>
                        <div>
                          <span className="font-medium text-sm">
                            {firstPlanting?.plantName || "Rangée"}
                          </span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {rowPlantings.length} plants
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            firstPlanting?.status === "seedling"
                              ? "seedling"
                              : firstPlanting?.status === "growing"
                              ? "growing"
                              : "default"
                          }
                        >
                          {firstPlanting ? getStatusLabel(firstPlanting.status) : ""}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100"
                          onClick={(e) => handleDeleteRow(row.id, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Progress value={avgGrowth} className="h-2" />
                    <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                      <span>{avgGrowth}% de croissance</span>
                      {firstPlanting && (
                        <span>
                          Récolte:{" "}
                          {formatShortDate(
                            firstPlanting.expectedHarvestAt instanceof Date
                              ? firstPlanting.expectedHarvestAt
                              : new Date(firstPlanting.expectedHarvestAt as unknown as string)
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Plantings - Individual Plants */}
      {individualPlantings.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sprout className="h-5 w-5 text-primary" />
              Plants individuels ({individualPlantings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {individualPlantings.map((plant) => {
                const catalogPlant = getPlantById(plant.plantId);
                return (
                  <div
                    key={plant.id}
                    className="block p-3 rounded-lg hover:bg-muted/50 transition-colors border"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Link
                        href={`/plants/${plant.id}`}
                        className="flex items-center gap-2 flex-1"
                      >
                        <span className="text-lg">
                          {catalogPlant?.emoji || "🌱"}
                        </span>
                        <span className="font-medium text-sm">
                          {plant.plantName}
                        </span>
                      </Link>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            plant.status === "seedling"
                              ? "seedling"
                              : plant.status === "growing"
                              ? "growing"
                              : "default"
                          }
                        >
                          {getStatusLabel(plant.status)}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100"
                          onClick={(e) => handleDeletePlanting(plant.id, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Progress value={plant.growthStage} className="h-2" />
                    <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                      <span>{plant.growthStage}% de croissance</span>
                      <span>
                        Récolte:{" "}
                        {formatShortDate(
                          plant.expectedHarvestAt instanceof Date
                            ? plant.expectedHarvestAt
                            : new Date(plant.expectedHarvestAt as unknown as string)
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {plantings.length === 0 && (
        <Card className="text-center py-8">
          <CardContent>
            <div className="text-6xl mb-4">🌱</div>
            <h3 className="text-lg font-semibold mb-2">
              Bienvenue sur MonJardin !
            </h3>
            <p className="text-muted-foreground mb-4">
              Commencez par ajouter vos premières plantations
            </p>
            <Link href="/plants/add">
              <Button>
                <Sprout className="h-4 w-4 mr-2" />
                Ajouter une plante
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Link href="/garden">
          <Button variant="outline" className="w-full h-auto py-4 flex-col">
            <span className="text-2xl mb-1">🗺️</span>
            <span className="text-sm">Vue 3D</span>
          </Button>
        </Link>
        <Link href="/planting">
          <Button variant="outline" className="w-full h-auto py-4 flex-col">
            <span className="text-2xl mb-1">📅</span>
            <span className="text-sm">Calendrier</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
