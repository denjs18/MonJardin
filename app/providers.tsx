"use client";

import { useEffect } from "react";
import { useUIStore, useCatalogStore } from "@/lib/store";
import { getAllPlants } from "@/lib/plantCatalog";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  const { isDarkMode } = useUIStore();
  const { setPlants, isLoaded } = useCatalogStore();

  // Load plant catalog on mount
  useEffect(() => {
    if (!isLoaded) {
      const plants = getAllPlants();
      setPlants(plants);
    }
  }, [isLoaded, setPlants]);

  // Apply dark mode class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-20 max-w-lg mx-auto">{children}</main>
      <BottomNav />
      <Toaster />
    </div>
  );
}
