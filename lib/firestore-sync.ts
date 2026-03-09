"use client";

import { db, setDoc, doc, getDoc, Timestamp } from "./firebase";
import { useGardenStore, useWeatherStore, useCompostStore } from "./store";

// Structure des données utilisateur dans Firestore
interface UserData {
  gardens: any[];
  currentGardenId: string | null;
  plots: any[];
  plantings: any[];
  composters: any[];
  location: any | null;
  updatedAt: any;
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

  const userData: UserData = {
    gardens: gardenState.gardens,
    currentGardenId: gardenState.currentGardenId,
    plots: gardenState.plots,
    plantings: gardenState.plantings,
    composters: compostState.composters,
    location: weatherState.location,
    updatedAt: Timestamp.now(),
  };

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
