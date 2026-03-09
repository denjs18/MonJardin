"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Sun,
  Moon,
  Trash2,
  Download,
  Upload,
  Info,
  User,
  LogOut,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useGardenStore,
  useWeatherStore,
  useUIStore,
  useCompostStore,
} from "@/lib/store";
import { Garden } from "@/lib/types";
import { generateId } from "@/lib/utils";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { CitySelector } from "@/components/location/CitySelector";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const {
    gardens,
    currentGardenId,
    setCurrentGarden,
    addGarden,
    updateGarden,
    deleteGarden,
  } = useGardenStore();
  const { location, setLocation } = useWeatherStore();
  const { isDarkMode, toggleDarkMode } = useUIStore();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [showGardenDialog, setShowGardenDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [editingGarden, setEditingGarden] = useState<Garden | null>(null);

  const [gardenName, setGardenName] = useState("");
  const [gardenWidth, setGardenWidth] = useState("4");
  const [gardenHeight, setGardenHeight] = useState("3");

  const handleSaveGarden = () => {
    if (editingGarden) {
      updateGarden(editingGarden.id, {
        name: gardenName,
        width: parseFloat(gardenWidth),
        height: parseFloat(gardenHeight),
      });
      toast({ title: "Jardin mis à jour" });
    } else {
      const newGarden: Garden = {
        id: generateId(),
        name: gardenName || `Jardin ${gardens.length + 1}`,
        environment: "outdoor",
        location: location || {
          lat: 43.6476,
          lng: 1.4351,
          city: "Toulouse",
        },
        width: parseFloat(gardenWidth),
        height: parseFloat(gardenHeight),
        createdAt: new Date(),
      };
      addGarden(newGarden);
      setCurrentGarden(newGarden.id);
      toast({ title: "Jardin créé" });
    }
    setShowGardenDialog(false);
    resetGardenForm();
  };

  const handleDeleteGarden = () => {
    if (editingGarden) {
      deleteGarden(editingGarden.id);
      toast({ title: "Jardin supprimé" });
      setShowDeleteDialog(false);
      setEditingGarden(null);
    }
  };

  const resetGardenForm = () => {
    setGardenName("");
    setGardenWidth("4");
    setGardenHeight("3");
    setEditingGarden(null);
  };

  const openEditGarden = (garden: Garden) => {
    setEditingGarden(garden);
    setGardenName(garden.name);
    setGardenWidth(garden.width.toString());
    setGardenHeight(garden.height.toString());
    setShowGardenDialog(true);
  };

  const handleLocationSelect = (loc: { lat: number; lng: number; city: string }) => {
    setLocation(loc);
    toast({ title: "Localisation mise à jour", description: loc.city });
  };

  const detectLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          // Reverse geocoding pour trouver la ville
          try {
            const response = await fetch(
              `https://geo.api.gouv.fr/communes?lat=${position.coords.latitude}&lon=${position.coords.longitude}&fields=nom,centre`
            );
            const communes = await response.json();
            if (communes.length > 0) {
              setLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                city: communes[0].nom,
              });
              toast({
                title: "Position détectée",
                description: communes[0].nom,
              });
            } else {
              setLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                city: "Position actuelle",
              });
              toast({ title: "Position détectée" });
            }
          } catch {
            setLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              city: "Position actuelle",
            });
            toast({ title: "Position détectée" });
          }
        },
        () => {
          toast({
            title: "Erreur",
            description: "Impossible de détecter la position. Utilisez la recherche de ville.",
            variant: "destructive",
          });
        }
      );
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/login");
      toast({ title: "Déconnexion réussie" });
    } catch {
      toast({
        title: "Erreur",
        description: "Erreur lors de la déconnexion",
        variant: "destructive",
      });
    }
  };

  const exportData = () => {
    const data = {
      gardens: useGardenStore.getState().gardens,
      plantings: useGardenStore.getState().plantings,
      plots: useGardenStore.getState().plots,
      composters: useCompostStore.getState().composters,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monjardin-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "Données exportées" });
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.gardens) useGardenStore.getState().setGardens(data.gardens);
        if (data.plantings)
          useGardenStore.getState().setPlantings(data.plantings);
        if (data.plots) useGardenStore.getState().setPlots(data.plots);
        if (data.composters)
          useCompostStore.getState().setComposters(data.composters);

        toast({ title: "Données importées avec succès" });
      } catch {
        toast({
          title: "Erreur",
          description: "Erreur lors de l'import",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">Paramètres</h1>
      </div>

      {/* Account */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-5 w-5" />
            Mon compte
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {user ? (
            <>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{user.displayName || "Jardinier"}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLogoutDialog(true)}
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Se déconnecter
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Non connecté</p>
          )}
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Apparence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isDarkMode ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
              <div>
                <p className="font-medium">Mode sombre</p>
                <p className="text-sm text-muted-foreground">
                  {isDarkMode ? "Activé" : "Désactivé"}
                </p>
              </div>
            </div>
            <Switch checked={isDarkMode} onCheckedChange={toggleDarkMode} />
          </div>
        </CardContent>
      </Card>

      {/* Gardens */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Mes jardins</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                resetGardenForm();
                setShowGardenDialog(true);
              }}
            >
              + Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {gardens.length > 0 ? (
            <div className="space-y-2">
              {gardens.map((garden) => (
                <div
                  key={garden.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    garden.id === currentGardenId
                      ? "border-primary bg-primary/5"
                      : ""
                  }`}
                >
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => setCurrentGarden(garden.id)}
                  >
                    <p className="font-medium">{garden.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {garden.width}m x {garden.height}m
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditGarden(garden)}
                    >
                      Modifier
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun jardin configuré
            </p>
          )}
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Localisation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Utilisée pour la météo et les conseils de jardinage
          </p>

          {location && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">{location.city}</p>
              <p className="text-xs text-muted-foreground">
                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Rechercher une ville</Label>
            <CitySelector
              value={location?.city}
              onSelect={handleLocationSelect}
              placeholder="Tapez le nom d'une ville ou un code postal..."
            />
          </div>

          <Button variant="outline" size="sm" onClick={detectLocation}>
            <MapPin className="h-4 w-4 mr-1" />
            Utiliser ma position
          </Button>
        </CardContent>
      </Card>

      {/* Data */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Données</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportData}>
              <Download className="h-4 w-4 mr-1" />
              Exporter
            </Button>
            <label>
              <Button variant="outline" size="sm" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-1" />
                  Importer
                </span>
              </Button>
              <input
                type="file"
                accept=".json"
                onChange={importData}
                className="hidden"
              />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Exportez vos données pour les sauvegarder ou les transférer
          </p>
        </CardContent>
      </Card>

      {/* Sync Status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-5 w-5" />
            Synchronisation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isFirebaseConfigured() && user ? "bg-green-500" : "bg-yellow-500"
              }`}
            />
            <span className="text-sm">
              {isFirebaseConfigured() && user
                ? "Synchronisé avec le cloud"
                : "Mode hors-ligne (localStorage)"}
            </span>
          </div>
          {(!isFirebaseConfigured() || !user) && (
            <p className="text-xs text-muted-foreground mt-2">
              {!user
                ? "Connectez-vous pour synchroniser vos données"
                : "Configuration Firebase manquante"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">À propos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>MonJardin</strong> v1.1.0
          </p>
          <p className="text-muted-foreground">
            Application de gestion de jardin mobile-first
          </p>
        </CardContent>
      </Card>

      {/* Garden Dialog */}
      <Dialog open={showGardenDialog} onOpenChange={setShowGardenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGarden ? "Modifier le jardin" : "Nouveau jardin"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom du jardin</Label>
              <Input
                value={gardenName}
                onChange={(e) => setGardenName(e.target.value)}
                placeholder="Mon potager"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Largeur (m)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={gardenWidth}
                  onChange={(e) => setGardenWidth(e.target.value)}
                />
              </div>
              <div>
                <Label>Longueur (m)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={gardenHeight}
                  onChange={(e) => setGardenHeight(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {editingGarden && (
              <Button
                variant="destructive"
                onClick={() => {
                  setShowGardenDialog(false);
                  setShowDeleteDialog(true);
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Supprimer
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                onClick={() => setShowGardenDialog(false)}
              >
                Annuler
              </Button>
              <Button onClick={handleSaveGarden}>Sauvegarder</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Garden Confirmation */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer ce jardin ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Toutes les plantations associées seront également supprimées. Cette
            action est irréversible.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteGarden}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logout Confirmation */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Se déconnecter ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Vos données locales seront effacées. Elles resteront disponibles dans le cloud
            et seront rechargées à votre prochaine connexion.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLogoutDialog(false)}
            >
              Annuler
            </Button>
            <Button onClick={handleLogout}>
              Se déconnecter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
