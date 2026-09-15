import { useState, useEffect } from "react";

interface CountdownWidgetProps {
  className?: string;
}

export function CountdownWidget({ className = "" }: CountdownWidgetProps) {
  const [tytCountdown, setTytCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [aytCountdown, setAytCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const tytDate = new Date("2026-06-20T10:15:00");
    const aytDate = new Date("2026-06-21T10:15:00");

    const updateCountdown = () => {
      const now = new Date();

      const tytDiff = tytDate.getTime() - now.getTime();
      if (tytDiff > 0) {
        setTytCountdown({
          days: Math.floor(tytDiff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((tytDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((tytDiff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((tytDiff % (1000 * 60)) / 1000),
        });
      } else {
        setTytCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }

      const aytDiff = aytDate.getTime() - now.getTime();
      if (aytDiff > 0) {
        setAytCountdown({
          days: Math.floor(aytDiff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((aytDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((aytDiff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((aytDiff % (1000 * 60)) / 1000),
        });
      } else {
        setAytCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const fmt = (n: number, pad = 2) => n.toString().padStart(pad, '0');

  const Unit = ({ value, label, accent }: { value: string; label: string; accent?: boolean }) => (
    <div className="flex flex-col items-center">
      <div className={`text-3xl md:text-4xl font-bold tabular-nums tracking-tight transition-colors duration-300 ${accent ? 'text-primary' : 'text-foreground'}`}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 font-medium">{label}</div>
    </div>
  );

  return (
    <div className={`rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-6 md:p-8 ${className}`}>
      <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-4">

        {/* TYT */}
        <div className="flex-1 w-full">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 text-primary text-xs font-bold ring-1 ring-primary/20">T</span>
            <div>
              <h4 className="text-sm font-semibold text-foreground">TYT 2026</h4>
              <p className="text-[11px] text-muted-foreground">Temel Yeterlilik Testi</p>
            </div>
          </div>
          <div className="flex items-baseline gap-4 md:gap-6">
            <Unit value={fmt(tytCountdown.days, 3)} label="Gün" accent />
            <span className="text-2xl text-border font-light">:</span>
            <Unit value={fmt(tytCountdown.hours)} label="Saat" />
            <span className="text-2xl text-border font-light">:</span>
            <Unit value={fmt(tytCountdown.minutes)} label="Dakika" />
            <span className="text-2xl text-border font-light">:</span>
            <Unit value={fmt(tytCountdown.seconds)} label="Saniye" />
          </div>
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px h-20 bg-border/50" />
        <div className="block lg:hidden w-full h-px bg-border/40" />

        {/* AYT */}
        <div className="flex-1 w-full">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 text-primary text-xs font-bold ring-1 ring-primary/20">A</span>
            <div>
              <h4 className="text-sm font-semibold text-foreground">AYT 2026</h4>
              <p className="text-[11px] text-muted-foreground">Alan Yeterlilik Testi</p>
            </div>
          </div>
          <div className="flex items-baseline gap-4 md:gap-6">
            <Unit value={fmt(aytCountdown.days, 3)} label="Gün" accent />
            <span className="text-2xl text-border font-light">:</span>
            <Unit value={fmt(aytCountdown.hours)} label="Saat" />
            <span className="text-2xl text-border font-light">:</span>
            <Unit value={fmt(aytCountdown.minutes)} label="Dakika" />
            <span className="text-2xl text-border font-light">:</span>
            <Unit value={fmt(aytCountdown.seconds)} label="Saniye" />
          </div>
        </div>
      </div>
    </div>
  );
}
