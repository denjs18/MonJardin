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
    <div className="flex items-center gap-1 p-2 bg-background border rounded-lg shadow-sm">
      {/* Selection tools */}
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

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Drawing tools */}
      <ToolButton
        tool="plot"
        currentTool={tool}
        icon={<Square className="h-4 w-4" />}
        label="Créer une parcelle"
        shortcut="P"
        onClick={() => setTool("plot")}
      />
      <ToolButton
        tool="plant-single"
        currentTool={tool}
        icon={<Flower2 className="h-4 w-4" />}
        label="Planter (un par un)"
        shortcut="S"
        onClick={() => setTool("plant-single")}
      />
      <ToolButton
        tool="plant-row"
        currentTool={tool}
        icon={<GripHorizontal className="h-4 w-4" />}
        label="Planter (rangée)"
        shortcut="R"
        onClick={() => setTool("plant-row")}
      />
      <ToolButton
        tool="eraser"
        currentTool={tool}
        icon={<Eraser className="h-4 w-4" />}
        label="Supprimer"
        shortcut="E"
        onClick={() => setTool("eraser")}
      />

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* View controls */}
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
            <p>Grille {showGrid ? "activée" : "désactivée"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setZoom(zoom / 1.2)}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setZoom(zoom * 1.2)}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={resetEditor}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Réinitialiser la vue</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
