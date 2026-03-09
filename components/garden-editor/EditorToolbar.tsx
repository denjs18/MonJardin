"use client";

import {
  MousePointer2,
  Move,
  Square,
  Flower2,
  GripHorizontal,
  Eraser,
  Grid3X3,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEditorStore } from "@/lib/store";
import { EditorTool } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ToolButtonProps {
  tool: EditorTool;
  currentTool: EditorTool;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
}

function ToolButton({
  tool,
  currentTool,
  icon,
  label,
  shortcut,
  onClick,
}: ToolButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            variant={currentTool === tool ? "default" : "ghost"}
            size="icon"
            className={cn(
              "h-9 w-9",
              currentTool === tool && "bg-primary text-primary-foreground"
            )}
            onClick={onClick}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>
            {label}
            {shortcut && (
              <span className="ml-2 text-muted-foreground">({shortcut})</span>
            )}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function EditorToolbar() {
  const {
    tool,
    zoom,
    showGrid,
    setTool,
    setZoom,
    toggleGrid,
    resetEditor,
  } = useEditorStore();

  return (
    <div className="flex items-center gap-1 p-1 sm:p-2 bg-background border rounded-lg shadow-sm overflow-x-auto">
      {/* Main tools - always visible */}
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant={tool === "plot" ? "default" : "outline"}
              size="sm"
              className={cn(
                "gap-1 shrink-0",
                tool === "plot" && "bg-primary text-primary-foreground"
              )}
              onClick={() => setTool("plot")}
            >
              <Square className="h-4 w-4" />
              Parcelle
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Créer une parcelle</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant={tool === "plant-single" ? "default" : "outline"}
              size="sm"
              className={cn(
                "gap-1 shrink-0",
                tool === "plant-single" && "bg-green-600 hover:bg-green-700 text-white"
              )}
              onClick={() => setTool("plant-single")}
            >
              <Flower2 className="h-4 w-4" />
              Planter
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Planter un par un</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant={tool === "plant-row" ? "default" : "outline"}
              size="sm"
              className={cn(
                "gap-1 shrink-0",
                tool === "plant-row" && "bg-green-600 hover:bg-green-700 text-white"
              )}
              onClick={() => setTool("plant-row")}
            >
              <GripHorizontal className="h-4 w-4" />
              Rangée
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Planter en rangée</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <ToolButton
        tool="eraser"
        currentTool={tool}
        icon={<Eraser className="h-4 w-4" />}
        label="Supprimer"
        shortcut="E"
        onClick={() => setTool("eraser")}
      />

      {/* Secondary tools - hidden on very small screens */}
      <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />

      <div className="hidden sm:flex items-center gap-1">
        <ToolButton
          tool="select"
          currentTool={tool}
          icon={<MousePointer2 className="h-4 w-4" />}
          label="Sélectionner"
          shortcut="V"
          onClick={() => setTool("select")}
        />
        <ToolButton
          tool="pan"
          currentTool={tool}
          icon={<Move className="h-4 w-4" />}
          label="Déplacer la vue"
          shortcut="H"
          onClick={() => setTool("pan")}
        />
      </div>

      <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />

      {/* View controls - hidden on mobile */}
      <div className="hidden sm:flex items-center gap-1">
        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <Toggle
                pressed={showGrid}
                onPressedChange={toggleGrid}
                size="sm"
                className="h-9 w-9"
              >
                <Grid3X3 className="h-4 w-4" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Grille</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setZoom(zoom / 1.2)}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setZoom(zoom * 1.2)}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
