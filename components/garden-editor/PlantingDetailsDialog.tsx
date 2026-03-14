"use client";

import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Droplets,
  Bug,
  Scissors,
  Leaf,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Plus,
  StickyNote,
} from "lucide-react";
import { Planting, PlantEvent, EventType, PlantStatus, Plant } from "@/lib/types";
import { useGardenStore, useCatalogStore } from "@/lib/store";
import { generateId } from "@/lib/utils";

interface PlantingDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planting: Planting | null;
  isRowMode?: boolean; // true si c'est une rangée (mode="row" avec rowConfig)
}

const statusLabels: Record<PlantStatus, string> = {
  seedling: "Semis",
  growing: "En croissance",
  flowering: "Floraison",
  ready: "Prêt à récolter",
  harvested: "Récolté",
  dead: "Mort",
};

const statusColors: Record<PlantStatus, string> = {
  seedling: "bg-lime-500",
  growing: "bg-green-500",
  flowering: "bg-pink-500",
  ready: "bg-amber-500",
  harvested: "bg-blue-500",
  dead: "bg-gray-500",
};

const eventTypeLabels: Record<EventType, string> = {
  watered: "Arrosage",
  fertilized: "Fertilisation",
  pruned: "Taille",
  disease: "Maladie",
  pest: "Ravageur",
  harvested: "Récolte",
  mulched: "Paillage",
  note: "Note",
};

const eventTypeIcons: Record<EventType, React.ReactNode> = {
  watered: <Droplets className="h-4 w-4" />,
  fertilized: <Leaf className="h-4 w-4" />,
  pruned: <Scissors className="h-4 w-4" />,
  disease: <Bug className="h-4 w-4" />,
  pest: <AlertTriangle className="h-4 w-4" />,
  harvested: <CheckCircle2 className="h-4 w-4" />,
  mulched: <Leaf className="h-4 w-4" />,
  note: <StickyNote className="h-4 w-4" />,
};

