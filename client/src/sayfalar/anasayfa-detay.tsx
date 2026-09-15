import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Header } from "@/bilesenler/baslik";
import { CompactWeatherWidget } from "@/bilesenler/kompakt-hava-durumu";
import { CountdownWidget } from "@/bilesenler/geri-sayim-widget";
import { TodaysTasksWidget } from "@/bilesenler/gunun-gorevleri-widget";
import { Calendar, ChevronLeft, ChevronRight, Mail, Lock, Unlock, Target } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Task, QuestionLog, ExamResult } from "@shared/sema";
import { Button } from "@/bilesenler/arayuz/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/bilesenler/arayuz/dialog";
import { Input } from "@/bilesenler/arayuz/input";
import { Label } from "@/bilesenler/arayuz/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/kutuphane/sorguIstemcisi";
import {
  ActivityList, PerformanceBar, StatGrid, StudyHoursRow, useExpandState,
  type DayActivities, type ActivityFilter,
} from "@/bilesenler/aktivite-listesi";

const dateToTurkeyString = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(d);
};

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("revealed");
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    el.querySelectorAll(".reveal").forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, []);
  return ref;
}

export default function Homepage() {
  const { toast } = useToast();
  const sectionRef = useReveal();

  const getTodayDateString = () => {
    const now = new Date();
    const t = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
    return `${t.getFullYear()}-${(t.getMonth() + 1).toString().padStart(2, "0")}-${t.getDate().toString().padStart(2, "0")}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [isReportButtonUnlocked, setIsReportButtonUnlocked] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const { expandedTasks, toggleTask, expandedQuestionLogs, toggleQuestionLog, expandedExams, toggleExam } = useExpandState();

  const { data: calendarData } = useQuery<{ date: string; dayNumber: number; daysRemaining: number; tasks: Task[]; tasksCount: number }>({
    queryKey: ["/api/calendar", selectedDate],
    queryFn: async () => {
      if (!selectedDate) return null;
      const r = await fetch(`/api/calendar/${selectedDate}`);
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
    enabled: !!selectedDate,
  });
  const { data: tasks = [] } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });
  const { data: questionLogs = [] } = useQuery<QuestionLog[]>({ queryKey: ["/api/question-logs"] });
  const { data: examResults = [] } = useQuery<ExamResult[]>({ queryKey: ["/api/exam-results"] });
  const { data: studyHours = [] } = useQuery<any[]>({ queryKey: ["/api/study-hours"] });
  const { data: archivedTasks = [] } = useQuery<Task[]>({ queryKey: ["/api/tasks/archived"] });
  const { data: archivedQuestionLogs = [] } = useQuery<QuestionLog[]>({ queryKey: ["/api/question-logs/archived"] });
  const { data: archivedExamResults = [] } = useQuery<ExamResult[]>({ queryKey: ["/api/exam-results/archived"] });
  const { data: archivedStudyHours = [] } = useQuery<any[]>({ queryKey: ["/api/study-hours/archived"] });

  const allTasks = useMemo(() => [...tasks, ...archivedTasks], [tasks, archivedTasks]);
  const allQuestionLogs = useMemo(() => [...questionLogs, ...archivedQuestionLogs], [questionLogs, archivedQuestionLogs]);
  const allExamResults = useMemo(() => [...examResults, ...archivedExamResults], [examResults, archivedExamResults]);
  const allStudyHours = useMemo(() => [...studyHours, ...archivedStudyHours], [studyHours, archivedStudyHours]);

  // Report mutation
  const sendReportMutation = useMutation({
    mutationFn: (params?: { isAutomatic?: boolean }) => {
      const completedGeneral = JSON.parse(localStorage.getItem("completedGeneralExamErrors") || "[]");
      const completedBranch = JSON.parse(localStorage.getItem("completedBranchExamErrors") || "[]");
      const completedQuestion = JSON.parse(localStorage.getItem("completedQuestionErrors") || "[]");
      const completedFromMissing = JSON.parse(localStorage.getItem("completedTopicsFromMissing") || "[]");
      const completedTopicsCount = completedGeneral.length + completedBranch.length + completedQuestion.length + completedFromMissing.length;
      const completedTopicsHistory = [
        ...completedGeneral.map((i: any) => ({ ...i, source: "general" })),
        ...completedBranch.map((i: any) => ({ ...i, source: "branch" })),
        ...completedQuestion.map((i: any) => ({ ...i, source: "question" })),
        ...completedFromMissing.map((i: any) => ({ ...i, source: "missing" })),
      ].sort((a: any, b: any) => new Date(b.completedAt || b.date).getTime() - new Date(a.completedAt || a.date).getTime()).slice(0, 15);

      const dayQuestionLogs = allQuestionLogs.filter((l) => l.study_date === selectedDate);
      const dayExamResults = allExamResults.filter((e) => e.exam_date === selectedDate);
      const qTotalQ = dayQuestionLogs.reduce((s, l) => s + (parseInt(l.correct_count) || 0) + (parseInt(l.wrong_count) || 0), 0);
      const qTotalC = dayQuestionLogs.reduce((s, l) => s + (parseInt(l.correct_count) || 0), 0);
      const qTotalW = dayQuestionLogs.reduce((s, l) => s + (parseInt(l.wrong_count) || 0), 0);
      const qTotalE = dayQuestionLogs.reduce((s, l) => s + (parseInt(l.blank_count) || 0), 0);
      let eC = 0, eW = 0, eE = 0;
      dayExamResults.forEach((exam) => {
        if (!exam.subjects_data) return;
        try {
          const sd = JSON.parse(exam.subjects_data);
          Object.values(sd).forEach((s: any) => { eC += parseInt(s.correct) || 0; eW += parseInt(s.wrong) || 0; eE += parseInt(s.blank) || 0; });
        } catch {}
      });
      return apiRequest("POST", "/api/reports/send", {
        isManualRequest: !params?.isAutomatic,
        dayTotalQuestions: qTotalQ + eC + eW, dayTotalCorrect: qTotalC + eC,
        dayTotalWrong: qTotalW + eW, dayTotalEmpty: qTotalE + eE,
        completedTopicsCount, completedQuestionsCount: 0,
        completedTopicsHistory, completedQuestionsHistory: [],
      });
    },
    onSuccess: (_, v) => {
      if (v?.isAutomatic) {
        const t = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
        localStorage.setItem("lastAutoReportDate", t.toISOString().split("T")[0]);
        toast({ title: "Haftalık Rapor Gönderildi", description: "Pazar 23:59 — rapor e-postanıza gönderildi.", duration: 3000 });
      } else {
        toast({ title: "Rapor Gönderildi", description: "Aylık ilerleme raporunuz e-posta adresinize gönderildi.", duration: 1500 });
      }
      setIsReportButtonUnlocked(false);
      setShowReportModal(false);
    },
    onError: (_, v) => {
      toast({
        title: v?.isAutomatic ? "Otomatik Rapor Hatası" : "Hata",
        description: "Rapor gönderilemedi. E-posta ayarlarını kontrol edin.",
        variant: "destructive",
        duration: v?.isAutomatic ? 3000 : 1500,
      });
    },
  });

  useEffect(() => {
    const check = () => {
      const t = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
      if (t.getDay() === 0 && t.getHours() === 23 && t.getMinutes() === 59) {
        const last = localStorage.getItem("lastAutoReportDate");
        const today = t.toISOString().split("T")[0];
        if (last !== today) sendReportMutation.mutate({ isAutomatic: true });
      }
    };
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [sendReportMutation]);

  // Calendar state
  const getTurkeyDateObj = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
  const currentDate = getTurkeyDateObj();
  const [displayYear, setDisplayYear] = useState(currentDate.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(currentDate.getMonth());

  useEffect(() => {
    const update = () => {
      const t = getTurkeyDateObj();
      setDisplayYear(t.getFullYear());
      setDisplayMonth(t.getMonth());
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, []);

  const calendarDays = useMemo(() => {
    const first = new Date(displayYear, displayMonth, 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(displayYear, displayMonth, 1 - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [displayYear, displayMonth]);

  const today = currentDate.getDate();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const navigateMonth = useCallback((dir: "prev" | "next") => {
    if (dir === "prev") {
      setDisplayMonth((p) => (p === 0 ? 11 : p - 1));
      setDisplayYear((p) => (displayMonth === 0 ? p - 1 : p));
    } else {
      setDisplayMonth((p) => (p === 11 ? 0 : p + 1));
      setDisplayYear((p) => (displayMonth === 11 ? p + 1 : p));
    }
  }, [displayMonth]);

  const hasActivities = useCallback((date: Date) => {
    const ds = dateToTurkeyString(date);
    return (
      allTasks.some((t) => t.completedAt && dateToTurkeyString(t.completedAt) === ds) ||
      allTasks.some((t) => t.dueDate && dateToTurkeyString(t.dueDate) === ds) ||
      allTasks.some((t) => t.archived && t.archivedAt && dateToTurkeyString(t.archivedAt) === ds) ||
      allQuestionLogs.some((l) => l.study_date === ds) ||
      allExamResults.some((e) => e.exam_date === ds) ||
      allStudyHours.some((s) => s.study_date === ds)
    );
  }, [allTasks, allQuestionLogs, allExamResults, allStudyHours]);

  const getActivitiesForDate = useCallback((date: Date): DayActivities => {
    const ds = dateToTurkeyString(date);
    const completedTasks = allTasks.filter((t) => t.completedAt && !t.archived && dateToTurkeyString(t.completedAt) === ds);
    const scheduledTasks = allTasks.filter((t) => t.dueDate && !t.completedAt && !t.archived && dateToTurkeyString(t.dueDate) === ds);
    const archivedTasksOnDay = allTasks.filter((t) => t.archived && t.archivedAt && dateToTurkeyString(t.archivedAt) === ds);
    const dayQuestionLogs = allQuestionLogs.filter((l) => l.study_date === ds);
    const dayExamResults = allExamResults.filter((e) => e.exam_date === ds);
    const dayStudyHours = allStudyHours.filter((s) => s.study_date === ds);

    const qLogTotal = dayQuestionLogs.reduce((s, l) => s + (parseInt(l.correct_count) || 0) + (parseInt(l.wrong_count) || 0), 0);
    const eTotal = dayExamResults.reduce((s, e) => {
      if (!e.subjects_data) return s;
      try {
        const sd = JSON.parse(e.subjects_data);
        return s + Object.values(sd).reduce((ss: number, d: any) => ss + (parseInt(d.correct) || 0) + (parseInt(d.wrong) || 0), 0);
      } catch { return s; }
    }, 0);

    return {
      tasks: completedTasks, scheduledTasks, archivedTasks: archivedTasksOnDay,
      questionLogs: dayQuestionLogs, examResults: dayExamResults, studyHours: dayStudyHours,
      total: completedTasks.length + scheduledTasks.length + archivedTasksOnDay.length + qLogTotal + eTotal + dayExamResults.length,
      performanceTotal: completedTasks.length + qLogTotal + eTotal + dayExamResults.length,
    };
  }, [allTasks, allQuestionLogs, allExamResults, allStudyHours]);

  const handleDateClick = (date: Date) => {
    const ds = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
    setSelectedDate(ds);
  };

  // Sunday countdown
  useEffect(() => {
    const update = () => {
      const t = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
      const next = new Date(t);
      const cd = t.getDay();
      let days = cd === 0 ? (t.getHours() < 23 ? 0 : 7) : 7 - cd;
      next.setDate(next.getDate() + days);
      next.setHours(23, 59, 59, 999);
      const diff = next.getTime() - t.getTime();
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const el = document.getElementById("month-countdown");
      if (el) el.textContent = `${d}g ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  // Hero greeting
  const greeting = useMemo(() => {
    const h = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })).getHours();
    if (h < 6) return "İyi geceler";
    if (h < 12) return "Günaydın";
    if (h < 18) return "İyi günler";
    return "İyi akşamlar";
  }, []);

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul", weekday: "long", day: "numeric", month: "long", year: "numeric",
    }).format(new Date());
  }, []);

  const selectedActivities = useMemo(() => getActivitiesForDate(new Date(selectedDate + "T12:00:00")), [selectedDate, getActivitiesForDate]);
  const todayDateStr = getTodayDateString();
  const isToday = selectedDate === todayDateStr;
  const isFuture = selectedDate > todayDateStr;

  return (
    <div className="min-h-screen bg-background ambient-bg transition-colors duration-300">
      <Header hideClockOnHomepage />

      {/* Hero + Countdown — editorial composition */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-6">
        <div className="flex flex-col gap-6 animate-fade-in-up">
          {/* Greeting + contextual status */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                {formattedDate}
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-foreground leading-[1.1]">
                {greeting}.
              </h1>
              <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                QuantPraxus'a hoş geldin. Bugünkü hedeflerine odaklan, ilerlemeni takip et.
              </p>
            </div>

            {/* YKS status chip — contextual detail */}
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-border/20 bg-card/30 shrink-0">
              <Target className="h-4 w-4 text-primary/70" />
              <div className="flex flex-col">
                <span className="text-[11px] text-muted-foreground font-medium">YKS Hedefi</span>
                <span className="text-sm font-semibold text-foreground">2027 · Sayısal</span>
              </div>
            </div>
          </div>

          {/* Countdown — editorial information panel */}
          <CountdownWidget />
        </div>
      </section>

      <main ref={sectionRef} className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 space-y-6">

        {/* Calendar + Today's tasks — unified dashboard section */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 reveal">
          {/* Calendar */}
          <div className="lg:col-span-3 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary/70" />
                <h3 className="text-sm font-semibold text-foreground">Takvim</h3>
              </div>
              <div className="flex items-center gap-3">
                {/* Report button */}
                <div className="relative">
                  <button
                    onClick={() => {
                      if (!isReportButtonUnlocked) {
                        setIsReportButtonUnlocked(true);
                        toast({ title: "Kilit açıldı", description: "Rapor göndermek için butona tıklayın.", duration: 1500 });
                      } else {
                        setIsReportButtonUnlocked(false);
                        toast({ title: "Kilit kapatıldı", description: "Rapor gönderme kilitlendi.", duration: 1500 });
                      }
                    }}
                    className={`absolute -top-1 -right-1 z-10 p-0.5 rounded-full transition-all ${isReportButtonUnlocked ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"} cursor-pointer shadow-sm`}
                    title={isReportButtonUnlocked ? "Kilidi Kapat" : "Kilidi Aç"}
                  >
                    {isReportButtonUnlocked ? <Unlock className="h-2.5 w-2.5 text-white" /> : <Lock className="h-2.5 w-2.5 text-white" />}
                  </button>
                  <button
                    onClick={() => isReportButtonUnlocked && setShowReportModal(true)}
                    disabled={!isReportButtonUnlocked}
                    className={`px-2.5 py-1 rounded-md border text-[11px] font-medium transition-all min-w-[140px] ${
                      isReportButtonUnlocked
                        ? "border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 cursor-pointer"
                        : "border-border/20 bg-muted/15 text-muted-foreground/50 cursor-not-allowed"
                    }`}
                  >
                    <div className="font-semibold">Rapor Gönder</div>
                    <div className="font-mono tabular-nums text-[9px] mt-0.5 text-muted-foreground" id="month-countdown">Loading...</div>
                  </button>
                </div>

                <div className="flex items-center gap-0.5">
                  <button onClick={() => navigateMonth("prev")} className="p-1 rounded-md hover:bg-muted/50 transition-colors">
                    <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <span className="text-xs font-medium text-foreground px-1.5 py-0.5 min-w-[95px] text-center">
                    {new Date(displayYear, displayMonth).toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}
                  </span>
                  <button onClick={() => navigateMonth("next")} className="p-1 rounded-md hover:bg-muted/50 transition-colors">
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar grid — compact */}
            <div className="space-y-1.5">
              <div className="grid grid-cols-7 gap-0.5 mb-0.5">
                {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((d) => (
                  <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {calendarDays.map((date, i) => {
                  const isCur = date.getMonth() === displayMonth;
                  const isTd = date.getDate() === today && isCur && displayYear === currentYear && displayMonth === currentMonth;
                  const ds = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
                  const isSel = selectedDate === ds;
                  const hasAct = hasActivities(date);
                  return (
                    <button
                      key={i}
                      onClick={() => handleDateClick(date)}
                      className={`relative flex flex-col items-center justify-center text-[13px] font-medium rounded-md transition-all duration-150 h-9 ${
                        isTd
                          ? "bg-primary text-primary-foreground"
                          : isSel
                          ? "bg-primary/10 text-primary ring-1 ring-primary/15"
                          : isCur
                          ? "text-foreground hover:bg-muted/30"
                          : "text-muted-foreground/20 hover:text-muted-foreground/35"
                      }`}
                      data-testid={`calendar-day-${date.getDate()}`}
                    >
                      <span>{date.getDate()}</span>
                      {hasAct && !isTd && <span className="w-1 h-1 rounded-full bg-primary/50 mt-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected date panel — editorial, flat */}
            {selectedDate && (
              <div className="mt-5 pt-4 border-t border-border/15 flex-1 min-h-0 overflow-y-auto custom-scrollbar max-h-[320px]">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[13px] font-semibold text-foreground">
                    {new Date(selectedDate + "T12:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" })}
                  </h4>
                  <span className="text-[11px] font-medium text-muted-foreground/60 px-1.5 py-0.5">
                    {calendarData?.daysRemaining && calendarData.daysRemaining > 0
                      ? `${calendarData.daysRemaining} gün sonra`
                      : calendarData?.daysRemaining === 0 ? "Bugün" : `${Math.abs(calendarData?.daysRemaining || 0)} gün önce`}
                  </span>
                </div>

                {(() => {
                  if (isFuture) {
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-2.5 py-2 rounded-md border border-border/20 bg-muted/15">
                          <span className="text-xs font-medium text-muted-foreground">Planlanan Aktiviteler</span>
                          <span className="text-sm font-bold text-foreground tabular-nums">{calendarData?.tasksCount || 0}</span>
                        </div>
                        {calendarData?.tasks && calendarData.tasks.length > 0 ? (
                          <div className="space-y-1.5">
                            {calendarData.tasks.slice(0, showAllTasks ? undefined : 3).map((task) => (
                              <div key={task.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-md border border-border/15 bg-card/20">
                                <div className="flex items-center gap-2 text-[13px] min-w-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                                  <span className="font-medium text-foreground truncate">{task.title}</span>
                                </div>
                                <span className="text-[11px] text-muted-foreground shrink-0">{task.priority === "high" ? "Yüksek" : task.priority === "medium" ? "Orta" : "Düşük"}</span>
                              </div>
                            ))}
                            {calendarData.tasks.length > 3 && (
                              <button onClick={() => setShowAllTasks(!showAllTasks)} className="text-[11px] font-medium text-primary hover:text-primary/80 px-2.5 py-1 transition-colors" data-testid="button-show-more-tasks">
                                {showAllTasks ? "Daha az" : `${calendarData.tasks.length - 3} görev daha`}
                              </button>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground text-center py-3">Bu tarihe planlanmış görev yok.</p>
                        )}
                      </div>
                    );
                  }

                  if (selectedActivities.total === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-6 text-center">
                        <p className="text-[13px] text-muted-foreground">{isToday ? "Bugün henüz aktivite yok." : "Bu tarihte aktivite yok."}</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      <StatGrid activities={selectedActivities} />
                      <PerformanceBar total={selectedActivities.performanceTotal} />
                      <StudyHoursRow studyHours={selectedActivities.studyHours} />
                      <ActivityList
                        activities={selectedActivities}
                        filter={activityFilter}
                        onFilterChange={setActivityFilter}
                        expandedTasks={expandedTasks}
                        onToggleTask={toggleTask}
                        expandedQuestionLogs={expandedQuestionLogs}
                        onToggleQuestionLog={toggleQuestionLog}
                        expandedExams={expandedExams}
                        onToggleExam={toggleExam}
                        selectedDate={selectedDate}
                      />
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Today's tasks — compact */}
          <div className="lg:col-span-2">
            <TodaysTasksWidget />
          </div>
        </div>

        {/* Weather — secondary, compact strip */}
        <div className="reveal">
          <CompactWeatherWidget />
        </div>
      </main>

      {/* Report modal */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Haftalık Aktivite Raporu</DialogTitle>
            <DialogDescription>Son 7 gün içinde yapılan tüm aktiviteler (bugün dahil)</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {(() => {
                const today = new Date();
                const last7 = new Date(today);
                last7.setDate(today.getDate() - 6);
                const l7s = last7.toISOString().split("T")[0];
                const tStr = today.toISOString().split("T")[0];
                const weekTasks = tasks.filter((t) => t.completedAt && new Date(t.completedAt).toISOString().split("T")[0] >= l7s && new Date(t.completedAt).toISOString().split("T")[0] <= tStr);
                const weekQ = questionLogs.filter((l) => l.study_date >= l7s && l.study_date <= tStr);
                const weekE = examResults.filter((e) => e.exam_date >= l7s && e.exam_date <= tStr);
                const weekQCount = weekQ.reduce((s, l) => s + (Number(l.correct_count) || 0) + (Number(l.wrong_count) || 0), 0);
                let weekECount = 0;
                weekE.forEach((e) => {
                  if (!e.subjects_data) return;
                  try {
                    const sd = JSON.parse(e.subjects_data);
                    Object.values(sd).forEach((s: any) => { weekECount += (Number(s.correct) || 0) + (Number(s.wrong) || 0); });
                  } catch {}
                });
                const weekStudy = studyHours.filter((s) => s.study_date >= l7s && s.study_date <= tStr).reduce((s, sh) => s + (Number(sh.hours) || 0), 0);

                const stats = [
                  { label: "Toplam Aktivite", value: weekTasks.length + weekQ.length + weekE.length },
                  { label: "Tamamlanan Görev", value: `${weekTasks.filter((t) => t.completed).length} / ${weekTasks.length}` },
                  { label: "Çözülen Soru", value: weekQCount + weekECount },
                  { label: "Deneme", value: weekE.length },
                  { label: "Çalışma Saati", value: `${weekStudy} saat`, span: true },
                ];
                return stats.map((s) => (
                  <div key={s.label} className={`rounded-lg border border-border/30 bg-muted/20 p-3 ${s.span ? "col-span-2" : ""}`}>
                    <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
                    <div className="text-2xl font-bold text-foreground tabular-nums">{s.value}</div>
                  </div>
                ));
              })()}
            </div>

            <div className="p-4 rounded-lg border border-border/30 bg-muted/20">
              <Label className="text-sm font-medium mb-2 block">Rapor Gönderilecek E-Posta Adresi</Label>
              <Input type="email" value="Belirlediğiniz e-posta adresine rapor gönderilecektir" disabled className="bg-muted/30 text-muted-foreground blur-[2px] cursor-not-allowed" />
              <p className="text-xs text-muted-foreground mt-2">E-posta adresinize detaylı rapor gönderilecek.</p>
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowReportModal(false)} disabled={sendReportMutation.isPending}>İptal</Button>
            <Button onClick={() => sendReportMutation.mutate({ isAutomatic: false })} disabled={sendReportMutation.isPending}>
              {sendReportMutation.isPending ? (
                <><span className="animate-spin mr-2">⏳</span>Gönderiliyor...</>
              ) : (
                <><Mail className="h-4 w-4 mr-2" />Gönder</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer — minimal editorial */}
      <footer className="border-t border-border/15 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground/50">
            © {new Date().getFullYear()}-2027 QuantPraxus
          </span>
          <span className="text-[11px] text-muted-foreground/35 hidden sm:inline">
            YKS hazırlık platformu
          </span>
        </div>
      </footer>
    </div>
  );
}
