"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Settings, Plus, Info, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GardenLegend } from "@/components/garden/GardenLegend";
import { useGardenStore, useCatalogStore } from "@/lib/store";
import { Planting } from "@/lib/types";
import { getStatusLabel, getStatusColor } from "@/lib/growthEngine";
import { formatDate, daysUntil } from "@/lib/utils";

// Dynamic import for 3D component to avoid SSR issues
const Garden3D = dynamic(
  () => import("@/components/3d/Garden3D").then((mod) => mod.Garden3D),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-sky-200 to-sky-100 dark:from-sky-900 dark:to-sky-800 rounded-lg">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">
            Chargement de la vue 3D...
          </span>
        </div>
      </div>
    ),
  }
);

export default function GardenPage() {
  const { plantings, gardens, currentGardenId, setCurrentGarden } =
    useGardenStore();
  const { getPlantById } = useCatalogStore();
  const [selectedPlanting, setSelectedPlanting] = useState<Planting | null>(
    null
  );
  const [showLegend, setShowLegend] = useState(true);
  const [is3DReady, setIs3DReady] = useState(false);

  const currentGarden = gardens.find((g) => g.id === currentGardenId);

  // Default garden dimensions
  const gardenWidth = currentGarden?.width || 4;
  const gardenHeight = currentGarden?.height || 3;

  // Filter plantings for current garden
  const gardenPlantings = currentGardenId
    ? plantings.filter((p) => p.gardenId === currentGardenId)
    : plantings;

  useEffect(() => {
    // Mark 3D as ready after a short delay to ensure component is mounted
    const timer = setTimeout(() => setIs3DReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handlePlantClick = (planting: Planting) => {
    setSelectedPlanting(planting);
  };

  const selectedPlant = selectedPlanting
    ? getPlantById(selectedPlanting.plantId)
    : null;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {currentGarden?.name || "Mon Jardin"}
          </span>
          <Badge variant="outline" className="text-xs">
            {gardenWidth}m × {gardenHeight}m
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowLegend(!showLegend)}
          >
            {showLegend ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* 3D View */}
      <div className="flex-1 relative">
        {is3DReady && (
          <Garden3D
            plantings={gardenPlantings}
            width={gardenWidth}
            height={gardenHeight}
            onPlantClick={handlePlantClick}
          />
        )}

        {/* Legend overlay */}
        {showLegend && <GardenLegend />}

        {/* Empty state */}
        {gardenPlantings.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-6 text-center max-w-xs mx-4">
              <span className="text-4xl">🌱</span>
              <h3 className="font-semibold mt-2">Jardin vide</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Ajoutez vos premières plantations pour les voir apparaître ici
              </p>
              <Link href="/plants/add">
                <Button className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une plante
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Controls hint */}
      <div className="p-2 text-center text-xs text-muted-foreground border-t bg-muted/30">
        <Info className="h-3 w-3 inline mr-1" />
        Glissez pour tourner • Pincez pour zoomer • Tapez sur une plante pour
        les détails
      </div>

      {/* Plant Detail Dialog */}
      <Dialog
        open={!!selectedPlanting}
        onOpenChange={() => setSelectedPlanting(null)}
      >
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{selectedPlant?.emoji || "🌱"}</span>
              {selectedPlanting?.plantName}
            </DialogTitle>
          </DialogHeader>

          {selectedPlanting && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Statut</span>
                <Badge
                  style={{
                    backgroundColor: getStatusColor(selectedPlanting.status),
                    color: "white",
                  }}
                >
                  {getStatusLabel(selectedPlanting.status)}
                </Badge>
              </div>

              {/* Growth progress */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Croissance</span>
                  <span className="font-medium">
                    {selectedPlanting.growthStage}%
                  </span>
                </div>
                <Progress value={selectedPlanting.growthStage} />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block">Planté le</span>
                  <span className="font-medium">
                    {formatDate(
                      selectedPlanting.plantedAt instanceof Date
                        ? selectedPlanting.plantedAt
                        : new Date(selectedPlanting.plantedAt as unknown as string)
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">
                    Récolte prévue
                  </span>
                  <span className="font-medium">
                    {formatDate(
                      selectedPlanting.expectedHarvestAt instanceof Date
                        ? selectedPlanting.expectedHarvestAt
                        : new Date(
                            selectedPlanting.expectedHarvestAt as unknown as string
                          )
                    )}
                  </span>
                </div>
              </div>

              {/* Variety */}
              {selectedPlanting.variety && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Variété: </span>
                  <span>{selectedPlanting.variety}</span>
                </div>
              )}

              {/* Disease alert */}
              {selectedPlanting.disease?.hasDisease && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg text-sm">
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    ⚠️ Maladie détectée: {selectedPlanting.disease.name}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" asChild>
                  <Link href={`/plants/${selectedPlanting.id}`}>
                    Voir détails
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
