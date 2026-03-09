// API geo.api.gouv.fr pour les communes françaises
// Documentation: https://geo.api.gouv.fr/decoupage-administratif/communes

export interface Commune {
  code: string;
  nom: string;
  codeDepartement: string;
  codeRegion: string;
  codesPostaux: string[];
  population?: number;
  centre?: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
}

const GEO_API_BASE = "https://geo.api.gouv.fr";

// Rechercher des communes par nom
export async function searchCommunes(query: string, limit: number = 10): Promise<Commune[]> {
  if (!query || query.length < 2) return [];

  try {
    const params = new URLSearchParams({
      nom: query,
      fields: "nom,code,codeDepartement,codesPostaux,centre,population",
      boost: "population",
      limit: limit.toString(),
    });

    const response = await fetch(`${GEO_API_BASE}/communes?${params}`);

    if (!response.ok) {
      throw new Error("Failed to fetch communes");
    }

    return await response.json();
  } catch (error) {
    console.error("Error searching communes:", error);
    return [];
  }
}

// Rechercher des communes par code postal
export async function searchCommunesByPostalCode(postalCode: string): Promise<Commune[]> {
  if (!postalCode || postalCode.length < 2) return [];

  try {
    const params = new URLSearchParams({
      codePostal: postalCode,
      fields: "nom,code,codeDepartement,codesPostaux,centre,population",
    });

    const response = await fetch(`${GEO_API_BASE}/communes?${params}`);

    if (!response.ok) {
      throw new Error("Failed to fetch communes");
    }

    return await response.json();
  } catch (error) {
    console.error("Error searching communes by postal code:", error);
    return [];
  }
}

// Obtenir une commune par son code
export async function getCommuneByCode(code: string): Promise<Commune | null> {
  try {
    const params = new URLSearchParams({
      fields: "nom,code,codeDepartement,codesPostaux,centre,population",
    });

    const response = await fetch(`${GEO_API_BASE}/communes/${code}?${params}`);

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting commune:", error);
    return null;
  }
}

// Convertir une commune en Location pour le store
export function communeToLocation(commune: Commune): { lat: number; lng: number; city: string } | null {
  if (!commune.centre) return null;

  return {
    lat: commune.centre.coordinates[1], // latitude
    lng: commune.centre.coordinates[0], // longitude
    city: commune.nom,
  };
}
