"use client";

import { db, setDoc, doc, getDoc, Timestamp } from "./firebase";
import { useGardenStore, useWeatherStore, useCompostStore } from "./store";

// Structure des données utilisateur dans Firestore
interface UserData {
  gardens: any[];
  currentGardenId: string | null;
  plots: any[];
  plantings: any[];
  rows: any[];
  grassAreas: any[];
  paths: any[];
  fences: any[];
  composters: any[];
  location: any | null;
  updatedAt: any;
}

// Fonction pour nettoyer les valeurs undefined (Firestore ne les accepte pas)
function removeUndefined(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  }
  if (typeof obj === "object" && !(obj instanceof Date)) {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (value !== undefined) {
        cleaned[key] = removeUndefined(value);
      }
    }
    return cleaned;
  }
  return obj;
}

// Sauvegarder les données de l'utilisateur dans Firestore
export async function saveUserData(userId: string): Promise<void> {
  if (!db) {
    console.warn("Firebase not initialized, skipping save");
    return;
  }

  const gardenState = useGardenStore.getState();
  const compostState = useCompostStore.getState();
  const weatherState = useWeatherStore.getState();

  const userData: UserData = removeUndefined({
    gardens: gardenState.gardens,
    currentGardenId: gardenState.currentGardenId,
    plots: gardenState.plots,
    plantings: gardenState.plantings,
    rows: gardenState.rows,
    grassAreas: gardenState.grassAreas,
    paths: gardenState.paths,
    fences: gardenState.fences,
    composters: compostState.composters,
    location: weatherState.location,
    updatedAt: Timestamp.now(),
  });

  try {
    await setDoc(doc(db, "users", userId), userData, { merge: true });
    console.log("Data saved to Firestore");
  } catch (error) {
    console.error("Error saving to Firestore:", error);
    throw error;
  }
}

// Charger les données de l'utilisateur depuis Firestore
export async function loadUserData(userId: string): Promise<boolean> {
  if (!db) {
    console.warn("Firebase not initialized, using local data");
    return false;
  }

  try {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as UserData;

      // Charger les données dans les stores
      if (data.gardens) {
        useGardenStore.getState().setGardens(data.gardens);
      }
      if (data.currentGardenId !== undefined) {
        useGardenStore.getState().setCurrentGarden(data.currentGardenId);
      }
      if (data.plots) {
        useGardenStore.getState().setPlots(data.plots);
      }
      if (data.plantings) {
        useGardenStore.getState().setPlantings(data.plantings);
      }
      if (data.rows) {
        useGardenStore.getState().setRows(data.rows);
      }
      if (data.grassAreas) {
        useGardenStore.getState().setGrassAreas(data.grassAreas);
      }
      if (data.paths) {
        useGardenStore.getState().setPaths(data.paths);
      }
      if (data.fences) {
        useGardenStore.getState().setFences(data.fences);
      }
      if (data.composters) {
        useCompostStore.getState().setComposters(data.composters);
      }
      if (data.location) {
        useWeatherStore.getState().setLocation(data.location);
      }

      console.log("Data loaded from Firestore");
      return true;
    } else {
      console.log("No user data in Firestore, using local data");
      // Sauvegarder les données locales existantes vers Firestore
      await saveUserData(userId);
      return false;
    }
  } catch (error) {
    console.error("Error loading from Firestore:", error);
    return false;
  }
}

// Effacer les données locales (lors de la déconnexion)
export function clearLocalData(): void {
  useGardenStore.getState().setGardens([]);
  useGardenStore.getState().setCurrentGarden(null);
  useGardenStore.getState().setPlots([]);
  useGardenStore.getState().setPlantings([]);
  useCompostStore.getState().setComposters([]);
  useWeatherStore.getState().setLocation(null);
  useWeatherStore.getState().setWeather(null);
}