export function PlantingDetailsDialog({
  open,
  onOpenChange,
  planting,
  isRowMode = false,
}: PlantingDetailsDialogProps) {
  const { updatePlanting, addPlantingEvent, deletePlanting } = useGardenStore();
  const { getPlantById } = useCatalogStore();

  // Form states
  const [plantedDate, setPlantedDate] = useState("");
  const [sowDate, setSowDate] = useState("");
  const [status, setStatus] = useState<PlantStatus>("seedling");

  // Event form
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventType, setEventType] = useState<EventType>("watered");
  const [eventNote, setEventNote] = useState("");
  const [eventQuantity, setEventQuantity] = useState("");

  // Disease form
  const [showDiseaseForm, setShowDiseaseForm] = useState(false);
  const [diseaseName, setDiseaseName] = useState("");

  const plant = planting ? getPlantById(planting.plantId) : null;

  // Initialize form values when planting changes
  useEffect(() => {
    if (planting) {
      const plantedAt = planting.plantedAt instanceof Date
        ? planting.plantedAt
        : new Date(planting.plantedAt as any);
      setPlantedDate(plantedAt.toISOString().split("T")[0]);

      if (planting.seedlingStartedAt) {
        const sowAt = planting.seedlingStartedAt instanceof Date
          ? planting.seedlingStartedAt
          : new Date(planting.seedlingStartedAt as any);
        setSowDate(sowAt.toISOString().split("T")[0]);
      } else {
        setSowDate("");
      }

      setStatus(planting.status);
    }
  }, [planting]);

  if (!planting || !plant) return null;

  const plantCount = isRowMode && planting.rowConfig ? planting.rowConfig.plantCount : 1;

  // Calculate progress
  const plantedAt = planting.plantedAt instanceof Date
    ? planting.plantedAt
    : new Date(planting.plantedAt as any);
  const expectedHarvestAt = planting.expectedHarvestAt instanceof Date
    ? planting.expectedHarvestAt
    : new Date(planting.expectedHarvestAt as any);

  const totalDays = Math.ceil((expectedHarvestAt.getTime() - plantedAt.getTime()) / (24 * 60 * 60 * 1000));
  const daysPassed = Math.ceil((Date.now() - plantedAt.getTime()) / (24 * 60 * 60 * 1000));
  const daysRemaining = Math.max(0, Math.ceil((expectedHarvestAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
  const progress = Math.min(100, Math.max(0, (daysPassed / totalDays) * 100));

  const handleSaveDates = () => {
    if (!planting) return;

    const newPlantedAt = new Date(plantedDate);
    let newSeedlingStartedAt: Date | null = null;

    if (sowDate) {
      newSeedlingStartedAt = new Date(sowDate);
    }

    // Recalculate expected harvest date
    const daysSinceSow = newSeedlingStartedAt
      ? Math.floor((Date.now() - newSeedlingStartedAt.getTime()) / (24 * 60 * 60 * 1000))
      : Math.floor((Date.now() - newPlantedAt.getTime()) / (24 * 60 * 60 * 1000));

    const newExpectedHarvestAt = new Date(
      Date.now() + Math.max(0, plant.daysToMaturity - daysSinceSow) * 24 * 60 * 60 * 1000
    );

    updatePlanting(planting.id, {
      plantedAt: newPlantedAt,
      seedlingStartedAt: newSeedlingStartedAt,
      expectedHarvestAt: newExpectedHarvestAt,
      status,
    });
  };

  const handleAddEvent = () => {
    if (!planting) return;

    const newEvent: PlantEvent = {
      id: generateId(),
      date: new Date(),
      type: eventType,
      note: eventNote,
      quantity: eventQuantity || undefined,
    };

    addPlantingEvent(planting.id, newEvent);
    setShowEventForm(false);
    setEventNote("");
    setEventQuantity("");
  };

  const handleAddDisease = () => {
    if (!planting || !diseaseName) return;

    updatePlanting(planting.id, {
      disease: {
        hasDisease: true,
        name: diseaseName,
        detectedAt: new Date(),
      },
    });
    setShowDiseaseForm(false);
    setDiseaseName("");
  };

  const handleClearDisease = () => {
    if (!planting) return;
    updatePlanting(planting.id, { disease: null });
  };

  const handleMarkAsHarvested = () => {
    if (!planting) return;
    updatePlanting(planting.id, {
      status: "harvested",
      harvestedAt: new Date(),
    });
    setStatus("harvested");
  };

  const handleDelete = () => {
    if (!planting) return;
    if (confirm(isRowMode
      ? `Supprimer cette rangée de ${plantCount} ${plant.name} ?`
      : `Supprimer ce ${plant.name} ?`
    )) {
      deletePlanting(planting.id);
      onOpenChange(false);
    }
  };

  const formatDate = (date: Date | any) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{plant.emoji}</span>
            <span>{plant.name}</span>
            {isRowMode && (
              <Badge variant="secondary" className="ml-2">
                Rangée de {plantCount}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress section */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Progression</Label>
              <Badge className={statusColors[status]}>
                {statusLabels[status]}
              </Badge>
            </div>
            <Progress value={progress} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{daysPassed} jours depuis plantation</span>
              <span>{daysRemaining > 0 ? `${daysRemaining} jours restants` : "Prêt !"}</span>
            </div>
          </div>

          {/* Disease alert */}
          {planting.disease?.hasDisease && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <Bug className="h-5 w-5 text-red-500" />
              <div className="flex-1">
                <p className="font-medium text-red-700 dark:text-red-300">
                  {planting.disease.name}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  Détecté le {formatDate(planting.disease.detectedAt)}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClearDisease}>
                Guéri
              </Button>
            </div>
          )}

          {/* Dates section */}
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Dates
            </Label>

            <div className="grid gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Date de plantation/repiquage
                </Label>
                <Input
                  type="date"
                  value={plantedDate}
                  onChange={(e) => setPlantedDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Date de semis (si connue)
                </Label>
                <Input
                  type="date"
                  value={sowDate}
                  onChange={(e) => setSowDate(e.target.value)}
                  max={plantedDate || new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Statut</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as PlantStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSaveDates} className="w-full" size="sm">
              Enregistrer les modifications
            </Button>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            {status !== "harvested" && (
              <Button variant="outline" size="sm" onClick={handleMarkAsHarvested}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Marquer récolté
              </Button>
            )}
            {!planting.disease?.hasDisease && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDiseaseForm(!showDiseaseForm)}
              >
                <Bug className="h-4 w-4 mr-1" />
                Signaler maladie
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEventForm(!showEventForm)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Ajouter événement
            </Button>
          </div>

          {/* Disease form */}
          {showDiseaseForm && (
            <div className="space-y-2 p-3 border rounded-lg">
              <Label>Nom de la maladie/problème</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: Mildiou, pucerons..."
                  value={diseaseName}
                  onChange={(e) => setDiseaseName(e.target.value)}
                />
                <Button onClick={handleAddDisease} disabled={!diseaseName}>
                  Ajouter
                </Button>
              </div>
            </div>
          )}

          {/* Event form */}
          {showEventForm && (
            <div className="space-y-3 p-3 border rounded-lg">
              <div className="space-y-1">
                <Label>Type d'événement</Label>
                <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(eventTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          {eventTypeIcons[key as EventType]}
                          {label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Note (optionnel)</Label>
                <Input
                  placeholder="Détails..."
                  value={eventNote}
                  onChange={(e) => setEventNote(e.target.value)}
                />
              </div>

              {(eventType === "watered" || eventType === "harvested") && (
                <div className="space-y-1">
                  <Label>Quantité (optionnel)</Label>
                  <Input
                    placeholder="Ex: 2L, 500g..."
                    value={eventQuantity}
                    onChange={(e) => setEventQuantity(e.target.value)}
                  />
                </div>
              )}

              <Button onClick={handleAddEvent} className="w-full">
                Ajouter l'événement
              </Button>
            </div>
          )}

          {/* Events history */}
          {planting.events && planting.events.length > 0 && (
            <div className="space-y-2">
              <Label>Historique</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {[...planting.events].reverse().map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-2 p-2 bg-muted/30 rounded text-sm"
                  >
                    <span className="mt-0.5">{eventTypeIcons[event.type]}</span>
                    <div className="flex-1">
                      <span className="font-medium">{eventTypeLabels[event.type]}</span>
                      {event.note && (
                        <p className="text-muted-foreground text-xs">{event.note}</p>
                      )}
                      {event.quantity && (
                        <p className="text-muted-foreground text-xs">Qté: {event.quantity}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(event.date)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Récolte estimée : {formatDate(expectedHarvestAt)}</p>
            <p>Durée de maturation : {plant.daysToMaturity} jours</p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-1" />
            Supprimer
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
