"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useGardenStore, useEditorStore, useCatalogStore } from "@/lib/store";
import { Plot, Planting, PlantingMode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { generateId } from "@/lib/utils";

interface GardenCanvasProps {
  spaceId: string;
  width: number;
  height: number;
  onPlotSelect?: (plot: Plot | null) => void;
  onPlantingSelect?: (planting: Planting | null) => void;
}

const PIXELS_PER_METER = 100; // 1 meter = 100 pixels at zoom 1

export function GardenCanvas({
  spaceId,
  width,
  height,
  onPlotSelect,
  onPlantingSelect,
}: GardenCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragCurrent, setDragCurrent] = useState({ x: 0, y: 0 });
  const [isDrawingRow, setIsDrawingRow] = useState(false);
  const [rowStart, setRowStart] = useState<{ x: number; y: number } | null>(null);

  const {
    plots,
    plantings,
    addPlot,
    updatePlot,
    addPlanting,
    getPlotsBySpace,
    getPlantingsBySpace,
  } = useGardenStore();

  const {
    tool,
    zoom,
    panOffset,
    showGrid,
    gridSize,
    selectedPlotId,
    selectedPlantingId,
    selectedPlantId,
    setSelectedPlot,
    setSelectedPlanting,
    setPanOffset,
  } = useEditorStore();

  const { getPlantById } = useCatalogStore();

  const spacePlots = getPlotsBySpace(spaceId);
  const spacePlantings = getPlantingsBySpace(spaceId);

  // Convert screen coordinates to garden coordinates
  const screenToGarden = useCallback(
    (screenX: number, screenY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };

      return {
        x: (screenX - rect.left - panOffset.x) / (PIXELS_PER_METER * zoom),
        y: (screenY - rect.top - panOffset.y) / (PIXELS_PER_METER * zoom),
      };
    },
    [zoom, panOffset]
  );

  // Handle mouse down
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const pos = screenToGarden(e.clientX, e.clientY);

      if (tool === "pan") {
        setIsDragging(true);
        setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
        return;
      }

      if (tool === "plot") {
        setIsDragging(true);
        setDragStart(pos);
        setDragCurrent(pos);
        return;
      }

      if (tool === "plant-row" && selectedPlantId) {
        // Find which plot we're clicking in
        const clickedPlot = spacePlots.find(
          (p) =>
            pos.x >= p.x &&
            pos.x <= p.x + p.width &&
            pos.y >= p.y &&
            pos.y <= p.y + p.height
        );

        if (clickedPlot) {
          setIsDrawingRow(true);
          setRowStart({
            x: pos.x - clickedPlot.x,
            y: pos.y - clickedPlot.y,
          });
          setDragCurrent(pos);
        }
        return;
      }

      if (tool === "plant-single" && selectedPlantId) {
        // Find which plot we're clicking in
        const clickedPlot = spacePlots.find(
          (p) =>
            pos.x >= p.x &&
            pos.x <= p.x + p.width &&
            pos.y >= p.y &&
            pos.y <= p.y + p.height
        );

        if (clickedPlot) {
          const plant = getPlantById(selectedPlantId);
          if (plant) {
            const newPlanting: Planting = {
              id: generateId(),
              spaceId,
              plotId: clickedPlot.id,
              plantId: plant.id,
              plantName: plant.name,
              variety: "",
              mode: "single",
              position: {
                x: pos.x - clickedPlot.x,
                y: pos.y - clickedPlot.y,
              },
              plantedAt: new Date(),
              seedlingStartedAt: null,
              expectedHarvestAt: new Date(
                Date.now() + plant.daysToMaturity * 24 * 60 * 60 * 1000
              ),
              harvestedAt: null,
              status: "seedling",
              growthStage: 0,
              events: [],
              disease: null,
            };
            addPlanting(newPlanting);
          }
        }
        return;
      }

      if (tool === "select") {
        // Check if clicking on a planting
        for (const planting of spacePlantings) {
          const plot = spacePlots.find((p) => p.id === planting.plotId);
          if (!plot) continue;

          const plantX = plot.x + planting.position.x;
          const plantY = plot.y + planting.position.y;
          const dist = Math.sqrt(
            Math.pow(pos.x - plantX, 2) + Math.pow(pos.y - plantY, 2)
          );

          if (dist < 0.15) {
            // 15cm click radius
            setSelectedPlanting(planting.id);
            setSelectedPlot(null);
            onPlantingSelect?.(planting);
            return;
          }
        }

        // Check if clicking on a plot
        const clickedPlot = spacePlots.find(
          (p) =>
            pos.x >= p.x &&
            pos.x <= p.x + p.width &&
            pos.y >= p.y &&
            pos.y <= p.y + p.height
        );

        if (clickedPlot) {
          setSelectedPlot(clickedPlot.id);
          setSelectedPlanting(null);
          onPlotSelect?.(clickedPlot);
        } else {
          setSelectedPlot(null);
          setSelectedPlanting(null);
          onPlotSelect?.(null);
          onPlantingSelect?.(null);
        }
      }
    },
    [
      tool,
      screenToGarden,
      panOffset,
      selectedPlantId,
      spacePlots,
      spacePlantings,
      getPlantById,
      spaceId,
      addPlanting,
      setSelectedPlot,
      setSelectedPlanting,
      onPlotSelect,
      onPlantingSelect,
    ]
  );

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (tool === "pan" && isDragging) {
        setPanOffset({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
        return;
      }

      if ((tool === "plot" && isDragging) || isDrawingRow) {
        const pos = screenToGarden(e.clientX, e.clientY);
        setDragCurrent(pos);
      }
    },
    [tool, isDragging, isDrawingRow, dragStart, screenToGarden, setPanOffset]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (tool === "plot" && isDragging) {
        const pos = screenToGarden(e.clientX, e.clientY);
        const x = Math.min(dragStart.x, pos.x);
        const y = Math.min(dragStart.y, pos.y);
        const w = Math.abs(pos.x - dragStart.x);
        const h = Math.abs(pos.y - dragStart.y);

        if (w > 0.1 && h > 0.1) {
          // Min 10cm
          const newPlot: Plot = {
            id: generateId(),
            spaceId,
            name: `Parcelle ${spacePlots.length + 1}`,
            x,
            y,
            width: w,
            height: h,
            rotation: 0,
            soil: { type: "normal", enrichedAt: null, notes: "" },
            mulch: "none",
            mulchAppliedAt: null,
            color: `hsl(${Math.random() * 60 + 20}, 70%, 35%)`,
          };
          addPlot(newPlot);
        }
      }

      if (isDrawingRow && rowStart && selectedPlantId) {
        const pos = screenToGarden(e.clientX, e.clientY);
        const clickedPlot = spacePlots.find(
          (p) =>
            pos.x >= p.x &&
            pos.x <= p.x + p.width &&
            pos.y >= p.y &&
            pos.y <= p.y + p.height
        );

        if (clickedPlot) {
          const plant = getPlantById(selectedPlantId);
          if (plant) {
            const endX = pos.x - clickedPlot.x;
            const endY = pos.y - clickedPlot.y;
            const length = Math.sqrt(
              Math.pow(endX - rowStart.x, 2) + Math.pow(endY - rowStart.y, 2)
            );
            const spacing = plant.spacing.plant / 100; // Convert cm to m
            const plantCount = Math.max(1, Math.floor(length / spacing) + 1);

            const newPlanting: Planting = {
              id: generateId(),
              spaceId,
              plotId: clickedPlot.id,
              plantId: plant.id,
              plantName: plant.name,
              variety: "",
              mode: "row",
              position: rowStart,
              rowConfig: {
                startX: rowStart.x,
                startY: rowStart.y,
                endX,
                endY,
                spacing: plant.spacing.plant,
                plantCount,
              },
              plantedAt: new Date(),
              seedlingStartedAt: null,
              expectedHarvestAt: new Date(
                Date.now() + plant.daysToMaturity * 24 * 60 * 60 * 1000
              ),
              harvestedAt: null,
              status: "seedling",
              growthStage: 0,
              events: [],
              disease: null,
            };
            addPlanting(newPlanting);
          }
        }
      }

      setIsDragging(false);
      setIsDrawingRow(false);
      setRowStart(null);
    },
    [
      tool,
      isDragging,
      isDrawingRow,
      rowStart,
      dragStart,
      selectedPlantId,
      screenToGarden,
      spacePlots,
      spaceId,
      getPlantById,
      addPlot,
      addPlanting,
    ]
  );

  // Handle wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      useEditorStore.getState().setZoom(zoom * delta);
    },
    [zoom]
  );

  const canvasWidth = width * PIXELS_PER_METER * zoom;
  const canvasHeight = height * PIXELS_PER_METER * zoom;

  // Center the garden on initial load
  useEffect(() => {
    if (canvasRef.current && panOffset.x === 0 && panOffset.y === 0) {
      const rect = canvasRef.current.getBoundingClientRect();
      const centerX = (rect.width - canvasWidth) / 2;
      const centerY = (rect.height - canvasHeight) / 2;
      setPanOffset({ x: Math.max(20, centerX), y: Math.max(20, centerY) });
    }
  }, [canvasWidth, canvasHeight, panOffset.x, panOffset.y, setPanOffset]);

  return (
    <div
      ref={canvasRef}
      className={cn(
        "relative overflow-auto bg-slate-100 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-lg",
        tool === "pan" && "cursor-grab",
        tool === "pan" && isDragging && "cursor-grabbing",
        tool === "plot" && "cursor-crosshair",
        tool === "plant-single" && "cursor-cell",
        tool === "plant-row" && "cursor-crosshair"
      )}
      style={{ width: "100%", height: "100%", minHeight: "400px" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Garden area */}
      <div
        className="absolute bg-amber-100 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700"
        style={{
          width: canvasWidth,
          height: canvasHeight,
          left: panOffset.x,
          top: panOffset.y,
        }}
      >
        {/* Grid */}
        {showGrid && (
          <svg
            className="absolute inset-0 pointer-events-none"
            width={canvasWidth}
            height={canvasHeight}
          >
            <defs>
              <pattern
                id="grid"
                width={gridSize * zoom}
                height={gridSize * zoom}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d={`M ${gridSize * zoom} 0 L 0 0 0 ${gridSize * zoom}`}
                  fill="none"
                  stroke="rgba(0,0,0,0.1)"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        )}

        {/* Plots */}
        {spacePlots.map((plot) => (
          <div
            key={plot.id}
            className={cn(
              "absolute border-2 rounded transition-colors",
              selectedPlotId === plot.id
                ? "border-primary ring-2 ring-primary/30"
                : "border-amber-600/50"
            )}
            style={{
              left: plot.x * PIXELS_PER_METER * zoom,
              top: plot.y * PIXELS_PER_METER * zoom,
              width: plot.width * PIXELS_PER_METER * zoom,
              height: plot.height * PIXELS_PER_METER * zoom,
              backgroundColor: plot.color || "rgba(139, 105, 20, 0.3)",
              transform: `rotate(${plot.rotation}deg)`,
            }}
          >
            <span className="absolute top-1 left-1 text-xs font-medium text-white bg-black/50 px-1 rounded">
              {plot.name}
            </span>
          </div>
        ))}

        {/* Plantings */}
        {spacePlantings.map((planting) => {
          const plot = spacePlots.find((p) => p.id === planting.plotId);
          if (!plot) return null;

          const plant = getPlantById(planting.plantId);
          const emoji = plant?.emoji || "🌱";

          if (planting.mode === "row" && planting.rowConfig) {
            // Render row of plants
            const { startX, startY, endX, endY, plantCount } = planting.rowConfig;
            const plants = [];

            for (let i = 0; i < plantCount; i++) {
              const t = plantCount > 1 ? i / (plantCount - 1) : 0;
              const x = startX + t * (endX - startX);
              const y = startY + t * (endY - startY);

              plants.push(
                <div
                  key={`${planting.id}-${i}`}
                  className={cn(
                    "absolute flex items-center justify-center transition-transform hover:scale-125 cursor-pointer",
                    selectedPlantingId === planting.id && "ring-2 ring-primary rounded-full"
                  )}
                  style={{
                    left: (plot.x + x) * PIXELS_PER_METER * zoom - 12,
                    top: (plot.y + y) * PIXELS_PER_METER * zoom - 12,
                    width: 24,
                    height: 24,
                    fontSize: 16 * Math.max(0.5, zoom),
                  }}
                >
                  {emoji}
                </div>
              );
            }

            return <>{plants}</>;
          }

          // Single plant
          return (
            <div
              key={planting.id}
              className={cn(
                "absolute flex items-center justify-center transition-transform hover:scale-125 cursor-pointer",
                selectedPlantingId === planting.id && "ring-2 ring-primary rounded-full"
              )}
              style={{
                left:
                  (plot.x + planting.position.x) * PIXELS_PER_METER * zoom - 12,
                top:
                  (plot.y + planting.position.y) * PIXELS_PER_METER * zoom - 12,
                width: 24,
                height: 24,
                fontSize: 16 * Math.max(0.5, zoom),
              }}
            >
              {emoji}
            </div>
          );
        })}

        {/* Drawing preview - Plot */}
        {tool === "plot" && isDragging && (
          <div
            className="absolute border-2 border-dashed border-primary bg-primary/20"
            style={{
              left: Math.min(dragStart.x, dragCurrent.x) * PIXELS_PER_METER * zoom,
              top: Math.min(dragStart.y, dragCurrent.y) * PIXELS_PER_METER * zoom,
              width:
                Math.abs(dragCurrent.x - dragStart.x) * PIXELS_PER_METER * zoom,
              height:
                Math.abs(dragCurrent.y - dragStart.y) * PIXELS_PER_METER * zoom,
            }}
          />
        )}

        {/* Drawing preview - Row */}
        {isDrawingRow && rowStart && (
          <svg
            className="absolute inset-0 pointer-events-none"
            width={canvasWidth}
            height={canvasHeight}
          >
            <line
              x1={
                (spacePlots.find((p) =>
                  rowStart.x >= 0 && rowStart.y >= 0
                )?.x || 0) *
                  PIXELS_PER_METER *
                  zoom +
                rowStart.x * PIXELS_PER_METER * zoom
              }
              y1={
                (spacePlots.find((p) =>
                  rowStart.x >= 0 && rowStart.y >= 0
                )?.y || 0) *
                  PIXELS_PER_METER *
                  zoom +
                rowStart.y * PIXELS_PER_METER * zoom
              }
              x2={dragCurrent.x * PIXELS_PER_METER * zoom}
              y2={dragCurrent.y * PIXELS_PER_METER * zoom}
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          </svg>
        )}
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-2 right-2 bg-background/80 px-2 py-1 rounded text-xs">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}
