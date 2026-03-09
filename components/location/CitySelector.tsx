"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchCommunes, communeToLocation, Commune } from "@/lib/geo-api";
import { cn } from "@/lib/utils";

interface CitySelectorProps {
  value?: string;
  onSelect: (location: { lat: number; lng: number; city: string }) => void;
  placeholder?: string;
  className?: string;
}

export function CitySelector({
  value,
  onSelect,
  placeholder = "Rechercher une ville...",
  className,
}: CitySelectorProps) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState<Commune[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Recherche avec debounce
  const search = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      // Déterminer si c'est un code postal ou un nom de ville
      const isPostalCode = /^\d+$/.test(searchQuery);
      let communes: Commune[];

      if (isPostalCode) {
        const { searchCommunesByPostalCode } = await import("@/lib/geo-api");
        communes = await searchCommunesByPostalCode(searchQuery);
      } else {
        communes = await searchCommunes(searchQuery, 8);
      }

      setResults(communes);
      setIsOpen(communes.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce la recherche
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      search(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, search]);

  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sélectionner une commune
  const handleSelect = (commune: Commune) => {
    const location = communeToLocation(commune);
    if (location) {
      setQuery(commune.nom);
      onSelect(location);
      setIsOpen(false);
    }
  };

  // Navigation au clavier
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  // Effacer la sélection
  const handleClear = () => {
    setQuery("");
    setResults([]);
    inputRef.current?.focus();
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10"
        />
        {isLoading ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        ) : query ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* Dropdown des résultats */}
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {results.map((commune, index) => (
            <button
              key={commune.code}
              type="button"
              onClick={() => handleSelect(commune)}
              className={cn(
                "w-full px-3 py-2 text-left hover:bg-accent flex items-center gap-2",
                index === selectedIndex && "bg-accent"
              )}
            >
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="font-medium truncate">{commune.nom}</div>
                <div className="text-xs text-muted-foreground">
                  {commune.codesPostaux?.[0]} - Département {commune.codeDepartement}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Message si pas de résultats */}
      {isOpen && query.length >= 2 && !isLoading && results.length === 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg p-3 text-center text-muted-foreground text-sm"
        >
          Aucune ville trouvée
        </div>
      )}
    </div>
  );
}
