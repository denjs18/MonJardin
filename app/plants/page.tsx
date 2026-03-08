"use client";

import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, Search, Filter, Grid, List, SlidersHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGardenStore, useCatalogStore } from "@/lib/store";
import { PlantStatus } from "@/lib/types";
import { getStatusLabel, getStatusColor } from "@/lib/growthEngine";
import { formatShortDate, daysUntil } from "@/lib/utils";
import { cn } from "@/lib/utils";

const statusFilters: { value: PlantStatus | "all"; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "seedling", label: "Semis" },
  { value: "growing", label: "Croissance" },
  { value: "flowering", label: "Floraison" },
  { value: "ready", label: "Récolte" },
  { value: "harvested", label: "Récoltées" },
];

function PlantsContent({ initialStatus }: { initialStatus: string }) {
  const { plantings } = useGardenStore();
  const { getPlantById } = useCatalogStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PlantStatus | "all">(
    initialStatus as PlantStatus | "all"
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Filter plantings
  const filteredPlantings = useMemo(() => {
    return plantings.filter((p) => {
      // Status filter
      if (statusFilter !== "all" && p.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          p.plantName.toLowerCase().includes(query) ||
          p.variety?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [plantings, statusFilter, searchQuery]);

  // Group by status for overview
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: plantings.length };
    plantings.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return counts;
  }, [plantings]);

  return (
    <div className="p-4 space-y-4">
      {/* Search and Filter */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
        >
          {viewMode === "grid" ? (
            <List className="h-4 w-4" />
          ) : (
            <Grid className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        {statusFilters.map((filter) => (
          <Button
            key={filter.value}
            variant={statusFilter === filter.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(filter.value)}
            className="whitespace-nowrap"
          >
            {filter.label}
            {statusCounts[filter.value] !== undefined && (
              <Badge
                variant="secondary"
                className="ml-2 h-5 px-1.5 text-xs"
              >
                {statusCounts[filter.value]}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Plantings list */}
      {filteredPlantings.length > 0 ? (
        <div
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-2 gap-3"
              : "flex flex-col gap-2"
          )}
        >
          {filteredPlantings.map((planting) => {
            const plant = getPlantById(planting.plantId);
            const daysToHarvest = daysUntil(
              planting.expectedHarvestAt instanceof Date
                ? planting.expectedHarvestAt
                : new Date(planting.expectedHarvestAt as unknown as string)
            );

            return (
              <Link key={planting.id} href={`/plants/${planting.id}`}>
                <Card
                  className={cn(
                    "hover:shadow-md transition-shadow cursor-pointer",
                    planting.disease?.hasDisease && "border-red-500"
                  )}
                >
                  <CardContent
                    className={cn(
                      viewMode === "grid" ? "p-3" : "p-3 flex items-center gap-3"
                    )}
                  >
                    {viewMode === "grid" ? (
                      // Grid view
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl">{plant?.emoji || "🌱"}</span>
                          <Badge
                            style={{
                              backgroundColor: getStatusColor(planting.status),
                              color: "white",
                            }}
                            className="text-xs"
                          >
                            {getStatusLabel(planting.status)}
                          </Badge>
                        </div>
                        <h3 className="font-medium text-sm truncate">
                          {planting.plantName}
                        </h3>
                        {planting.variety && (
                          <p className="text-xs text-muted-foreground truncate">
                            {planting.variety}
                          </p>
                        )}
                        <Progress
                          value={planting.growthStage}
                          className="h-1.5 mt-2"
                        />
                        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                          <span>{planting.growthStage}%</span>
                          {daysToHarvest > 0 && planting.status !== "harvested" && (
                            <span>J-{daysToHarvest}</span>
                          )}
                        </div>
                      </>
                    ) : (
                      // List view
                      <>
                        <span className="text-2xl">{plant?.emoji || "🌱"}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">
                            {planting.plantName}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress
                              value={planting.growthStage}
                              className="h-1.5 flex-1"
                            />
                            <span className="text-xs text-muted-foreground">
                              {planting.growthStage}%
                            </span>
                          </div>
                        </div>
                        <Badge
                          style={{
                            backgroundColor: getStatusColor(planting.status),
                            color: "white",
                          }}
                          className="text-xs shrink-0"
                        >
                          {getStatusLabel(planting.status)}
                        </Badge>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        // Empty state
        <Card className="text-center py-12">
          <CardContent>
            {searchQuery || statusFilter !== "all" ? (
              <>
                <span className="text-4xl">🔍</span>
                <h3 className="font-semibold mt-4">Aucun résultat</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Aucune plante ne correspond à vos critères
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                >
                  Réinitialiser les filtres
                </Button>
              </>
            ) : (
              <>
                <span className="text-4xl">🌱</span>
                <h3 className="font-semibold mt-4">Pas encore de plantations</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Commencez par ajouter vos premières plantes
                </p>
                <Link href="/plants/add">
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter une plante
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Catalog link */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <Link
            href="/plants/catalog"
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📚</span>
              <div>
                <h3 className="font-medium">Catalogue des plantes</h3>
                <p className="text-sm text-muted-foreground">
                  Découvrez les plantes disponibles
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              Voir
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function PlantsPageWithParams() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "all";
  return <PlantsContent initialStatus={initialStatus} />;
}

export default function PlantsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center">Chargement...</div>}>
      <PlantsPageWithParams />
    </Suspense>
  );
}
