import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export function MidnightCountdown() {
  const [timeUntilSundayArchive, setTimeUntilSundayArchive] = useState("");

  useEffect(() => {
    const calculateTimeUntilSundayArchive = () => {
      const now = new Date();
      const turkeyTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
      const nextSunday = new Date(turkeyTime);
      const currentDay = nextSunday.getDay();

      let daysUntilSunday: number;
      if (currentDay === 0) {
        const targetTime = new Date(turkeyTime);
        targetTime.setHours(23, 59, 0, 0);
        daysUntilSunday = turkeyTime < targetTime ? 0 : 7;
      } else {
        daysUntilSunday = 7 - currentDay;
      }

      nextSunday.setDate(nextSunday.getDate() + daysUntilSunday);
      nextSunday.setHours(23, 59, 0, 0);

      const diff = nextSunday.getTime() - turkeyTime.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return `${days}g ${hours.toString().padStart(2, '0')}s:${minutes.toString().padStart(2, '0')}d:${seconds.toString().padStart(2, '0')}s`;
    };

    const updateTimer = () => setTimeUntilSundayArchive(calculateTimeUntilSundayArchive());
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted/50 border border-border rounded-md text-xs">
      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
      <div className="flex flex-col">
        <span className="text-muted-foreground">Pazar arşivleme</span>
        <span className="font-mono font-semibold tabular-nums text-foreground">{timeUntilSundayArchive}</span>
      </div>
    </div>
  );
}
