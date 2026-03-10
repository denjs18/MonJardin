import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  GardenSpace,
  Garden,
  GardenRow,
  Plot,
  Planting,
  Plant,
  WeatherData,
  Composter,
  Location,
  Toast,
  PlantStatus,
  PlantEvent,
  PlantReserveItem,
  EditorState,
  EditorTool,
} from "./types";
import { migrateOldRows, needsMigration } from "./migration";

// ============ Garden Store ============

interface GardenState {
  spaces: GardenSpace[];
  gardens: Garden[]; // Legacy alias for spaces
  currentSpaceId: string | null;
  currentGardenId: string | null; // Legacy alias
  plots: Plot[];
  rows: GardenRow[];
  plantings: Planting[];
  reserve: PlantReserveItem[];

  // Space actions
  setSpaces: (spaces: GardenSpace[]) => void;
  addSpace: (space: GardenSpace) => void;
  updateSpace: (id: string, data: Partial<GardenSpace>) => void;
  deleteSpace: (id: string) => void;
  setCurrentSpace: (id: string | null) => void;

  // Legacy garden actions (aliases)
  setGardens: (gardens: Garden[]) => void;
  addGarden: (garden: Garden) => void;
  updateGarden: (id: string, data: Partial<Garden>) => void;
  deleteGarden: (id: string) => void;
  setCurrentGarden: (id: string | null) => void;

  // Plot actions
  setPlots: (plots: Plot[]) => void;
  addPlot: (plot: Plot) => void;
  updatePlot: (id: string, data: Partial<Plot>) => void;
  deletePlot: (id: string) => void;

  // Row actions
  setRows: (rows: GardenRow[]) => void;
  addRow: (row: GardenRow) => void;
  updateRow: (id: string, data: Partial<GardenRow>) => void;
  deleteRow: (id: string) => void;

  // Planting actions
  setPlantings: (plantings: Planting[]) => void;
  addPlanting: (planting: Planting) => void;
  updatePlanting: (id: string, data: Partial<Planting>) => void;
  deletePlanting: (id: string) => void;
  addPlantingEvent: (plantingId: string, event: PlantEvent) => void;
  updatePlantingStatus: (id: string, status: PlantStatus) => void;

  // Reserve actions
  setReserve: (items: PlantReserveItem[]) => void;
  addToReserve: (item: PlantReserveItem) => void;
  removeFromReserve: (plantId: string) => void;
  isInReserve: (plantId: string) => boolean;

  // Computed
  getCurrentSpace: () => GardenSpace | null;
  getCurrentGarden: () => Garden | null;
  getPlotsBySpace: (spaceId: string) => Plot[];
  getPlotsByGarden: (gardenId: string) => Plot[];
  getPlantingsBySpace: (spaceId: string) => Planting[];
  getPlantingsByGarden: (gardenId: string) => Planting[];
  getPlantingsByPlot: (plotId: string) => Planting[];
  getReadyToHarvest: () => Planting[];
  getRowsByPlot: (plotId: string) => GardenRow[];
  getRowsBySpace: (spaceId: string) => GardenRow[];
  getPlantingsByRow: (rowId: string) => Planting[];

  // Migration
  runMigration: () => void;
  needsMigration: () => boolean;
}

