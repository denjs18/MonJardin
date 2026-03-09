"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Droplets,
  Scissors,
  Bug,
  Leaf,
  PenLine,
  Trash2,
  CheckCircle,
  MoreVertical,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGardenStore, useCatalogStore, useUIStore } from "@/lib/store";
import { PlantEvent, EventType, PlantStatus } from "@/lib/types";
import { getStatusLabel, getStatusColor } from "@/lib/growthEngine";
import { formatDate, formatShortDate, daysUntil, daysSince } from "@/lib/utils";
import { cn } from "@/lib/utils";

const eventTypes: { type: EventType; label: string; emoji: string }[] = [
  { type: "watered", label: "Arrosage", emoji: "💧" },
  { type: "fertilized", label: "Engrais", emoji: "🌿" },
  { type: "pruned", label: "Taille", emoji: "✂️" },
  { type: "disease", label: "Maladie", emoji: "🦠" },
  { type: "pest", label: "Nuisible", emoji: "🐛" },
  { type: "harvested", label: "Récolte", emoji: "🌾" },
  { type: "mulched", label: "Paillage", emoji: "🪹" },
  { type: "note", label: "Note", emoji: "📝" },
];

export default function PlantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const plantingId = params.id as string;

  const { plantings, updatePlanting, addPlantingEvent, deletePlanting } =
    useGardenStore();
  const { getPlantById } = useCatalogStore();
  const { addToast } = useUIStore();

  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [eventType, setEventType] = useState<EventType>("watered");
  const [eventNote, setEventNote] = useState("");

  const planting = plantings.find((p) => p.id === plantingId);
  const plant = planting ? getPlantById(planting.plantId) : null;

  if (!planting) {
    return (
      <div className="p-4 text-center">
        <p>Plante non trouvée</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">
          Retour
        </Button>
      </div>
    );
  }

  const plantedAt =
    planting.plantedAt instanceof Date
      ? planting.plantedAt
      : new Date(planting.plantedAt as unknown as string);

  const expectedHarvest =
    planting.expectedHarvestAt instanceof Date
      ? planting.expectedHarvestAt
      : new Date(planting.expectedHarvestAt as unknown as string);

  const daysPlanted = daysSince(plantedAt);
  const daysToHarvest = daysUntil(expectedHarvest);

  const handleAddEvent = () => {
    const event: PlantEvent = {
      id: `event-${Date.now()}`,
      date: new Date(),
      type: eventType,
      note: eventNote,
    };
    addPlantingEvent(planting.id, event);
    addToast({
      type: "success",
      message: "Événement ajouté",
    });
    setShowEventDialog(false);
    setEventNote("");
  };

  const handleStatusChange = (newStatus: PlantStatus) => {
    updatePlanting(planting.id, {
      status: newStatus,
      ...(newStatus === "harvested" && { harvestedAt: new Date() }),
    });
    addToast({
      type: "success",
      message: `Statut mis à jour: ${getStatusLabel(newStatus)}`,
    });
  };

  const handleDelete = () => {
    deletePlanting(planting.id);
    addToast({
      type: "success",
      message: "Plante supprimée",
    });
    router.push("/plants");
  };

  // Quick actions based on status
  const quickActions = [
    {
      label: "Arrosé",
      emoji: "💧",
      action: () => {
        addPlantingEvent(planting.id, {
          id: `event-${Date.now()}`,
          date: new Date(),
          type: "watered",
          note: "",
        });
        addToast({ type: "success", message: "Arrosage enregistré" });
      },
    },
    ...(planting.status === "ready"
      ? [
          {
            label: "Récolté",
            emoji: "🌾",
            action: () => handleStatusChange("harvested"),
          },
        ]
      : []),
    ...(planting.status !== "dead" && !planting.disease?.hasDisease
      ? [
          {
            label: "Maladie",
            emoji: "🦠",
            action: () => {
              updatePlanting(planting.id, {
                disease: {
                  hasDisease: true,
                  name: "Non identifiée",
                  detectedAt: new Date(),
                },
              });
              addToast({ type: "warning", message: "Maladie signalée" });
            },
          },
        ]
      : []),
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="text-3xl">{plant?.emoji || "🌱"}</span>
          <div>
            <h1 className="font-semibold text-lg">{planting.plantName}</h1>
            {planting.variety && (
              <p className="text-sm text-muted-foreground">{planting.variety}</p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-red-500"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Status and Progress */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Statut</p>
              <Badge
                style={{
                  backgroundColor: getStatusColor(planting.status),
                  color: "white",
                }}
                className="mt-1"
              >
                {getStatusLabel(planting.status)}
              </Badge>
            </div>
            <Select
              value={planting.status}
              onValueChange={(v) => handleStatusChange(v as PlantStatus)}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="seedling">Semis</SelectItem>
                <SelectItem value="growing">Croissance</SelectItem>
                <SelectItem value="flowering">Floraison</SelectItem>
                <SelectItem value="ready">Prêt</SelectItem>
                <SelectItem value="harvested">Récolté</SelectItem>
                <SelectItem value="dead">Mort</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Croissance</span>
              <span className="font-medium">{planting.growthStage}%</span>
            </div>
            <Progress value={planting.growthStage} className="h-3" />
          </div>

          {/* Disease alert */}
          {planting.disease?.hasDisease && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                ⚠️ Maladie: {planting.disease.name}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() =>
                  updatePlanting(planting.id, { disease: null })
                }
              >
                Marquer comme guéri
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {quickActions.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            size="sm"
            onClick={action.action}
            className="whitespace-nowrap"
          >
            {action.emoji} {action.label}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowEventDialog(true)}
          className="whitespace-nowrap"
        >
          + Autre
        </Button>
      </div>

      {/* Dates */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Planté le</p>
              <p className="font-medium">{formatDate(plantedAt)}</p>
              <p className="text-xs text-muted-foreground">
                Il y a {daysPlanted} jours
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Récolte prévue</p>
              <p className="font-medium">{formatDate(expectedHarvest)}</p>
              {daysToHarvest > 0 ? (
                <p className="text-xs text-green-600">
                  Dans {daysToHarvest} jours
                </p>
              ) : (
                <p className="text-xs text-orange-600">Date dépassée</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Historique</CardTitle>
        </CardHeader>
        <CardContent>
          {planting.events.length > 0 ? (
            <div className="space-y-3">
              {planting.events
                .slice()
                .reverse()
                .map((event, i) => {
                  const eventInfo = eventTypes.find((e) => e.type === event.type);
                  const eventDate =
                    event.date instanceof Date
                      ? event.date
                      : new Date(event.date as unknown as string);

                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50"
                    >
                      <span className="text-lg">{eventInfo?.emoji || "📝"}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {eventInfo?.label || event.type}
                        </p>
                        {event.note && (
                          <p className="text-xs text-muted-foreground">
                            {event.note}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatShortDate(eventDate)}
                      </span>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun événement enregistré
            </p>
          )}
        </CardContent>
      </Card>

      {/* Plant Info */}
      {plant && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">{plant.description}</p>

            {plant.tips.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">💡 Conseils</p>
                <ul className="text-sm space-y-1">
                  {plant.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span className="text-muted-foreground">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un événement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type d'événement</Label>
              <Select
                value={eventType}
                onValueChange={(v) => setEventType(v as EventType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((et) => (
                    <SelectItem key={et.type} value={et.type}>
                      {et.emoji} {et.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Note (optionnel)</Label>
              <Input
                placeholder="Ajouter une note..."
                value={eventNote}
                onChange={(e) => setEventNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEventDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddEvent}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette plante ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cette action est irréversible. Toutes les données de cette plantation
            seront perdues.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
