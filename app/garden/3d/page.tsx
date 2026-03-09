"use client";

import { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Info, Grid3X3, Warehouse, Home, Tent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { GardenLegend } from "@/components/garden/GardenLegend";
import { useGardenStore, useCatalogStore } from "@/lib/store";
import { Planting, PlantStatus, EnvironmentType } from "@/lib/types";
import { getStatusLabel, getStatusColor } from "@/lib/growthEngine";
import { formatDate } from "@/lib/utils";

// Dynamic import for 3D component
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

const environmentIcons: Record<EnvironmentType, React.ReactNode> = {
  outdoor: <Tent className="h-4 w-4" />,
  greenhouse: <Warehouse className="h-4 w-4" />,
  indoor: <Home className="h-4 w-4" />,
};

const statusOptions: { value: PlantStatus; label: string }[] = [
  { value: "seedling", label: "Semis" },
  { value: "growing", label: "Croissance" },
  { value: "flowering", label: "Floraison" },
  { value: "ready", label: "Prêt à récolter" },
  { value: "harvested", label: "Récolté" },
  { value: "dead", label: "Mort" },
];

function Garden3DPageContent() {
  const searchParams = useSearchParams();
  const spaceIdParam = searchParams.get("space");

  const {
    spaces,
    plantings,
    plots,
    currentSpaceId,
    setCurrentSpace,
    getPlantingsBySpace,
    updatePlanting,
  } = useGardenStore();
  const { getPlantById } = useCatalogStore();

  const [selectedPlanting, setSelectedPlanting] = useState<Planting | null>(null);
  const [showLegend, setShowLegend] = useState(true);

  // Set space from URL param
  useEffect(() => {
    if (spaceIdParam && spaceIdParam !== currentSpaceId) {
      setCurrentSpace(spaceIdParam);
    }
  }, [spaceIdParam, currentSpaceId, setCurrentSpace]);

  const currentSpace = spaces.find(
    (s) => s.id === (spaceIdParam || currentSpaceId)
  );
  const spacePlantings = currentSpace
    ? getPlantingsBySpace(currentSpace.id)
    : [];

  // Convert plantings to format expected by Garden3D
  const garden3DPlantings = spacePlantings.flatMap((planting) => {
    const plot = plots.find((p) => p.id === planting.plotId);
    if (!plot) return [];

    if (planting.mode === "row" && planting.rowConfig) {
      const { startX, startY, endX, endY, plantCount } = planting.rowConfig;
      const plants = [];

      for (let i = 0; i < plantCount; i++) {
        const t = plantCount > 1 ? i / (plantCount - 1) : 0;
        const x = plot.x + startX + t * (endX - startX);
        const y = plot.y + startY + t * (endY - startY);

        plants.push({
          ...planting,
          id: `${planting.id}-${i}`,
          position: { x, y },
        });
      }

      return plants;
    }

    return [
      {
        ...planting,
        position: {
          x: plot.x + planting.position.x,
          y: plot.y + planting.position.y,
        },
      },
    ];
  });

  const handlePlantClick = (planting: Planting) => {
    // Find original planting (for rows, strip the index suffix)
    const originalId = planting.id.includes("-")
      ? planting.id.split("-").slice(0, -1).join("-")
      : planting.id;
    const original = plantings.find((p) => p.id === originalId || p.id === planting.id);
    if (original) {
      setSelectedPlanting(original);
    }
  };

  const handleStatusChange = (status: PlantStatus) => {
    if (selectedPlanting) {
      updatePlanting(selectedPlanting.id, {
        status,
        harvestedAt: status === "harvested" ? new Date() : null,
      });
      setSelectedPlanting({ ...selectedPlanting, status });
    }
  };

  const selectedPlant = selectedPlanting
    ? getPlantById(selectedPlanting.plantId)
    : null;

  if (!currentSpace) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">Aucun espace sélectionné</p>
        <Link href="/garden">
          <Button className="mt-4">Retour à l'éditeur</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Link href="/garden">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            {environmentIcons[currentSpace.environment]}
            <span className="font-medium">{currentSpace.name}</span>
            <Badge variant="outline" className="text-xs">
              {currentSpace.width}m × {currentSpace.height}m
            </Badge>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowLegend(!showLegend)}
        >
          <Grid3X3 className="h-4 w-4 mr-1" />
          Légende
        </Button>
      </div>

      {/* 3D View */}
      <div className="flex-1 relative">
        <Garden3D
          plantings={garden3DPlantings}
          width={currentSpace.width}
          height={currentSpace.height}
          onPlantClick={handlePlantClick}
        />

        {showLegend && <GardenLegend />}

        {spacePlantings.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-6 text-center max-w-xs mx-4 pointer-events-auto">
              <span className="text-4xl">🌱</span>
              <h3 className="font-semibold mt-2">Espace vide</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Ajoutez des plantations dans l'éditeur 2D
              </p>
              <Link href="/garden">
                <Button className="mt-4">Ouvrir l'éditeur</Button>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Controls hint */}
      <div className="p-2 text-center text-xs text-muted-foreground border-t bg-muted/30">
        <Info className="h-3 w-3 inline mr-1" />
        Glissez pour tourner • Pincez pour zoomer • Cliquez sur une plante pour la modifier
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
              {/* Status selector */}
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Statut
                </label>
                <Select
                  value={selectedPlanting.status}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getStatusColor(opt.value) }}
                          />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

              {/* Mode info */}
              {selectedPlanting.mode === "row" && selectedPlanting.rowConfig && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Rangée: </span>
                  <span>{selectedPlanting.rowConfig.plantCount} plants</span>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block">Planté le</span>
                  <span className="font-medium">
                    {formatDate(
                      selectedPlanting.plantedAt instanceof Date
                        ? selectedPlanting.plantedAt
                        : new Date(selectedPlanting.plantedAt as any)
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
                        : new Date(selectedPlanting.expectedHarvestAt as any)
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
                    Maladie détectée: {selectedPlanting.disease.name}
                  </span>
                </div>
              )}

              {/* Quick actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleStatusChange("harvested")}
                  disabled={selectedPlanting.status === "harvested"}
                >
                  Marquer récolté
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    updatePlanting(selectedPlanting.id, {
                      disease: {
                        hasDisease: true,
                        name: "À identifier",
                        detectedAt: new Date(),
                      },
                    });
                    setSelectedPlanting({
                      ...selectedPlanting,
                      disease: {
                        hasDisease: true,
                        name: "À identifier",
                        detectedAt: new Date(),
                      },
                    });
                  }}
                >
                  Signaler maladie
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Garden3DPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground mt-2">Chargement...</p>
        </div>
      }
    >
      <Garden3DPageContent />
    </Suspense>
  );
}