export const useGardenStore = create<GardenState>()(
  persist(
    (set, get) => ({
      spaces: [],
      gardens: [], // Will be synced with spaces
      currentSpaceId: null,
      currentGardenId: null,
      plots: [],
      rows: [],
      plantings: [],
      reserve: [],

      // Space actions
      setSpaces: (spaces) => set({ spaces, gardens: spaces }),
      addSpace: (space) =>
        set((state) => ({
          spaces: [...state.spaces, space],
          gardens: [...state.spaces, space],
        })),
      updateSpace: (id, data) =>
        set((state) => {
          const updated = state.spaces.map((s) =>
            s.id === id ? { ...s, ...data } : s
          );
          return { spaces: updated, gardens: updated };
        }),
      deleteSpace: (id) =>
        set((state) => {
          const filtered = state.spaces.filter((s) => s.id !== id);
          return {
            spaces: filtered,
            gardens: filtered,
            plots: state.plots.filter((p) => p.spaceId !== id && p.gardenId !== id),
            rows: state.rows.filter((r) => r.spaceId !== id),
            plantings: state.plantings.filter((p) => p.spaceId !== id && p.gardenId !== id),
            currentSpaceId: state.currentSpaceId === id ? null : state.currentSpaceId,
            currentGardenId: state.currentGardenId === id ? null : state.currentGardenId,
          };
        }),
      setCurrentSpace: (id) => set({ currentSpaceId: id, currentGardenId: id }),

      // Legacy aliases
      setGardens: (gardens) => set({ gardens, spaces: gardens }),
      addGarden: (garden) =>
        set((state) => ({
          gardens: [...state.gardens, garden],
          spaces: [...state.gardens, garden],
        })),
      updateGarden: (id, data) =>
        set((state) => {
          const updated = state.gardens.map((g) =>
            g.id === id ? { ...g, ...data } : g
          );
          return { gardens: updated, spaces: updated };
        }),
      deleteGarden: (id) =>
        set((state) => {
          const filtered = state.gardens.filter((g) => g.id !== id);
          return {
            gardens: filtered,
            spaces: filtered,
            plots: state.plots.filter((p) => p.gardenId !== id && p.spaceId !== id),
            rows: state.rows.filter((r) => r.spaceId !== id),
            plantings: state.plantings.filter((p) => p.gardenId !== id && p.spaceId !== id),
            currentGardenId: state.currentGardenId === id ? null : state.currentGardenId,
            currentSpaceId: state.currentSpaceId === id ? null : state.currentSpaceId,
          };
        }),
      setCurrentGarden: (id) => set({ currentGardenId: id, currentSpaceId: id }),

      // Plot actions
      setPlots: (plots) => set({ plots }),
      addPlot: (plot) => set((state) => ({ plots: [...state.plots, plot] })),
      updatePlot: (id, data) =>
        set((state) => ({
          plots: state.plots.map((p) => (p.id === id ? { ...p, ...data } : p)),
        })),
      deletePlot: (id) =>
        set((state) => {
          // Récupérer les IDs des rangées de cette parcelle
          const rowIdsToDelete = state.rows
            .filter((r) => r.plotId === id)
            .map((r) => r.id);
          return {
            plots: state.plots.filter((p) => p.id !== id),
            rows: state.rows.filter((r) => r.plotId !== id),
            // Supprimer les plantings de la parcelle ET ceux attachés aux rangées supprimées
            plantings: state.plantings.filter(
              (p) => p.plotId !== id && !rowIdsToDelete.includes(p.rowId || "")
            ),
          };
        }),

      // Row actions
      setRows: (rows) => set({ rows }),
      addRow: (row) => set((state) => ({ rows: [...state.rows, row] })),
      updateRow: (id, data) =>
        set((state) => ({
          rows: state.rows.map((r) => (r.id === id ? { ...r, ...data } : r)),
        })),
      deleteRow: (id) =>
        set((state) => ({
          rows: state.rows.filter((r) => r.id !== id),
          // Supprimer aussi les plants attachés à cette rangée
          plantings: state.plantings.filter((p) => p.rowId !== id),
        })),

      // Planting actions
      setPlantings: (plantings) => set({ plantings }),
      addPlanting: (planting) =>
        set((state) => ({ plantings: [...state.plantings, planting] })),
      updatePlanting: (id, data) =>
        set((state) => ({
          plantings: state.plantings.map((p) =>
            p.id === id ? { ...p, ...data } : p
          ),
        })),
      deletePlanting: (id) =>
        set((state) => ({
          plantings: state.plantings.filter((p) => p.id !== id),
        })),
      addPlantingEvent: (plantingId, event) =>
        set((state) => ({
          plantings: state.plantings.map((p) =>
            p.id === plantingId ? { ...p, events: [...p.events, event] } : p
          ),
        })),
      updatePlantingStatus: (id, status) =>
        set((state) => ({
          plantings: state.plantings.map((p) =>
            p.id === id ? { ...p, status } : p
          ),
        })),

      // Reserve actions
      setReserve: (items) => set({ reserve: items }),
      addToReserve: (item) =>
        set((state) => {
          if (state.reserve.some((r) => r.plantId === item.plantId)) {
            return state;
          }
          return { reserve: [...state.reserve, item] };
        }),
      removeFromReserve: (plantId) =>
        set((state) => ({
          reserve: state.reserve.filter((r) => r.plantId !== plantId),
        })),
      isInReserve: (plantId) => get().reserve.some((r) => r.plantId === plantId),

      // Computed
      getCurrentSpace: () => {
        const state = get();
        return state.spaces.find((s) => s.id === state.currentSpaceId) || null;
      },
      getCurrentGarden: () => {
        const state = get();
        return state.gardens.find((g) => g.id === state.currentGardenId) || null;
      },
      getPlotsBySpace: (spaceId) =>
        get().plots.filter((p) => p.spaceId === spaceId || p.gardenId === spaceId),
      getPlotsByGarden: (gardenId) =>
        get().plots.filter((p) => p.gardenId === gardenId || p.spaceId === gardenId),
      getPlantingsBySpace: (spaceId) =>
        get().plantings.filter((p) => p.spaceId === spaceId || p.gardenId === spaceId),
      getPlantingsByGarden: (gardenId) =>
        get().plantings.filter((p) => p.gardenId === gardenId || p.spaceId === gardenId),
      getPlantingsByPlot: (plotId) =>
        get().plantings.filter((p) => p.plotId === plotId),
      getReadyToHarvest: () =>
        get().plantings.filter((p) => p.status === "ready"),
      getRowsByPlot: (plotId) =>
        get().rows.filter((r) => r.plotId === plotId),
      getRowsBySpace: (spaceId) =>
        get().rows.filter((r) => r.spaceId === spaceId),
      getPlantingsByRow: (rowId) =>
        get().plantings.filter((p) => p.rowId === rowId),

      // Migration
      needsMigration: () => needsMigration(get().plantings),
      runMigration: () => {
        const state = get();
        if (!needsMigration(state.plantings)) return;

        const { newRows, newPlantings, plantingsToRemove } = migrateOldRows(
          state.plantings,
          state.rows
        );

        set({
          rows: [...state.rows, ...newRows],
          plantings: [
            ...state.plantings.filter((p) => !plantingsToRemove.includes(p.id)),
            ...newPlantings,
          ],
        });

        console.log(
          `Migration terminee: ${newRows.length} rangees et ${newPlantings.length} plantations creees, ${plantingsToRemove.length} anciennes rangees supprimees`
        );
      },
    }),
    {
      name: "garden-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        spaces: state.spaces,
        gardens: state.gardens,
        currentSpaceId: state.currentSpaceId,
        currentGardenId: state.currentGardenId,
        plots: state.plots,
        rows: state.rows,
        plantings: state.plantings,
        reserve: state.reserve,
      }),
    }
  )
);

