"use client";

import { useEffect, useRef } from "react";
import { useGardenStore } from "./store";

/**
 * Hook qui execute automatiquement la migration des anciennes rangees
 * au premier chargement de l'application
 */
export function useMigration() {
  const hasRun = useRef(false);
  const { needsMigration, runMigration } = useGardenStore();

  useEffect(() => {
    // Ne executer qu'une fois
    if (hasRun.current) return;
    hasRun.current = true;

    // Verifier si une migration est necessaire
    if (needsMigration()) {
      console.log("Migration des anciennes rangees en cours...");
      runMigration();
    }
  }, [needsMigration, runMigration]);
}
