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

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Plant palette (left) - hidden on mobile */}
        <div className="w-64 border-r flex-shrink-0 overflow-hidden hidden md:block">
          <PlantPalette />
        </div>

        {/* Canvas (center) */}
        <div className="flex-1 p-2 overflow-hidden min-w-0">
          {currentSpace ? (
            <GardenCanvas
              spaceId={currentSpace.id}
              width={currentSpace.width}
              height={currentSpace.height}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Sélectionnez un espace
            </div>
          )}
        </div>

        {/* Properties panel (right) - hidden on mobile */}
        <div className="w-64 border-l flex-shrink-0 overflow-auto hidden lg:block">
          <PropertiesPanel />
        </div>
      </div>

      {/* Mobile bottom bar */}
      <div className="md:hidden border-t p-2 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => {
            // TODO: Open plant palette drawer
          }}
        >
          🌱 Plantes
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => {
            // TODO: Open properties drawer
          }}
        >
          ⚙️ Propriétés
        </Button>
      </div>

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
