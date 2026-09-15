import {
  Sun, Moon, Clock, Home, CheckSquare, BarChart3, Calculator, Timer, BookOpen,
  Minus, Square, X, ChevronLeft, ChevronRight, RotateCw, Menu, Settings, LogOut, User
} from "lucide-react";
import { useTheme } from "./tema-saglayici";
import { useState, useEffect } from "react";
import { EmojiPicker } from "./emoji-secici";
import { MotivationalQuote } from "./motivasyon-sozu";
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
  const [showTooltip, setShowTooltip] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('😊');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const savedEmoji = localStorage.getItem('userEmoji');
    if (savedEmoji) setSelectedEmoji(savedEmoji);
  }, []);

  useEffect(() => {
    const updateMoodEmoji = () => {
      const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Istanbul',
        year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(new Date());

      const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
      const completedToday = tasks.filter((t: any) => t.completedAt && t.completedAt.startsWith(today)).length;
      const questionLogs = JSON.parse(localStorage.getItem('questionLogs') || '[]');
      const questionsToday = questionLogs.filter((q: any) => q.study_date && q.study_date.startsWith(today)).length;
      const examResults = JSON.parse(localStorage.getItem('examResults') || '[]');
      const examsToday = examResults.filter((e: any) => e.exam_date && e.exam_date.startsWith(today)).length;

      const totalActivity = completedToday + questionsToday + examsToday;

      let newEmoji = '😊';
      if (totalActivity >= 15) newEmoji = '🔥';
      else if (totalActivity >= 10) newEmoji = '💪';
      else if (totalActivity >= 7) newEmoji = '⭐';
      else if (totalActivity >= 4) newEmoji = '😊';
      else if (totalActivity >= 1) newEmoji = '🙂';
      else newEmoji = '😴';

      setSelectedEmoji(newEmoji);
      localStorage.setItem('userEmoji', newEmoji);
    };

    updateMoodEmoji();
    const handleStorageChange = () => updateMoodEmoji();
    window.addEventListener('localStorageUpdate', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(updateMoodEmoji, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('localStorageUpdate', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('userEmoji', selectedEmoji);
  }, [selectedEmoji]);

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
    const onScroll = () => setScrolled(window.scrollY > 8);
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

  return (
    <header className="sticky top-0 z-50 transition-all duration-300">
      {/* Electron title bar */}
      {typeof window !== 'undefined' && window.electronAPI && !isFullscreen && (
        <div
          className="h-9 bg-background/95 border-b border-border/50 flex items-center justify-between px-2"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <div className="flex items-center space-x-0.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <button onClick={() => window.electronAPI?.goBack()} className="h-7 w-8 flex items-center justify-center hover:bg-accent transition-colors rounded-md" title="Geri">
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <button onClick={() => window.electronAPI?.reload()} className="h-7 w-8 flex items-center justify-center hover:bg-accent transition-colors rounded-md" title="Yenile">
              <RotateCw className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button onClick={() => window.electronAPI?.goForward()} className="h-7 w-8 flex items-center justify-center hover:bg-accent transition-colors rounded-md" title="İleri">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <img src="/app-icon.png" alt="QuantPraxus" className="h-5 w-5 rounded-sm" />
            <span className="text-xs font-semibold text-foreground">QuantPraxus</span>
          </div>
          <div className="flex items-center space-x-0.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <button onClick={() => window.electronAPI?.minimizeWindow()} className="h-7 w-9 flex items-center justify-center hover:bg-accent transition-colors rounded-sm" title="Küçült">
              <Minus className="h-3 w-3" />
            </button>
            <button onClick={() => window.electronAPI?.maximizeWindow()} className="h-7 w-9 flex items-center justify-center hover:bg-accent transition-colors rounded-sm" title="Ekranı Kapla">
              <Square className="h-3 w-3" />
            </button>
            <button onClick={() => window.electronAPI?.closeWindow()} className="h-7 w-9 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors rounded-sm" title="Kapat">
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Motivation strip */}
      <div className="border-b border-border/40 bg-muted/30">
        <div className="py-2 px-4">
          <div className="max-w-7xl mx-auto">
            <MotivationalQuote />
          </div>
        </div>
      </div>

      {/* Glass navbar */}
      <div className={`glass-surface border-b transition-all duration-300 ${scrolled ? 'border-border/60 shadow-sm' : 'border-border/30'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Left: Logo + desktop nav */}
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2.5 group shrink-0">
                <img src="/app-icon.png" alt="QuantPraxus" className="h-8 w-8 rounded-lg transition-transform group-hover:scale-105" />
                <span className="text-lg font-bold tracking-tight text-foreground hidden sm:block">
                  QuantPraxus
                </span>
              </Link>

              {/* Desktop nav */}
              <nav className="hidden lg:flex items-center gap-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <button
                        className={`relative px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                          isActive
                            ? 'text-primary bg-primary/8'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                        }`}
                        data-testid={item.testId}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                        {isActive && (
                          <span className="absolute -bottom-px left-3 right-3 h-0.5 bg-primary rounded-full" />
                        )}
                      </button>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right: clock (non-homepage), theme, profile */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Compact clock for non-homepage pages */}
              {!isHomepage && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/40 border border-border/40">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span className="text-sm font-semibold tabular-nums text-foreground" data-testid="text-time-header">
                    {formatDateTime().timeStr}
                  </span>
                  <span className="text-xs text-muted-foreground hidden xl:block" data-testid="text-date-header">
                    {formatDateTime().dateStr}
                  </span>
                </div>
              )}

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-lg bg-muted/50 hover:bg-muted border border-border/40 transition-all duration-200 hover:shadow-sm"
                title="Tema Değiştir"
                data-testid="button-theme-toggle"
              >
                {theme === "light" ? <Sun className="h-4 w-4 text-foreground" /> : <Moon className="h-4 w-4 text-foreground" />}
              </button>

              {/* Profile dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={() => setEmojiPickerOpen(true)}
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    className="relative w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold transition-all duration-200 hover:shadow-md hover:scale-105"
                    data-testid="button-emoji-picker"
                  >
                    <span className="text-base font-bold">B</span>
                    {selectedEmoji && (
                      <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-card rounded-full border-2 border-primary flex items-center justify-center shadow-sm">
                        <span className="text-[10px]">{selectedEmoji}</span>
                      </span>
                    )}
                    {showTooltip && (
                      <span className="absolute top-full left-1/2 mt-2 px-2 py-1 bg-card text-card-foreground text-xs rounded shadow-lg border border-border transform -translate-x-1/2 whitespace-nowrap z-50">
                        Profil
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2.5">
                    <p className="text-sm font-semibold text-foreground">QuantPraxus</p>
                    <p className="text-xs text-muted-foreground">Hoş geldin</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setEmojiPickerOpen(true)} className="cursor-pointer">
                    <User className="w-4 h-4 mr-2 text-muted-foreground" />
                    Emoji Seç
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
                    {theme === "light" ? <Moon className="w-4 h-4 mr-2 text-muted-foreground" /> : <Sun className="w-4 h-4 mr-2 text-muted-foreground" />}
                    {theme === "light" ? "Karanlık Tema" : "Aydınlık Tema"}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">
                    <Settings className="w-4 h-4 mr-2 text-muted-foreground" />
                    Ayarlar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Çıkış
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile nav trigger */}
              <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <SheetTrigger asChild>
                  <button
                    className="lg:hidden p-2.5 rounded-lg bg-muted/50 hover:bg-muted border border-border/40 transition-all duration-200"
                    data-testid="button-mobile-nav"
                  >
                    <Menu className="h-4 w-4 text-foreground" />
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
                            className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-3 ${
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
        </div>
      </div>

      <EmojiPicker
        open={emojiPickerOpen}
        onOpenChange={setEmojiPickerOpen}
        selectedEmoji={selectedEmoji}
        onEmojiSelect={setSelectedEmoji}
      />
    </header>
  );
}
