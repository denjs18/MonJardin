"use client";

import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { Trash2, Move, X, Rows3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGardenStore, useEditorStore, useCatalogStore } from "@/lib/store";
import { Plot, Planting, PlantingMode, GardenRow, Plant, GrassArea, GardenPath, Fence } from "@/lib/types";
import { cn } from "@/lib/utils";
import { generateId } from "@/lib/utils";
import { PlantingTypeResult } from "./PlantingTypeDialog";
import "@/app/garden/garden.css";

interface GardenCanvasProps {
  spaceId: string;
  rowSpacing?: number; // Espacement en cm pour l'outil plant-row
  plantingTypeResult?: PlantingTypeResult | null; // Resultat du dialog semis/plant
  onPlotSelect?: (plot: Plot | null) => void;
  onPlantingSelect?: (planting: Planting | null) => void;
  onRowSelect?: (row: GardenRow | null) => void;
}

const PIXELS_PER_METER = 100; // 1 meter = 100 pixels at zoom 1
const VIRTUAL_SIZE = 50; // Virtual workspace: 50x50 meters

export function GardenCanvas({
  spaceId,
  rowSpacing,
  plantingTypeResult,
  onPlotSelect,
  onPlantingSelect,
  onRowSelect,
}: GardenCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const lastCenteredSpace = useRef<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragCurrent, setDragCurrent] = useState({ x: 0, y: 0 });
  const [isDrawingRow, setIsDrawingRow] = useState(false);
  const [rowStart, setRowStart] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingPlant, setIsDraggingPlant] = useState(false);
  const [draggedPlantingId, setDraggedPlantingId] = useState<string | null>(null);
  const [isDraggingPlot, setIsDraggingPlot] = useState(false);
  const [draggedPlotId, setDraggedPlotId] = useState<string | null>(null);
  const [plotDragOffset, setPlotDragOffset] = useState({ x: 0, y: 0 });
  const [isDraggingGrass, setIsDraggingGrass] = useState(false);
  const [draggedGrassId, setDraggedGrassId] = useState<string | null>(null);
  const [grassDragOffset, setGrassDragOffset] = useState({ x: 0, y: 0 });
  const [selectedPlantIndex, setSelectedPlantIndex] = useState<number | null>(null); // For row plants
  const [isDrawingGardenRow, setIsDrawingGardenRow] = useState(false);
  const [gardenRowStart, setGardenRowStart] = useState<{ x: number; y: number; plotId: string } | null>(null);
  // Pour planter sur une rangée existante (cliquer-glisser)
  const [isPlantingOnRow, setIsPlantingOnRow] = useState(false);
  const [plantingOnRowData, setPlantingOnRowData] = useState<{
    row: GardenRow;
    plot: Plot;
    startT: number; // Position de départ sur la rangée (0-1)
  } | null>(null);


  const {
    plots,
    plantings,
    rows,
    addPlot,
    updatePlot,
    deletePlot,
    addPlanting,
    updatePlanting,
    deletePlanting,
    addRow,
    deleteRow,
    getPlotsBySpace,
    getPlantingsBySpace,
    getRowsBySpace,
    getPlantingsByRow,
    addGrassArea,
    updateGrassArea,
    deleteGrassArea,
    getGrassAreasBySpace,
    addPath,
    deletePath,
    getPathsBySpace,
    addFence,
    deleteFence,
    getFencesBySpace,
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
    selectedGrassId,
    selectedPathId,
    selectedFenceId,
    grassType,
    pathStyle,
    pathWidth,
    fenceStyle,
    fenceHeight,
    setSelectedPlot,
    setSelectedPlanting,
    setSelectedRow,
    setSelectedGrass,
    setSelectedPath,
    setSelectedFence,
    setPanOffset,
  } = useEditorStore();

  const { getPlantById } = useCatalogStore();

  const spacePlots = getPlotsBySpace(spaceId);
  const spacePlantings = getPlantingsBySpace(spaceId);
  const spaceRows = getRowsBySpace(spaceId);
  const spaceGrassAreas = getGrassAreasBySpace(spaceId);
  const spacePaths = getPathsBySpace(spaceId);
  const spaceFences = getFencesBySpace(spaceId);

  // State for drawing fences
  const [isDrawingFence, setIsDrawingFence] = useState(false);
  const [fenceStart, setFenceStart] = useState<{ x: number; y: number } | null>(null);

  // State for drawing paths (multi-point)
  const [isDrawingPath, setIsDrawingPath] = useState(false);
  const [pathPoints, setPathPoints] = useState<{ x: number; y: number }[]>([]);

  // State for middle mouse button panning
  const [isMiddleMousePanning, setIsMiddleMousePanning] = useState(false);
  const [middleMouseStart, setMiddleMouseStart] = useState({ x: 0, y: 0 });

  // State for touch interactions
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const [isTouchPanning, setIsTouchPanning] = useState(false);
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);

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
      // Middle mouse button for panning (works with any tool)
      if (e.button === 1) {
        e.preventDefault();
        setIsMiddleMousePanning(true);
        setMiddleMouseStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
        return;
      }

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

      // Helper function to find clicked grass area
      const findClickedGrass = (clickPos: { x: number; y: number }) => {
        for (const grass of spaceGrassAreas) {
          if (
            clickPos.x >= grass.x &&
            clickPos.x <= grass.x + grass.width &&
            clickPos.y >= grass.y &&
            clickPos.y <= grass.y + grass.height
          ) {
            return grass;
          }
        }
        return null;
      };

      // Helper function to find clicked path
      const findClickedPath = (clickPos: { x: number; y: number }) => {
        for (const path of spacePaths) {
          for (let i = 0; i < path.points.length - 1; i++) {
            const a = path.points[i];
            const b = path.points[i + 1];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len2 = dx * dx + dy * dy;
            if (len2 === 0) continue;
            const t = Math.max(0, Math.min(1, ((clickPos.x - a.x) * dx + (clickPos.y - a.y) * dy) / len2));
            const projX = a.x + t * dx;
            const projY = a.y + t * dy;
            const dist = Math.sqrt(Math.pow(clickPos.x - projX, 2) + Math.pow(clickPos.y - projY, 2));
            if (dist < path.width / 2 + 0.1) return path;
          }
        }
        return null;
      };

      // Helper function to find clicked fence
      const findClickedFence = (clickPos: { x: number; y: number }) => {
        for (const fence of spaceFences) {
          const dx = fence.endX - fence.startX;
          const dy = fence.endY - fence.startY;
          const len2 = dx * dx + dy * dy;
          if (len2 === 0) continue;
          const t = Math.max(0, Math.min(1, ((clickPos.x - fence.startX) * dx + (clickPos.y - fence.startY) * dy) / len2));
          const projX = fence.startX + t * dx;
          const projY = fence.startY + t * dy;
          const dist = Math.sqrt(Math.pow(clickPos.x - projX, 2) + Math.pow(clickPos.y - projY, 2));
          if (dist < 0.2) return fence;
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
          // Démarrer le drag pour planter sur cette rangée
          const plot = spacePlots.find((p) => p.id === clickedRow.row.plotId);
          if (plot) {
            // Calculer la position de départ sur la rangée (0-1)
            const dx = clickedRow.row.endX - clickedRow.row.startX;
            const dy = clickedRow.row.endY - clickedRow.row.startY;
            const px = (pos.x - plot.x) - clickedRow.row.startX;
            const py = (pos.y - plot.y) - clickedRow.row.startY;
            const startT = Math.max(0, Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy)));

            setIsPlantingOnRow(true);
            setPlantingOnRowData({
              row: clickedRow.row,
              plot,
              startT,
            });
            setDragCurrent(pos);
          }
        } else {
          // Pas sur une rangée: dessiner une nouvelle rangée avec plantes
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

      // Grass tool - draw rectangle
      if (tool === "grass") {
        setIsDragging(true);
        setDragStart(pos);
        setDragCurrent(pos);
        return;
      }

      // Fence tool - draw line
      if (tool === "fence") {
        setIsDrawingFence(true);
        setFenceStart(pos);
        setDragCurrent(pos);
        return;
      }

      // Path tool - click to add points, double-click to finish
      if (tool === "path") {
        if (e.detail === 2 && pathPoints.length >= 2) {
          // Double-click: finish path
          const newPath: GardenPath = {
            id: generateId(),
            spaceId,
            points: pathPoints,
            width: pathWidth,
            style: pathStyle,
            createdAt: new Date(),
          };
          addPath(newPath);
          setPathPoints([]);
          setIsDrawingPath(false);
        } else {
          // Single click: add point
          setPathPoints((prev) => [...prev, pos]);
          setIsDrawingPath(true);
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
            // Calculer les infos de plantation selon le type
            const now = new Date();
            let seedlingStartedAt: Date | null = null;
            let expectedHarvestAt: Date;
            let growthStage = 0;

            if (plantingTypeResult?.plantingType === "seedling") {
              let estimatedDaysSinceSow = 0;
              if (plantingTypeResult.seedlingStartedAt) {
                seedlingStartedAt = plantingTypeResult.seedlingStartedAt;
                estimatedDaysSinceSow = Math.floor(
                  (now.getTime() - seedlingStartedAt.getTime()) / (24 * 60 * 60 * 1000)
                );
              } else if (plantingTypeResult.seedlingHeight && plant.daysToTransplant) {
                const typicalTransplantHeight = 15;
                estimatedDaysSinceSow = Math.round(
                  (plantingTypeResult.seedlingHeight / typicalTransplantHeight) * plant.daysToTransplant
                );
                seedlingStartedAt = new Date(now.getTime() - estimatedDaysSinceSow * 24 * 60 * 60 * 1000);
              }
              expectedHarvestAt = new Date(
                now.getTime() + Math.max(0, plant.daysToMaturity - estimatedDaysSinceSow) * 24 * 60 * 60 * 1000
              );
              growthStage = Math.min(30, estimatedDaysSinceSow);
            } else {
              expectedHarvestAt = new Date(now.getTime() + plant.daysToMaturity * 24 * 60 * 60 * 1000);
            }

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
              plantingType: plantingTypeResult?.plantingType || "seed",
              seedlingHeight: plantingTypeResult?.seedlingHeight,
              plantedAt: now,
              seedlingStartedAt,
              expectedHarvestAt,
              harvestedAt: null,
              status: "seedling",
              growthStage,
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

        // Vérifier les clôtures
        const clickedFence = findClickedFence(pos);
        if (clickedFence) {
          deleteFence(clickedFence.id);
          return;
        }

        // Vérifier les chemins
        const clickedPath = findClickedPath(pos);
        if (clickedPath) {
          deletePath(clickedPath.id);
          return;
        }

        // Vérifier les zones d'herbe
        const clickedGrass = findClickedGrass(pos);
        if (clickedGrass) {
          deleteGrassArea(clickedGrass.id);
          return;
        }

        // Vérifier les parcelles (dernier car élément structurel)
        const clickedPlotToDelete = spacePlots.find(
          (p) =>
            pos.x >= p.x &&
            pos.x <= p.x + p.width &&
            pos.y >= p.y &&
            pos.y <= p.y + p.height
        );
        if (clickedPlotToDelete) {
          if (confirm(`Supprimer la parcelle "${clickedPlotToDelete.name}" et tout son contenu ?`)) {
            deletePlot(clickedPlotToDelete.id);
          }
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

        // Vérifier les clôtures
        const clickedFence = findClickedFence(pos);
        if (clickedFence) {
          setSelectedFence(clickedFence.id);
          return;
        }

        // Vérifier les chemins
        const clickedPath = findClickedPath(pos);
        if (clickedPath) {
          setSelectedPath(clickedPath.id);
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
          // Start dragging the plot
          setIsDraggingPlot(true);
          setDraggedPlotId(clickedPlot.id);
          setPlotDragOffset({
            x: pos.x - clickedPlot.x,
            y: pos.y - clickedPlot.y,
          });
        } else {
          // Vérifier les zones d'herbe
          const clickedGrass = findClickedGrass(pos);
          if (clickedGrass) {
            setSelectedGrass(clickedGrass.id);
            // Start dragging the grass area
            setIsDraggingGrass(true);
            setDraggedGrassId(clickedGrass.id);
            setGrassDragOffset({
              x: pos.x - clickedGrass.x,
              y: pos.y - clickedGrass.y,
            });
            return;
          }

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
      spaceGrassAreas,
      spacePaths,
      spaceFences,
      getPlantById,
      spaceId,
      addPlanting,
      updatePlanting,
      deletePlanting,
      deletePlot,
      deleteRow,
      deleteGrassArea,
      deletePath,
      deleteFence,
      addGrassArea,
      addPath,
      addFence,
      grassType,
      pathStyle,
      pathWidth,
      fenceStyle,
      fenceHeight,
      pathPoints,
      setSelectedPlot,
      setSelectedPlanting,
      setSelectedRow,
      setSelectedGrass,
      setSelectedPath,
      setSelectedFence,
      onPlotSelect,
      onPlantingSelect,
      onRowSelect,
    ]
  );

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Middle mouse button panning (works with any tool)
      if (isMiddleMousePanning) {
        setPanOffset({
          x: e.clientX - middleMouseStart.x,
          y: e.clientY - middleMouseStart.y,
        });
        return;
      }

      if (tool === "pan" && isDragging) {
        setPanOffset({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
        return;
      }

      if ((tool === "plot" && isDragging) || (tool === "grass" && isDragging) || isDrawingRow || isDrawingGardenRow || isPlantingOnRow || isDrawingFence) {
        const pos = screenToGarden(e.clientX, e.clientY);
        setDragCurrent(pos);
      }

      // Handle plant dragging
      if (isDraggingPlant && draggedPlantingId) {
        const pos = screenToGarden(e.clientX, e.clientY);
        setDragCurrent(pos);
      }

      // Handle plot dragging
      if (isDraggingPlot && draggedPlotId) {
        const pos = screenToGarden(e.clientX, e.clientY);
        const newX = pos.x - plotDragOffset.x;
        const newY = pos.y - plotDragOffset.y;
        updatePlot(draggedPlotId, { x: newX, y: newY });
      }

      // Handle grass area dragging
      if (isDraggingGrass && draggedGrassId) {
        const pos = screenToGarden(e.clientX, e.clientY);
        const newX = pos.x - grassDragOffset.x;
        const newY = pos.y - grassDragOffset.y;
        updateGrassArea(draggedGrassId, { x: newX, y: newY });
      }
    },
    [tool, isDragging, isDrawingRow, isDrawingGardenRow, isPlantingOnRow, isDrawingFence, isDraggingPlant, draggedPlantingId, isDraggingPlot, draggedPlotId, plotDragOffset, isDraggingGrass, draggedGrassId, grassDragOffset, dragStart, screenToGarden, setPanOffset, updatePlot, updateGrassArea, isMiddleMousePanning, middleMouseStart]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      // Stop middle mouse panning
      if (isMiddleMousePanning) {
        setIsMiddleMousePanning(false);
        return;
      }

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

      // Create grass area
      if (tool === "grass" && isDragging) {
        const pos = screenToGarden(e.clientX, e.clientY);
        const x = Math.min(dragStart.x, pos.x);
        const y = Math.min(dragStart.y, pos.y);
        const w = Math.abs(pos.x - dragStart.x);
        const h = Math.abs(pos.y - dragStart.y);

        if (w > 0.1 && h > 0.1) {
          const newGrass: GrassArea = {
            id: generateId(),
            spaceId,
            x,
            y,
            width: w,
            height: h,
            rotation: 0,
            grassType,
            createdAt: new Date(),
          };
          addGrassArea(newGrass);
        }
      }

      // Create fence
      if (isDrawingFence && fenceStart) {
        const pos = screenToGarden(e.clientX, e.clientY);
        const length = Math.sqrt(
          Math.pow(pos.x - fenceStart.x, 2) + Math.pow(pos.y - fenceStart.y, 2)
        );

        if (length > 0.1) {
          const newFence: Fence = {
            id: generateId(),
            spaceId,
            startX: fenceStart.x,
            startY: fenceStart.y,
            endX: pos.x,
            endY: pos.y,
            height: fenceHeight,
            style: fenceStyle,
            postSpacing: 1.5,
            createdAt: new Date(),
          };
          addFence(newFence);
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
            const spacingCm = rowSpacing ?? plant.spacing.plant;
            const spacing = spacingCm / 100;
            const plantCount = Math.max(1, Math.floor(length / spacing) + 1);

            // Calculer les infos de plantation selon le type
            const now = new Date();
            let seedlingStartedAt: Date | null = null;
            let expectedHarvestAt: Date;
            let growthStage = 0;

            if (plantingTypeResult?.plantingType === "seedling") {
              let estimatedDaysSinceSow = 0;
              if (plantingTypeResult.seedlingStartedAt) {
                seedlingStartedAt = plantingTypeResult.seedlingStartedAt;
                estimatedDaysSinceSow = Math.floor(
                  (now.getTime() - seedlingStartedAt.getTime()) / (24 * 60 * 60 * 1000)
                );
              } else if (plantingTypeResult.seedlingHeight && plant.daysToTransplant) {
                const typicalTransplantHeight = 15;
                estimatedDaysSinceSow = Math.round(
                  (plantingTypeResult.seedlingHeight / typicalTransplantHeight) * plant.daysToTransplant
                );
                seedlingStartedAt = new Date(now.getTime() - estimatedDaysSinceSow * 24 * 60 * 60 * 1000);
              }
              expectedHarvestAt = new Date(
                now.getTime() + Math.max(0, plant.daysToMaturity - estimatedDaysSinceSow) * 24 * 60 * 60 * 1000
              );
              growthStage = Math.min(30, estimatedDaysSinceSow);
            } else {
              expectedHarvestAt = new Date(now.getTime() + plant.daysToMaturity * 24 * 60 * 60 * 1000);
            }

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
                spacing: spacingCm,
                plantCount,
              },
              plantingType: plantingTypeResult?.plantingType || "seed",
              seedlingHeight: plantingTypeResult?.seedlingHeight,
              plantedAt: now,
              seedlingStartedAt,
              expectedHarvestAt,
              harvestedAt: null,
              status: "seedling",
              growthStage,
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

      // Créer des plants sur une rangée existante (après drag)
      if (isPlantingOnRow && plantingOnRowData && selectedPlantId) {
        const pos = screenToGarden(e.clientX, e.clientY);
        const { row, plot, startT } = plantingOnRowData;
        const plant = getPlantById(selectedPlantId);

        if (plant) {
          // Calculer la position de fin sur la rangée (0-1)
          const dx = row.endX - row.startX;
          const dy = row.endY - row.startY;
          const px = (pos.x - plot.x) - row.startX;
          const py = (pos.y - plot.y) - row.startY;
          const endT = Math.max(0, Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy)));

          // S'assurer que startT < endT
          const tMin = Math.min(startT, endT);
          const tMax = Math.max(startT, endT);

          const rowLength = Math.sqrt(dx * dx + dy * dy);
          const segmentLength = (tMax - tMin) * rowLength;
          const spacingInMeters = (rowSpacing ?? plant.spacing.plant) / 100;
          const plantCount = Math.max(1, Math.floor(segmentLength / spacingInMeters) + 1);

          // Calculer les infos de plantation selon le type
          const now = new Date();
          let seedlingStartedAt: Date | null = null;
          let expectedHarvestAt: Date;
          let growthStage = 0;

          if (plantingTypeResult?.plantingType === "seedling") {
            let estimatedDaysSinceSow = 0;
            if (plantingTypeResult.seedlingStartedAt) {
              seedlingStartedAt = plantingTypeResult.seedlingStartedAt;
              estimatedDaysSinceSow = Math.floor(
                (now.getTime() - seedlingStartedAt.getTime()) / (24 * 60 * 60 * 1000)
              );
            } else if (plantingTypeResult.seedlingHeight && plant.daysToTransplant) {
              const typicalTransplantHeight = 15;
              estimatedDaysSinceSow = Math.round(
                (plantingTypeResult.seedlingHeight / typicalTransplantHeight) * plant.daysToTransplant
              );
              seedlingStartedAt = new Date(now.getTime() - estimatedDaysSinceSow * 24 * 60 * 60 * 1000);
            }
            expectedHarvestAt = new Date(
              now.getTime() + Math.max(0, plant.daysToMaturity - estimatedDaysSinceSow) * 24 * 60 * 60 * 1000
            );
            growthStage = Math.min(30, estimatedDaysSinceSow);
          } else {
            expectedHarvestAt = new Date(now.getTime() + plant.daysToMaturity * 24 * 60 * 60 * 1000);
          }

          for (let i = 0; i < plantCount; i++) {
            const t = plantCount > 1
              ? tMin + (i / (plantCount - 1)) * (tMax - tMin)
              : (tMin + tMax) / 2;
            const x = row.startX + t * dx;
            const y = row.startY + t * dy;

            const newPlanting: Planting = {
              id: generateId(),
              spaceId,
              plotId: plot.id,
              plantId: plant.id,
              plantName: plant.name,
              variety: "",
              mode: "single",
              position: { x, y },
              rowId: row.id,
              positionOnRow: t,
              plantingType: plantingTypeResult?.plantingType || "seed",
              seedlingHeight: plantingTypeResult?.seedlingHeight,
              plantedAt: now,
              seedlingStartedAt,
              expectedHarvestAt,
              harvestedAt: null,
              status: "seedling",
              growthStage,
              events: [],
              disease: null,
            };
            addPlanting(newPlanting);
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
      setIsPlantingOnRow(false);
      setPlantingOnRowData(null);
      setIsDraggingPlant(false);
      setDraggedPlantingId(null);
      setIsDraggingPlot(false);
      setDraggedPlotId(null);
      setIsDraggingGrass(false);
      setDraggedGrassId(null);
      setIsDrawingFence(false);
      setFenceStart(null);
    },
    [
      tool,
      isDragging,
      isDrawingRow,
      isDrawingGardenRow,
      isPlantingOnRow,
      isDrawingFence,
      fenceStart,
      plantingOnRowData,
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
      addGrassArea,
      addFence,
      grassType,
      fenceStyle,
      fenceHeight,
      isMiddleMousePanning,
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

  // Helper to get touch position
  const getTouchPos = useCallback((touch: React.Touch) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (touch.clientX - rect.left - panOffset.x) / (PIXELS_PER_METER * zoom),
      y: (touch.clientY - rect.top - panOffset.y) / (PIXELS_PER_METER * zoom),
    };
  }, [zoom, panOffset]);

  // Handle touch start
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      // Two finger touch = pan/zoom
      if (e.touches.length === 2) {
        e.preventDefault();
        setIsTouchPanning(true);
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;
        setMiddleMouseStart({ x: centerX - panOffset.x, y: centerY - panOffset.y });
        const distance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        setLastTouchDistance(distance);
        return;
      }

      // Single touch = tool action
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const pos = getTouchPos(touch);
        setTouchStartPos(pos);

        // Simulate mouse down for the current tool
        if (tool === "pan") {
          setIsDragging(true);
          setDragStart({ x: touch.clientX - panOffset.x, y: touch.clientY - panOffset.y });
          return;
        }

        if (tool === "plot" || tool === "grass") {
          setIsDragging(true);
          setDragStart(pos);
          setDragCurrent(pos);
          return;
        }

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

        if (tool === "fence") {
          setIsDrawingFence(true);
          setFenceStart(pos);
          setDragCurrent(pos);
          return;
        }
      }
    },
    [tool, panOffset, spacePlots, selectedPlantId, getTouchPos]
  );

  // Handle touch move
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      // Two finger pan/zoom
      if (e.touches.length === 2 && isTouchPanning) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];

        // Pan
        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;
        setPanOffset({
          x: centerX - middleMouseStart.x,
          y: centerY - middleMouseStart.y,
        });

        // Pinch zoom
        if (lastTouchDistance !== null) {
          const distance = Math.sqrt(
            Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2)
          );
          const scale = distance / lastTouchDistance;
          if (Math.abs(scale - 1) > 0.01) {
            useEditorStore.getState().setZoom(zoom * scale);
            setLastTouchDistance(distance);
          }
        }
        return;
      }

      // Single touch movement
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const pos = getTouchPos(touch);

        if (tool === "pan" && isDragging) {
          setPanOffset({
            x: touch.clientX - dragStart.x,
            y: touch.clientY - dragStart.y,
          });
          return;
        }

        if ((tool === "plot" && isDragging) || (tool === "grass" && isDragging) || isDrawingRow || isDrawingGardenRow || isDrawingFence) {
          setDragCurrent(pos);
        }
      }
    },
    [tool, isDragging, isTouchPanning, isDrawingRow, isDrawingGardenRow, isDrawingFence, dragStart, middleMouseStart, lastTouchDistance, zoom, setPanOffset, getTouchPos]
  );

  // Handle touch end
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      // End two-finger pan/zoom
      if (isTouchPanning) {
        setIsTouchPanning(false);
        setLastTouchDistance(null);
        return;
      }

      // Process single touch end (like mouse up)
      if (touchStartPos) {
        const touch = e.changedTouches[0];
        if (touch) {
          const pos = getTouchPos(touch);

          // Create plot
          if (tool === "plot" && isDragging && touchStartPos) {
            const x = Math.min(touchStartPos.x, pos.x);
            const y = Math.min(touchStartPos.y, pos.y);
            const w = Math.abs(pos.x - touchStartPos.x);
            const h = Math.abs(pos.y - touchStartPos.y);

            if (w > 0.1 && h > 0.1) {
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

          // Create grass area
          if (tool === "grass" && isDragging && touchStartPos) {
            const x = Math.min(touchStartPos.x, pos.x);
            const y = Math.min(touchStartPos.y, pos.y);
            const w = Math.abs(pos.x - touchStartPos.x);
            const h = Math.abs(pos.y - touchStartPos.y);

            if (w > 0.1 && h > 0.1) {
              const newGrass: GrassArea = {
                id: generateId(),
                spaceId,
                x,
                y,
                width: w,
                height: h,
                rotation: 0,
                grassType,
                createdAt: new Date(),
              };
              addGrassArea(newGrass);
            }
          }

          // Create garden row
          if (isDrawingGardenRow && gardenRowStart) {
            const plot = spacePlots.find((p) => p.id === gardenRowStart.plotId);
            if (plot && pos.x >= plot.x && pos.x <= plot.x + plot.width && pos.y >= plot.y && pos.y <= plot.y + plot.height) {
              const endX = pos.x - plot.x;
              const endY = pos.y - plot.y;
              const length = Math.sqrt(
                Math.pow(endX - gardenRowStart.x, 2) + Math.pow(endY - gardenRowStart.y, 2)
              );
              if (length > 0.1) {
                const newRow: GardenRow = {
                  id: generateId(),
                  spaceId,
                  plotId: plot.id,
                  startX: gardenRowStart.x,
                  startY: gardenRowStart.y,
                  endX,
                  endY,
                  color: "#8B4513",
                  name: `Rangée ${spaceRows.length + 1}`,
                  createdAt: new Date(),
                };
                addRow(newRow);
              }
            }
          }

          // Create plant row
          if (isDrawingRow && rowStart && selectedPlantId) {
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
                const spacingCm = rowSpacing ?? plant.spacing.plant;
                const spacing = spacingCm / 100;
                const plantCount = Math.max(1, Math.floor(length / spacing) + 1);

                const now = new Date();
                const expectedHarvestAt = new Date(now.getTime() + plant.daysToMaturity * 24 * 60 * 60 * 1000);

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
                    spacing: spacingCm,
                    plantCount,
                  },
                  plantingType: plantingTypeResult?.plantingType || "seed",
                  seedlingHeight: plantingTypeResult?.seedlingHeight,
                  plantedAt: now,
                  seedlingStartedAt: null,
                  expectedHarvestAt,
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

          // Create fence
          if (isDrawingFence && fenceStart) {
            const length = Math.sqrt(
              Math.pow(pos.x - fenceStart.x, 2) + Math.pow(pos.y - fenceStart.y, 2)
            );
            if (length > 0.1) {
              const newFence: Fence = {
                id: generateId(),
                spaceId,
                startX: fenceStart.x,
                startY: fenceStart.y,
                endX: pos.x,
                endY: pos.y,
                height: fenceHeight,
                style: fenceStyle,
                postSpacing: 1.5,
                createdAt: new Date(),
              };
              addFence(newFence);
            }
          }
        }
      }

      // Reset all states
      setIsDragging(false);
      setIsDrawingRow(false);
      setRowStart(null);
      setIsDrawingGardenRow(false);
      setGardenRowStart(null);
      setIsDrawingFence(false);
      setFenceStart(null);
      setTouchStartPos(null);
    },
    [
      tool, isDragging, isTouchPanning, isDrawingRow, isDrawingGardenRow, isDrawingFence,
      touchStartPos, rowStart, gardenRowStart, fenceStart, selectedPlantId, rowSpacing,
      spacePlots, spaceRows, spaceId, grassType, fenceStyle, fenceHeight,
      getTouchPos, getPlantById, addPlot, addGrassArea, addRow, addPlanting, addFence, plantingTypeResult
    ]
  );

  const canvasWidth = VIRTUAL_SIZE * PIXELS_PER_METER * zoom;
  const canvasHeight = VIRTUAL_SIZE * PIXELS_PER_METER * zoom;

  // Center on content or at origin on initial load (once per space)
  useEffect(() => {
    if (!canvasRef.current) return;
    if (lastCenteredSpace.current === spaceId) return;
    lastCenteredSpace.current = spaceId;

    const rect = canvasRef.current.getBoundingClientRect();
    // Find content bounds
    const allElements = [
      ...spacePlots.map(p => ({ x: p.x, y: p.y, w: p.width, h: p.height })),
      ...spaceGrassAreas.map(g => ({ x: g.x, y: g.y, w: g.width, h: g.height })),
    ];
    if (allElements.length > 0) {
      const minX = Math.min(...allElements.map(e => e.x));
      const minY = Math.min(...allElements.map(e => e.y));
      const maxX = Math.max(...allElements.map(e => e.x + e.w));
      const maxY = Math.max(...allElements.map(e => e.y + e.h));
      const cx = ((minX + maxX) / 2) * PIXELS_PER_METER * zoom;
      const cy = ((minY + maxY) / 2) * PIXELS_PER_METER * zoom;
      setPanOffset({
        x: rect.width / 2 - cx,
        y: rect.height / 2 - cy,
      });
    } else {
      // No content: center on origin (0,0)
      setPanOffset({ x: rect.width / 2, y: rect.height / 2 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId, setPanOffset, zoom]);

  return (
    <div
      ref={canvasRef}
      className={cn(
        "garden-canvas relative overflow-auto rounded-xl shadow-inner touch-none",
        tool === "pan" && "cursor-grab",
        tool === "pan" && isDragging && "cursor-grabbing",
        tool === "plot" && "cursor-crosshair",
        tool === "row" && "cursor-crosshair",
        tool === "plant-single" && "cursor-cell",
        tool === "plant-row" && "cursor-crosshair",
        tool === "grass" && "cursor-crosshair",
        tool === "path" && "cursor-crosshair",
        tool === "fence" && "cursor-crosshair",
        tool === "eraser" && "cursor-pointer",
        (isDraggingPlot || isDraggingGrass) && "!cursor-grabbing",
        isMiddleMousePanning && "!cursor-grabbing"
      )}
      style={{ width: "100%", height: "100%", minHeight: "400px" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Garden area - ground */}
      <div
        className="garden-ground absolute"
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

        {/* Grass Areas (behind plots) */}
        {spaceGrassAreas.map((grass) => (
          <div
            key={grass.id}
            className={cn(
              "grass-area absolute transition-all",
              grass.grassType,
              selectedGrassId === grass.id && "selected"
            )}
            style={{
              left: grass.x * PIXELS_PER_METER * zoom,
              top: grass.y * PIXELS_PER_METER * zoom,
              width: grass.width * PIXELS_PER_METER * zoom,
              height: grass.height * PIXELS_PER_METER * zoom,
              transform: `rotate(${grass.rotation}deg)`,
              zIndex: 1,
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (tool === "eraser") {
                deleteGrassArea(grass.id);
              } else if (tool === "select") {
                setSelectedGrass(grass.id);
              }
            }}
          >
            <span className="absolute top-1 left-1.5 text-xs font-bold text-white/80 bg-green-900/50 px-1.5 py-0.5 rounded-full">
              {grass.grassType === "lawn" ? "Pelouse" : grass.grassType === "wild" ? "Prairie" : "Ornement"}
            </span>
          </div>
        ))}

        {/* Plots */}
        {spacePlots.map((plot) => (
          <div
            key={plot.id}
            className={cn(
              "plot-3d absolute transition-all",
              selectedPlotId === plot.id && "selected"
            )}
            style={{
              left: plot.x * PIXELS_PER_METER * zoom,
              top: plot.y * PIXELS_PER_METER * zoom,
              width: plot.width * PIXELS_PER_METER * zoom,
              height: plot.height * PIXELS_PER_METER * zoom,
              transform: `rotate(${plot.rotation}deg)`,
            }}
          >
            <span className="absolute top-1.5 left-2 text-xs font-bold text-amber-100 bg-amber-900/70 px-2 py-0.5 rounded-full shadow-sm">
              {plot.name}
            </span>
            {/* Dimensions badge */}
            <span className="absolute bottom-1.5 right-2 text-xs font-medium text-amber-200 bg-amber-950/60 px-2 py-0.5 rounded-full">
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

        {/* Paths */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={canvasWidth}
          height={canvasHeight}
          style={{ zIndex: 3 }}
        >
          {spacePaths.map((path) => {
            if (path.points.length < 2) return null;
            const isSelected = selectedPathId === path.id;
            const pointsStr = path.points
              .map((p) => `${p.x * PIXELS_PER_METER * zoom},${p.y * PIXELS_PER_METER * zoom}`)
              .join(" ");

            return (
              <g key={path.id}>
                {/* Path background (wider, for click area) */}
                <polyline
                  points={pointsStr}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={Math.max(20, path.width * PIXELS_PER_METER * zoom)}
                  style={{ pointerEvents: "auto", cursor: "pointer" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (tool === "eraser") {
                      deletePath(path.id);
                    } else if (tool === "select") {
                      setSelectedPath(path.id);
                    }
                  }}
                />
                {/* Path visual */}
                <polyline
                  points={pointsStr}
                  fill="none"
                  className={cn("path-line", path.style, isSelected && "selected")}
                  strokeWidth={path.width * PIXELS_PER_METER * zoom}
                  style={{ pointerEvents: "none" }}
                />
                {/* Path points when selected */}
                {isSelected && path.points.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x * PIXELS_PER_METER * zoom}
                    cy={p.y * PIXELS_PER_METER * zoom}
                    r={5}
                    fill="#FFD700"
                    stroke="white"
                    strokeWidth={2}
                  />
                ))}
              </g>
            );
          })}
        </svg>

        {/* Fences */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={canvasWidth}
          height={canvasHeight}
          style={{ zIndex: 4 }}
        >
          {spaceFences.map((fence) => {
            const isSelected = selectedFenceId === fence.id;
            const x1 = fence.startX * PIXELS_PER_METER * zoom;
            const y1 = fence.startY * PIXELS_PER_METER * zoom;
            const x2 = fence.endX * PIXELS_PER_METER * zoom;
            const y2 = fence.endY * PIXELS_PER_METER * zoom;

            // Calculate fence posts
            const dx = fence.endX - fence.startX;
            const dy = fence.endY - fence.startY;
            const length = Math.sqrt(dx * dx + dy * dy);
            const postCount = Math.max(2, Math.floor(length / fence.postSpacing) + 1);
            const posts = [];
            for (let i = 0; i < postCount; i++) {
              const t = postCount > 1 ? i / (postCount - 1) : 0;
              posts.push({
                x: fence.startX + t * dx,
                y: fence.startY + t * dy,
              });
            }

            return (
              <g key={fence.id}>
                {/* Fence click area */}
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="transparent"
                  strokeWidth={20}
                  style={{ pointerEvents: "auto", cursor: "pointer" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (tool === "eraser") {
                      deleteFence(fence.id);
                    } else if (tool === "select") {
                      setSelectedFence(fence.id);
                    }
                  }}
                />
                {/* Fence line */}
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  className={cn("fence-line", fence.style, isSelected && "selected")}
                  strokeWidth={Math.max(4, fence.height * 3 * zoom)}
                />
                {/* Fence posts */}
                {posts.map((post, i) => (
                  <circle
                    key={i}
                    cx={post.x * PIXELS_PER_METER * zoom}
                    cy={post.y * PIXELS_PER_METER * zoom}
                    r={Math.max(3, fence.height * 3 * zoom)}
                    className={cn("fence-post", fence.style)}
                  />
                ))}
                {/* Selection handles */}
                {isSelected && (
                  <>
                    <circle cx={x1} cy={y1} r={6} fill="#FFD700" stroke="white" strokeWidth={2} />
                    <circle cx={x2} cy={y2} r={6} fill="#FFD700" stroke="white" strokeWidth={2} />
                  </>
                )}
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
                    "absolute flex items-center justify-center cursor-pointer",
                    (isThisPlantSelected || isRowSelected) && "ring-2 ring-primary rounded-full",
                    isThisPlantSelected && "ring-yellow-400 bg-yellow-100/50",
                    tool === "eraser" && "hover:bg-red-500/30 hover:rounded-full"
                  )}
                  style={{
                    left: (plot.x + x) * PIXELS_PER_METER * zoom - 14,
                    top: (plot.y + y) * PIXELS_PER_METER * zoom - 14,
                    width: 28,
                    height: 28,
                    fontSize: 18 * Math.max(0.5, zoom),
                    animationDelay: `${i * 0.1}s`,
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
                  <span className="plant-emoji">{emoji}</span>
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
                "absolute flex items-center justify-center cursor-pointer",
                selectedPlantingId === planting.id && "ring-2 ring-yellow-400 rounded-full bg-yellow-100/30",
                tool === "eraser" && "hover:bg-red-500/30 hover:rounded-full"
              )}
              style={{
                left:
                  (plot.x + planting.position.x) * PIXELS_PER_METER * zoom - 14,
                top:
                  (plot.y + planting.position.y) * PIXELS_PER_METER * zoom - 14,
                width: 28,
                height: 28,
                fontSize: 18 * Math.max(0.5, zoom),
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
              <span className="plant-emoji">{emoji}</span>
            </div>
          );
        })}

        {/* Drawing preview - Plot */}
        {tool === "plot" && isDragging && (() => {
          const w = Math.abs(dragCurrent.x - dragStart.x);
          const h = Math.abs(dragCurrent.y - dragStart.y);
          const left = Math.min(dragStart.x, dragCurrent.x) * PIXELS_PER_METER * zoom;
          const top = Math.min(dragStart.y, dragCurrent.y) * PIXELS_PER_METER * zoom;
          const width = w * PIXELS_PER_METER * zoom;
          const height = h * PIXELS_PER_METER * zoom;
          return (
            <div
              className="absolute border-2 border-dashed border-primary bg-primary/20"
              style={{ left, top, width, height }}
            >
              {/* Dimension label */}
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg whitespace-nowrap"
                style={{ pointerEvents: "none" }}
              >
                {w.toFixed(2)}m × {h.toFixed(2)}m
              </div>
            </div>
          );
        })()}

        {/* Drawing preview - Row (legacy plant-row tool) */}
        {isDrawingRow && rowStart && (() => {
          const plot = spacePlots.find((p) =>
            rowStart.x >= 0 && rowStart.y >= 0
          );
          const plotX = plot?.x || 0;
          const plotY = plot?.y || 0;
          const x1 = (plotX + rowStart.x) * PIXELS_PER_METER * zoom;
          const y1 = (plotY + rowStart.y) * PIXELS_PER_METER * zoom;
          const x2 = dragCurrent.x * PIXELS_PER_METER * zoom;
          const y2 = dragCurrent.y * PIXELS_PER_METER * zoom;
          const length = Math.sqrt(
            Math.pow(dragCurrent.x - plotX - rowStart.x, 2) +
            Math.pow(dragCurrent.y - plotY - rowStart.y, 2)
          );
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          return (
            <svg
              className="absolute inset-0 pointer-events-none"
              width={canvasWidth}
              height={canvasHeight}
            >
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
              {/* Length label */}
              <rect
                x={midX - 30}
                y={midY - 24}
                width={60}
                height={20}
                rx={10}
                fill="hsl(var(--primary))"
              />
              <text
                x={midX}
                y={midY - 10}
                textAnchor="middle"
                fill="white"
                fontSize={11}
                fontWeight="bold"
              >
                {length.toFixed(2)}m
              </text>
            </svg>
          );
        })()}

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
              const length = Math.sqrt(
                Math.pow(dragCurrent.x - plot.x - gardenRowStart.x, 2) +
                Math.pow(dragCurrent.y - plot.y - gardenRowStart.y, 2)
              );
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;
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
                  {/* Length label */}
                  <rect
                    x={midX - 30}
                    y={midY - 24}
                    width={60}
                    height={20}
                    rx={10}
                    fill="#8B4513"
                  />
                  <text
                    x={midX}
                    y={midY - 10}
                    textAnchor="middle"
                    fill="white"
                    fontSize={11}
                    fontWeight="bold"
                  >
                    {length.toFixed(2)}m
                  </text>
                </>
              );
            })()}
          </svg>
        )}

        {/* Drawing preview - Grass area */}
        {tool === "grass" && isDragging && (() => {
          const w = Math.abs(dragCurrent.x - dragStart.x);
          const h = Math.abs(dragCurrent.y - dragStart.y);
          const left = Math.min(dragStart.x, dragCurrent.x) * PIXELS_PER_METER * zoom;
          const top = Math.min(dragStart.y, dragCurrent.y) * PIXELS_PER_METER * zoom;
          const width = w * PIXELS_PER_METER * zoom;
          const height = h * PIXELS_PER_METER * zoom;
          return (
            <div
              className={cn("grass-area absolute", grassType)}
              style={{
                left,
                top,
                width,
                height,
                opacity: 0.7,
                zIndex: 100,
                pointerEvents: "none",
              }}
            >
              {/* Dimension label */}
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-green-800 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg whitespace-nowrap"
                style={{ pointerEvents: "none" }}
              >
                {w.toFixed(2)}m × {h.toFixed(2)}m
              </div>
            </div>
          );
        })()}

        {/* Drawing preview - Fence */}
        {isDrawingFence && fenceStart && (() => {
          const x1 = fenceStart.x * PIXELS_PER_METER * zoom;
          const y1 = fenceStart.y * PIXELS_PER_METER * zoom;
          const x2 = dragCurrent.x * PIXELS_PER_METER * zoom;
          const y2 = dragCurrent.y * PIXELS_PER_METER * zoom;
          const length = Math.sqrt(
            Math.pow(dragCurrent.x - fenceStart.x, 2) +
            Math.pow(dragCurrent.y - fenceStart.y, 2)
          );
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          return (
            <svg
              className="absolute inset-0 pointer-events-none"
              width={canvasWidth}
              height={canvasHeight}
              style={{ zIndex: 20 }}
            >
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                className={cn("fence-line", fenceStyle)}
                strokeWidth={Math.max(4, fenceHeight * 3 * zoom)}
                opacity={0.7}
              />
              <circle
                cx={x1}
                cy={y1}
                r={5}
                className={cn("fence-post", fenceStyle)}
              />
              <circle
                cx={x2}
                cy={y2}
                r={5}
                className={cn("fence-post", fenceStyle)}
              />
              {/* Length label */}
              <rect
                x={midX - 30}
                y={midY - 24}
                width={60}
                height={20}
                rx={10}
                fill="#5D4037"
              />
              <text
                x={midX}
                y={midY - 10}
                textAnchor="middle"
                fill="white"
                fontSize={11}
                fontWeight="bold"
              >
                {length.toFixed(2)}m
              </text>
            </svg>
          );
        })()}

        {/* Drawing preview - Path (accumulated points) */}
        {isDrawingPath && pathPoints.length > 0 && (() => {
          // Calculate total path length
          let totalLength = 0;
          for (let i = 1; i < pathPoints.length; i++) {
            totalLength += Math.sqrt(
              Math.pow(pathPoints[i].x - pathPoints[i - 1].x, 2) +
              Math.pow(pathPoints[i].y - pathPoints[i - 1].y, 2)
            );
          }
          const lastPoint = pathPoints[pathPoints.length - 1];
          const lastX = lastPoint.x * PIXELS_PER_METER * zoom;
          const lastY = lastPoint.y * PIXELS_PER_METER * zoom;
          return (
            <svg
              className="absolute inset-0 pointer-events-none"
              width={canvasWidth}
              height={canvasHeight}
              style={{ zIndex: 20 }}
            >
              <polyline
                points={pathPoints
                  .map((p) => `${p.x * PIXELS_PER_METER * zoom},${p.y * PIXELS_PER_METER * zoom}`)
                  .join(" ")}
                fill="none"
                className={cn("path-line", pathStyle)}
                strokeWidth={pathWidth * PIXELS_PER_METER * zoom}
                opacity={0.7}
              />
              {pathPoints.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x * PIXELS_PER_METER * zoom}
                  cy={p.y * PIXELS_PER_METER * zoom}
                  r={5}
                  fill="hsl(var(--primary))"
                  stroke="white"
                  strokeWidth={2}
                />
              ))}
              {/* Length label */}
              <rect
                x={lastX - 35}
                y={lastY - 45}
                width={70}
                height={20}
                rx={10}
                fill="#808080"
              />
              <text
                x={lastX}
                y={lastY - 31}
                textAnchor="middle"
                fill="white"
                fontSize={11}
                fontWeight="bold"
              >
                {totalLength.toFixed(2)}m
              </text>
              {pathPoints.length >= 2 && (
                <text
                  x={lastX}
                  y={lastY - 55}
                  textAnchor="middle"
                  fill="hsl(var(--primary))"
                  fontSize={10}
                  fontWeight="bold"
                >
                  Double-clic pour terminer
                </text>
              )}
            </svg>
          );
        })()}

        {/* Drawing preview - Planting on existing row */}
        {isPlantingOnRow && plantingOnRowData && selectedPlantId && (
          <svg
            className="absolute inset-0 pointer-events-none"
            width={canvasWidth}
            height={canvasHeight}
            style={{ zIndex: 10 }}
          >
            {(() => {
              const { row, plot, startT } = plantingOnRowData;
              const plant = getPlantById(selectedPlantId);
              if (!plant) return null;

              // Calculer la position de fin sur la rangée
              const dx = row.endX - row.startX;
              const dy = row.endY - row.startY;
              const px = (dragCurrent.x - plot.x) - row.startX;
              const py = (dragCurrent.y - plot.y) - row.startY;
              const endT = Math.max(0, Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy)));

              const tMin = Math.min(startT, endT);
              const tMax = Math.max(startT, endT);

              // Calculer les positions des plants
              const rowLength = Math.sqrt(dx * dx + dy * dy);
              const segmentLength = (tMax - tMin) * rowLength;
              const spacingInMeters = (rowSpacing ?? plant.spacing.plant) / 100;
              const plantCount = Math.max(1, Math.floor(segmentLength / spacingInMeters) + 1);

              // Points de début et fin du segment
              const x1 = (plot.x + row.startX + tMin * dx) * PIXELS_PER_METER * zoom;
              const y1 = (plot.y + row.startY + tMin * dy) * PIXELS_PER_METER * zoom;
              const x2 = (plot.x + row.startX + tMax * dx) * PIXELS_PER_METER * zoom;
              const y2 = (plot.y + row.startY + tMax * dy) * PIXELS_PER_METER * zoom;

              // Générer les positions des plants
              const plantPositions = [];
              for (let i = 0; i < plantCount; i++) {
                const t = plantCount > 1
                  ? tMin + (i / (plantCount - 1)) * (tMax - tMin)
                  : (tMin + tMax) / 2;
                const px = (plot.x + row.startX + t * dx) * PIXELS_PER_METER * zoom;
                const py = (plot.y + row.startY + t * dy) * PIXELS_PER_METER * zoom;
                plantPositions.push({ x: px, y: py });
              }

              return (
                <>
                  {/* Ligne du segment */}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="hsl(var(--primary))"
                    strokeWidth="4"
                    strokeLinecap="round"
                    opacity={0.7}
                  />
                  {/* Points des plants */}
                  {plantPositions.map((pos, i) => (
                    <g key={i}>
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={10}
                        fill="hsl(var(--primary))"
                        opacity={0.8}
                      />
                      <text
                        x={pos.x}
                        y={pos.y + 4}
                        textAnchor="middle"
                        fill="white"
                        fontSize={12}
                      >
                        {plant.emoji}
                      </text>
                    </g>
                  ))}
                  {/* Indicateur du nombre et longueur */}
                  <g>
                    <rect
                      x={(x1 + x2) / 2 - 45}
                      y={(y1 + y2) / 2 - 35}
                      width={90}
                      height={32}
                      rx={6}
                      fill="hsl(var(--primary))"
                    />
                    <text
                      x={(x1 + x2) / 2}
                      y={(y1 + y2) / 2 - 20}
                      textAnchor="middle"
                      fill="white"
                      fontSize={11}
                      fontWeight="bold"
                    >
                      {plantCount} plants
                    </text>
                    <text
                      x={(x1 + x2) / 2}
                      y={(y1 + y2) / 2 - 6}
                      textAnchor="middle"
                      fill="white"
                      fontSize={10}
                    >
                      {segmentLength.toFixed(2)}m
                    </text>
                  </g>
                </>
              );
            })()}
          </svg>
        )}
      </div>

      {/* Zoom indicator */}
      <div className="zoom-indicator absolute bottom-3 right-3 text-sm">
        🔍 {Math.round(zoom * 100)}%
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
            className="plant-info-panel absolute z-20 p-3 flex flex-col gap-2"
            style={{
              left: Math.max(10, plantX - 80),
              top: Math.max(10, plantY - 100),
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-2">
              <span className="text-2xl plant-emoji">{plant?.emoji || "🌱"}</span>
              <div>
                <span className="text-sm font-bold text-green-800 dark:text-green-200">{planting.plantName}</span>
                {isRow && (
                  <span className="text-xs text-green-600 dark:text-green-400 block">
                    Rangée de {plantCount} plants
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 ml-auto hover:bg-red-100 dark:hover:bg-red-900/30"
                onClick={() => {
                  setSelectedPlanting(null);
                  setSelectedPlantIndex(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Actions */}
            <div className="flex gap-1.5 flex-wrap">
              {planting.mode === "single" && (
                <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 px-2 bg-green-50 dark:bg-green-900/30 rounded-full py-1">
                  <Move className="h-3 w-3" />
                  Glisser pour déplacer
                </span>
              )}

              {isRow && selectedPlantIndex !== null && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-600 dark:text-orange-300"
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
