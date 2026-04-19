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
  Flower2,
  Settings2,
  HelpCircle,
  Square,
  GripHorizontal,
  Minus,
  Eraser,
  MousePointer2,
  Move,
  Sun,
  Sparkles,
  Leaf,
  Trees,
  Footprints,
  Fence as FenceIcon,
  Trash2,
} from "lucide-react";
import "./garden.css";
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
  DropdownMenuSeparator,
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
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GardenCanvas,
  PlantPalette,
  PropertiesPanel,
  PlantingTypeDialog,
  PlantingTypeResult,
} from "@/components/garden-editor";
import { useGardenStore, useEditorStore, useWeatherStore, useCatalogStore } from "@/lib/store";
import { useMigration } from "@/lib/useMigration";
import { GardenSpace, EnvironmentType, Plant } from "@/lib/types";
import { generateId } from "@/lib/utils";
import { cn } from "@/lib/utils";

const environmentIcons: Record<EnvironmentType, React.ReactNode> = {
  outdoor: <Tent className="h-4 w-4" />,
  greenhouse: <Warehouse className="h-4 w-4" />,
  indoor: <Home className="h-4 w-4" />,
};

export default function GardenPage() {
  // All hooks must be called before any conditional returns

  // Migration automatique des anciennes rangees
  useMigration();

  const {
    spaces,
    currentSpaceId,
    setCurrentSpace,
    addSpace,
    deleteSpace,
  } = useGardenStore();
  const { location } = useWeatherStore();
  const { resetEditor, selectedPlotId, selectedPlantingId, selectedPlantId, selectedRowId, tool, setTool } = useEditorStore();
  const { getPlantById } = useCatalogStore();

  const [showNewSpaceDialog, setShowNewSpaceDialog] = useState(false);
  const [rowSpacing, setRowSpacing] = useState<number | null>(null); // null = use default

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => { setIsMobile(navigator.maxTouchPoints > 0); }, []);

  // Confirm dialog for space deletion
  const [confirmDeleteSpace, setConfirmDeleteSpace] = useState<(typeof spaces)[number] | null>(null);

  // Dialog pour le type de plantation (semis vs plant)
  const [showPlantingTypeDialog, setShowPlantingTypeDialog] = useState(false);
  const [pendingTransplantPlant, setPendingTransplantPlant] = useState<Plant | null>(null);
  const [plantingTypeResult, setPlantingTypeResult] = useState<PlantingTypeResult | null>(null);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newSpaceEnv, setNewSpaceEnv] = useState<EnvironmentType>("outdoor");
  const [showPlantPalette, setShowPlantPalette] = useState(false);
  const [showProperties, setShowProperties] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const currentSpace = spaces.find((s) => s.id === currentSpaceId);

  // Select first space if none selected
  useEffect(() => {
    if (!currentSpaceId && spaces.length > 0) {
      setCurrentSpace(spaces[0].id);
    }
  }, [currentSpaceId, spaces, setCurrentSpace]);

  // Auto-show/hide properties panel based on selection
  useEffect(() => {
    if (selectedPlotId || selectedPlantingId || selectedRowId) {
      setShowProperties(true);
    } else {
      setShowProperties(false);
    }
  }, [selectedPlotId, selectedPlantingId, selectedRowId]);

  // Réinitialiser l'espacement quand la plante change
  const selectedPlant = selectedPlantId ? getPlantById(selectedPlantId) : null;
  const defaultSpacing = selectedPlant?.spacing.plant || 30;
  const currentSpacing = rowSpacing ?? defaultSpacing;

  useEffect(() => {
    // Réinitialiser à la valeur par défaut quand la plante change
    setRowSpacing(null);
    // Réinitialiser le type de plantation quand on change de plante
    setPlantingTypeResult(null);
  }, [selectedPlantId]);

  // Handler quand une plante transplantable est selectionnee dans la palette
  const handleTransplantablePlantSelect = (plant: Plant) => {
    setPendingTransplantPlant(plant);
    setShowPlantingTypeDialog(true);
  };

  // Handler quand le dialog de type de plantation est confirme
  const handlePlantingTypeConfirm = (result: PlantingTypeResult) => {
    setPlantingTypeResult(result);
    if (pendingTransplantPlant) {
      // Selectionner la plante maintenant
      useEditorStore.getState().setSelectedPlant(pendingTransplantPlant.id);
      // Auto-switch to planting tool
      if (tool !== "plant-single" && tool !== "plant-row") {
        useEditorStore.getState().setTool("plant-single");
      }
    }
    setShowPlantingTypeDialog(false);
    setPendingTransplantPlant(null);
    setShowPlantPalette(false);
  };

  const handleCreateSpace = () => {
    const newSpace: GardenSpace = {
      id: generateId(),
      name: newSpaceName || `Espace ${spaces.length + 1}`,
      environment: newSpaceEnv,
      location,
      createdAt: new Date(),
    };

    addSpace(newSpace);
    setCurrentSpace(newSpace.id);
    setShowNewSpaceDialog(false);
    setNewSpaceName("");
    setNewSpaceEnv("outdoor");
    resetEditor();
  };

  // No spaces - show creation prompt
  if (spaces.length === 0) {
    return (
      <div className="p-4 h-[calc(100vh-8rem)] flex items-center justify-center relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-green-100 to-green-300 dark:from-slate-900 dark:via-green-950 dark:to-slate-900 -z-10" />

        {/* Decorative sun */}
        <div className="absolute top-8 right-8 pointer-events-none">
          <Sun className="h-16 w-16 text-yellow-400 drop-shadow-lg animate-pulse" style={{ animationDuration: '3s' }} />
        </div>

        {/* Decorative clouds */}
        <div className="absolute top-12 left-[15%] opacity-60 pointer-events-none animate-pulse" style={{ animationDuration: '4s' }}>
          <span className="text-5xl">☁️</span>
        </div>

        <Card className="max-w-md w-full border-4 border-green-500 shadow-2xl">
          <CardContent className="pt-8 text-center">
            <div className="text-6xl mb-4 animate-bounce" style={{ animationDuration: '2s' }}>🌻</div>
            <h2 className="text-2xl font-bold mb-2 text-green-800 dark:text-green-200">Bienvenue au jardin !</h2>
            <p className="text-green-600 dark:text-green-400 mb-6">
              Commencez par créer votre premier espace de jardinage
            </p>
            <Button
              onClick={() => setShowNewSpaceDialog(true)}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 text-lg"
            >
              <Leaf className="h-5 w-5 mr-2" />
              Créer mon jardin
            </Button>
          </CardContent>
        </Card>

        <NewSpaceDialog
          open={showNewSpaceDialog}
          onOpenChange={setShowNewSpaceDialog}
          name={newSpaceName}
          setName={setNewSpaceName}
          environment={newSpaceEnv}
          setEnvironment={setNewSpaceEnv}
          onCreate={handleCreateSpace}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] sm:h-[calc(100vh-8rem)] relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-green-100 to-green-200 dark:from-slate-900 dark:via-green-950 dark:to-slate-900 -z-10" />

      {/* Decorative sun */}
      <div className="absolute top-4 right-4 pointer-events-none z-0 hidden sm:block">
        <div className="relative">
          <Sun className="h-12 w-12 text-yellow-400 drop-shadow-lg animate-pulse" style={{ animationDuration: '3s' }} />
          <div className="absolute inset-0 bg-yellow-300/30 rounded-full blur-xl" />
        </div>
      </div>

      {/* Decorative clouds (hidden on mobile for performance) */}
      <div className="hidden sm:block absolute top-8 left-[10%] opacity-60 pointer-events-none animate-pulse" style={{ animationDuration: '4s' }}>
        <span className="text-4xl">☁️</span>
      </div>
      <div className="hidden sm:block absolute top-12 left-[60%] opacity-40 pointer-events-none animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }}>
        <span className="text-3xl">☁️</span>
      </div>

      {/* Header - Garden style */}
      <div className="garden-header flex items-center justify-between p-3 gap-2 relative z-10">
        {/* Space selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="garden-dropdown gap-2 font-semibold">
              <Leaf className="h-4 w-4 text-green-600" />
              <span className="font-medium truncate max-w-[120px]">
                {currentSpace?.name || "Sélectionner"}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-green-600" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="border-2 border-green-200">
            {spaces.map((space) => (
              <DropdownMenuItem
                key={space.id}
                onClick={() => {
                  setCurrentSpace(space.id);
                  resetEditor();
                }}
                className={cn(
                  "gap-2",
                  space.id === currentSpaceId && "bg-green-100 dark:bg-green-900"
                )}
              >
                {environmentIcons[space.environment]}
                {space.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              onClick={() => setShowNewSpaceDialog(true)}
              className="gap-2 text-green-600 font-medium"
            >
              <Plus className="h-4 w-4" />
              Nouvel espace
            </DropdownMenuItem>
            {currentSpace && spaces.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setConfirmDeleteSpace(currentSpace);
                  }}
                  className="gap-2 text-red-600 font-medium focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer cet espace
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Title with sparkle */}
        <div className="hidden md:flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          <span className="font-bold text-green-700 dark:text-green-400">Mon Potager</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowHelp(true)}
            title="Aide"
            className="hover:bg-green-100 dark:hover:bg-green-900"
          >
            <HelpCircle className="h-4 w-4 text-green-600" />
          </Button>
          {currentSpace && (
            <Link href={`/garden/3d?space=${currentSpace.id}`}>
              <Button variant="outline" size="sm" className="garden-dropdown">
                <Box className="h-4 w-4 mr-1 text-green-600" />
                <span className="hidden sm:inline">Vue 3D</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Main content with left toolbar */}
      <div className="flex-1 flex overflow-hidden relative z-10 min-h-0">
        {/* Left toolbar - Game style */}
        {/* Desktop left toolbar (hidden on mobile) */}
        <div className="hidden sm:flex game-toolbar flex-col gap-2 p-2 m-2 rounded-2xl">
          {/* Plant selector */}
          <button
            className={cn(
              "game-toolbar-button h-14 w-14 flex items-center justify-center",
              selectedPlantId && "active"
            )}
            title="Choisir une plante"
            onClick={() => setShowPlantPalette(true)}
          >
            <span className="text-2xl plant-emoji">🌱</span>
          </button>

          <div className="h-1 bg-amber-900/30 rounded-full mx-1" />

          <button className={cn("game-toolbar-button h-14 w-14 flex items-center justify-center", tool === "plot" && "active")} onClick={() => setTool("plot")} title="Créer une parcelle"><Square className="h-6 w-6" /></button>
          <button className={cn("game-toolbar-button h-14 w-14 flex items-center justify-center", tool === "row" && "active")} onClick={() => setTool("row")} title="Dessiner une rangée"><Minus className="h-6 w-6" /></button>
          <button className={cn("game-toolbar-button h-14 w-14 flex items-center justify-center", tool === "plant-single" && "active")} onClick={() => { setTool("plant-single"); setShowPlantPalette(true); }} title="Planter un par un"><Flower2 className="h-6 w-6" /></button>
          <button className={cn("game-toolbar-button h-14 w-14 flex items-center justify-center", tool === "plant-row" && "active")} onClick={() => { setTool("plant-row"); setShowPlantPalette(true); }} title="Planter en rangée"><GripHorizontal className="h-6 w-6" /></button>
          <button className={cn("game-toolbar-button h-14 w-14 flex items-center justify-center", tool === "eraser" && "!bg-gradient-to-b !from-red-500 !to-red-700 !border-red-800")} onClick={() => setTool("eraser")} title="Supprimer"><Eraser className="h-6 w-6" /></button>

          <div className="h-1 bg-amber-900/30 rounded-full mx-1" />

          <button className={cn("game-toolbar-button h-14 w-14 flex items-center justify-center", tool === "grass" && "active")} onClick={() => setTool("grass")} title="Zone d'herbe"><Trees className="h-6 w-6" /></button>
          <button className={cn("game-toolbar-button h-14 w-14 flex items-center justify-center", tool === "path" && "active")} onClick={() => setTool("path")} title="Chemin (double-clic pour terminer)"><Footprints className="h-6 w-6" /></button>
          <button className={cn("game-toolbar-button h-14 w-14 flex items-center justify-center", tool === "fence" && "active")} onClick={() => setTool("fence")} title="Clôture"><FenceIcon className="h-6 w-6" /></button>

          <div className="flex-1" />
          <div className="h-1 bg-amber-900/30 rounded-full mx-1" />

          <button className={cn("game-toolbar-button h-12 w-12 flex items-center justify-center", tool === "select" && "active")} onClick={() => setTool("select")} title="Sélectionner"><MousePointer2 className="h-5 w-5" /></button>
          <button className={cn("game-toolbar-button h-12 w-12 flex items-center justify-center", tool === "pan" && "active")} onClick={() => setTool("pan")} title="Déplacer la vue"><Move className="h-5 w-5" /></button>
        </div>

        {/* Canvas area */}
        <div className="flex-1 relative overflow-hidden min-h-0">
          {currentSpace ? (
            <div className="absolute inset-0 p-2">
              <GardenCanvas
                spaceId={currentSpace.id}
                rowSpacing={currentSpacing}
                plantingTypeResult={plantingTypeResult}
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Sélectionnez un espace
            </div>
          )}

          {/* Contextual instruction - no plant selected */}
          {currentSpace && (tool === "plant-single" || tool === "plant-row") && !selectedPlantId && (
            <div className="floating-badge absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-sm z-50">
              <Flower2 className="h-4 w-4" />
              {isMobile ? "Choisissez d'abord une plante 👆" : "Choisissez d'abord une plante"}
            </div>
          )}

          {/* Spacing control for plant-row tool */}
          {currentSpace && tool === "plant-row" && selectedPlant && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 plant-info-panel px-4 py-3 shadow-xl w-[calc(100vw-2rem)] max-w-sm z-50">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl plant-emoji">{selectedPlant.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-green-800 dark:text-green-300">{selectedPlant.name}</p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {isMobile ? "Glissez sur une rangée pour planter" : "Glissez sur une rangée pour planter"}
                  </p>
                </div>
              </div>
              <div className="space-y-2 bg-green-50 dark:bg-green-900/30 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-green-700 dark:text-green-300">Espacement</Label>
                  <span className="text-sm font-bold text-green-800 dark:text-green-200 bg-white dark:bg-green-800 px-2 py-0.5 rounded-full">{currentSpacing} cm</span>
                </div>
                <Slider
                  value={[currentSpacing]}
                  onValueChange={([v]) => setRowSpacing(v)}
                  min={5}
                  max={100}
                  step={5}
                  className="garden-slider"
                />
                <p className="text-xs text-green-600 dark:text-green-400 text-center">
                  Recommandé: {defaultSpacing} cm
                  {rowSpacing !== null && rowSpacing !== defaultSpacing && (
                    <button
                      className="ml-2 text-green-700 dark:text-green-300 font-semibold hover:underline"
                      onClick={() => setRowSpacing(null)}
                    >
                      Réinitialiser
                    </button>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom toolbar (visible only on mobile, positioned above BottomNav) */}
      <div className="flex sm:hidden game-toolbar-mobile overflow-x-auto px-2 py-1.5 gap-1.5 safe-bottom">
        {/* Plant selector */}
        <button
          className={cn("mobile-tool-btn", selectedPlantId && "active")}
          onClick={() => setShowPlantPalette(true)}
        >
          <span className="text-xl">🌱</span>
          <span className="tool-label">Plantes</span>
        </button>
        <div className="w-px bg-amber-900/30 self-stretch mx-0.5 shrink-0" />
        <button className={cn("mobile-tool-btn", tool === "plot" && "active")} onClick={() => setTool("plot")}>
          <Square className="h-5 w-5" /><span className="tool-label">Parcelle</span>
        </button>
        <button className={cn("mobile-tool-btn", tool === "row" && "active")} onClick={() => setTool("row")}>
          <Minus className="h-5 w-5" /><span className="tool-label">Rangée</span>
        </button>
        <button className={cn("mobile-tool-btn", tool === "plant-single" && "active")} onClick={() => { setTool("plant-single"); setShowPlantPalette(true); }}>
          <Flower2 className="h-5 w-5" /><span className="tool-label">Planter</span>
        </button>
        <button className={cn("mobile-tool-btn", tool === "plant-row" && "active")} onClick={() => { setTool("plant-row"); setShowPlantPalette(true); }}>
          <GripHorizontal className="h-5 w-5" /><span className="tool-label">En rangée</span>
        </button>
        <button className={cn("mobile-tool-btn", tool === "eraser" && "!bg-gradient-to-b !from-red-500 !to-red-700 !border-red-800 !text-white")} onClick={() => setTool("eraser")}>
          <Eraser className="h-5 w-5" /><span className="tool-label">Gomme</span>
        </button>
        <div className="w-px bg-amber-900/30 self-stretch mx-0.5 shrink-0" />
        <button className={cn("mobile-tool-btn", tool === "grass" && "active")} onClick={() => setTool("grass")}>
          <Trees className="h-5 w-5" /><span className="tool-label">Herbe</span>
        </button>
        <button className={cn("mobile-tool-btn", tool === "path" && "active")} onClick={() => setTool("path")}>
          <Footprints className="h-5 w-5" /><span className="tool-label">Chemin</span>
        </button>
        <button className={cn("mobile-tool-btn", tool === "fence" && "active")} onClick={() => setTool("fence")}>
          <FenceIcon className="h-5 w-5" /><span className="tool-label">Clôture</span>
        </button>
        <div className="w-px bg-amber-900/30 self-stretch mx-0.5 shrink-0" />
        <button className={cn("mobile-tool-btn", tool === "select" && "active")} onClick={() => setTool("select")}>
          <MousePointer2 className="h-5 w-5" /><span className="tool-label">Sélect.</span>
        </button>
        <button className={cn("mobile-tool-btn", tool === "pan" && "active")} onClick={() => setTool("pan")}>
          <Move className="h-5 w-5" /><span className="tool-label">Déplacer</span>
        </button>
      </div>

      {/* Plant palette sheet (shared between desktop & mobile toolbar triggers) */}
      <Sheet open={showPlantPalette} onOpenChange={setShowPlantPalette}>
        <SheetContent
          side={isMobile ? "bottom" : "left"}
          className={cn("p-0 border-green-500", isMobile ? "border-t-4 h-[75vh]" : "border-r-4 w-80")}
        >
          <SheetHeader className="p-4 border-b bg-gradient-to-r from-green-500 to-green-600 text-white">
            <SheetTitle className="text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Mes Plantes
            </SheetTitle>
          </SheetHeader>
          <div className="overflow-auto h-[calc(100%-5rem)]">
            <PlantPalette
              onSelect={() => setShowPlantPalette(false)}
              onTransplantablePlantSelect={handleTransplantablePlantSelect}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Properties panel - floating when something selected */}
      {/* Properties panel - always mounted to avoid Radix unmount-while-open crash */}
      <Sheet
        open={showProperties && !!(selectedPlotId || selectedPlantingId || selectedRowId)}
        onOpenChange={setShowProperties}
      >
        <SheetTrigger asChild>
          <button
            className={cn(
              "game-toolbar-button active fixed right-4 h-14 w-14 z-50 flex items-center justify-center",
              isMobile ? "bottom-20" : "bottom-32",
              !(selectedPlotId || selectedPlantingId || selectedRowId) && "hidden"
            )}
          >
            <Settings2 className="h-6 w-6" />
          </button>
        </SheetTrigger>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={cn("p-0 border-green-500", isMobile ? "border-t-4 h-[65vh]" : "border-l-4 w-80")}
        >
          <SheetHeader className="p-4 border-b bg-gradient-to-r from-green-500 to-green-600 text-white">
            <SheetTitle className="text-white flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Propriétés
            </SheetTitle>
          </SheetHeader>
          <div className="overflow-auto h-[calc(100%-5rem)]">
            <PropertiesPanel />
          </div>
        </SheetContent>
      </Sheet>

      {/* Help dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-md border-4 border-green-500">
          <DialogHeader className="bg-gradient-to-r from-green-500 to-green-600 -m-6 mb-4 p-4 rounded-t-lg">
            <DialogTitle className="text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Comment jardiner
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="bg-amber-200 dark:bg-amber-700 rounded-full h-8 w-8 flex items-center justify-center shrink-0 font-bold text-amber-800 dark:text-amber-200">
                1
              </div>
              <div>
                <p className="font-bold text-amber-800 dark:text-amber-200">Créer une parcelle</p>
                <p className="text-amber-700 dark:text-amber-300 text-xs">
                  {isMobile
                    ? "Appuyez sur l'outil ◻️ puis dessinez une zone en glissant le doigt sur le jardin."
                    : "Cliquez sur l'outil ◻️ puis dessinez une zone en cliquant-glissant sur le sol du jardin."}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="bg-orange-200 dark:bg-orange-700 rounded-full h-8 w-8 flex items-center justify-center shrink-0 font-bold text-orange-800 dark:text-orange-200">
                2
              </div>
              <div>
                <p className="font-bold text-orange-800 dark:text-orange-200">Tracer des rangées</p>
                <p className="text-orange-700 dark:text-orange-300 text-xs">
                  Avec l'outil — dessinez des lignes dans vos parcelles pour organiser vos cultures.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="bg-green-200 dark:bg-green-700 rounded-full h-8 w-8 flex items-center justify-center shrink-0 font-bold text-green-800 dark:text-green-200">
                3
              </div>
              <div>
                <p className="font-bold text-green-800 dark:text-green-200">Planter !</p>
                <p className="text-green-700 dark:text-green-300 text-xs">
                  Choisissez une plante avec 🌱 puis :<br/>
                  {isMobile
                    ? "• 🌸 Appuyez pour planter\n• 📏 Glissez sur une rangée"
                    : "• 🌸 Cliquez pour planter un par un\n• 📏 Glissez sur une rangée pour remplir"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="bg-blue-200 dark:bg-blue-700 rounded-full h-8 w-8 flex items-center justify-center shrink-0 font-bold text-blue-800 dark:text-blue-200">
                4
              </div>
              <div>
                <p className="font-bold text-blue-800 dark:text-blue-200">Gérer le jardin</p>
                <p className="text-blue-700 dark:text-blue-300 text-xs">
                  {isMobile
                    ? "Appuyez sur le curseur pour sélectionner et glisser les éléments. La gomme supprime en tapant."
                    : "Utilisez le curseur pour sélectionner et modifier les propriétés. La gomme supprime les éléments."}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowHelp(false)} className="bg-green-600 hover:bg-green-700 text-white">
              <Leaf className="h-4 w-4 mr-2" />
              C'est parti !
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New space dialog */}
      <NewSpaceDialog
        open={showNewSpaceDialog}
        onOpenChange={setShowNewSpaceDialog}
        name={newSpaceName}
        setName={setNewSpaceName}
        environment={newSpaceEnv}
        setEnvironment={setNewSpaceEnv}
        onCreate={handleCreateSpace}
      />

      {/* Dialog pour choisir semis vs plant */}
      {pendingTransplantPlant && (
        <PlantingTypeDialog
          open={showPlantingTypeDialog}
          onOpenChange={(open) => {
            setShowPlantingTypeDialog(open);
            if (!open) {
              setPendingTransplantPlant(null);
            }
          }}
          plant={pendingTransplantPlant}
          onConfirm={handlePlantingTypeConfirm}
        />
      )}

      {/* Confirm space deletion - simple overlay without Radix to avoid iOS touch issues */}
      {confirmDeleteSpace && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Supprimer l&apos;espace ?</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Supprimer &quot;{confirmDeleteSpace.name}&quot; et tout son contenu (parcelles, plantations, etc.) ? Cette action est irréversible.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 active:scale-95"
                onClick={() => setConfirmDeleteSpace(null)}
              >
                Annuler
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-sm font-medium text-white active:scale-95"
                onClick={() => {
                  const remaining = spaces.filter((s) => s.id !== confirmDeleteSpace.id);
                  setShowProperties(false);
                  deleteSpace(confirmDeleteSpace.id);
                  if (remaining.length > 0) setCurrentSpace(remaining[0].id);
                  resetEditor();
                  setConfirmDeleteSpace(null);
                }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface NewSpaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  setName: (name: string) => void;
  environment: EnvironmentType;
  setEnvironment: (env: EnvironmentType) => void;
  onCreate: () => void;
}

function NewSpaceDialog({
  open,
  onOpenChange,
  name,
  setName,
  environment,
  setEnvironment,
  onCreate,
}: NewSpaceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-4 border-green-500">
        <DialogHeader className="bg-gradient-to-r from-green-500 to-green-600 -m-6 mb-4 p-4 rounded-t-lg">
          <DialogTitle className="text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Nouvel espace de jardinage
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-green-700 dark:text-green-300 font-semibold">Nom du jardin</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mon potager"
              className="border-green-300 focus:border-green-500"
            />
          </div>

          <div>
            <Label className="text-green-700 dark:text-green-300 font-semibold">Type d'environnement</Label>
            <Select
              value={environment}
              onValueChange={(v: EnvironmentType) => setEnvironment(v)}
            >
              <SelectTrigger className="border-green-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="outdoor">
                  <div className="flex items-center gap-2">
                    <Tent className="h-4 w-4 text-green-600" />
                    Extérieur (plein air)
                  </div>
                </SelectItem>
                <SelectItem value="greenhouse">
                  <div className="flex items-center gap-2">
                    <Warehouse className="h-4 w-4 text-green-600" />
                    Serre extérieure
                  </div>
                </SelectItem>
                <SelectItem value="indoor">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-green-600" />
                    Intérieur (petite serre / appartement)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-green-300 text-green-700">
            Annuler
          </Button>
          <Button onClick={onCreate} className="bg-green-600 hover:bg-green-700 text-white">
            <Leaf className="h-4 w-4 mr-2" />
            Créer l'espace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
