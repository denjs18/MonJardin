"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStatusColor, getStatusLabel } from "@/lib/growthEngine";
import { PlantStatus } from "@/lib/types";

const statuses: PlantStatus[] = [
  "seedling",
  "growing",
  "flowering",
  "ready",
  "harvested",
  "dead",
];

export function GardenLegend() {
  return (
    <Card className="absolute bottom-4 left-4 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur">
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-sm">Légende</CardTitle>
      </CardHeader>
      <CardContent className="py-2 px-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {statuses.map((status) => (
            <div key={status} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getStatusColor(status) }}
              />
              <span className="text-xs">{getStatusLabel(status)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
