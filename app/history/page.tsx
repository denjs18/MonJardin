"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, BarChart3, TrendingUp, Leaf } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGardenStore, useCatalogStore } from "@/lib/store";
import { getStatusLabel } from "@/lib/growthEngine";
import { formatDate, formatShortDate } from "@/lib/utils";

export default function HistoryPage() {
  const { plantings } = useGardenStore();
  const { getPlantById } = useCatalogStore();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Get available years from plantings
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(currentYear);
    plantings.forEach((p) => {
      const plantedAt =
        p.plantedAt instanceof Date
          ? p.plantedAt
          : new Date(p.plantedAt as unknown as string);
      years.add(plantedAt.getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [plantings, currentYear]);

  // Filter plantings by year
  const yearPlantings = useMemo(() => {
    return plantings.filter((p) => {
      const plantedAt =
        p.plantedAt instanceof Date
          ? p.plantedAt
          : new Date(p.plantedAt as unknown as string);
      return plantedAt.getFullYear() === selectedYear;
    });
  }, [plantings, selectedYear]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = yearPlantings.length;
    const harvested = yearPlantings.filter(
      (p) => p.status === "harvested"
    ).length;
    const dead = yearPlantings.filter((p) => p.status === "dead").length;
    const active = yearPlantings.filter(
      (p) => !["harvested", "dead"].includes(p.status)
    ).length;
    const successRate = total > 0 ? Math.round((harvested / total) * 100) : 0;

    // Count by plant type
    const byPlant: Record<string, { total: number; harvested: number }> = {};
    yearPlantings.forEach((p) => {
      if (!byPlant[p.plantName]) {
        byPlant[p.plantName] = { total: 0, harvested: 0 };
      }
      byPlant[p.plantName].total++;
      if (p.status === "harvested") {
        byPlant[p.plantName].harvested++;
      }
    });

    return { total, harvested, dead, active, successRate, byPlant };
  }, [yearPlantings]);

  // Group plantings by month
  const byMonth = useMemo(() => {
    const months: Record<number, typeof yearPlantings> = {};
    yearPlantings.forEach((p) => {
      const plantedAt =
        p.plantedAt instanceof Date
          ? p.plantedAt
          : new Date(p.plantedAt as unknown as string);
      const month = plantedAt.getMonth();
      if (!months[month]) months[month] = [];
      months[month].push(p);
    });
    return months;
  }, [yearPlantings]);

  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Historique</h1>
        </div>

        <Select
          value={selectedYear.toString()}
          onValueChange={(v) => setSelectedYear(parseInt(v))}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Plantations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">
              {stats.successRate}%
            </p>
            <p className="text-sm text-muted-foreground">Taux de réussite</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Résumé {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Récoltées</span>
            <span className="font-medium text-green-600">
              {stats.harvested}
            </span>
          </div>
          <Progress
            value={(stats.harvested / Math.max(stats.total, 1)) * 100}
            className="h-2"
          />

          <div className="flex justify-between text-sm">
            <span>En cours</span>
            <span className="font-medium text-blue-600">{stats.active}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span>Perdues</span>
            <span className="font-medium text-red-600">{stats.dead}</span>
          </div>
        </CardContent>
      </Card>

      {/* By Plant Stats */}
      {Object.keys(stats.byPlant).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Leaf className="h-5 w-5" />
              Par plante
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.byPlant)
                .sort((a, b) => b[1].total - a[1].total)
                .slice(0, 10)
                .map(([name, data]) => {
                  const rate =
                    data.total > 0
                      ? Math.round((data.harvested / data.total) * 100)
                      : 0;
                  return (
                    <div
                      key={name}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="text-sm">{name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {data.harvested}/{data.total}
                        </span>
                        <Badge
                          variant={
                            rate >= 80
                              ? "success"
                              : rate >= 50
                              ? "secondary"
                              : "destructive"
                          }
                          className="text-xs"
                        >
                          {rate}%
                        </Badge>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline by Month */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Chronologie</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(byMonth).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(byMonth)
                .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                .map(([monthIdx, monthPlantings]) => (
                  <div key={monthIdx}>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      {monthNames[parseInt(monthIdx)]}
                    </h4>
                    <div className="space-y-1 pl-3 border-l-2 border-primary/20">
                      {monthPlantings.map((planting) => {
                        const plant = getPlantById(planting.plantId);
                        return (
                          <div
                            key={planting.id}
                            className="flex items-center gap-2 py-1"
                          >
                            <span>{plant?.emoji || "🌱"}</span>
                            <span className="text-sm flex-1">
                              {planting.plantName}
                            </span>
                            <Badge
                              variant={
                                planting.status === "harvested"
                                  ? "success"
                                  : planting.status === "dead"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {getStatusLabel(planting.status)}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune plantation pour {selectedYear}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Empty State */}
      {yearPlantings.length === 0 && (
        <Card className="text-center py-8">
          <CardContent>
            <span className="text-4xl">📊</span>
            <h3 className="font-semibold mt-4">Pas de données</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Aucune plantation enregistrée pour {selectedYear}
            </p>
            <Link href="/plants/add">
              <Button className="mt-4">Ajouter une plante</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
