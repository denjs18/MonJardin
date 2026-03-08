import { WeatherData, CurrentWeather, DailyWeather, DailyAdvice } from "./types";

const OPEN_METEO_BASE_URL = "https://api.open-meteo.com/v1/forecast";

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    precipitation: number;
    wind_speed_10m: number;
    relative_humidity_2m: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    et0_fao_evapotranspiration: number[];
  };
}

export async function fetchWeather(
  lat: number,
  lng: number
): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    current:
      "temperature_2m,precipitation,wind_speed_10m,relative_humidity_2m",
    daily:
      "precipitation_sum,temperature_2m_max,temperature_2m_min,et0_fao_evapotranspiration",
    timezone: "Europe/Paris",
    forecast_days: "7",
  });

  const response = await fetch(`${OPEN_METEO_BASE_URL}?${params}`);

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }

  const data: OpenMeteoResponse = await response.json();

  const current: CurrentWeather = {
    temperature: Math.round(data.current.temperature_2m),
    precipitation: data.current.precipitation,
    windSpeed: Math.round(data.current.wind_speed_10m),
    humidity: data.current.relative_humidity_2m,
  };

  const daily: DailyWeather[] = data.daily.time.map((date, i) => ({
    date,
    tempMax: Math.round(data.daily.temperature_2m_max[i]),
    tempMin: Math.round(data.daily.temperature_2m_min[i]),
    precipitationSum: data.daily.precipitation_sum[i],
    et0: data.daily.et0_fao_evapotranspiration[i],
  }));

  return {
    current,
    daily,
    fetchedAt: new Date(),
  };
}

export function generateWateringAdvice(weather: WeatherData): DailyAdvice[] {
  const advice: DailyAdvice[] = [];
  const { current, daily } = weather;
  const today = daily[0];
  const tomorrow = daily[1];

  // Check evapotranspiration and precipitation
  if (today.et0 > 3 && today.precipitationSum < 2) {
    advice.push({
      type: "watering",
      emoji: "💧",
      message: "Arrosage urgent recommandé - évaporation élevée et peu de pluie",
      priority: "high",
    });
  }

  // Check if rain is expected
  if (tomorrow && tomorrow.precipitationSum > 5) {
    advice.push({
      type: "watering",
      emoji: "☔",
      message: `Pas besoin d'arroser - ${Math.round(tomorrow.precipitationSum)}mm de pluie prévus demain`,
      priority: "medium",
    });
  }

  // Morning watering advice for hot days
  if (today.tempMax > 28) {
    advice.push({
      type: "watering",
      emoji: "🌅",
      message: "Arrosez tôt le matin avant les fortes chaleurs",
      priority: "high",
    });
  }

  // Low humidity advice
  if (current.humidity < 30) {
    advice.push({
      type: "watering",
      emoji: "💧",
      message: "Humidité très basse - pensez à arroser vos plantes sensibles",
      priority: "medium",
    });
  }

  // Good conditions for weeding
  if (current.temperature > 20 && current.precipitation === 0 && current.humidity > 40) {
    advice.push({
      type: "weeding",
      emoji: "🌿",
      message: "Bon moment pour désherber - sol sec et temps clément",
      priority: "low",
    });
  }

  // Frost warning
  if (today.tempMin < 5) {
    advice.push({
      type: "protection",
      emoji: "🥶",
      message: `Attention au gel - minimum de ${today.tempMin}°C prévu cette nuit`,
      priority: "high",
    });
  }

  // Wind warning
  if (current.windSpeed > 40) {
    advice.push({
      type: "protection",
      emoji: "💨",
      message: "Vents forts - protégez les plantes fragiles et les tuteurs",
      priority: "high",
    });
  }

  // Perfect planting conditions
  const isPerfectForPlanting =
    current.temperature >= 15 &&
    current.temperature <= 25 &&
    current.humidity >= 50 &&
    current.humidity <= 80 &&
    current.precipitation === 0 &&
    tomorrow.precipitationSum > 0;

  if (isPerfectForPlanting) {
    advice.push({
      type: "planting",
      emoji: "🌱",
      message: "Conditions idéales pour planter - pluie prévue demain",
      priority: "medium",
    });
  }

  // If no specific advice, give a general one
  if (advice.length === 0) {
    advice.push({
      type: "general",
      emoji: "🌻",
      message: "Bonne journée pour jardiner !",
      priority: "low",
    });
  }

  return advice.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

export function getWeatherIcon(
  temp: number,
  precipitation: number,
  humidity: number
): string {
  if (precipitation > 5) return "🌧️";
  if (precipitation > 0) return "🌦️";
  if (humidity > 80) return "☁️";
  if (temp > 30) return "🔥";
  if (temp > 25) return "☀️";
  if (temp > 15) return "🌤️";
  if (temp > 5) return "⛅";
  return "❄️";
}

export function formatTemperature(temp: number): string {
  return `${temp}°C`;
}

export function shouldRefreshWeather(lastFetchedAt: Date | null): boolean {
  if (!lastFetchedAt) return true;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  return new Date(lastFetchedAt) < oneHourAgo;
}
