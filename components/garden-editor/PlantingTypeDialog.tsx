"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sprout, TreeDeciduous, Ruler, Calendar } from "lucide-react";
import { Plant } from "@/lib/types";

export type PlantingTypeResult = {
  plantingType: "seed" | "seedling";
  seedlingHeight?: number; // cm
  seedlingStartedAt?: Date;
};

interface PlantingTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plant: Plant;
  onConfirm: (result: PlantingTypeResult) => void;
}

export function PlantingTypeDialog({
  open,
  onOpenChange,
  plant,
  onConfirm,
}: PlantingTypeDialogProps) {
  const [plantingType, setPlantingType] = useState<"seed" | "seedling">("seed");
  const [estimationMethod, setEstimationMethod] = useState<"height" | "date">("height");
  const [seedlingHeight, setSeedlingHeight] = useState("");
  const [sowDate, setSowDate] = useState("");

  const handleConfirm = () => {
    if (plantingType === "seed") {
      onConfirm({ plantingType: "seed" });
    } else {
      if (estimationMethod === "height") {
        const height = parseFloat(seedlingHeight);
        if (isNaN(height) || height <= 0) {
          return; // Invalid height
        }
        onConfirm({
          plantingType: "seedling",
          seedlingHeight: height,
        });
      } else {
        if (!sowDate) {
          return; // No date selected
        }
        onConfirm({
          plantingType: "seedling",
          seedlingStartedAt: new Date(sowDate),
        });
      }
    }
  };

  const resetForm = () => {
    setPlantingType("seed");
    setEstimationMethod("height");
    setSeedlingHeight("");
    setSowDate("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  // Calculate estimated age from height (rough estimation)
  const getEstimatedAge = () => {
    const height = parseFloat(seedlingHeight);
    if (isNaN(height) || height <= 0 || !plant.daysToTransplant) return null;

    // Simple linear estimation: assume max height at transplant is roughly 15-20cm
    const typicalTransplantHeight = 15; // cm
    const estimatedDays = Math.round((height / typicalTransplantHeight) * plant.daysToTransplant);
    return Math.min(estimatedDays, plant.daysToTransplant);
  };

  const estimatedAge = getEstimatedAge();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{plant.emoji}</span>
            Planter {plant.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Planting type selection */}
          <div className="space-y-3">
            <Label>Comment plantez-vous ?</Label>
            <RadioGroup
              value={plantingType}
              onValueChange={(v: string) => setPlantingType(v as "seed" | "seedling")}
              className="grid grid-cols-2 gap-3"
            >
              <div>
                <RadioGroupItem value="seed" id="seed" className="peer sr-only" />
                <Label
                  htmlFor="seed"
                  className="flex flex-col items-center gap-2 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                >
                  <Sprout className="h-8 w-8" />
                  <span className="font-medium">Semis direct</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Vous semez les graines
                  </span>
                </Label>
              </div>

              <div>
                <RadioGroupItem value="seedling" id="seedling" className="peer sr-only" />
                <Label
                  htmlFor="seedling"
                  className="flex flex-col items-center gap-2 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                >
                  <TreeDeciduous className="h-8 w-8" />
                  <span className="font-medium">Plant/repiquage</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Vous plantez un plant
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Seedling info (only if seedling selected) */}
          {plantingType === "seedling" && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <Label className="text-sm text-muted-foreground">
                Pour estimer l'age du plant, indiquez :
              </Label>

              <RadioGroup
                value={estimationMethod}
                onValueChange={(v: string) => setEstimationMethod(v as "height" | "date")}
                className="space-y-3"
              >
                {/* Height estimation */}
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="height" id="height-method" className="mt-1" />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="height-method" className="flex items-center gap-2 cursor-pointer">
                      <Ruler className="h-4 w-4" />
                      Sa taille approximative
                    </Label>
                    {estimationMethod === "height" && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="10"
                          value={seedlingHeight}
                          onChange={(e) => setSeedlingHeight(e.target.value)}
                          className="w-20"
                          min={1}
                          max={100}
                        />
                        <span className="text-sm text-muted-foreground">cm</span>
                        {estimatedAge && (
                          <span className="text-sm text-muted-foreground ml-2">
                            (~{estimatedAge} jours)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Date estimation */}
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="date" id="date-method" className="mt-1" />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="date-method" className="flex items-center gap-2 cursor-pointer">
                      <Calendar className="h-4 w-4" />
                      La date de semis (si connue)
                    </Label>
                    {estimationMethod === "date" && (
                      <Input
                        type="date"
                        value={sowDate}
                        onChange={(e) => setSowDate(e.target.value)}
                        max={new Date().toISOString().split("T")[0]}
                      />
                    )}
                  </div>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Info about expected maturity */}
          <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            {plantingType === "seed" ? (
              <>
                Maturation estimee dans <strong>{plant.daysToMaturity} jours</strong>
              </>
            ) : (
              <>
                {estimationMethod === "height" && estimatedAge ? (
                  <>
                    Le plant a environ <strong>{estimatedAge} jours</strong>.
                    Maturation estimee dans <strong>{Math.max(0, plant.daysToMaturity - estimatedAge)} jours</strong>
                  </>
                ) : estimationMethod === "date" && sowDate ? (
                  <>
                    {(() => {
                      const sowDateObj = new Date(sowDate);
                      const daysSinceSow = Math.floor((Date.now() - sowDateObj.getTime()) / (24 * 60 * 60 * 1000));
                      const daysUntilHarvest = Math.max(0, plant.daysToMaturity - daysSinceSow);
                      return (
                        <>
                          Seme il y a <strong>{daysSinceSow} jours</strong>.
                          Maturation estimee dans <strong>{daysUntilHarvest} jours</strong>
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <>
                    Renseignez la taille ou la date de semis pour estimer la maturation
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleConfirm}>
            Planter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
