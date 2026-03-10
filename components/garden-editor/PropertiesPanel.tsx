"use client";

import { useState, useEffect } from "react";
import { Trash2, Calendar, Leaf, Ruler, Palette, Flower2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useGardenStore, useCatalogStore, useEditorStore } from "@/lib/store";
import { Plot, Planting, PlantStatus, SoilType, MulchType, GardenRow } from "@/lib/types";
import { generateId } from "@/lib/utils";
import { getStatusLabel, getStatusColor } from "@/lib/growthEngine";
import { formatShortDate } from "@/lib/utils";

const statusOptions: { value: PlantStatus; label: string }[] = [
  { value: "seedling", label: "Semis" },
  { value: "growing", label: "Croissance" },
  { value: "flowering", label: "Floraison" },
  { value: "ready", label: "Prêt à récolter" },
  { value: "harvested", label: "Récolté" },
  { value: "dead", label: "Mort" },
];

const soilOptions: { value: SoilType; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "enriched", label: "Enrichi" },
  { value: "compost", label: "Compost" },
];

const mulchOptions: { value: MulchType; label: string }[] = [
  { value: "none", label: "Aucun" },
  { value: "paille", label: "Paille" },
  { value: "bache", label: "Bâche" },
  { value: "ecorce", label: "Écorce" },
];

export function PropertiesPanel() {
  const { selectedPlotId, selectedPlantingId, selectedRowId } = useEditorStore();
  const { plots, plantings, rows, updatePlot, updatePlanting, deletePlot, deletePlanting } =
    useGardenStore();
  const { getPlantById } = useCatalogStore();

  const selectedPlot = plots.find((p) => p.id === selectedPlotId);
  const selectedPlanting = plantings.find((p) => p.id === selectedPlantingId);
  const selectedRow = rows.find((r) => r.id === selectedRowId);

  if (!selectedPlot && !selectedPlanting && !selectedRow) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p className="text-sm">Sélectionnez une parcelle, une rangée ou une plantation</p>
      </div>
    );
  }

  if (selectedRow) {
    return <RowProperties row={selectedRow} />;
  }

  if (selectedPlot) {
    return <PlotProperties plot={selectedPlot} />;
  }

  if (selectedPlanting) {
    return <PlantingProperties planting={selectedPlanting} />;
  }

  return null;
}

