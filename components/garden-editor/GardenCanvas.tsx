"use client";

import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { Trash2, Move, X, Rows3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGardenStore, useEditorStore, useCatalogStore } from "@/lib/store";
import { Plot, Planting, PlantingMode, GardenRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { generateId } from "@/lib/utils";

interface GardenCanvasProps {
  spaceId: string;
  width: number;
  height: number;
  onPlotSelect?: (plot: Plot | null) => void;
  onPlantingSelect?: (planting: Planting | null) => void;
  onRowSelect?: (row: GardenRow | null) => void;
}

const PIXELS_PER_METER = 100; // 1 meter = 100 pixels at zoom 1

export function GardenCanvas({
  spaceId,
  width,
  height,
  onPlotSelect,
  onPlantingSelect,
  onRowSelect,
}: GardenCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragCurrent, setDragCurrent] = useState({ x: 0, y: 0 });
  const [isDrawingRow, setIsDrawingRow] = useState(false);
  const [rowStart, setRowStart] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingPlant, setIsDraggingPlant] = useState(false);
  const [draggedPlantingId, setDraggedPlantingId] = useState<string | null>(null);
  const [selectedPlantIndex, setSelectedPlantIndex] = useState<number | null>(null); // For row plants
  const [isDrawingGardenRow, setIsDrawingGardenRow] = useState(false);
  const [gardenRowStart, setGardenRowStart] = useState<{ x: number; y: number; plotId: string } | null>(null);

  const {
    plots,
    plantings,
    rows,
    addPlot,
    updatePlot,
    addPlanting,
    updatePlanting,
    deletePlanting,
    addRow,
    deleteRow,
    getPlotsBySpace,
    getPlantingsBySpace,
    getRowsBySpace,
    getPlantingsByRow,
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
    selectedRowId,
    setSelectedPlot,
    setSelectedPlanting,
    setSelectedRow,
    setPanOffset,
  } = useEditorStore();

  const { getPlantById } = useCatalogStore();

  const spacePlots = getPlotsBySpace(spaceId);
  const spacePlantings = getPlantingsBySpace(spaceId);
  const spaceRows = getRowsBySpace(spaceId);

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

      // Helper function to find clicked row (GardenRow)
      const findClickedRow = (clickPos: { x: number; y: number }) => {
        for (const row of spaceRows) {
          const plot = spacePlots.find((p) => p.id === row.plotId);
          if (!plot) continue;

          const ax = plot.x + row.startX;
          const ay = plot.y + row.startY;
          const bx = plot.x + row.endX;
          const by = plot.y + row.endY;

          const dx = bx - ax;
          const dy = by - ay;
          const len2 = dx * dx + dy * dy;

          if (len2 === 0) {
            const dist = Math.sqrt(Math.pow(clickPos.x - ax, 2) + Math.pow(clickPos.y - ay, 2));
            if (dist < 0.15) return { row, plot };
          } else {
            const t = Math.max(0, Math.min(1, ((clickPos.x - ax) * dx + (clickPos.y - ay) * dy) / len2));
            const projX = ax + t * dx;
            const projY = ay + t * dy;
            const dist = Math.sqrt(Math.pow(clickPos.x - projX, 2) + Math.pow(clickPos.y - projY, 2));
            if (dist < 0.15) return { row, plot };
          }
        }
        return null;
      };

      // Helper function to find clicked planting
      const findClickedPlanting = () => {
        for (const planting of spacePlantings) {
          const plot = spacePlots.find((p) => p.id === planting.plotId);
          if (!plot) continue;

          if (planting.mode === "row" && planting.rowConfig) {
            const { startX, startY, endX, endY, plantCount } = planting.rowConfig;
            for (let i = 0; i < plantCount; i++) {
              const t = plantCount > 1 ? i / (plantCount - 1) : 0;
              const x = plot.x + startX + t * (endX - startX);
              const y = plot.y + startY + t * (endY - startY);
              const dist = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2));
              if (dist < 0.15) {
                return { planting, plantIndex: i };
              }
            }
          } else {
            const plantX = plot.x + planting.position.x;
            const plantY = plot.y + planting.position.y;
            const dist = Math.sqrt(Math.pow(pos.x - plantX, 2) + Math.pow(pos.y - plantY, 2));
            if (dist < 0.15) {
              return { planting, plantIndex: null };
            }
          }
        }
        return null;
      };

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

      // Outil "row" - dessiner une rangée indépendante
      if (tool === "row") {
        const clickedPlot = spacePlots.find(
          (p) =>
            pos.x >= p.x &&
            pos.x <= p.x + p.width &&
            pos.y >= p.y &&
            pos.y <= p.y + p.height
        );

        if (clickedPlot) {
          setIsDrawingGardenRow(true);
          setGardenRowStart({
            x: pos.x - clickedPlot.x,
            y: pos.y - clickedPlot.y,
            plotId: clickedPlot.id,
          });
          setDragCurrent(pos);
        }
        return;
      }

      if (tool === "plant-row" && selectedPlantId) {
        // Chercher si on clique près d'une rangée existante
        const clickedRow = findClickedRow(pos);

        if (clickedRow) {
          // Planter sur cette rangée
          const plot = spacePlots.find((p) => p.id === clickedRow.row.plotId);
          if (plot) {
            const plant = getPlantById(selectedPlantId);
            if (plant) {
              // Calculer la position sur la rangée (0-1)
              const rowLength = Math.sqrt(
                Math.pow(clickedRow.row.endX - clickedRow.row.startX, 2) +
                Math.pow(clickedRow.row.endY - clickedRow.row.startY, 2)
              );

              // Projeter le point sur la ligne de la rangée
              const dx = clickedRow.row.endX - clickedRow.row.startX;
              const dy = clickedRow.row.endY - clickedRow.row.startY;
              const px = (pos.x - plot.x) - clickedRow.row.startX;
              const py = (pos.y - plot.y) - clickedRow.row.startY;
              const t = Math.max(0, Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy)));

              const newPlanting: Planting = {
                id: generateId(),
                spaceId,
                plotId: plot.id,
                plantId: plant.id,
                plantName: plant.name,
                variety: "",
                mode: "single",
                position: {
                  x: clickedRow.row.startX + t * (clickedRow.row.endX - clickedRow.row.startX),
                  y: clickedRow.row.startY + t * (clickedRow.row.endY - clickedRow.row.startY),
                },
                rowId: clickedRow.row.id,
                positionOnRow: t,
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
        } else {
          // Fallback: dessiner une nouvelle rangée avec plantes (ancien comportement)
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

      // Eraser tool - delete on click
      if (tool === "eraser") {
        // D'abord vérifier les plantings
        const clicked = findClickedPlanting();
        if (clicked) {
          const { planting, plantIndex } = clicked;
          if (planting.mode === "row" && planting.rowConfig && plantIndex !== null) {
            // Delete single plant from row
            if (planting.rowConfig.plantCount <= 1) {
              deletePlanting(planting.id);
            } else {
              updatePlanting(planting.id, {
                rowConfig: {
                  ...planting.rowConfig,
                  plantCount: planting.rowConfig.plantCount - 1,
                },
              });
            }
          } else {
            // Delete single plant or entire row
            deletePlanting(planting.id);
          }
          return;
        }

        // Ensuite vérifier les rangées (GardenRow)
        const clickedRow = findClickedRow(pos);
        if (clickedRow) {
          // Supprimer la rangée (les plantings attachés seront aussi supprimés via cascade)
          deleteRow(clickedRow.row.id);
          return;
        }
      }

      if (tool === "select") {
        // D'abord vérifier les plantings
        const clicked = findClickedPlanting();
        if (clicked) {
          const { planting, plantIndex } = clicked;
          setSelectedPlanting(planting.id);
          setSelectedPlot(null);
          setSelectedRow(null);
          setSelectedPlantIndex(plantIndex);
          onPlantingSelect?.(planting);
          // Start dragging if it's a single plant
          if (planting.mode === "single") {
            setIsDraggingPlant(true);
            setDraggedPlantingId(planting.id);
            setDragStart(pos);
          }
          return;
        }

        // Ensuite vérifier les rangées (GardenRow)
        const clickedRow = findClickedRow(pos);
        if (clickedRow) {
          setSelectedRow(clickedRow.row.id);
          setSelectedPlot(null);
          setSelectedPlanting(null);
          setSelectedPlantIndex(null);
          onRowSelect?.(clickedRow.row);
          return;
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
          setSelectedRow(null);
          setSelectedPlantIndex(null);
          onPlotSelect?.(clickedPlot);
        } else {
          setSelectedPlot(null);
          setSelectedPlanting(null);
          setSelectedRow(null);
          setSelectedPlantIndex(null);
          onPlotSelect?.(null);
          onPlantingSelect?.(null);
          onRowSelect?.(null);
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
      spaceRows,
      getPlantById,
      spaceId,
      addPlanting,
      updatePlanting,
      deletePlanting,
      deleteRow,
      setSelectedPlot,
      setSelectedPlanting,
      setSelectedRow,
      onPlotSelect,
      onPlantingSelect,
      onRowSelect,
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

      if ((tool === "plot" && isDragging) || isDrawingRow || isDrawingGardenRow) {
        const pos = screenToGarden(e.clientX, e.clientY);
        setDragCurrent(pos);
      }

      // Handle plant dragging
      if (isDraggingPlant && draggedPlantingId) {
        const pos = screenToGarden(e.clientX, e.clientY);
        setDragCurrent(pos);
      }
    },
    [tool, isDragging, isDrawingRow, isDrawingGardenRow, isDraggingPlant, draggedPlantingId, dragStart, screenToGarden, setPanOffset]
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

      // Créer une GardenRow indépendante
      if (isDrawingGardenRow && gardenRowStart) {
        const pos = screenToGarden(e.clientX, e.clientY);
        const plot = spacePlots.find((p) => p.id === gardenRowStart.plotId);

        if (plot) {
          // Vérifier que le point final est dans la même parcelle
          if (
            pos.x >= plot.x &&
            pos.x <= plot.x + plot.width &&
            pos.y >= plot.y &&
            pos.y <= plot.y + plot.height
          ) {
            const endX = pos.x - plot.x;
            const endY = pos.y - plot.y;
            const length = Math.sqrt(
              Math.pow(endX - gardenRowStart.x, 2) + Math.pow(endY - gardenRowStart.y, 2)
            );

            // Créer la rangée seulement si elle a une longueur minimale
            if (length > 0.1) {
              const newRow: GardenRow = {
                id: generateId(),
                spaceId,
                plotId: plot.id,
                startX: gardenRowStart.x,
                startY: gardenRowStart.y,
                endX,
                endY,
                color: "#8B4513", // Marron par défaut
                name: `Rangée ${spaceRows.length + 1}`,
                createdAt: new Date(),
              };
              addRow(newRow);
            }
          }
        }
      }

      // Handle plant drop after dragging
      if (isDraggingPlant && draggedPlantingId) {
        const pos = screenToGarden(e.clientX, e.clientY);
        const planting = spacePlantings.find((p) => p.id === draggedPlantingId);
        if (planting) {
          const plot = spacePlots.find((p) => p.id === planting.plotId);
          if (plot) {
            // Check if still within the same plot
            if (
              pos.x >= plot.x &&
              pos.x <= plot.x + plot.width &&
              pos.y >= plot.y &&
              pos.y <= plot.y + plot.height
            ) {
              updatePlanting(draggedPlantingId, {
                position: {
                  x: pos.x - plot.x,
                  y: pos.y - plot.y,
                },
              });
            }
          }
        }
      }

      setIsDragging(false);
      setIsDrawingRow(false);
      setRowStart(null);
      setIsDrawingGardenRow(false);
      setGardenRowStart(null);
      setIsDraggingPlant(false);
      setDraggedPlantingId(null);
    },
    [
      tool,
      isDragging,
      isDrawingRow,
      isDrawingGardenRow,
      isDraggingPlant,
      draggedPlantingId,
      rowStart,
      gardenRowStart,
      dragStart,
      selectedPlantId,
      screenToGarden,
      spacePlots,
      spacePlantings,
      spaceRows,
      spaceId,
      getPlantById,
      addPlot,
      addRow,
      addPlanting,
      updatePlanting,
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
        tool === "row" && "cursor-crosshair",
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
            {/* Dimensions badge */}
            <span className="absolute bottom-1 right-1 text-xs font-medium text-white bg-black/50 px-1 rounded">
              {plot.width.toFixed(1)}m × {plot.height.toFixed(1)}m
            </span>
          </div>
        ))}

        {/* Garden Rows (rangées indépendantes) */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={canvasWidth}
          height={canvasHeight}
          style={{ zIndex: 5 }}
        >
          {spaceRows.map((row) => {
            const plot = spacePlots.find((p) => p.id === row.plotId);
            if (!plot) return null;

            const x1 = (plot.x + row.startX) * PIXELS_PER_METER * zoom;
            const y1 = (plot.y + row.startY) * PIXELS_PER_METER * zoom;
            const x2 = (plot.x + row.endX) * PIXELS_PER_METER * zoom;
            const y2 = (plot.y + row.endY) * PIXELS_PER_METER * zoom;

            const isSelected = selectedRowId === row.id;

            return (
              <g key={row.id}>
                {/* Ligne de la rangée */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isSelected ? "hsl(var(--primary))" : (row.color || "#8B4513")}
                  strokeWidth={isSelected ? 4 : 3}
                  strokeLinecap="round"
                  style={{ pointerEvents: "auto", cursor: "pointer" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (tool === "eraser") {
                      deleteRow(row.id);
                    } else if (tool === "select") {
                      setSelectedRow(row.id);
                      setSelectedPlot(null);
                      setSelectedPlanting(null);
                      onRowSelect?.(row);
                    }
                  }}
                />
                {/* Handles de début et fin quand sélectionné */}
                {isSelected && (
                  <>
                    <circle
                      cx={x1}
                      cy={y1}
                      r={6}
                      fill="hsl(var(--primary))"
                      stroke="white"
                      strokeWidth={2}
                    />
                    <circle
                      cx={x2}
                      cy={y2}
                      r={6}
                      fill="hsl(var(--primary))"
                      stroke="white"
                      strokeWidth={2}
                    />
                  </>
                )}
                {/* Indicateur du nombre de plants sur la rangée */}
                {(() => {
                  const rowPlantings = spacePlantings.filter((p) => p.rowId === row.id);
                  if (rowPlantings.length > 0) {
                    const midX = (x1 + x2) / 2;
                    const midY = (y1 + y2) / 2;
                    return (
                      <g>
                        <circle cx={midX} cy={midY - 15} r={10} fill="hsl(var(--primary))" />
                        <text
                          x={midX}
                          y={midY - 11}
                          textAnchor="middle"
                          fill="white"
                          fontSize={10}
                          fontWeight="bold"
                        >
                          {rowPlantings.length}
                        </text>
                      </g>
                    );
                  }
                  return null;
                })()}
              </g>
            );
          })}
        </svg>

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

              const isThisPlantSelected = selectedPlantingId === planting.id && selectedPlantIndex === i;
              const isRowSelected = selectedPlantingId === planting.id && selectedPlantIndex === null;

              plants.push(
                <div
                  key={`${planting.id}-${i}`}
                  className={cn(
                    "absolute flex items-center justify-center transition-transform hover:scale-125 cursor-pointer",
                    (isThisPlantSelected || isRowSelected) && "ring-2 ring-primary rounded-full",
                    isThisPlantSelected && "ring-red-500 bg-red-100/50",
                    tool === "eraser" && "hover:bg-red-500/30"
                  )}
                  style={{
                    left: (plot.x + x) * PIXELS_PER_METER * zoom - 12,
                    top: (plot.y + y) * PIXELS_PER_METER * zoom - 12,
                    width: 24,
                    height: 24,
                    fontSize: 16 * Math.max(0.5, zoom),
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (tool === "eraser") {
                      // Delete this specific plant from row - convert others to individual plants
                      if (planting.rowConfig) {
                        const { startX, startY, endX, endY, plantCount: count } = planting.rowConfig;

                        if (count <= 1) {
                          // Last plant, just delete the row
                          deletePlanting(planting.id);
                        } else {
                          // Create individual plants for all except the deleted one
                          for (let j = 0; j < count; j++) {
                            if (j !== i) {
                              const tj = count > 1 ? j / (count - 1) : 0;
                              const xj = startX + tj * (endX - startX);
                              const yj = startY + tj * (endY - startY);

                              const newPlanting: Planting = {
                                id: generateId(),
                                spaceId: planting.spaceId,
                                plotId: planting.plotId,
                                plantId: planting.plantId,
                                plantName: planting.plantName,
                                variety: planting.variety,
                                mode: "single",
                                position: { x: xj, y: yj },
                                plantedAt: planting.plantedAt,
                                seedlingStartedAt: planting.seedlingStartedAt,
                                expectedHarvestAt: planting.expectedHarvestAt,
                                harvestedAt: planting.harvestedAt,
                                status: planting.status,
                                growthStage: planting.growthStage,
                                events: [],
                                disease: planting.disease,
                              };
                              addPlanting(newPlanting);
                            }
                          }
                          // Delete the original row
                          deletePlanting(planting.id);
                        }
                      }
                    } else if (tool === "select") {
                      setSelectedPlanting(planting.id);
                      setSelectedPlot(null);
                      setSelectedPlantIndex(i);
                    }
                  }}
                >
                  {emoji}
                </div>
              );
            }

            return <React.Fragment key={planting.id}>{plants}</React.Fragment>;
          }

          // Single plant
          return (
            <div
              key={planting.id}
              className={cn(
                "absolute flex items-center justify-center transition-transform hover:scale-125 cursor-pointer",
                selectedPlantingId === planting.id && "ring-2 ring-primary rounded-full",
                tool === "eraser" && "hover:bg-red-500/30"
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
              onClick={(e) => {
                e.stopPropagation();
                if (tool === "eraser") {
                  deletePlanting(planting.id);
                } else if (tool === "select") {
                  setSelectedPlanting(planting.id);
                  setSelectedPlot(null);
                  setSelectedPlantIndex(null);
                }
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

        {/* Drawing preview - Row (legacy plant-row tool) */}
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

        {/* Drawing preview - GardenRow (outil row) */}
        {isDrawingGardenRow && gardenRowStart && (
          <svg
            className="absolute inset-0 pointer-events-none"
            width={canvasWidth}
            height={canvasHeight}
          >
            {(() => {
              const plot = spacePlots.find((p) => p.id === gardenRowStart.plotId);
              if (!plot) return null;
              const x1 = (plot.x + gardenRowStart.x) * PIXELS_PER_METER * zoom;
              const y1 = (plot.y + gardenRowStart.y) * PIXELS_PER_METER * zoom;
              const x2 = dragCurrent.x * PIXELS_PER_METER * zoom;
              const y2 = dragCurrent.y * PIXELS_PER_METER * zoom;
              return (
                <>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#8B4513"
                    strokeWidth="3"
                    strokeDasharray="8,4"
                    strokeLinecap="round"
                  />
                  <circle cx={x1} cy={y1} r={5} fill="#8B4513" />
                  <circle cx={x2} cy={y2} r={5} fill="#8B4513" />
                </>
              );
            })()}
          </svg>
        )}
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-2 right-2 bg-background/80 px-2 py-1 rounded text-xs">
        {Math.round(zoom * 100)}%
      </div>

      {/* Selected planting actions */}
      {selectedPlantingId && (() => {
        const planting = spacePlantings.find((p) => p.id === selectedPlantingId);
        if (!planting) return null;
        const plot = spacePlots.find((p) => p.id === planting.plotId);
        if (!plot) return null;
        const plant = getPlantById(planting.plantId);

        // Calculate position for the toolbar
        let plantX: number, plantY: number;

        if (planting.mode === "row" && planting.rowConfig && selectedPlantIndex !== null) {
          // Position at the selected plant in the row
          const { startX, startY, endX, endY, plantCount } = planting.rowConfig;
          const t = plantCount > 1 ? selectedPlantIndex / (plantCount - 1) : 0;
          const x = startX + t * (endX - startX);
          const y = startY + t * (endY - startY);
          plantX = (plot.x + x) * PIXELS_PER_METER * zoom + panOffset.x;
          plantY = (plot.y + y) * PIXELS_PER_METER * zoom + panOffset.y;
        } else {
          plantX = (plot.x + planting.position.x) * PIXELS_PER_METER * zoom + panOffset.x;
          plantY = (plot.y + planting.position.y) * PIXELS_PER_METER * zoom + panOffset.y;
        }

        const isRow = planting.mode === "row" && planting.rowConfig;
        const plantCount = planting.rowConfig?.plantCount || 1;

        const handleDeleteSingleFromRow = () => {
          if (!planting.rowConfig || selectedPlantIndex === null) return;

          const { startX, startY, endX, endY, plantCount: count } = planting.rowConfig;

          if (count <= 1) {
            // Last plant, delete the whole row
            deletePlanting(selectedPlantingId);
          } else {
            // Convert other plants to individual plants, keeping their positions
            for (let j = 0; j < count; j++) {
              if (j !== selectedPlantIndex) {
                const tj = count > 1 ? j / (count - 1) : 0;
                const xj = startX + tj * (endX - startX);
                const yj = startY + tj * (endY - startY);

                const newPlanting: Planting = {
                  id: generateId(),
                  spaceId: planting.spaceId,
                  plotId: planting.plotId,
                  plantId: planting.plantId,
                  plantName: planting.plantName,
                  variety: planting.variety,
                  mode: "single",
                  position: { x: xj, y: yj },
                  plantedAt: planting.plantedAt,
                  seedlingStartedAt: planting.seedlingStartedAt,
                  expectedHarvestAt: planting.expectedHarvestAt,
                  harvestedAt: planting.harvestedAt,
                  status: planting.status,
                  growthStage: planting.growthStage,
                  events: [],
                  disease: planting.disease,
                };
                addPlanting(newPlanting);
              }
            }
            // Delete the original row
            deletePlanting(selectedPlantingId);
          }
          setSelectedPlanting(null);
          setSelectedPlantIndex(null);
        };

        const handleDeleteWholeRow = () => {
          deletePlanting(selectedPlantingId);
          setSelectedPlanting(null);
          setSelectedPlantIndex(null);
        };

        return (
          <div
            className="absolute z-20 bg-background border rounded-lg shadow-lg p-2 flex flex-col gap-2"
            style={{
              left: Math.max(10, plantX - 80),
              top: Math.max(10, plantY - 90),
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-2">
              <span className="text-lg">{plant?.emoji || "🌱"}</span>
              <div>
                <span className="text-sm font-medium">{planting.plantName}</span>
                {isRow && (
                  <span className="text-xs text-muted-foreground block">
                    Rangée de {plantCount} plants
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 ml-auto"
                onClick={() => {
                  setSelectedPlanting(null);
                  setSelectedPlantIndex(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Actions */}
            <div className="flex gap-1">
              {planting.mode === "single" && (
                <span className="text-xs text-muted-foreground flex items-center gap-1 px-2">
                  <Move className="h-3 w-3" />
                  Glisser pour déplacer
                </span>
              )}

              {isRow && selectedPlantIndex !== null && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={handleDeleteSingleFromRow}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Ce plant
                </Button>
              )}

              {isRow && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="text-xs h-7"
                  onClick={handleDeleteWholeRow}
                >
                  <Rows3 className="h-3 w-3 mr-1" />
                  Toute la rangée
                </Button>
              )}

              {!isRow && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="text-xs h-7"
                  onClick={handleDeleteWholeRow}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Supprimer
                </Button>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
