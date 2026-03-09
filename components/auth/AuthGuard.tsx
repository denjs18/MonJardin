"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const publicRoutes = ["/login", "/signup", "/reset-password"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    if (!loading) {
      if (!user && !isPublicRoute) {
        router.push("/login");
      } else if (user && isPublicRoute) {
        router.push("/dashboard");
      }
    }
  }, [user, loading, isPublicRoute, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Si c'est une route publique et pas d'utilisateur, afficher le contenu
  if (isPublicRoute && !user) {
    return <>{children}</>;
  }

  // Si c'est une route protégée et pas d'utilisateur, ne rien afficher (redirection en cours)
  if (!isPublicRoute && !user) {
    return null;
  }

  // Utilisateur connecté sur route protégée
  return <>{children}</>;
}
