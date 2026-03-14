"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Sprout,
  Sun,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trash2,
  Leaf,
} from "lucide-react";
import { Planting, Plant, GardenRow } from "@/lib/types";
import {
  getGrowthTrackingInfo,
  GrowthTrackingInfo,
  getStatusColor,
} from "@/lib/growthEngine";
import { formatShortDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface PlantGrowthPanelProps {
  planting: Planting;
  plant: Plant;
  isRow?: boolean;
  rowPlantings?: Planting[];
  onClose?: () => void;
  onDelete?: () => void;
  onMarkHarvested?: () => void;
}

export function PlantGrowthPanel({
  planting,
  plant,
  isRow = false,
  rowPlantings = [],
  onClose,
  onDelete,
  onMarkHarvested,
}: PlantGrowthPanelProps) {
  // Get growth tracking info
  const trackingInfo = useMemo(
    () => getGrowthTrackingInfo(planting, plant),
    [planting, plant]
  );

  // For rows, calculate average growth
  const avgGrowth = isRow && rowPlantings.length > 0
    ? Math.round(rowPlantings.reduce((sum, p) => sum + p.growthStage, 0) / rowPlantings.length)
    : trackingInfo.growthPercentage;

  const timingColors = {
    ideal: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    early: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    late: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    "off-season": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };

  const timingIcons = {
    ideal: <Sun className="h-4 w-4" />,
    early: <Clock className="h-4 w-4" />,
    late: <Clock className="h-4 w-4" />,
    "off-season": <AlertTriangle className="h-4 w-4" />,
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">{trackingInfo.emoji}</span>
            <div>
              <span className="text-lg">{trackingInfo.plantName}</span>
              {isRow && (
                <Badge variant="outline" className="ml-2 text-xs">
                  Rangée de {rowPlantings.length}
                </Badge>
              )}
            </div>
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              &times;
            </Button>
          )}
        </div>
        {trackingInfo.variety && (
          <p className="text-sm text-muted-foreground">{trackingInfo.variety}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Timing Badge */}
        <div className={cn(
          "flex items-center gap-2 p-3 rounded-lg",
          timingColors[trackingInfo.timing.timing]
        )}>
          {timingIcons[trackingInfo.timing.timing]}
          <div>
            <p className="font-medium text-sm">{trackingInfo.timing.label}</p>
            <p className="text-xs opacity-80">{trackingInfo.timing.description}</p>
          </div>
        </div>

        {/* Disease Alert */}
        {trackingInfo.hasDisease && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <p className="font-medium text-sm">Maladie détectée</p>
              <p className="text-xs">{trackingInfo.diseaseName}</p>
            </div>
          </div>
        )}

        {/* Growth Stage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{trackingInfo.stageInfo.icon}</span>
              <span className="font-medium">{trackingInfo.stageInfo.title}</span>
            </div>
            <Badge
              style={{
                backgroundColor: getStatusColor(trackingInfo.stageInfo.stage),
                color: "white",
              }}
            >
              {avgGrowth}%
            </Badge>
          </div>

          <Progress value={avgGrowth} className="h-3" />

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{trackingInfo.daysSincePlanted} jours depuis plantation</span>
            {!trackingInfo.isHarvested && trackingInfo.daysUntilHarvest > 0 && (
              <span>{trackingInfo.daysUntilHarvest} jours restants</span>
            )}
          </div>
        </div>

        {/* Physical Description */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Leaf className="h-4 w-4 text-green-600" />
            <span className="font-medium text-sm">État physique actuel</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {trackingInfo.stageInfo.physicalDescription}
          </p>
        </div>

        {/* Tips */}
        {trackingInfo.stageInfo.tips.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium flex items-center gap-1">
              <Sprout className="h-4 w-4" /> Conseils
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {trackingInfo.stageInfo.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {trackingInfo.sowedAt && (
            <div className="p-2 bg-muted/30 rounded">
              <p className="text-xs text-muted-foreground">Semé le</p>
              <p className="font-medium">{formatShortDate(trackingInfo.sowedAt)}</p>
            </div>
          )}
          <div className="p-2 bg-muted/30 rounded">
            <p className="text-xs text-muted-foreground">Planté le</p>
            <p className="font-medium">{formatShortDate(trackingInfo.plantedAt)}</p>
          </div>
          <div className="p-2 bg-muted/30 rounded">
            <p className="text-xs text-muted-foreground">Récolte prévue</p>
            <p className="font-medium">{formatShortDate(trackingInfo.expectedHarvestAt)}</p>
          </div>
          {trackingInfo.harvestedAt && (
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded">
              <p className="text-xs text-muted-foreground">Récolté le</p>
              <p className="font-medium text-green-700 dark:text-green-300">
                {formatShortDate(trackingInfo.harvestedAt)}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        {!trackingInfo.isHarvested && (
          <div className="flex gap-2 pt-2">
            {trackingInfo.growthPercentage >= 80 && onMarkHarvested && (
              <Button
                variant="default"
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={onMarkHarvested}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Marquer récolté
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
