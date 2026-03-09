"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useUIStore, useCatalogStore } from "@/lib/store";
import { getAllPlants } from "@/lib/plantCatalog";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useFirestoreSync } from "@/hooks/use-sync";

const publicRoutes = ["/login", "/signup", "/reset-password"];

function AppContent({ children }: { children: React.ReactNode }) {
  const { isDarkMode } = useUIStore();
  const { setPlants, isLoaded } = useCatalogStore();
  const { user } = useAuth();
  const pathname = usePathname();

  // Synchronisation Firestore
  useFirestoreSync();

  const isPublicRoute = publicRoutes.includes(pathname);

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

  // Pages publiques (login, signup) sans navigation
  if (isPublicRoute) {
    return (
      <div className="min-h-screen bg-background">
        {children}
        <Toaster />
      </div>
    );
  }

  // Pages protégées avec navigation
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-20 max-w-lg mx-auto">{children}</main>
      <BottomNav />
      <Toaster />
    </div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>
        <AppContent>{children}</AppContent>
      </AuthGuard>
    </AuthProvider>
  );
}
