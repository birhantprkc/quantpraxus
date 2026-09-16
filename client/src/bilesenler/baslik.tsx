import {
  Sun, Moon, Clock, Home, BarChart3, Calculator, Timer, BookOpen,
  Minus, Square, X, ChevronLeft, ChevronRight, RotateCw, Menu, Settings, LogOut, ChevronDown, Target, User
} from "lucide-react";
import { useTheme } from "./tema-saglayici";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/bilesenler/arayuz/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/bilesenler/arayuz/sheet";

interface HeaderProps {
  hideClockOnHomepage?: boolean;
  onReportCounterClick?: () => void;
}

const NAV_ITEMS = [
  { href: "/", label: "Anasayfa", icon: Home, testId: "link-homepage" },
  { href: "/net-calculator", label: "Net Hesapla", icon: Calculator, testId: "link-net-calculator" },
  { href: "/timer", label: "Sayaç", icon: Timer, testId: "link-timer" },
  { href: "/yks-konular", label: "YKS Konuları", icon: BookOpen, testId: "link-yks-konular" },
  { href: "/dashboard", label: "Analiz", icon: BarChart3, testId: "link-dashboard" },
];

export function Header({ hideClockOnHomepage = false, onReportCounterClick }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.onFullscreenChange((fullscreen: boolean) => setIsFullscreen(fullscreen));
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        if (typeof window !== 'undefined' && window.electronAPI) {
          window.electronAPI.toggleFullscreen();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 12);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const formatDateTime = () => {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Europe/Istanbul', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    };
    const timeOptions: Intl.DateTimeFormatOptions = {
      timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    };
    return {
      dateStr: currentTime.toLocaleDateString('tr-TR', options),
      timeStr: currentTime.toLocaleTimeString('tr-TR', timeOptions),
    };
  };

  const isHomepage = location === '/';

  const getYksTarget = (): string => {
    const alan = localStorage.getItem('yksAlan');
    const year = localStorage.getItem('yksYear') || '2027';
    const alanMap: Record<string, string> = {
      'sayisal': 'Sayısal',
      'esit-agirlik': 'Eşit Ağırlık',
      'sozel': 'Sözel',
      'dil': 'Dil',
    };
    const alanText = alan ? (alanMap[alan] || alan) : 'Sayısal';
    return `${year} · ${alanText}`;
  };

  return (
    <header className="sticky top-0 z-50">
      {/* Electron title bar */}
      {typeof window !== 'undefined' && window.electronAPI && !isFullscreen && (
        <div
          className="h-8 bg-background/95 border-b border-border/50 flex items-center justify-between px-2"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <div className="flex items-center space-x-0.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <button onClick={() => window.electronAPI?.goBack()} className="h-6 w-7 flex items-center justify-center hover:bg-accent transition-colors rounded-md" title="Geri">
              <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button onClick={() => window.electronAPI?.reload()} className="h-6 w-7 flex items-center justify-center hover:bg-accent transition-colors rounded-md" title="Yenile">
              <RotateCw className="h-3 w-3 text-muted-foreground" />
            </button>
            <button onClick={() => window.electronAPI?.goForward()} className="h-6 w-7 flex items-center justify-center hover:bg-accent transition-colors rounded-md" title="İleri">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <img src="/app-icon.png" alt="QuantPraxus" className="h-4 w-4 rounded-sm" />
            <span className="text-[11px] font-semibold text-foreground">QuantPraxus</span>
          </div>
          <div className="flex items-center space-x-0.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
            <button onClick={() => window.electronAPI?.minimizeWindow()} className="h-6 w-8 flex items-center justify-center hover:bg-accent transition-colors rounded-sm" title="Küçült">
              <Minus className="h-2.5 w-2.5" />
            </button>
            <button onClick={() => window.electronAPI?.maximizeWindow()} className="h-6 w-8 flex items-center justify-center hover:bg-accent transition-colors rounded-sm" title="Ekranı Kapla">
              <Square className="h-2.5 w-2.5" />
            </button>
            <button onClick={() => window.electronAPI?.closeWindow()} className="h-6 w-8 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors rounded-sm" title="Kapat">
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating glass navbar — two scroll states */}
      <div className={`px-4 sm:px-6 transition-all duration-300 ease-out ${scrolled ? 'pt-2.5' : 'pt-5'}`}>
        <nav
          className={`max-w-6xl mx-auto border transition-all duration-300 ease-out ${
            scrolled
              ? 'glass-surface-scrolled rounded-[16px] border-border/30 shadow-lg py-1.5'
              : 'glass-surface rounded-[18px] border-border/20 shadow-md py-2.5'
          }`}
        >
          <div className="flex items-center justify-between px-4 sm:px-5">

            {/* Left: Logo + desktop nav */}
            <div className="flex items-center gap-5">
              <Link href="/" className="flex items-center gap-2.5 group shrink-0">
                <img src="/app-icon.png" alt="QuantPraxus" className="h-7 w-7 rounded-lg transition-transform duration-200 group-hover:scale-105" />
                <span className="text-[15px] font-bold tracking-tight text-foreground hidden sm:block">
                  QuantPraxus
                </span>
              </Link>

              {/* Desktop nav */}
              <nav className={`hidden lg:flex items-center transition-all duration-300 ${scrolled ? 'gap-0' : 'gap-0.5'}`}>
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <button
                        className={`relative px-3 py-1.5 rounded-md text-[13px] font-medium transition-all duration-200 flex items-center gap-1.5 ${
                          isActive
                            ? 'text-primary'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        data-testid={item.testId}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{item.label}</span>
                        {isActive && (
                          <span className="absolute -bottom-px left-2 right-2 h-[2px] bg-primary rounded-full" />
                        )}
                      </button>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right: clock (non-homepage), theme, profile */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Compact clock for non-homepage pages */}
              {!isHomepage && (
                <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-muted/30 border border-border/30">
                  <Clock className="w-3 h-3 text-primary/70" />
                  <span className="text-xs font-semibold tabular-nums text-foreground" data-testid="text-time-header">
                    {formatDateTime().timeStr}
                  </span>
                  <span className="text-[11px] text-muted-foreground hidden xl:block" data-testid="text-date-header">
                    {formatDateTime().dateStr}
                  </span>
                </div>
              )}

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
                title="Tema Değiştir"
                data-testid="button-theme-toggle"
              >
                {theme === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              {/* Profile control — avatar + name + chevron */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-full border border-border/20 hover:border-border/40 hover:bg-muted/30 transition-all duration-200"
                    data-testid="button-emoji-picker"
                  >
                    <span className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[11px] font-bold shrink-0">
                      B
                    </span>
                    <span className="text-xs font-semibold text-foreground hidden sm:block">Aday</span>
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1.5">
                  {/* Profile header */}
                  <div className="px-3 py-2.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0">
                      B
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">QuantPraxus</p>
                      <p className="text-[11px] text-muted-foreground truncate">YKS Adayı · {getYksTarget()}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer rounded-md px-3 py-1.5 text-sm">
                    <User className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                    Profil
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer rounded-md px-3 py-1.5 text-sm">
                    <Target className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                    Hedefler
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer rounded-md px-3 py-1.5 text-sm">
                    {theme === "light" ? <Moon className="w-3.5 h-3.5 mr-2 text-muted-foreground" /> : <Sun className="w-3.5 h-3.5 mr-2 text-muted-foreground" />}
                    {theme === "light" ? "Karanlık Tema" : "Aydınlık Tema"}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer rounded-md px-3 py-1.5 text-sm">
                    <Settings className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                    Ayarlar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-destructive rounded-md px-3 py-1.5 text-sm">
                    <LogOut className="w-3.5 h-3.5 mr-2" />
                    Çıkış
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile nav trigger */}
              <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <SheetTrigger asChild>
                  <button
                    className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
                    data-testid="button-mobile-nav"
                  >
                    <Menu className="h-4 w-4" />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72">
                  <SheetHeader>
                    <SheetTitle className="text-left">Navigasyon</SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-1 mt-4">
                    {NAV_ITEMS.map((item) => {
                      const Icon = item.icon;
                      const isActive = location === item.href;
                      return (
                        <Link key={item.href} href={item.href}>
                          <button
                            onClick={() => setMobileNavOpen(false)}
                            className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-3 ${
                              isActive
                                ? 'text-primary bg-primary/8'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                            }`}
                            data-testid={`mobile-${item.testId}`}
                          >
                            <Icon className="w-4 h-4" />
                            {item.label}
                          </button>
                        </Link>
                      );
                    })}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
