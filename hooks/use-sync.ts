"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { saveUserData, loadUserData, clearLocalData } from "@/lib/firestore-sync";
import { useGardenStore, useCompostStore, useWeatherStore } from "@/lib/store";

export function useFirestoreSync() {
  const { user } = useAuth();
  const previousUserId = useRef<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);

  // Charger les données quand l'utilisateur se connecte
  useEffect(() => {
    const loadData = async () => {
      if (user && user.uid !== previousUserId.current) {
        isLoadingRef.current = true;
        await loadUserData(user.uid);
        previousUserId.current = user.uid;
        isLoadingRef.current = false;
      } else if (!user && previousUserId.current) {
        // Utilisateur déconnecté, effacer les données
        clearLocalData();
        previousUserId.current = null;
      }
    };

    loadData();
  }, [user]);

  // Fonction de sauvegarde avec debounce
  const debouncedSave = useCallback(() => {
    if (!user || isLoadingRef.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveUserData(user.uid);
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    }, 2000); // Attendre 2 secondes après le dernier changement
  }, [user]);

  // S'abonner aux changements des stores
  useEffect(() => {
    if (!user) return;

    const unsubGarden = useGardenStore.subscribe(debouncedSave);
    const unsubCompost = useCompostStore.subscribe(debouncedSave);
    const unsubWeather = useWeatherStore.subscribe((state, prevState) => {
      // Ne sauvegarder que si la location change
      if (state.location !== prevState.location) {
        debouncedSave();
      }
    });

    return () => {
      unsubGarden();
      unsubCompost();
      unsubWeather();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [user, debouncedSave]);

  // Sauvegarder immédiatement
  const saveNow = useCallback(async () => {
    if (!user) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    await saveUserData(user.uid);
  }, [user]);

  return { saveNow };
}
