import { useState, useEffect } from "react";

interface CountdownWidgetProps {
  className?: string;
}

export function CountdownWidget({ className = "" }: CountdownWidgetProps) {
  const [tytCountdown, setTytCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [aytCountdown, setAytCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const tytDate = new Date("2027-06-19T10:15:00+03:00");
    const aytDate = new Date("2027-06-20T10:15:00+03:00");

    const updateCountdown = () => {
      const now = new Date();

      const calc = (target: Date) => {
        const diff = target.getTime() - now.getTime();
        if (diff > 0) {
          return {
            days: Math.floor(diff / 86400000),
            hours: Math.floor((diff % 86400000) / 3600000),
            minutes: Math.floor((diff % 3600000) / 60000),
            seconds: Math.floor((diff % 60000) / 1000),
          };
        }
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      };

      setTytCountdown(calc(tytDate));
      setAytCountdown(calc(aytDate));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const fmt = (n: number, pad = 2) => n.toString().padStart(pad, '0');

  return (
    <div className={className}>
      {/* Section header */}
      <div className="flex items-baseline gap-3 mb-5">
        <h3 className="text-lg font-bold tracking-tight text-foreground">YKS 2027</h3>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sınava Kalan Zaman</span>
      </div>

      {/* Two-column premium information panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 border-t border-b border-border/40">
        {/* TYT */}
        <CountdownColumn
          label="TYT"
          fullName="Temel Yeterlilik Testi"
          examDate="19 Haziran 2027"
          days={tytCountdown.days}
          hours={tytCountdown.hours}
          minutes={tytCountdown.minutes}
          seconds={tytCountdown.seconds}
          fmt={fmt}
          borderClass="sm:border-r border-border/40"
        />

        {/* AYT */}
        <CountdownColumn
          label="AYT"
          fullName="Alan Yeterlilik Testi"
          examDate="20 Haziran 2027"
          days={aytCountdown.days}
          hours={aytCountdown.hours}
          minutes={aytCountdown.minutes}
          seconds={aytCountdown.seconds}
          fmt={fmt}
          borderClass="border-t sm:border-t-0 border-border/40"
        />
      </div>
    </div>
  );
}

interface CountdownColumnProps {
  label: string;
  fullName: string;
  examDate: string;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  fmt: (n: number, pad?: number) => string;
  borderClass: string;
}

function CountdownColumn({ label, fullName, examDate, days, hours, minutes, seconds, fmt, borderClass }: CountdownColumnProps) {
  return (
    <div className={`px-5 py-6 sm:px-8 sm:py-7 ${borderClass}`}>
      {/* Label + date */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-sm font-bold tracking-tight text-foreground">{label}</span>
        <span className="text-[11px] font-medium text-muted-foreground tabular-nums">{examDate}</span>
      </div>

      {/* Big day number */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-5xl sm:text-[3.5rem] font-bold tabular-nums tracking-tighter text-foreground leading-none">
          {fmt(days, 3)}
        </span>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">gün</span>
      </div>

      {/* Secondary time */}
      <div className="flex items-center gap-2.5 text-sm tabular-nums text-muted-foreground mb-4">
        <span className="font-semibold text-foreground-secondary">{fmt(hours)}<span className="text-muted-foreground/50 ml-0.5 text-[11px]">sa</span></span>
        <span className="text-border/60">·</span>
        <span className="font-semibold text-foreground-secondary">{fmt(minutes)}<span className="text-muted-foreground/50 ml-0.5 text-[11px]">dk</span></span>
        <span className="text-border/60">·</span>
        <span className="font-medium text-muted-foreground/70">{fmt(seconds)}<span className="text-muted-foreground/40 ml-0.5 text-[11px]">sn</span></span>
      </div>

      {/* Subtle progress line — minute-based */}
      <div className="h-px bg-border/20 relative overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-primary/30 transition-all duration-1000 ease-linear"
          style={{ width: `${(seconds / 60) * 100}%` }}
        />
      </div>

      <p className="text-[11px] text-muted-foreground/60 mt-3 truncate">{fullName}</p>
    </div>
  );
}
