"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowLeft, Check, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGardenStore, useCatalogStore, useUIStore } from "@/lib/store";
import { Plant, PlantType, Planting } from "@/lib/types";
import {
  getAllPlants,
  getPlantTypeLabel,
  getExposureLabel,
  getExposureIcon,
  getWaterNeedsIcon,
} from "@/lib/plantCatalog";
import { calculateHarvestDate, isGoodTimeToSow, isGoodTimeToPlant } from "@/lib/growthEngine";
import { generateId } from "@/lib/utils";
import { getCompanions } from "@/lib/companion";
import { cn } from "@/lib/utils";

type Step = "select" | "details" | "position";

export default function AddPlantPage() {
  const router = useRouter();
  const { plants } = useCatalogStore();
  const { addPlanting, gardens, currentGardenId, plots } = useGardenStore();
  const { addToast } = useUIStore();

  const [step, setStep] = useState<Step>("select");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<PlantType | "all">("all");
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);

  // Form state
  const [variety, setVariety] = useState("");
  const [plantedAt, setPlantedAt] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [seedlingStarted, setSeedlingStarted] = useState(false);
  const [seedlingDate, setSeedlingDate] = useState("");
  const [selectedPlotId, setSelectedPlotId] = useState<string>("");
  const [position, setPosition] = useState({ x: 1, y: 1 });

  // Filter plants
  const filteredPlants = useMemo(() => {
    return plants.filter((p) => {
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(query) ||
          p.family.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [plants, typeFilter, searchQuery]);

  // Get current month for recommendations
  const currentMonth = new Date().getMonth() + 1;

  const handleSelectPlant = (plant: Plant) => {
    setSelectedPlant(plant);
    setStep("details");
  };

  const handleSubmit = () => {
    if (!selectedPlant) return;

    const plantedDate = new Date(plantedAt);
    const expectedHarvest = calculateHarvestDate(
      plantedDate,
      selectedPlant.daysToMaturity
    );

    const newPlanting: Planting = {
      id: generateId(),
      gardenId: currentGardenId || "default",
      plotId: selectedPlotId || "default",
      plantId: selectedPlant.id,
      plantName: selectedPlant.name,
      variety: variety || "",
      position: position,
      plantedAt: plantedDate,
      seedlingStartedAt: seedlingStarted ? new Date(seedlingDate) : null,
      expectedHarvestAt: expectedHarvest,
      status: "seedling",
      harvestedAt: null,
      events: [],
      disease: null,
      growthStage: 0,
    };

    addPlanting(newPlanting);
    addToast({
      type: "success",
      message: `${selectedPlant.name} ajouté(e) avec succès !`,
    });
    router.push("/plants");
  };

  // Companion info for selected plant
  const companionInfo = selectedPlant
    ? getCompanions(selectedPlant.id)
    : { excellent: [], good: [], enemies: [] };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (step === "details") setStep("select");
            else if (step === "position") setStep("details");
            else router.back();
          }}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">
          {step === "select"
            ? "Choisir une plante"
            : step === "details"
            ? "Détails de plantation"
            : "Position"}
        </h1>
      </div>

      {/* Step 1: Select Plant */}
      {step === "select" && (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une plante..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Type filter */}
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-2">
            {(["all", "legume", "herbe", "fleur"] as const).map((type) => (
              <Button
                key={type}
                variant={typeFilter === type ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter(type)}
              >
                {type === "all"
                  ? "Tout"
                  : type === "legume"
                  ? "🥬 Légumes"
                  : type === "herbe"
                  ? "🌿 Herbes"
                  : "🌸 Fleurs"}
              </Button>
            ))}
          </div>

          {/* Plant list */}
          <div className="space-y-2">
            {filteredPlants.map((plant) => {
              const canSow = isGoodTimeToSow(plant, currentMonth);
              const canPlant = isGoodTimeToPlant(plant, currentMonth);

              return (
                <Card
                  key={plant.id}
                  className={cn(
                    "cursor-pointer hover:shadow-md transition-shadow",
                    (canSow || canPlant) && "border-green-500/50"
                  )}
                  onClick={() => handleSelectPlant(plant)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{plant.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{plant.name}</h3>
                          {(canSow || canPlant) && (
                            <Badge variant="success" className="text-xs">
                              {canSow ? "Semis" : "Plantation"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {plant.family} •{" "}
                          {getExposureIcon(plant.exposure)}{" "}
                          {getWaterNeedsIcon(plant.waterNeeds)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Step 2: Details */}
      {step === "details" && selectedPlant && (
        <div className="space-y-4">
          {/* Selected plant info */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{selectedPlant.emoji}</span>
                <div>
                  <h2 className="font-semibold text-lg">{selectedPlant.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedPlant.family}
                  </p>
                </div>
              </div>
              <p className="text-sm mt-3">{selectedPlant.description}</p>
            </CardContent>
          </Card>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="variety">Variété (optionnel)</Label>
              <Input
                id="variety"
                placeholder="ex: Coeur de Boeuf"
                value={variety}
                onChange={(e) => setVariety(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="plantedAt">Date de plantation</Label>
              <Input
                id="plantedAt"
                type="date"
                value={plantedAt}
                onChange={(e) => setPlantedAt(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="seedling"
                checked={seedlingStarted}
                onChange={(e) => setSeedlingStarted(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="seedling" className="font-normal">
                Semis en intérieur avant
              </Label>
            </div>

            {seedlingStarted && (
              <div>
                <Label htmlFor="seedlingDate">Date de semis</Label>
                <Input
                  id="seedlingDate"
                  type="date"
                  value={seedlingDate}
                  onChange={(e) => setSeedlingDate(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Plant info */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <Info className="h-4 w-4" />
                Informations
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Exposition</span>
                  <p className="font-medium">
                    {getExposureIcon(selectedPlant.exposure)}{" "}
                    {getExposureLabel(selectedPlant.exposure)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Arrosage</span>
                  <p className="font-medium">
                    {getWaterNeedsIcon(selectedPlant.waterNeeds)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Espacement</span>
                  <p className="font-medium">
                    {selectedPlant.spacing.row}×{selectedPlant.spacing.plant} cm
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Maturité</span>
                  <p className="font-medium">
                    {selectedPlant.daysToMaturity} jours
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Companions */}
          {(companionInfo.excellent.length > 0 ||
            companionInfo.enemies.length > 0) && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-medium">Associations</h3>
                {companionInfo.excellent.length > 0 && (
                  <div>
                    <span className="text-xs text-green-600">✅ Excellentes</span>
                    <p className="text-sm">
                      {companionInfo.excellent.join(", ")}
                    </p>
                  </div>
                )}
                {companionInfo.good.length > 0 && (
                  <div>
                    <span className="text-xs text-lime-600">👍 Bonnes</span>
                    <p className="text-sm">{companionInfo.good.join(", ")}</p>
                  </div>
                )}
                {companionInfo.enemies.length > 0 && (
                  <div>
                    <span className="text-xs text-red-600">⚠️ À éviter</span>
                    <p className="text-sm">{companionInfo.enemies.join(", ")}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tips */}
          {selectedPlant.tips.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <h3 className="font-medium">💡 Conseils</h3>
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

          {/* Submit */}
          <Button className="w-full" size="lg" onClick={handleSubmit}>
            <Check className="h-4 w-4 mr-2" />
            Ajouter {selectedPlant.name}
          </Button>
        </div>
      )}
    </div>
  );
}