// ============ Editor Store ============

interface EditorStoreState extends EditorState {
  setTool: (tool: EditorTool) => void;
  setSelectedPlot: (id: string | null) => void;
  setSelectedPlanting: (id: string | null) => void;
  setSelectedPlant: (id: string | null) => void;
  setSelectedRow: (id: string | null) => void;
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
  toggleGrid: () => void;
  setGridSize: (size: number) => void;
  resetEditor: () => void;
}

const defaultEditorState: EditorState = {
  tool: "select",
  selectedPlotId: null,
  selectedPlantingId: null,
  selectedPlantId: null,
  selectedRowId: null,
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  showGrid: true,
  gridSize: 10, // 10cm
};

export const useEditorStore = create<EditorStoreState>((set) => ({
  ...defaultEditorState,

  setTool: (tool) => set({ tool, selectedPlotId: null, selectedPlantingId: null, selectedRowId: null }),
  setSelectedPlot: (id) => set({ selectedPlotId: id, selectedPlantingId: null, selectedRowId: null }),
  setSelectedPlanting: (id) => set({ selectedPlantingId: id, selectedPlotId: null, selectedRowId: null }),
  setSelectedPlant: (id) => set({ selectedPlantId: id }),
  setSelectedRow: (id) => set({ selectedRowId: id, selectedPlotId: null, selectedPlantingId: null }),
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),
  setPanOffset: (offset) => set({ panOffset: offset }),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  setGridSize: (size) => set({ gridSize: size }),
  resetEditor: () => set(defaultEditorState),
}));