function PlotProperties({ plot }: { plot: Plot }) {
  const { updatePlot, deletePlot } = useGardenStore();
  const { setSelectedPlot } = useEditorStore();

  const [name, setName] = useState(plot.name);
  const [width, setWidth] = useState(plot.width.toString());
  const [height, setHeight] = useState(plot.height.toString());
  const [soil, setSoil] = useState<SoilType>(plot.soil.type);
  const [mulch, setMulch] = useState<MulchType>(plot.mulch);

  useEffect(() => {
    setName(plot.name);
    setWidth(plot.width.toString());
    setHeight(plot.height.toString());
    setSoil(plot.soil.type);
    setMulch(plot.mulch);
  }, [plot]);

  const handleSave = () => {
    updatePlot(plot.id, {
      name,
      width: parseFloat(width) || plot.width,
      height: parseFloat(height) || plot.height,
      soil: { ...plot.soil, type: soil },
      mulch,
    });
  };

  const handleDelete = () => {
    if (confirm("Supprimer cette parcelle et toutes ses plantations ?")) {
      deletePlot(plot.id);
      setSelectedPlot(null);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Parcelle</h3>
        <Button variant="destructive" size="icon" onClick={handleDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <Label>Nom</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleSave}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Largeur (m)</Label>
            <Input
              type="number"
              step="0.1"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              onBlur={handleSave}
            />
          </div>
          <div>
            <Label>Hauteur (m)</Label>
            <Input
              type="number"
              step="0.1"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              onBlur={handleSave}
            />
          </div>
        </div>

        <div>
          <Label>Type de sol</Label>
          <Select
            value={soil}
            onValueChange={(v: SoilType) => {
              setSoil(v);
              updatePlot(plot.id, { soil: { ...plot.soil, type: v } });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {soilOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Paillage</Label>
          <Select
            value={mulch}
            onValueChange={(v: MulchType) => {
              setMulch(v);
              updatePlot(plot.id, { mulch: v });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mulchOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="pt-2 text-xs text-muted-foreground">
          Position: {plot.x.toFixed(2)}m, {plot.y.toFixed(2)}m
        </div>
      </div>
    </div>
  );
}

const rowColorOptions = [
  { value: "#8B4513", label: "Marron" },
  { value: "#228B22", label: "Vert" },
  { value: "#4682B4", label: "Bleu" },
  { value: "#DAA520", label: "Doré" },
  { value: "#DC143C", label: "Rouge" },
  { value: "#9932CC", label: "Violet" },
];

function RowProperties({ row }: { row: GardenRow }) {
  const { updateRow, deleteRow, plantings, addPlanting, getPlantingsByRow } = useGardenStore();
  const { setSelectedRow, selectedPlantId } = useEditorStore();
  const { getPlantById, plants } = useCatalogStore();

  const [name, setName] = useState(row.name || "");
  const [color, setColor] = useState(row.color || "#8B4513");
  const [showFillDialog, setShowFillDialog] = useState(false);
  const [selectedFillPlantId, setSelectedFillPlantId] = useState<string | null>(null);
  const [fillSpacing, setFillSpacing] = useState(30);

  // Calculer la longueur de la rangée
  const rowLength = Math.sqrt(
    Math.pow(row.endX - row.startX, 2) + Math.pow(row.endY - row.startY, 2)
  );

  // Récupérer les plantations sur cette rangée
  const rowPlantings = plantings.filter((p) => p.rowId === row.id);

  useEffect(() => {
    setName(row.name || "");
    setColor(row.color || "#8B4513");
  }, [row]);

  const handleSave = () => {
    updateRow(row.id, { name, color });
  };

  const handleDelete = () => {
    const plantCount = rowPlantings.length;
    const message = plantCount > 0
      ? `Supprimer cette rangée et ses ${plantCount} plants ?`
      : "Supprimer cette rangée ?";
    if (confirm(message)) {
      deleteRow(row.id);
      setSelectedRow(null);
    }
  };

  const handleFillRow = () => {
    if (!selectedFillPlantId) return;
    const plant = getPlantById(selectedFillPlantId);
    if (!plant) return;

    // Calculer le nombre de plants
    const spacingInMeters = fillSpacing / 100;
    const plantCount = Math.max(1, Math.floor(rowLength / spacingInMeters) + 1);

    // Créer les plantations
    for (let i = 0; i < plantCount; i++) {
      const t = plantCount > 1 ? i / (plantCount - 1) : 0;
      const x = row.startX + t * (row.endX - row.startX);
      const y = row.startY + t * (row.endY - row.startY);

      const newPlanting: Planting = {
        id: generateId(),
        spaceId: row.spaceId,
        plotId: row.plotId,
        plantId: plant.id,
        plantName: plant.name,
        variety: "",
        mode: "single",
        position: { x, y },
        rowId: row.id,
        positionOnRow: t,
        plantedAt: new Date(),
        seedlingStartedAt: null,
        expectedHarvestAt: new Date(Date.now() + plant.daysToMaturity * 24 * 60 * 60 * 1000),
        harvestedAt: null,
        status: "seedling",
        growthStage: 0,
        events: [],
        disease: null,
      };
      addPlanting(newPlanting);
    }

    setShowFillDialog(false);
    setSelectedFillPlantId(null);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Rangée</h3>
        <Button variant="destructive" size="icon" onClick={handleDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {/* Info badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">
            <Ruler className="h-3 w-3 mr-1" />
            {rowLength.toFixed(2)}m
          </Badge>
          <Badge variant="secondary">
            <Flower2 className="h-3 w-3 mr-1" />
            {rowPlantings.length} plants
          </Badge>
        </div>

        <div>
          <Label>Nom</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleSave}
            placeholder="Ex: Rangée de tomates"
          />
        </div>

        <div>
          <Label className="flex items-center gap-1">
            <Palette className="h-3 w-3" />
            Couleur
          </Label>
          <div className="flex gap-2 mt-2">
            {rowColorOptions.map((opt) => (
              <button
                key={opt.value}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  color === opt.value ? "border-primary ring-2 ring-primary/30" : "border-transparent"
                }`}
                style={{ backgroundColor: opt.value }}
                onClick={() => {
                  setColor(opt.value);
                  updateRow(row.id, { color: opt.value });
                }}
                title={opt.label}
              />
            ))}
          </div>
        </div>

        {/* Bouton remplir la rangée */}
        <div className="pt-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowFillDialog(true)}
          >
            <Flower2 className="h-4 w-4 mr-2" />
            Remplir la rangée
          </Button>
        </div>

        {/* Dialog de remplissage */}
        {showFillDialog && (
          <div className="border rounded-lg p-3 space-y-3 bg-muted/50">
            <div className="flex items-center justify-between">
              <Label className="font-medium">Remplir avec</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFillDialog(false)}
              >
                ×
              </Button>
            </div>

            <Select
              value={selectedFillPlantId || ""}
              onValueChange={setSelectedFillPlantId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir une plante" />
              </SelectTrigger>
              <SelectContent>
                {plants.slice(0, 20).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="mr-2">{p.emoji}</span>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div>
              <Label>Espacement ({fillSpacing} cm)</Label>
              <Slider
                value={[fillSpacing]}
                onValueChange={([v]) => setFillSpacing(v)}
                min={5}
                max={100}
                step={5}
                className="mt-2"
              />
              {selectedFillPlantId && (
                <p className="text-xs text-muted-foreground mt-1">
                  ≈ {Math.max(1, Math.floor(rowLength / (fillSpacing / 100)) + 1)} plants
                </p>
              )}
            </div>

            <Button
              className="w-full"
              onClick={handleFillRow}
              disabled={!selectedFillPlantId}
            >
              Planter
            </Button>
          </div>
        )}

        {/* Liste des plants sur la rangée */}
        {rowPlantings.length > 0 && (
          <div className="pt-2">
            <Label className="text-xs text-muted-foreground">Plants sur cette rangée</Label>
            <div className="mt-1 flex flex-wrap gap-1">
              {Object.entries(
                rowPlantings.reduce((acc, p) => {
                  acc[p.plantName] = (acc[p.plantName] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([name, count]) => (
                <Badge key={name} variant="secondary" className="text-xs">
                  {name} × {count}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PlantingProperties({ planting }: { planting: Planting }) {
  const { updatePlanting, deletePlanting } = useGardenStore();
  const { setSelectedPlanting } = useEditorStore();
  const { getPlantById } = useCatalogStore();

  const plant = getPlantById(planting.plantId);

  const [variety, setVariety] = useState(planting.variety);
  const [status, setStatus] = useState<PlantStatus>(planting.status);
  const [plantedAt, setPlantedAt] = useState(
    planting.plantedAt instanceof Date
      ? planting.plantedAt.toISOString().split("T")[0]
      : new Date(planting.plantedAt as any).toISOString().split("T")[0]
  );
  const [spacing, setSpacing] = useState(
    planting.rowConfig?.spacing || plant?.spacing.plant || 30
  );

  useEffect(() => {
    setVariety(planting.variety);
    setStatus(planting.status);
    setPlantedAt(
      planting.plantedAt instanceof Date
        ? planting.plantedAt.toISOString().split("T")[0]
        : new Date(planting.plantedAt as any).toISOString().split("T")[0]
    );
    if (planting.rowConfig) {
      setSpacing(planting.rowConfig.spacing);
    }
  }, [planting]);

  const handleSave = () => {
    const newPlantedAt = new Date(plantedAt);
    const daysToMaturity = plant?.daysToMaturity || 90;

    updatePlanting(planting.id, {
      variety,
      status,
      plantedAt: newPlantedAt,
      expectedHarvestAt: new Date(
        newPlantedAt.getTime() + daysToMaturity * 24 * 60 * 60 * 1000
      ),
    });
  };

  const handleSpacingChange = (newSpacing: number) => {
    setSpacing(newSpacing);
    if (planting.mode === "row" && planting.rowConfig) {
      const { startX, startY, endX, endY } = planting.rowConfig;
      const length = Math.sqrt(
        Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)
      );
      const plantCount = Math.max(1, Math.floor(length / (newSpacing / 100)) + 1);

      updatePlanting(planting.id, {
        rowConfig: {
          ...planting.rowConfig,
          spacing: newSpacing,
          plantCount,
        },
      });
    }
  };

  const handleDelete = () => {
    if (confirm("Supprimer cette plantation ?")) {
      deletePlanting(planting.id);
      setSelectedPlanting(null);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{plant?.emoji || "🌱"}</span>
          <h3 className="font-semibold">{planting.plantName}</h3>
        </div>
        <Button variant="destructive" size="icon" onClick={handleDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {/* Mode badge */}
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {planting.mode === "row" ? "Rangée" : "Individuel"}
          </Badge>
          {planting.mode === "row" && planting.rowConfig && (
            <Badge variant="secondary">
              {planting.rowConfig.plantCount} plants
            </Badge>
          )}
        </div>

        <div>
          <Label>Variété</Label>
          <Input
            value={variety}
            onChange={(e) => setVariety(e.target.value)}
            onBlur={handleSave}
            placeholder="Ex: Marmande"
          />
        </div>

        <div>
          <Label>Statut</Label>
          <Select
            value={status}
            onValueChange={(v: PlantStatus) => {
              setStatus(v);
              updatePlanting(planting.id, {
                status: v,
                harvestedAt: v === "harvested" ? new Date() : null,
              });
            }}
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

        <div>
          <Label className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Date de plantation
          </Label>
          <Input
            type="date"
            value={plantedAt}
            onChange={(e) => setPlantedAt(e.target.value)}
            onBlur={handleSave}
          />
        </div>

        {/* Spacing control for rows */}
        {planting.mode === "row" && (
          <div>
            <Label className="flex items-center gap-1">
              <Ruler className="h-3 w-3" />
              Espacement ({spacing} cm)
            </Label>
            <Slider
              value={[spacing]}
              onValueChange={([v]) => handleSpacingChange(v)}
              min={5}
              max={100}
              step={5}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Recommandé: {plant?.spacing.plant || 30} cm
            </p>
          </div>
        )}

        {/* Growth progress */}
        <div className="pt-2">
          <Label>Croissance</Label>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${planting.growthStage}%` }}
              />
            </div>
            <span className="text-sm font-medium">{planting.growthStage}%</span>
          </div>
        </div>

        {/* Info */}
        <div className="pt-2 text-xs text-muted-foreground space-y-1">
          <p>
            Récolte prévue:{" "}
            {formatShortDate(
              planting.expectedHarvestAt instanceof Date
                ? planting.expectedHarvestAt
                : new Date(planting.expectedHarvestAt as any)
            )}
          </p>
          {planting.disease?.hasDisease && (
            <p className="text-red-500">Maladie: {planting.disease.name}</p>
          )}
        </div>
      </div>
    </div>
  );
}
