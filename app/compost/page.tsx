"use client";

import { useState } from "react";
import Link from "next/link";
import { addDays, addMonths, differenceInDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  Plus,
  Leaf,
  Info,
  RotateCcw,
  CheckCircle,
  Trash2,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCompostStore, useUIStore } from "@/lib/store";
import { Composter, CompostLayer, LayerType } from "@/lib/types";
import { generateId, formatDate, formatShortDate } from "@/lib/utils";

const layerExamples = {
  verts: [
    "Épluchures de fruits/légumes",
    "Marc de café",
    "Tontes de gazon fraîches",
    "Mauvaises herbes (sans graines)",
    "Fleurs fanées",
  ],
  bruns: [
    "Feuilles mortes",
    "Brindilles broyées",
    "Carton non imprimé",
    "Paille",
    "Copeaux de bois",
  ],
};

export default function CompostPage() {
  const { composters, addComposter, updateComposter, deleteComposter } =
    useCompostStore();
  const { addToast } = useUIStore();

  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showAddLayerDialog, setShowAddLayerDialog] = useState(false);
  const [selectedComposter, setSelectedComposter] = useState<Composter | null>(
    null
  );
  const [newComposterName, setNewComposterName] = useState("");
  const [layerType, setLayerType] = useState<LayerType>("verts");
  const [layerDescription, setLayerDescription] = useState("");

  const createComposter = () => {
    const now = new Date();
    const newComposter: Composter = {
      id: generateId(),
      gardenId: "default",
      name: newComposterName || `Compost ${composters.length + 1}`,
      startedAt: now,
      layers: [],
      estimatedReadyAt: addMonths(now, 4),
      status: "active",
      lastTurnedAt: null,
      usedOnPlotId: null,
      usedAt: null,
    };
    addComposter(newComposter);
    addToast({ type: "success", message: "Composteur créé !" });
    setShowNewDialog(false);
    setNewComposterName("");
  };

  const addLayer = () => {
    if (!selectedComposter) return;

    const newLayer: CompostLayer = {
      date: new Date(),
      type: layerType,
      description: layerDescription,
    };

    const updatedLayers = [...selectedComposter.layers, newLayer];

    // Recalculate estimated ready date based on layers balance
    const greens = updatedLayers.filter((l) => l.type === "verts").length;
    const browns = updatedLayers.filter((l) => l.type === "bruns").length;
    const ratio = browns / Math.max(greens, 1);

    // Optimal ratio is 3:1 browns to greens
    // Better ratio = faster composting
    const monthsToReady = ratio >= 2.5 && ratio <= 3.5 ? 3 : ratio >= 1.5 ? 4 : 6;

    updateComposter(selectedComposter.id, {
      layers: updatedLayers,
      estimatedReadyAt: addMonths(selectedComposter.startedAt as Date, monthsToReady),
    });

    addToast({ type: "success", message: "Couche ajoutée !" });
    setShowAddLayerDialog(false);
    setLayerDescription("");
    setSelectedComposter({
      ...selectedComposter,
      layers: updatedLayers,
    });
  };

  const markTurned = (composter: Composter) => {
    updateComposter(composter.id, { lastTurnedAt: new Date() });
    addToast({ type: "success", message: "Retournement enregistré !" });
  };

  const markMature = (composter: Composter) => {
    updateComposter(composter.id, { status: "mature" });
    addToast({ type: "success", message: "Compost marqué comme mûr !" });
  };

  const calculateProgress = (composter: Composter) => {
    const startedAt =
      composter.startedAt instanceof Date
        ? composter.startedAt
        : new Date(composter.startedAt as unknown as string);
    const readyAt =
      composter.estimatedReadyAt instanceof Date
        ? composter.estimatedReadyAt
        : new Date(composter.estimatedReadyAt as unknown as string);

    const totalDays = differenceInDays(readyAt, startedAt);
    const daysPassed = differenceInDays(new Date(), startedAt);
    return Math.min(100, Math.max(0, Math.round((daysPassed / totalDays) * 100)));
  };

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
          <h1 className="text-lg font-semibold">Compost</h1>
        </div>
        <Button size="sm" onClick={() => setShowNewDialog(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nouveau
        </Button>
      </div>

      <Tabs defaultValue="composters">
        <TabsList className="w-full">
          <TabsTrigger value="composters" className="flex-1">
            Mes composts
          </TabsTrigger>
          <TabsTrigger value="guide" className="flex-1">
            Guide
          </TabsTrigger>
        </TabsList>

        {/* Composters Tab */}
        <TabsContent value="composters" className="space-y-4">
          {composters.length > 0 ? (
            composters.map((composter) => {
              const progress = calculateProgress(composter);
              const greens = composter.layers.filter(
                (l) => l.type === "verts"
              ).length;
              const browns = composter.layers.filter(
                (l) => l.type === "bruns"
              ).length;
              const ratio = browns / Math.max(greens, 1);

              const lastTurnedAt = composter.lastTurnedAt
                ? composter.lastTurnedAt instanceof Date
                  ? composter.lastTurnedAt
                  : new Date(composter.lastTurnedAt as unknown as string)
                : null;

              const daysSinceTurned = lastTurnedAt
                ? differenceInDays(new Date(), lastTurnedAt)
                : null;

              const needsTurning =
                daysSinceTurned === null || daysSinceTurned >= 14;

              return (
                <Card key={composter.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="text-xl">♻️</span>
                        {composter.name}
                      </CardTitle>
                      <Badge
                        variant={
                          composter.status === "mature"
                            ? "success"
                            : composter.status === "used"
                            ? "secondary"
                            : "default"
                        }
                      >
                        {composter.status === "mature"
                          ? "Mûr"
                          : composter.status === "used"
                          ? "Utilisé"
                          : "Actif"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Maturation</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    {/* Ratio */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-green-50">
                          🟢 {greens} verts
                        </Badge>
                        <Badge variant="outline" className="bg-amber-50">
                          🟤 {browns} bruns
                        </Badge>
                      </div>
                      <span
                        className={
                          ratio >= 2.5 && ratio <= 3.5
                            ? "text-green-600"
                            : "text-orange-600"
                        }
                      >
                        Ratio: {ratio.toFixed(1)}:1
                      </span>
                    </div>

                    {/* Turning reminder */}
                    {composter.status === "active" && needsTurning && (
                      <div className="p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg text-sm">
                        <span className="text-yellow-700 dark:text-yellow-400">
                          ⚠️ Retournement conseillé
                          {daysSinceTurned !== null &&
                            ` (${daysSinceTurned} jours)`}
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      {composter.status === "active" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedComposter(composter);
                              setShowAddLayerDialog(true);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Couche
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markTurned(composter)}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Retourné
                          </Button>
                          {progress >= 80 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => markMature(composter)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Mûr
                            </Button>
                          )}
                        </>
                      )}
                    </div>

                    {/* Recent layers */}
                    {composter.layers.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground mb-2">
                          Derniers ajouts
                        </p>
                        <div className="space-y-1">
                          {composter.layers
                            .slice(-3)
                            .reverse()
                            .map((layer, i) => {
                              const layerDate =
                                layer.date instanceof Date
                                  ? layer.date
                                  : new Date(layer.date as unknown as string);
                              return (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  <span>
                                    {layer.type === "verts" ? "🟢" : "🟤"}
                                  </span>
                                  <span className="flex-1 truncate">
                                    {layer.description || layer.type}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {formatShortDate(layerDate)}
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="text-center py-8">
              <CardContent>
                <span className="text-4xl">♻️</span>
                <h3 className="font-semibold mt-4">Pas de composteur</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Créez votre premier composteur
                </p>
                <Button className="mt-4" onClick={() => setShowNewDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un composteur
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Guide Tab */}
        <TabsContent value="guide" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-5 w-5" />
                Guide du compostage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">1. Démarrage</h4>
                <p className="text-sm text-muted-foreground">
                  Commencez par une couche de bruns (brindilles, carton) au fond
                  pour le drainage et l'aération.
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">2. Équilibre des couches</h4>
                <p className="text-sm text-muted-foreground">
                  Alternez verts et bruns avec un ratio de 1 vert pour 3 bruns.
                  C'est la clé d'un bon compostage !
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">3. Retournement</h4>
                <p className="text-sm text-muted-foreground">
                  Retournez toutes les 2-4 semaines pour aérer et accélérer la
                  décomposition.
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">4. Humidité</h4>
                <p className="text-sm text-muted-foreground">
                  Le compost doit être humide comme une éponge essorée. Arrosez
                  si trop sec, ajoutez des bruns si trop humide.
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">5. Maturité</h4>
                <p className="text-sm text-muted-foreground">
                  Après 3-6 mois, le compost est prêt quand il est brun foncé,
                  friable et sent la terre de forêt.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">🟢 Matières vertes (azote)</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1">
                {layerExamples.verts.map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-green-500">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">🟤 Matières brunes (carbone)</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1">
                {layerExamples.bruns.map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-amber-600">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Composter Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau composteur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom (optionnel)</Label>
              <Input
                placeholder="ex: Compost principal"
                value={newComposterName}
                onChange={(e) => setNewComposterName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Annuler
            </Button>
            <Button onClick={createComposter}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Layer Dialog */}
      <Dialog open={showAddLayerDialog} onOpenChange={setShowAddLayerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une couche</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type de matière</Label>
              <Select
                value={layerType}
                onValueChange={(v) => setLayerType(v as LayerType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="verts">🟢 Verts (azote)</SelectItem>
                  <SelectItem value="bruns">🟤 Bruns (carbone)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                placeholder="ex: Épluchures de légumes"
                value={layerDescription}
                onChange={(e) => setLayerDescription(e.target.value)}
              />
              <div className="mt-2 flex flex-wrap gap-1">
                {layerExamples[layerType].slice(0, 3).map((example) => (
                  <Badge
                    key={example}
                    variant="outline"
                    className="cursor-pointer text-xs"
                    onClick={() => setLayerDescription(example)}
                  >
                    {example}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddLayerDialog(false)}
            >
              Annuler
            </Button>
            <Button onClick={addLayer}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
