"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Box,
  Warehouse,
  Home,
  Tent,
  ChevronDown,
  X,
  Flower2,
  Settings2,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GardenCanvas,
  EditorToolbar,
  PlantPalette,
  PropertiesPanel,
} from "@/components/garden-editor";
import { useGardenStore, useEditorStore, useWeatherStore } from "@/lib/store";
import { GardenSpace, EnvironmentType } from "@/lib/types";
import { generateId } from "@/lib/utils";
import { cn } from "@/lib/utils";

const environmentIcons: Record<EnvironmentType, React.ReactNode> = {
  outdoor: <Tent className="h-4 w-4" />,
  greenhouse: <Warehouse className="h-4 w-4" />,
  indoor: <Home className="h-4 w-4" />,
};

export default function GardenPage() {
  const {
    spaces,
    currentSpaceId,
    setCurrentSpace,
    addSpace,
  } = useGardenStore();
  const { location } = useWeatherStore();
  const { resetEditor } = useEditorStore();

  const [showNewSpaceDialog, setShowNewSpaceDialog] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newSpaceWidth, setNewSpaceWidth] = useState("6");
  const [newSpaceHeight, setNewSpaceHeight] = useState("4");
  const [newSpaceEnv, setNewSpaceEnv] = useState<EnvironmentType>("outdoor");

  const currentSpace = spaces.find((s) => s.id === currentSpaceId);

  // Select first space if none selected
  useEffect(() => {
    if (!currentSpaceId && spaces.length > 0) {
      setCurrentSpace(spaces[0].id);
    }
  }, [currentSpaceId, spaces, setCurrentSpace]);

  const handleCreateSpace = () => {
    const newSpace: GardenSpace = {
      id: generateId(),
      name: newSpaceName || `Espace ${spaces.length + 1}`,
      environment: newSpaceEnv,
      width: parseFloat(newSpaceWidth) || 6,
      height: parseFloat(newSpaceHeight) || 4,
      location,
      createdAt: new Date(),
    };

    addSpace(newSpace);
    setCurrentSpace(newSpace.id);
    setShowNewSpaceDialog(false);
    resetForm();
    resetEditor();
  };

  const resetForm = () => {
    setNewSpaceName("");
    setNewSpaceWidth("6");
    setNewSpaceHeight("4");
    setNewSpaceEnv("outdoor");
  };

  // No spaces - show creation prompt
  if (spaces.length === 0) {
    return (
      <div className="p-4 h-[calc(100vh-8rem)] flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="text-4xl mb-4">🌻</div>
            <h2 className="text-xl font-semibold mb-2">Créez votre jardin</h2>
            <p className="text-muted-foreground mb-4">
              Commencez par créer un espace de jardinage
            </p>
            <Button onClick={() => setShowNewSpaceDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer un espace
            </Button>
          </CardContent>
        </Card>

        <NewSpaceDialog
          open={showNewSpaceDialog}
          onOpenChange={setShowNewSpaceDialog}
          name={newSpaceName}
          setName={setNewSpaceName}
          width={newSpaceWidth}
          setWidth={setNewSpaceWidth}
          height={newSpaceHeight}
          setHeight={setNewSpaceHeight}
          environment={newSpaceEnv}
          setEnvironment={setNewSpaceEnv}
          onCreate={handleCreateSpace}
        />
      </div>
    );
  }

  const { selectedPlotId, selectedPlantingId, selectedPlantId, tool } = useEditorStore();
  const [showPlantPalette, setShowPlantPalette] = useState(false);
  const [showProperties, setShowProperties] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Auto-show properties panel when something is selected
  useEffect(() => {
    if (selectedPlotId || selectedPlantingId) {
      setShowProperties(true);
    }
  }, [selectedPlotId, selectedPlantingId]);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b bg-background gap-2 flex-wrap">
        {/* Space selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              {currentSpace && environmentIcons[currentSpace.environment]}
              <span className="font-medium truncate max-w-[120px]">
                {currentSpace?.name || "Sélectionner"}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {spaces.map((space) => (
              <DropdownMenuItem
                key={space.id}
                onClick={() => {
                  setCurrentSpace(space.id);
                  resetEditor();
                }}
                className={cn(
                  "gap-2",
                  space.id === currentSpaceId && "bg-accent"
                )}
              >
                {environmentIcons[space.environment]}
                {space.name}
                <span className="text-muted-foreground text-xs ml-auto">
                  {space.width}x{space.height}m
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              onClick={() => setShowNewSpaceDialog(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Nouvel espace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Toolbar */}
        <div className="flex-1 flex justify-center overflow-x-auto">
          <EditorToolbar />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowHelp(true)}
            title="Aide"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
          {currentSpace && (
            <Link href={`/garden/3d?space=${currentSpace.id}`}>
              <Button variant="outline" size="sm">
                <Box className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Vue 3D</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Main content - Canvas takes full space */}
      <div className="flex-1 relative overflow-hidden">
        {currentSpace ? (
          <div className="absolute inset-0 p-2">
            <GardenCanvas
              spaceId={currentSpace.id}
              width={currentSpace.width}
              height={currentSpace.height}
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Sélectionnez un espace
          </div>
        )}

        {/* Contextual instruction overlay */}
        {currentSpace && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-sm border rounded-lg px-4 py-2 shadow-lg text-sm max-w-lg text-center">
            {tool === "select" && !selectedPlotId && !selectedPlantingId && (
              <span>
                <strong>Étape 1:</strong> Cliquez sur <Button variant="outline" size="sm" className="mx-1 h-6 px-2" onClick={() => useEditorStore.getState().setTool("plot")}>◻️ Parcelle</Button> puis dessinez une zone
              </span>
            )}
            {tool === "plot" && (
              <span className="text-primary font-medium">
                Dessinez une parcelle en cliquant et glissant sur la zone beige
              </span>
            )}
            {tool === "select" && selectedPlotId && (
              <span>
                Parcelle sélectionnée. <Button variant="outline" size="sm" className="mx-1 h-6 px-2" onClick={() => setShowPlantPalette(true)}>🌱 Choisir une plante</Button>
              </span>
            )}
            {tool === "plant-single" && selectedPlantId && (
              <span className="text-green-600 font-medium">
                Cliquez dans une parcelle pour planter un par un
              </span>
            )}
            {tool === "plant-row" && selectedPlantId && (
              <span className="text-green-600 font-medium">
                Cliquez et glissez dans une parcelle pour créer une rangée
              </span>
            )}
            {(tool === "plant-single" || tool === "plant-row") && !selectedPlantId && (
              <span className="text-orange-600">
                <Button variant="outline" size="sm" className="mx-1 h-6 px-2" onClick={() => setShowPlantPalette(true)}>🌱 Choisissez d'abord une plante</Button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Floating action buttons - fixed position */}
      <div className="fixed bottom-24 right-4 flex flex-col gap-2 z-50">
        <Sheet open={showPlantPalette} onOpenChange={setShowPlantPalette}>
          <SheetTrigger asChild>
            <Button
              size="lg"
              className={cn(
                "rounded-full shadow-lg h-14 w-14",
                selectedPlantId ? "bg-green-600 hover:bg-green-700" : "bg-primary"
              )}
              title="Choisir une plante"
            >
              <Flower2 className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle>Choisir une plante</SheetTitle>
            </SheetHeader>
            <div className="overflow-auto h-[calc(100vh-5rem)]">
              <PlantPalette onSelect={() => setShowPlantPalette(false)} />
            </div>
          </SheetContent>
        </Sheet>

        {(selectedPlotId || selectedPlantingId) && (
          <Sheet open={showProperties} onOpenChange={setShowProperties}>
            <SheetTrigger asChild>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full shadow-lg h-14 w-14"
              >
                <Settings2 className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0">
              <SheetHeader className="p-4 border-b">
                <SheetTitle>Propriétés</SheetTitle>
              </SheetHeader>
              <div className="overflow-auto h-[calc(100vh-5rem)]">
                <PropertiesPanel />
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>

      {/* Help dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Comment utiliser l'éditeur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 rounded-full p-2 shrink-0">
                <span className="text-lg">1️⃣</span>
              </div>
              <div>
                <p className="font-medium">Créer une parcelle</p>
                <p className="text-muted-foreground">
                  Cliquez sur l'outil ◻️ Parcelle, puis dessinez une zone en cliquant-glissant sur la zone beige du jardin.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 rounded-full p-2 shrink-0">
                <span className="text-lg">2️⃣</span>
              </div>
              <div>
                <p className="font-medium">Choisir une plante</p>
                <p className="text-muted-foreground">
                  Cliquez sur le bouton vert flottant 🌸 ou sélectionnez une plante dans la palette.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 rounded-full p-2 shrink-0">
                <span className="text-lg">3️⃣</span>
              </div>
              <div>
                <p className="font-medium">Planter</p>
                <p className="text-muted-foreground">
                  Avec 🌸 (un par un): cliquez dans une parcelle.<br/>
                  Avec ═ (rangée): cliquez-glissez pour définir la ligne.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 rounded-full p-2 shrink-0">
                <span className="text-lg">4️⃣</span>
              </div>
              <div>
                <p className="font-medium">Modifier</p>
                <p className="text-muted-foreground">
                  Utilisez l'outil curseur pour sélectionner une parcelle ou plantation, puis modifiez les propriétés.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowHelp(false)}>Compris !</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New space dialog */}
      <NewSpaceDialog
        open={showNewSpaceDialog}
        onOpenChange={setShowNewSpaceDialog}
        name={newSpaceName}
        setName={setNewSpaceName}
        width={newSpaceWidth}
        setWidth={setNewSpaceWidth}
        height={newSpaceHeight}
        setHeight={setNewSpaceHeight}
        environment={newSpaceEnv}
        setEnvironment={setNewSpaceEnv}
        onCreate={handleCreateSpace}
      />
    </div>
  );
}

interface NewSpaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  setName: (name: string) => void;
  width: string;
  setWidth: (width: string) => void;
  height: string;
  setHeight: (height: string) => void;
  environment: EnvironmentType;
  setEnvironment: (env: EnvironmentType) => void;
  onCreate: () => void;
}

function NewSpaceDialog({
  open,
  onOpenChange,
  name,
  setName,
  width,
  setWidth,
  height,
  setHeight,
  environment,
  setEnvironment,
  onCreate,
}: NewSpaceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvel espace de jardinage</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nom</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mon potager"
            />
          </div>

          <div>
            <Label>Type d'environnement</Label>
            <Select
              value={environment}
              onValueChange={(v: EnvironmentType) => setEnvironment(v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="outdoor">
                  <div className="flex items-center gap-2">
                    <Tent className="h-4 w-4" />
                    Extérieur (plein air)
                  </div>
                </SelectItem>
                <SelectItem value="greenhouse">
                  <div className="flex items-center gap-2">
                    <Warehouse className="h-4 w-4" />
                    Serre extérieure
                  </div>
                </SelectItem>
                <SelectItem value="indoor">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Intérieur (petite serre / appartement)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Largeur (m)</Label>
              <Input
                type="number"
                step="0.5"
                min="1"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
              />
            </div>
            <div>
              <Label>Profondeur (m)</Label>
              <Input
                type="number"
                step="0.5"
                min="1"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onCreate}>Créer l'espace</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
