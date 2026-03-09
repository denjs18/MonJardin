"use client";

import { useState, useMemo } from "react";
import { Search, Star, StarOff, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useGardenStore, useCatalogStore, useEditorStore } from "@/lib/store";
import { Plant, PlantReserveItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { generateId } from "@/lib/utils";

interface PlantItemProps {
  plant: Plant;
  isSelected: boolean;
  isInReserve: boolean;
  onSelect: () => void;
  onToggleReserve: () => void;
}

function PlantItem({
  plant,
  isSelected,
  isInReserve,
  onSelect,
  onToggleReserve,
}: PlantItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
        isSelected
          ? "bg-primary text-primary-foreground"
          : "hover:bg-accent"
      )}
      onClick={onSelect}
    >
      <span className="text-xl">{plant.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{plant.name}</p>
        <p
          className={cn(
            "text-xs truncate",
            isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {plant.spacing.plant}cm entre plants
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7 shrink-0",
          isSelected && "hover:bg-primary-foreground/20"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onToggleReserve();
        }}
      >
        {isInReserve ? (
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        ) : (
          <StarOff className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

export function PlantPalette() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isReserveOpen, setIsReserveOpen] = useState(true);
  const [isCatalogOpen, setIsCatalogOpen] = useState(true);

  const { plants, searchPlants, getPlantById } = useCatalogStore();
  const { reserve, addToReserve, removeFromReserve, isInReserve } = useGardenStore();
  const { selectedPlantId, setSelectedPlant, tool } = useEditorStore();

  // Filter plants by search
  const filteredPlants = useMemo(() => {
    if (!searchQuery) return plants;
    return searchPlants(searchQuery);
  }, [plants, searchQuery, searchPlants]);

  // Group plants by type
  const plantsByType = useMemo(() => {
    const groups: Record<string, Plant[]> = {
      legume: [],
      fruit: [],
      herbe: [],
      fleur: [],
    };

    filteredPlants.forEach((plant) => {
      if (groups[plant.type]) {
        groups[plant.type].push(plant);
      }
    });

    return groups;
  }, [filteredPlants]);

  const handleToggleReserve = (plant: Plant) => {
    if (isInReserve(plant.id)) {
      removeFromReserve(plant.id);
    } else {
      const item: PlantReserveItem = {
        id: generateId(),
        plantId: plant.id,
        addedAt: new Date(),
      };
      addToReserve(item);
    }
  };

  const reservePlants = reserve
    .map((item) => getPlantById(item.plantId))
    .filter((p): p is Plant => p !== undefined);

  const isPlantingTool = tool === "plant-single" || tool === "plant-row";

  return (
    <div className="flex flex-col h-full bg-background border rounded-lg">
      {/* Header */}
      <div className="p-3 border-b">
        <h3 className="font-semibold mb-2">Plantes</h3>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8"
          />
        </div>
        {!isPlantingTool && (
          <p className="text-xs text-muted-foreground mt-2">
            Sélectionnez l'outil "Planter" pour placer des plants
          </p>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {/* Reserve section */}
          <Collapsible open={isReserveOpen} onOpenChange={setIsReserveOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between h-8 px-2"
              >
                <span className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-400" />
                  <span className="font-medium">Ma réserve</span>
                  <Badge variant="secondary" className="h-5 px-1.5">
                    {reserve.length}
                  </Badge>
                </span>
                {isReserveOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1">
              {reservePlants.length > 0 ? (
                <div className="space-y-1">
                  {reservePlants.map((plant) => (
                    <PlantItem
                      key={plant.id}
                      plant={plant}
                      isSelected={selectedPlantId === plant.id}
                      isInReserve={true}
                      onSelect={() => setSelectedPlant(plant.id)}
                      onToggleReserve={() => handleToggleReserve(plant)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground p-2 text-center">
                  Ajoutez des plantes avec l'étoile
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Catalog section */}
          <Collapsible open={isCatalogOpen} onOpenChange={setIsCatalogOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between h-8 px-2"
              >
                <span className="flex items-center gap-2">
                  <span className="font-medium">Catalogue</span>
                  <Badge variant="secondary" className="h-5 px-1.5">
                    {filteredPlants.length}
                  </Badge>
                </span>
                {isCatalogOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 space-y-3">
              {/* Légumes */}
              {plantsByType.legume.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground px-2 mb-1">
                    Légumes ({plantsByType.legume.length})
                  </p>
                  <div className="space-y-1">
                    {plantsByType.legume.map((plant) => (
                      <PlantItem
                        key={plant.id}
                        plant={plant}
                        isSelected={selectedPlantId === plant.id}
                        isInReserve={isInReserve(plant.id)}
                        onSelect={() => setSelectedPlant(plant.id)}
                        onToggleReserve={() => handleToggleReserve(plant)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Fruits */}
              {plantsByType.fruit.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground px-2 mb-1">
                    Fruits ({plantsByType.fruit.length})
                  </p>
                  <div className="space-y-1">
                    {plantsByType.fruit.map((plant) => (
                      <PlantItem
                        key={plant.id}
                        plant={plant}
                        isSelected={selectedPlantId === plant.id}
                        isInReserve={isInReserve(plant.id)}
                        onSelect={() => setSelectedPlant(plant.id)}
                        onToggleReserve={() => handleToggleReserve(plant)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Herbes */}
              {plantsByType.herbe.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground px-2 mb-1">
                    Herbes ({plantsByType.herbe.length})
                  </p>
                  <div className="space-y-1">
                    {plantsByType.herbe.map((plant) => (
                      <PlantItem
                        key={plant.id}
                        plant={plant}
                        isSelected={selectedPlantId === plant.id}
                        isInReserve={isInReserve(plant.id)}
                        onSelect={() => setSelectedPlant(plant.id)}
                        onToggleReserve={() => handleToggleReserve(plant)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Fleurs */}
              {plantsByType.fleur.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground px-2 mb-1">
                    Fleurs ({plantsByType.fleur.length})
                  </p>
                  <div className="space-y-1">
                    {plantsByType.fleur.map((plant) => (
                      <PlantItem
                        key={plant.id}
                        plant={plant}
                        isSelected={selectedPlantId === plant.id}
                        isInReserve={isInReserve(plant.id)}
                        onSelect={() => setSelectedPlant(plant.id)}
                        onToggleReserve={() => handleToggleReserve(plant)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>

      {/* Selected plant info */}
      {selectedPlantId && (
        <div className="p-3 border-t bg-muted/50">
          {(() => {
            const plant = getPlantById(selectedPlantId);
            if (!plant) return null;
            return (
              <div className="flex items-center gap-2">
                <span className="text-2xl">{plant.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{plant.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Espacement: {plant.spacing.plant}cm
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
