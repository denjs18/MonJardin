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
  History,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { WeatherWidget } from "@/components/weather/WeatherWidget";
import { PlantGrowthPanel } from "@/components/plants/PlantGrowthPanel";
import { useGardenStore, useCatalogStore } from "@/lib/store";
import { getPlantingsNeedingAttention } from "@/lib/growthEngine";
import { getStatusLabel, getStatusColor } from "@/lib/growthEngine";
import { formatShortDate, daysUntil } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Planting, GardenRow } from "@/lib/types";

export default function DashboardPage() {
  const {
    plantings,
    rows,
    gardens,
    currentGardenId,
    getReadyToHarvest,
    deletePlanting,
    deleteRow,
    updatePlanting,
  } = useGardenStore();
  const { getPlantById } = useCatalogStore();

  // Selected item for detail panel
  const [selectedPlanting, setSelectedPlanting] = useState<Planting | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showHarvestedHistory, setShowHarvestedHistory] = useState(false);

  const readyToHarvest = getReadyToHarvest();
  const currentGarden = gardens.find((g) => g.id === currentGardenId);

  const [attentionItems, setAttentionItems] = useState<
    ReturnType<typeof getPlantingsNeedingAttention>
  >([]);

  useEffect(() => {
    const items = getPlantingsNeedingAttention(plantings);
    setAttentionItems(items);
  }, [plantings]);

  // Get disease alerts
  const diseaseAlerts = plantings.filter((p) => p.disease?.hasDisease && p.status !== "harvested");

  // Get harvested plantings for history
  const harvestedPlantings = useMemo(() => {
    return plantings
      .filter((p) => p.status === "harvested")
      .sort((a, b) => {
        const dateA = a.harvestedAt instanceof Date ? a.harvestedAt : new Date(a.harvestedAt as any);
        const dateB = b.harvestedAt instanceof Date ? b.harvestedAt : new Date(b.harvestedAt as any);
        return dateB.getTime() - dateA.getTime();
      });
  }, [plantings]);

  // Group plantings by row vs individual (exclude harvested)
  const { rowGroups, individualPlantings } = useMemo(() => {
    const individual: Planting[] = [];
    const rowMap = new Map<string, { row: GardenRow; plantings: Planting[] }>();

    rows.forEach((row) => {
      rowMap.set(row.id, { row, plantings: [] });
    });

    plantings.forEach((p) => {
      if (p.status === "harvested") return;

      if (p.rowId && rowMap.has(p.rowId)) {
        rowMap.get(p.rowId)!.plantings.push(p);
      } else if (!p.rowId) {
        individual.push(p);
      }
    });

    const groups = Array.from(rowMap.values()).filter((g) => g.plantings.length > 0);

    return { rowGroups: groups, individualPlantings: individual };
  }, [plantings, rows]);

  // Get selected row data
  const selectedRowData = useMemo(() => {
    if (!selectedRowId) return null;
    return rowGroups.find((g) => g.row.id === selectedRowId) || null;
  }, [selectedRowId, rowGroups]);

  // Handle row click
  const handleRowClick = (rowId: string) => {
    setSelectedRowId(rowId);
    setSelectedPlanting(null);
  };

  // Handle planting click
  const handlePlantingClick = (planting: Planting) => {
    setSelectedPlanting(planting);
    setSelectedRowId(null);
  };

  // Close detail panel
  const handleClosePanel = () => {
    setSelectedPlanting(null);
    setSelectedRowId(null);
  };

  // Handle row deletion
  const handleDeleteRow = (rowId: string) => {
    if (confirm("Supprimer cette rangée et toutes ses plantes ?")) {
      const rowPlantings = plantings.filter((p) => p.rowId === rowId);
      rowPlantings.forEach((p) => deletePlanting(p.id));
      deleteRow(rowId);
      handleClosePanel();
    }
  };

  // Handle individual planting deletion
  const handleDeletePlanting = (plantingId: string) => {
    if (confirm("Supprimer cette plantation ?")) {
      deletePlanting(plantingId);
      handleClosePanel();
    }
  };

  // Handle mark as harvested
  const handleMarkHarvested = (plantingId: string) => {
    updatePlanting(plantingId, {
      status: "harvested",
      harvestedAt: new Date(),
    });
    handleClosePanel();
  };

  // Handle mark row as harvested
  const handleMarkRowHarvested = (rowId: string) => {
    const rowPlantings = plantings.filter((p) => p.rowId === rowId);
    rowPlantings.forEach((p) => {
      updatePlanting(p.id, {
        status: "harvested",
        harvestedAt: new Date(),
      });
    });
    handleClosePanel();
  };

  // Active plantings count (non-harvested)
  const activePlantingsCount = plantings.filter((p) => p.status !== "harvested").length;

  return (
    <div className="p-4 space-y-4">
      {/* Detail Panel Modal */}
      {(selectedPlanting || selectedRowData) && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-md">
            {selectedPlanting && (
              <PlantGrowthPanel
                planting={selectedPlanting}
                plant={getPlantById(selectedPlanting.plantId)!}
                onClose={handleClosePanel}
                onDelete={() => handleDeletePlanting(selectedPlanting.id)}
                onMarkHarvested={() => handleMarkHarvested(selectedPlanting.id)}
              />
            )}
            {selectedRowData && (
              <PlantGrowthPanel
                planting={selectedRowData.plantings[0]}
                plant={getPlantById(selectedRowData.plantings[0].plantId)!}
                isRow={true}
                rowPlantings={selectedRowData.plantings}
                onClose={handleClosePanel}
                onDelete={() => handleDeleteRow(selectedRowData.row.id)}
                onMarkHarvested={() => handleMarkRowHarvested(selectedRowData.row.id)}
              />
            )}
          </div>
        </div>
      )}

      {/* Weather Widget */}
      <WeatherWidget />

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-primary/20">
                <Leaf className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{activePlantingsCount}</p>
                <p className="text-xs text-muted-foreground">En cours</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-500/10 border-orange-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-orange-500/20">
                <CheckCircle2 className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{readyToHarvest.length}</p>
                <p className="text-xs text-muted-foreground">À récolter</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-green-500/20">
                <History className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{harvestedPlantings.length}</p>
                <p className="text-xs text-muted-foreground">Récoltés</p>
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
                <button
                  key={plant.id}
                  onClick={() => handlePlantingClick(plant)}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {getPlantById(plant.plantId)?.emoji || "🌱"}
                    </span>
                    <div className="text-left">
                      <p className="font-medium text-sm">{plant.plantName}</p>
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {plant.disease?.name}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4" />
                </button>
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
                  <button
                    key={plant.id}
                    onClick={() => handlePlantingClick(plant)}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-950/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {catalogPlant?.emoji || "🌱"}
                      </span>
                      <div className="text-left">
                        <p className="font-medium">{plant.plantName}</p>
                        {plant.variety && (
                          <p className="text-xs text-muted-foreground">
                            {plant.variety}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="ready">Récolte</Badge>
                  </button>
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
                  <button
                    key={row.id}
                    onClick={() => handleRowClick(row.id)}
                    className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors border"
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
                      <Badge
                        style={{
                          backgroundColor: getStatusColor(firstPlanting?.status || "seedling"),
                          color: "white",
                        }}
                      >
                        {avgGrowth}%
                      </Badge>
                    </div>
                    <Progress value={avgGrowth} className="h-2" />
                    <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                      <span>{getStatusLabel(firstPlanting?.status || "seedling")}</span>
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
                  </button>
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
                  <button
                    key={plant.id}
                    onClick={() => handlePlantingClick(plant)}
                    className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors border"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {catalogPlant?.emoji || "🌱"}
                        </span>
                        <span className="font-medium text-sm">
                          {plant.plantName}
                        </span>
                      </div>
                      <Badge
                        style={{
                          backgroundColor: getStatusColor(plant.status),
                          color: "white",
                        }}
                      >
                        {plant.growthStage}%
                      </Badge>
                    </div>
                    <Progress value={plant.growthStage} className="h-2" />
                    <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                      <span>{getStatusLabel(plant.status)}</span>
                      <span>
                        Récolte:{" "}
                        {formatShortDate(
                          plant.expectedHarvestAt instanceof Date
                            ? plant.expectedHarvestAt
                            : new Date(plant.expectedHarvestAt as unknown as string)
                        )}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Harvested History */}
      {harvestedPlantings.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-green-600" />
                Historique des récoltes ({harvestedPlantings.length})
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHarvestedHistory(!showHarvestedHistory)}
              >
                {showHarvestedHistory ? "Masquer" : "Voir"}
              </Button>
            </CardTitle>
          </CardHeader>
          {showHarvestedHistory && (
            <CardContent>
              <div className="space-y-2">
                {harvestedPlantings.map((plant) => {
                  const catalogPlant = getPlantById(plant.plantId);
                  const harvestedAt = plant.harvestedAt instanceof Date
                    ? plant.harvestedAt
                    : new Date(plant.harvestedAt as unknown as string);

                  return (
                    <div
                      key={plant.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-green-50 dark:bg-green-950/20"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg opacity-60">
                          {catalogPlant?.emoji || "🌱"}
                        </span>
                        <div>
                          <p className="font-medium text-sm">{plant.plantName}</p>
                          <p className="text-xs text-muted-foreground">
                            Récolté le {formatShortDate(harvestedAt)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-green-600">
                        Récolté
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}
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
            <Link href="/garden">
              <Button>
                <Sprout className="h-4 w-4 mr-2" />
                Aller au jardin
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
            <span className="text-sm">Vue 2D</span>
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
