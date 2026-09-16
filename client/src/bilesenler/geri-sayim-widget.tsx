import { useState, useEffect } from "react";

export function CountdownWidget({ className = "" }: { className?: string }) {
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

  const formatTime = (t: { days: number; hours: number; minutes: number; seconds: number }) => ({
    days: t.days.toString().padStart(3, '0'),
    hours: t.hours.toString().padStart(2, '0'),
    minutes: t.minutes.toString().padStart(2, '0'),
    seconds: t.seconds.toString().padStart(2, '0'),
  });

  const tyt = formatTime(tytCountdown);
  const ayt = formatTime(aytCountdown);

  return (
    <div className={`bg-card border border-border rounded-lg p-6 ${className}`}>
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-foreground">YKS 2026 Geri Sayım</h3>
        <p className="text-xs text-muted-foreground mt-1">Hedefe kalan süre</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12">
        {/* TYT */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-primary rounded-md mb-2">
            <span className="text-lg font-bold text-primary-foreground">T</span>
          </div>
          <h4 className="text-sm font-semibold text-foreground mb-3">TYT 2026</h4>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Gün', value: tyt.days },
              { label: 'Saat', value: tyt.hours },
              { label: 'Dk', value: tyt.minutes },
              { label: 'Sn', value: tyt.seconds },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="bg-muted border border-border rounded-md px-1.5 py-2 min-w-[48px]">
                  <span className="text-base font-bold font-mono tabular-nums text-foreground">{value}</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* AYT */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-emerald-600 rounded-md mb-2">
            <span className="text-lg font-bold text-white">A</span>
          </div>
          <h4 className="text-sm font-semibold text-foreground mb-3">AYT 2026</h4>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Gün', value: ayt.days },
              { label: 'Saat', value: ayt.hours },
              { label: 'Dk', value: ayt.minutes },
              { label: 'Sn', value: ayt.seconds },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="bg-muted border border-border rounded-md px-1.5 py-2 min-w-[48px]">
                  <span className="text-base font-bold font-mono tabular-nums text-foreground">{value}</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
