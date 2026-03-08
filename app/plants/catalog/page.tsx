"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ArrowLeft, Filter, Calendar, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCatalogStore } from "@/lib/store";
import { Plant, PlantType } from "@/lib/types";
import {
  getPlantTypeLabel,
  getExposureLabel,
  getExposureIcon,
  getWaterNeedsIcon,
  getWaterNeedsLabel,
} from "@/lib/plantCatalog";
import { isGoodTimeToSow, isGoodTimeToPlant } from "@/lib/growthEngine";
import { getCompanions } from "@/lib/companion";
import { getMonthName } from "@/lib/utils";

export default function CatalogPage() {
  const { plants } = useCatalogStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<PlantType | "all">("all");
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [showSeasonable, setShowSeasonable] = useState(false);

  const currentMonth = new Date().getMonth() + 1;

  const filteredPlants = useMemo(() => {
    return plants.filter((p) => {
      if (typeFilter !== "all" && p.type !== typeFilter) return false;

      if (showSeasonable) {
        if (!isGoodTimeToSow(p, currentMonth) && !isGoodTimeToPlant(p, currentMonth)) {
          return false;
        }
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(query) ||
          p.family.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [plants, typeFilter, searchQuery, showSeasonable, currentMonth]);

  const companionInfo = selectedPlant
    ? getCompanions(selectedPlant.id)
    : { excellent: [], good: [], enemies: [] };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/plants">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">Catalogue des plantes</h1>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-2">
        <Button
          variant={showSeasonable ? "default" : "outline"}
          size="sm"
          onClick={() => setShowSeasonable(!showSeasonable)}
        >
          <Calendar className="h-4 w-4 mr-1" />
          De saison
        </Button>
        {(["all", "legume", "herbe", "fleur"] as const).map((type) => (
          <Button
            key={type}
            variant={typeFilter === type ? "secondary" : "outline"}
            size="sm"
            onClick={() => setTypeFilter(type)}
          >
            {type === "all"
              ? "Tout"
              : type === "legume"
              ? "🥬"
              : type === "herbe"
              ? "🌿"
              : "🌸"}
          </Button>
        ))}
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground">
        {filteredPlants.length} plante{filteredPlants.length > 1 ? "s" : ""}
      </p>

      {/* Plant list */}
      <div className="space-y-2">
        {filteredPlants.map((plant) => {
          const canSow = isGoodTimeToSow(plant, currentMonth);
          const canPlant = isGoodTimeToPlant(plant, currentMonth);

          return (
            <Card
              key={plant.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedPlant(plant)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{plant.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{plant.name}</h3>
                      {canSow && (
                        <Badge variant="success" className="text-xs">
                          Semis
                        </Badge>
                      )}
                      {canPlant && (
                        <Badge className="text-xs bg-lime-500">
                          Plantation
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {plant.family}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{getExposureIcon(plant.exposure)}</span>
                      <span>{getWaterNeedsIcon(plant.waterNeeds)}</span>
                      <span>{plant.daysToMaturity}j</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredPlants.length === 0 && (
        <Card className="text-center py-8">
          <CardContent>
            <span className="text-4xl">🔍</span>
            <p className="mt-2 text-muted-foreground">Aucune plante trouvée</p>
          </CardContent>
        </Card>
      )}

      {/* Plant Detail Dialog */}
      <Dialog
        open={!!selectedPlant}
        onOpenChange={() => setSelectedPlant(null)}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          {selectedPlant && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="text-3xl">{selectedPlant.emoji}</span>
                  {selectedPlant.name}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <p className="text-sm">{selectedPlant.description}</p>

                {/* Type and Family */}
                <div className="flex gap-2">
                  <Badge variant="outline">
                    {getPlantTypeLabel(selectedPlant.type)}
                  </Badge>
                  <Badge variant="secondary">{selectedPlant.family}</Badge>
                </div>

                {/* Growing info */}
                <Card>
                  <CardContent className="p-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground block">
                          Exposition
                        </span>
                        <span>
                          {getExposureIcon(selectedPlant.exposure)}{" "}
                          {getExposureLabel(selectedPlant.exposure)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">
                          Arrosage
                        </span>
                        <span>
                          {getWaterNeedsIcon(selectedPlant.waterNeeds)}{" "}
                          {getWaterNeedsLabel(selectedPlant.waterNeeds)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">
                          Espacement
                        </span>
                        <span>
                          {selectedPlant.spacing.row}×
                          {selectedPlant.spacing.plant} cm
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">
                          Maturité
                        </span>
                        <span>{selectedPlant.daysToMaturity} jours</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Calendrier */}
                <Card>
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm">📅 Calendrier</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2 text-sm">
                    {selectedPlant.sowingMonths.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Semis: </span>
                        {selectedPlant.sowingMonths
                          .map((m) => getMonthName(m).substring(0, 3))
                          .join(", ")}
                      </div>
                    )}
                    {selectedPlant.plantingMonths.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">
                          Plantation:{" "}
                        </span>
                        {selectedPlant.plantingMonths
                          .map((m) => getMonthName(m).substring(0, 3))
                          .join(", ")}
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Récolte: </span>
                      {selectedPlant.harvestMonths
                        .map((m) => getMonthName(m).substring(0, 3))
                        .join(", ")}
                    </div>
                  </CardContent>
                </Card>

                {/* Companions */}
                {(companionInfo.excellent.length > 0 ||
                  companionInfo.enemies.length > 0) && (
                  <Card>
                    <CardHeader className="py-2 px-3">
                      <CardTitle className="text-sm">
                        🤝 Associations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 space-y-2 text-sm">
                      {companionInfo.excellent.length > 0 && (
                        <div>
                          <span className="text-green-600">✅ Excellentes: </span>
                          {companionInfo.excellent.join(", ")}
                        </div>
                      )}
                      {companionInfo.good.length > 0 && (
                        <div>
                          <span className="text-lime-600">👍 Bonnes: </span>
                          {companionInfo.good.join(", ")}
                        </div>
                      )}
                      {companionInfo.enemies.length > 0 && (
                        <div>
                          <span className="text-red-600">⚠️ À éviter: </span>
                          {companionInfo.enemies.join(", ")}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Tips */}
                {selectedPlant.tips.length > 0 && (
                  <Card>
                    <CardHeader className="py-2 px-3">
                      <CardTitle className="text-sm">💡 Conseils</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3">
                      <ul className="text-sm space-y-1">
                        {selectedPlant.tips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Add button */}
                <Link href={`/plants/add?plant=${selectedPlant.id}`}>
                  <Button className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter à mon jardin
                  </Button>
                </Link>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
