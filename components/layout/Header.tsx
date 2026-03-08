"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Moon, Sun, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/lib/store";

const pageTitles: Record<string, string> = {
  "/dashboard": "Tableau de bord",
  "/garden": "Mon Jardin 3D",
  "/plants": "Mes Plantes",
  "/plants/add": "Ajouter une plante",
  "/plants/catalog": "Catalogue",
  "/planting": "Calendrier",
  "/history": "Historique",
  "/compost": "Compost",
  "/settings": "Paramètres",
};

export function Header() {
  const pathname = usePathname();
  const { isDarkMode, toggleDarkMode } = useUIStore();

  const title = pageTitles[pathname] || "MonJardin";

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 safe-top">
      <div className="flex h-14 items-center justify-between px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-2xl">🌱</span>
            <h1 className="font-semibold text-lg text-primary">{title}</h1>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            className="touch-target"
          >
            {isDarkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
            <span className="sr-only">Changer le thème</span>
          </Button>

          <Button variant="ghost" size="icon" asChild className="touch-target">
            <Link href="/settings">
              <Settings className="h-5 w-5" />
              <span className="sr-only">Paramètres</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
