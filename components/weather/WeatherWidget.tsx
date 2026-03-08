"use client";

import { useEffect, useState } from "react";
import { Cloud, Droplets, Wind, Thermometer, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWeatherStore } from "@/lib/store";
import {
  fetchWeather,
  generateWateringAdvice,
  getWeatherIcon,
  shouldRefreshWeather,
} from "@/lib/openmeteo";
import { cn } from "@/lib/utils";

export function WeatherWidget() {
  const { weather, location, setWeather, setLocation, isLoading, setLoading, setError } =
    useWeatherStore();
  const [advice, setAdvice] = useState<ReturnType<typeof generateWateringAdvice>>([]);

  const loadWeather = async () => {
    setLoading(true);

    try {
      // Use default location or stored location
      const lat = location?.lat || parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LAT || "43.6476");
      const lng = location?.lng || parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LNG || "1.4351");
      const city = location?.city || process.env.NEXT_PUBLIC_DEFAULT_CITY || "Toulouse";

      if (!location) {
        setLocation({ lat, lng, city });
      }

      const data = await fetchWeather(lat, lng);
      setWeather(data);
      setAdvice(generateWateringAdvice(data));
    } catch (err) {
      setError("Impossible de charger la météo");
      console.error("Weather fetch error:", err);
    }
  };

  useEffect(() => {
    if (shouldRefreshWeather(weather?.fetchedAt || null)) {
      loadWeather();
    } else if (weather) {
      setAdvice(generateWateringAdvice(weather));
    }
  }, []);

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Chargement météo...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!weather) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Météo indisponible
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={loadWeather} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { current, daily } = weather;
  const today = daily[0];
  const weatherIcon = getWeatherIcon(
    current.temperature,
    current.precipitation,
    current.humidity
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-2xl">{weatherIcon}</span>
            {location?.city || "Ma localisation"}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={loadWeather}
            className="h-8 w-8"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current conditions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-4xl font-bold text-primary">
              {current.temperature}°C
            </span>
            <div className="text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Thermometer className="h-4 w-4" />
                {today.tempMin}° / {today.tempMax}°
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Droplets className="h-4 w-4 text-blue-500" />
              {current.humidity}%
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Wind className="h-4 w-4" />
              {current.windSpeed} km/h
            </div>
          </div>
        </div>

        {/* Daily advice */}
        {advice.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Conseils du jour
            </h4>
            <div className="space-y-2">
              {advice.slice(0, 3).map((item, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-2 p-2 rounded-lg text-sm",
                    item.priority === "high"
                      ? "bg-red-50 dark:bg-red-950/30"
                      : item.priority === "medium"
                      ? "bg-yellow-50 dark:bg-yellow-950/30"
                      : "bg-green-50 dark:bg-green-950/30"
                  )}
                >
                  <span className="text-lg">{item.emoji}</span>
                  <span>{item.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7-day forecast mini */}
        <div className="pt-2 border-t">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            Prévisions
          </h4>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {daily.slice(1, 6).map((day, i) => {
              const date = new Date(day.date);
              const dayName = date.toLocaleDateString("fr-FR", {
                weekday: "short",
              });
              const icon = getWeatherIcon(
                (day.tempMax + day.tempMin) / 2,
                day.precipitationSum,
                50
              );

              return (
                <div
                  key={i}
                  className="flex flex-col items-center min-w-[60px] p-2 rounded-lg bg-muted/50"
                >
                  <span className="text-xs text-muted-foreground capitalize">
                    {dayName}
                  </span>
                  <span className="text-lg my-1">{icon}</span>
                  <div className="text-xs">
                    <span className="font-medium">{day.tempMax}°</span>
                    <span className="text-muted-foreground ml-1">
                      {day.tempMin}°
                    </span>
                  </div>
                  {day.precipitationSum > 0 && (
                    <span className="text-xs text-blue-500 flex items-center gap-0.5">
                      <Droplets className="h-3 w-3" />
                      {Math.round(day.precipitationSum)}mm
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
