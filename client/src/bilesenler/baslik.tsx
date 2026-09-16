import { Sun, Moon, Chrome as Home, SquareCheck as CheckSquare, ChartBar as BarChart3, Calculator, Timer, BookOpen } from "lucide-react";
import { useTheme } from "./tema-saglayici";
import { useState, useEffect } from "react";
import { EmojiPicker } from "./emoji-secici";
import { MotivationalQuote } from "./motivasyon-sozu";
import { Link, useLocation } from "wouter";

interface HeaderProps {
  hideClockOnHomepage?: boolean;
  onReportCounterClick?: () => void;
}

const NAV_ITEMS = [
  { href: "/", label: "Anasayfa", icon: Home, testId: "link-homepage" },
  { href: "/tasks", label: "Yapılacaklar", icon: CheckSquare, testId: "link-todos" },
  { href: "/dashboard", label: "Raporlarım", icon: BarChart3, testId: "link-dashboard" },
  { href: "/net-calculator", label: "Net Hesapla", icon: Calculator, testId: "link-net-calculator" },
  { href: "/timer", label: "Sayaç", icon: Timer, testId: "link-timer" },
  { href: "/yks-konular", label: "YKS Konular", icon: BookOpen, testId: "link-yks-konular" },
];

export function Header({ hideClockOnHomepage = false }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('😊');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  return (
    <header className="bg-card border-b border-border sticky top-0 z-40">
      {/* Motivasyon Sözü */}
      <div className="border-b border-border bg-muted/30">
        <div className="py-2 px-4 max-w-7xl mx-auto">
          <MotivationalQuote />
        </div>
      </div>

      {/* Üst bar - tema + profil */}
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 flex justify-end items-center py-2 gap-2">
          <span className="text-sm text-muted-foreground hidden sm:block">Hoşgeldiniz</span>
          <span className="font-medium text-foreground text-sm hidden sm:block">QuantPraxus</span>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-md hover:bg-secondary transition-colors"
            title="Tema Değiştir"
            aria-label="Tema değiştir"
            data-testid="button-theme-toggle"
          >
            {theme === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            onClick={() => setEmojiPickerOpen(true)}
            className="relative w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            aria-label="Emoji seç"
            data-testid="button-emoji-picker"
          >
            <span className="font-bold">B</span>
            {selectedEmoji && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-card border border-border rounded-full flex items-center justify-center text-[10px]">
                {selectedEmoji}
              </span>
            )}
          </button>

          {/* Mobil menü butonu */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md hover:bg-secondary transition-colors"
            aria-label="Menü"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>
      </div>

      {/* Desktop Navigasyon */}
      <nav className="hidden md:block">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center h-12">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <button
                    className={`flex items-center gap-2 px-4 h-12 text-sm font-medium border-b-2 transition-colors ${
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                    data-testid={item.testId}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobil Navigasyon */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-border bg-card">
          <div className="px-4 py-2 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                    data-testid={`mobile-${item.testId}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      <EmojiPicker
        open={emojiPickerOpen}
        onOpenChange={setEmojiPickerOpen}
        selectedEmoji={selectedEmoji}
        onEmojiSelect={setSelectedEmoji}
      />
    </header>
  );
}
