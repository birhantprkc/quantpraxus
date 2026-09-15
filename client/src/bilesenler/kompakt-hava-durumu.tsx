import { useQuery } from "@tanstack/react-query";
import { getQueryOptions } from "@/kutuphane/sorguIstemcisi";
import { Droplets, Wind, ChevronDown, Sun, Cloud, CloudRain, CloudSun, Snowflake, MapPin } from "lucide-react";
import { useState } from "react";

interface WeatherData {
  location: string;
  current: {
    temperature: number;
    description: string;
    emoji: string;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    windDescription: string;
    feelsLike: number;
    pressure: number;
    visibility: number;
    precipitation: number;
  };
  hourlyForecast: Array<{
    time: string;
    hour: number;
    temperature: number;
    emoji: string;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    precipitation: number;
  }>;
  forecast: Array<{
    date: string;
    dayName: string;
    temperature: { max: number; min: number };
    description: string;
    emoji: string;
    humidity: number;
    windSpeed: number;
  }>;
  sunData: {
    sunrise: string;
    sunset: string;
    dayLength: string;
    sunProgress: number;
  };
}

function getWeatherIcon(emoji: string) {
  if (emoji.includes('☀️') || emoji.includes('🌤️')) return Sun;
  if (emoji.includes('🌧️') || emoji.includes('⛈️')) return CloudRain;
  if (emoji.includes('❄️')) return Snowflake;
  if (emoji.includes('☁️')) return Cloud;
  return CloudSun;
}

export function CompactWeatherWidget() {
  const [expanded, setExpanded] = useState(false);

  const { data: weather, isLoading, error } = useQuery<WeatherData>({
    queryKey: ["/api/weather"],
    queryFn: async () => {
      const response = await fetch(`/api/weather`);
      if (!response.ok) throw new Error('Failed to fetch weather data');
      return response.json();
    },
    ...getQueryOptions("/api/weather"),
    refetchInterval: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/20 bg-card/40">
        <Sun className="h-5 w-5 text-muted-foreground/50" />
        <span className="text-sm text-muted-foreground">Hava durumu yükleniyor...</span>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/20 bg-card/40">
        <Cloud className="h-5 w-5 text-muted-foreground/40" />
        <span className="text-sm text-muted-foreground/60">Hava durumu şu an kullanılamıyor</span>
      </div>
    );
  }

  const WeatherIcon = getWeatherIcon(weather.current.emoji);
  const now = new Date();
  const currentHour = now.getHours();

  return (
    <div className="rounded-xl border border-border/20 bg-card/40 overflow-hidden">
      {/* Compact summary */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors duration-200"
      >
        <WeatherIcon className="h-6 w-6 text-primary/70 shrink-0" />

        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tabular-nums text-foreground leading-none">{weather.current.temperature}°</span>
          <span className="text-sm text-muted-foreground">C</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate capitalize">{weather.current.description}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            {weather.location}
          </p>
        </div>

        {/* Secondary metrics */}
        <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Droplets className="h-3.5 w-3.5" />
            <span className="tabular-nums">%{weather.current.humidity}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Wind className="h-3.5 w-3.5" />
            <span className="tabular-nums">{weather.current.windSpeed} km/h</span>
          </span>
        </div>

        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Expandable hourly forecast */}
      {expanded && (
        <div className="border-t border-border/20 px-4 py-3 animate-fade-in">
          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1">
            {weather.hourlyForecast.slice(0, 12).map((hour, index) => {
              const HourIcon = getWeatherIcon(hour.emoji);
              const isNow = hour.hour === currentHour;
              return (
                <div
                  key={index}
                  className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg shrink-0 transition-colors ${
                    isNow ? 'bg-primary/8' : 'hover:bg-muted/30'
                  }`}
                >
                  <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                    {isNow ? 'şimdi' : `${hour.hour.toString().padStart(2, '0')}:00`}
                  </span>
                  <HourIcon className="h-4 w-4 text-muted-foreground/70" />
                  <span className="text-xs font-semibold text-foreground tabular-nums">{hour.temperature}°</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