// ============ Weather Store ============

interface WeatherState {
  weather: WeatherData | null;
  location: Location | null;
  isLoading: boolean;
  error: string | null;

  setWeather: (weather: WeatherData | null) => void;
  setLocation: (location: Location | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useWeatherStore = create<WeatherState>()(
  persist(
    (set) => ({
      weather: null,
      location: null,
      isLoading: false,
      error: null,

      setWeather: (weather) => set({ weather, error: null }),
      setLocation: (location) => set({ location }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error, isLoading: false }),
    }),
    {
      name: "weather-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        weather: state.weather,
        location: state.location,
      }),
    }
  )
);

// ============ Compost Store ============

interface CompostState {
  composters: Composter[];

  setComposters: (composters: Composter[]) => void;
  addComposter: (composter: Composter) => void;
  updateComposter: (id: string, data: Partial<Composter>) => void;
  deleteComposter: (id: string) => void;
  getCompostersByGarden: (gardenId: string) => Composter[];
}

export const useCompostStore = create<CompostState>()(
  persist(
    (set, get) => ({
      composters: [],

      setComposters: (composters) => set({ composters }),
      addComposter: (composter) =>
        set((state) => ({ composters: [...state.composters, composter] })),
      updateComposter: (id, data) =>
        set((state) => ({
          composters: state.composters.map((c) =>
            c.id === id ? { ...c, ...data } : c
          ),
        })),
      deleteComposter: (id) =>
        set((state) => ({
          composters: state.composters.filter((c) => c.id !== id),
        })),
      getCompostersByGarden: (gardenId) =>
        get().composters.filter((c) => c.gardenId === gardenId),
    }),
    {
      name: "compost-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ============ Plant Catalog Store ============

interface CatalogState {
  plants: Plant[];
  isLoaded: boolean;

  setPlants: (plants: Plant[]) => void;
  getPlantById: (id: string) => Plant | undefined;
  getPlantsByType: (type: Plant["type"]) => Plant[];
  searchPlants: (query: string) => Plant[];
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  plants: [],
  isLoaded: false,

  setPlants: (plants) => set({ plants, isLoaded: true }),
  getPlantById: (id) => get().plants.find((p) => p.id === id),
  getPlantsByType: (type) => get().plants.filter((p) => p.type === type),
  searchPlants: (query) => {
    const q = query.toLowerCase();
    return get().plants.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.family.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  },
}));

// ============ UI Store ============

interface UIState {
  isMobileMenuOpen: boolean;
  isDarkMode: boolean;
  toasts: Toast[];
  selectedPlantingId: string | null;

  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  toggleDarkMode: () => void;
  setDarkMode: (dark: boolean) => void;
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  setSelectedPlanting: (id: string | null) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isMobileMenuOpen: false,
      isDarkMode: false,
      toasts: [],
      selectedPlantingId: null,

      toggleMobileMenu: () =>
        set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
      setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      setDarkMode: (dark) => set({ isDarkMode: dark }),
      addToast: (toast) =>
        set((state) => ({
          toasts: [
            ...state.toasts,
            { ...toast, id: `toast-${Date.now()}` },
          ],
        })),
      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),
      setSelectedPlanting: (id) => set({ selectedPlantingId: id }),
    }),
    {
      name: "ui-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isDarkMode: state.isDarkMode,
      }),
    }
  )
);
