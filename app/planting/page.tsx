"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar, Moon, Sprout, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCatalogStore, useGardenStore } from "@/lib/store";
import {
  getLunarCalendarDay,
  getLunarPhaseEmoji,
  isGoodTimeToSow,
  isGoodTimeToPlant,
} from "@/lib/growthEngine";
import { cn } from "@/lib/utils";

export default function PlantingPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { plants } = useCatalogStore();
  const { plantings } = useGardenStore();

  const currentMonth = currentDate.getMonth() + 1;

  // Get calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Get plants for current month
  const sowablePlants = plants.filter((p) =>
    isGoodTimeToSow(p, currentMonth)
  );
  const plantablePlants = plants.filter((p) =>
    isGoodTimeToPlant(p, currentMonth)
  );

  // Get lunar info for selected date
  const selectedLunar = selectedDate
    ? getLunarCalendarDay(selectedDate)
    : null;

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate(
      direction === "prev"
        ? subMonths(currentDate, 1)
        : addMonths(currentDate, 1)
    );
    setSelectedDate(null);
  };

  return (
    <div className="p-4 space-y-4">
      <Tabs defaultValue="calendar">
        <TabsList className="w-full">
          <TabsTrigger value="calendar" className="flex-1">
            <Calendar className="h-4 w-4 mr-1" />
            Calendrier
          </TabsTrigger>
          <TabsTrigger value="lunar" className="flex-1">
            <Moon className="h-4 w-4 mr-1" />
            Lune
          </TabsTrigger>
          <TabsTrigger value="season" className="flex-1">
            <Sprout className="h-4 w-4 mr-1" />
            Saison
          </TabsTrigger>
        </TabsList>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateMonth("prev")}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-semibold capitalize">
              {format(currentDate, "MMMM yyyy", { locale: fr })}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateMonth("next")}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Calendar Grid */}
          <Card>
            <CardContent className="p-2">
              {/* Days header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["L", "M", "M", "J", "V", "S", "D"].map((day, i) => (
                  <div
                    key={i}
                    className="text-center text-xs font-medium text-muted-foreground py-1"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar cells */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for first week offset */}
                {Array.from({
                  length: (calendarDays[0].getDay() + 6) % 7,
                }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-10" />
                ))}

                {calendarDays.map((day) => {
                  const lunar = getLunarCalendarDay(day);
                  const hasPlanting = plantings.some((p) => {
                    const plantedAt =
                      p.plantedAt instanceof Date
                        ? p.plantedAt
                        : new Date(p.plantedAt as unknown as string);
                    return (
                      plantedAt.toDateString() === day.toDateString()
                    );
                  });

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "h-10 rounded-lg text-sm flex flex-col items-center justify-center relative transition-colors",
                        isToday(day)
                          ? "bg-primary text-primary-foreground"
                          : selectedDate?.toDateString() === day.toDateString()
                          ? "bg-primary/20"
                          : "hover:bg-muted",
                        lunar.isGoodForPlanting && !isToday(day)
                          ? "bg-green-50 dark:bg-green-950/30"
                          : ""
                      )}
                    >
                      <span>{day.getDate()}</span>
                      <span className="text-[10px] opacity-70">
                        {getLunarPhaseEmoji(lunar.phase)}
                      </span>
                      {hasPlanting && (
                        <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-green-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Selected Day Info */}
          {selectedDate && selectedLunar && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {format(selectedDate, "EEEE d MMMM", { locale: fr })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {getLunarPhaseEmoji(selectedLunar.phase)}
                  </span>
                  <div>
                    <p className="font-medium">{selectedLunar.recommendation}</p>
                    <Badge
                      variant={
                        selectedLunar.isGoodForPlanting ? "success" : "secondary"
                      }
                    >
                      {selectedLunar.isGoodForPlanting
                        ? "Bon pour planter"
                        : "Repos conseillé"}
                    </Badge>
                  </div>
                </div>

                <Link href="/plants/add">
                  <Button variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Planifier une plantation
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Lunar Tab */}
        <TabsContent value="lunar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Moon className="h-5 w-5" />
                Calendrier lunaire
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Le calendrier lunaire guide les jardiniers selon les phases de
                la lune et les jours associés aux différentes parties des
                plantes.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900">
                  <CardContent className="p-3 text-center">
                    <span className="text-2xl">🍅</span>
                    <p className="text-sm font-medium mt-1">Jours Fruits</p>
                    <p className="text-xs text-muted-foreground">
                      Tomates, courgettes, haricots
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900">
                  <CardContent className="p-3 text-center">
                    <span className="text-2xl">🥕</span>
                    <p className="text-sm font-medium mt-1">Jours Racines</p>
                    <p className="text-xs text-muted-foreground">
                      Carottes, radis, pommes de terre
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
                  <CardContent className="p-3 text-center">
                    <span className="text-2xl">🥬</span>
                    <p className="text-sm font-medium mt-1">Jours Feuilles</p>
                    <p className="text-xs text-muted-foreground">
                      Laitues, épinards, choux
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-900">
                  <CardContent className="p-3 text-center">
                    <span className="text-2xl">🌸</span>
                    <p className="text-sm font-medium mt-1">Jours Fleurs</p>
                    <p className="text-xs text-muted-foreground">
                      Capucines, soucis, lavande
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2 text-sm">
                <p>
                  <strong>🌒 Lune montante:</strong> Semer les plantes qui
                  poussent en hauteur
                </p>
                <p>
                  <strong>🌘 Lune descendante:</strong> Planter, repiquer,
                  tailler
                </p>
                <p>
                  <strong>🌑🌕 Nouvelle/Pleine lune:</strong> Éviter les
                  travaux au jardin
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Season Tab */}
        <TabsContent value="season" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                🌱 À semer ce mois-ci
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sowablePlants.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {sowablePlants.map((plant) => (
                    <Link key={plant.id} href={`/plants/add?plant=${plant.id}`}>
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10"
                      >
                        {plant.emoji} {plant.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Pas de semis recommandé ce mois-ci
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                🪴 À planter ce mois-ci
              </CardTitle>
            </CardHeader>
            <CardContent>
              {plantablePlants.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {plantablePlants.map((plant) => (
                    <Link key={plant.id} href={`/plants/add?plant=${plant.id}`}>
                      <Badge
                        variant="secondary"
                        className="cursor-pointer hover:bg-secondary/80"
                      >
                        {plant.emoji} {plant.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Pas de plantation recommandée ce mois-ci
                </p>
              )}
            </CardContent>
          </Card>

          {/* Monthly tips */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">💡 Conseils du mois</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {currentMonth >= 3 && currentMonth <= 5 && (
                  <>
                    <li>• Préparez vos semis sous abri</li>
                    <li>• Enrichissez le sol avec du compost</li>
                    <li>• Attention aux gelées tardives</li>
                  </>
                )}
                {currentMonth >= 6 && currentMonth <= 8 && (
                  <>
                    <li>• Arrosez tôt le matin ou tard le soir</li>
                    <li>• Paillez pour garder l'humidité</li>
                    <li>• Récoltez régulièrement pour stimuler la production</li>
                  </>
                )}
                {currentMonth >= 9 && currentMonth <= 11 && (
                  <>
                    <li>• Semez les engrais verts</li>
                    <li>• Récoltez les derniers légumes d'été</li>
                    <li>• Préparez le jardin pour l'hiver</li>
                  </>
                )}
                {(currentMonth === 12 || currentMonth <= 2) && (
                  <>
                    <li>• Planifiez votre jardin pour l'année prochaine</li>
                    <li>• Commandez vos graines</li>
                    <li>• Entretenez vos outils</li>
                  </>
                )}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
