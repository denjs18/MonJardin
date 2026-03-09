import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  Garden,
  Plot,
  Planting,
  Plant,
  WeatherData,
  Composter,
  Location,
  Toast,
  PlantStatus,
  PlantEvent,
} from "./types";

// ============ Garden Store ============

interface GardenState {
  gardens: Garden[];
  currentGardenId: string | null;
  plots: Plot[];
  plantings: Planting[];

  // Actions
  setGardens: (gardens: Garden[]) => void;
  addGarden: (garden: Garden) => void;
  updateGarden: (id: string, data: Partial<Garden>) => void;
  deleteGarden: (id: string) => void;
  setCurrentGarden: (id: string | null) => void;

  setPlots: (plots: Plot[]) => void;
  addPlot: (plot: Plot) => void;
  updatePlot: (id: string, data: Partial<Plot>) => void;
  deletePlot: (id: string) => void;

  setPlantings: (plantings: Planting[]) => void;
  addPlanting: (planting: Planting) => void;
  updatePlanting: (id: string, data: Partial<Planting>) => void;
  deletePlanting: (id: string) => void;
  addPlantingEvent: (plantingId: string, event: PlantEvent) => void;
  updatePlantingStatus: (id: string, status: PlantStatus) => void;

  // Computed
  getCurrentGarden: () => Garden | null;
  getPlotsByGarden: (gardenId: string) => Plot[];
  getPlantingsByGarden: (gardenId: string) => Planting[];
  getPlantingsByPlot: (plotId: string) => Planting[];
  getReadyToHarvest: () => Planting[];
}

export const useGardenStore = create<GardenState>()(
  persist(
    (set, get) => ({
      gardens: [],
      currentGardenId: null,
      plots: [],
      plantings: [],

      setGardens: (gardens) => set({ gardens }),
      addGarden: (garden) =>
        set((state) => ({ gardens: [...state.gardens, garden] })),
      updateGarden: (id, data) =>
        set((state) => ({
          gardens: state.gardens.map((g) =>
            g.id === id ? { ...g, ...data } : g
          ),
        })),
      deleteGarden: (id) =>
        set((state) => ({
          gardens: state.gardens.filter((g) => g.id !== id),
          plots: state.plots.filter((p) => p.gardenId !== id),
          plantings: state.plantings.filter((p) => p.gardenId !== id),
          currentGardenId:
            state.currentGardenId === id ? null : state.currentGardenId,
        })),
      setCurrentGarden: (id) => set({ currentGardenId: id }),

      setPlots: (plots) => set({ plots }),
      addPlot: (plot) => set((state) => ({ plots: [...state.plots, plot] })),
      updatePlot: (id, data) =>
        set((state) => ({
          plots: state.plots.map((p) => (p.id === id ? { ...p, ...data } : p)),
        })),
      deletePlot: (id) =>
        set((state) => ({
          plots: state.plots.filter((p) => p.id !== id),
          plantings: state.plantings.filter((p) => p.plotId !== id),
        })),

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

      getCurrentGarden: () => {
        const state = get();
        return (
          state.gardens.find((g) => g.id === state.currentGardenId) || null
        );
      },
      getPlotsByGarden: (gardenId) =>
        get().plots.filter((p) => p.gardenId === gardenId),
      getPlantingsByGarden: (gardenId) =>
        get().plantings.filter((p) => p.gardenId === gardenId),
      getPlantingsByPlot: (plotId) =>
        get().plantings.filter((p) => p.plotId === plotId),
      getReadyToHarvest: () =>
        get().plantings.filter((p) => p.status === "ready"),
    }),
    {
      name: "garden-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        gardens: state.gardens,
        currentGardenId: state.currentGardenId,
        plots: state.plots,
        plantings: state.plantings,
      }),
    }
  )
);

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
