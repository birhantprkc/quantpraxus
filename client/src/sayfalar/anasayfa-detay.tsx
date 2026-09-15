import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useLocation } from "wouter";
import { Header } from "@/bilesenler/baslik";
import { EnhancedWeatherWidget } from "@/bilesenler/gelismis-hava-durumu-widget";
import { CountdownWidget } from "@/bilesenler/geri-sayim-widget";
import { TodaysTasksWidget } from "@/bilesenler/gunun-gorevleri-widget";
import { Calendar, TrendingUp, Clock, ChevronLeft, ChevronRight, Mail, Zap, ChevronDown, ChevronUp, Lock, Unlock } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { sorguIstemcisi } from "@/kutuphane/sorguIstemcisi";
import { Task, QuestionLog, ExamResult } from "@shared/sema";
import { Button } from "@/bilesenler/arayuz/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/bilesenler/arayuz/dialog";
import { Input } from "@/bilesenler/arayuz/input";
import { Textarea } from "@/bilesenler/arayuz/textarea";
import { Label } from "@/bilesenler/arayuz/label";
import { Badge } from "@/bilesenler/arayuz/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/kutuphane/sorguIstemcisi";

// Türkiye saatine göre bugünün tarihini döndüren yardımcı fonksiyon (UTC sorununu çöz)
const getTurkeyDate = (): string => {
  const now = new Date();
  return new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'Europe/Istanbul' 
  }).format(now);
};

// Herhangi bir tarihi Türkiye saatinde YYYY-MM-DD formatına çevirir (UTC sorununu çöz)
const dateToTurkeyString = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'Europe/Istanbul' 
  }).format(dateObj);
};

// Saatli Ortalanmış Karşılama Bölümü Bileşeni - memo ile optimize edildi
const CenteredWelcomeSection = memo(function CenteredWelcomeSection() {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Her saniye güncelleme zamanı
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Şehir  için tarih ve saat formatlama - memoize edildi
  const { dateStr, timeStr } = useMemo(() => {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Europe/Istanbul',
      weekday: 'long',
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    };
    
    const timeOptions: Intl.DateTimeFormatOptions = {
      timeZone: 'Europe/Istanbul',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };

    const dateStr = currentTime.toLocaleDateString('tr-TR', options);
    const timeStr = currentTime.toLocaleTimeString('tr-TR', timeOptions);
    
    return { dateStr, timeStr };
  }, [currentTime]);

  return (
    <div className="space-y-8">
      {/* Hoşgeldin Mesajı */}
      <div className="space-y-2">
        <h1 className="text-5xl font-black bg-gradient-to-r from-purple-600 via-violet-700 to-black dark:from-purple-400 dark:via-violet-500 dark:to-gray-300 bg-clip-text text-transparent">
          Hoşgeldiniz QuantPraxus
        </h1>
      </div>
      
      {/* Ortalanmış Saat ve Saat Göstergesi */}
      <div className="flex flex-col items-center space-y-6">
        {/* Zaman ve Saat Konteyneri - Mükemmel Ortalanmış */}
        <div className="flex items-center justify-center space-x-6">
          {/* Geliştirilmiş Saat İkonu - Zaman ile Ortalanmış */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 via-violet-600/30 to-black/40 rounded-3xl blur-2xl animate-pulse"></div>
            <div className="relative w-20 h-20 bg-black/10 dark:bg-purple-950/20 backdrop-blur-xl border border-purple-500/20 dark:border-purple-400/20 rounded-3xl flex items-center justify-center shadow-2xl">
              <Clock className="h-12 w-12 text-purple-600 dark:text-purple-400 drop-shadow-lg" />
            </div>
          </div>
          
          {/* Mor-Siyah Gradyanlı Geliştirilmiş Saat Göstergesi - Ortalanmış */}
          <div className="text-8xl font-black bg-gradient-to-r from-purple-600 via-violet-700 to-black dark:from-purple-400 dark:via-violet-500 dark:to-gray-300 bg-clip-text text-transparent font-mono tracking-tighter drop-shadow-lg" data-testid="text-time-center">
            {timeStr}
          </div>
        </div>
        
        {/* Stilize Tarih ve Konum - Sola Hizalı ve Ortalanmış */}
        <div className="flex items-center justify-center space-x-4 text-2xl font-semibold">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-violet-600 shadow-lg animate-pulse"></div>
            <span className="bg-gradient-to-r from-purple-800 to-black dark:from-purple-300 dark:to-gray-200 bg-clip-text text-transparent font-bold" data-testid="text-date-center">
              {dateStr}
            </span>
          </div>
          <span className="text-muted-foreground/50">•</span>
          <div className="flex items-center space-x-2 text-muted-foreground">
            <span className="text-lg">📍</span>
            <span className="font-bold bg-gradient-to-r from-purple-600 to-violet-700 dark:from-purple-400 dark:to-violet-500 bg-clip-text text-transparent">
              Afyonkarahisar
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default function Homepage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Bugünün tarihini YYYY-MM-DD formatında al (Türkiye saat dilimi)
  const getTodayDateString = () => {
    const now = new Date();
    const turkeyTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
    const year = turkeyTime.getFullYear();
    const month = (turkeyTime.getMonth() + 1).toString().padStart(2, '0');
    const day = turkeyTime.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [activityFilter, setActivityFilter] = useState<'all' | 'tasks' | 'questions' | 'exams'>('all');
  const [showAllTasks, setShowAllTasks] = useState<boolean>(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [isReportButtonUnlocked, setIsReportButtonUnlocked] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  
  // Rapor gönderme mutation
  const sendReportMutation = useMutation({
    mutationFn: (params?: { isAutomatic?: boolean }) => {
      // LocalStorage'dan tamamlanan konuları al
      const completedGeneral = JSON.parse(localStorage.getItem('completedGeneralExamErrors') || '[]');
      const completedBranch = JSON.parse(localStorage.getItem('completedBranchExamErrors') || '[]');
      const completedQuestion = JSON.parse(localStorage.getItem('completedQuestionErrors') || '[]');
      const completedFromMissing = JSON.parse(localStorage.getItem('completedTopicsFromMissing') || '[]');
      
      // MODAL İLE EŞLEŞTİR: "Tamamlanan Hatalı Konular Geçmişi" modalı tüm 4 kaynağı içeriyor
      const completedTopicsCount = completedGeneral.length + completedBranch.length + completedQuestion.length + completedFromMissing.length;
      
      // Ayrı bir "Düzeltilen Sorular" kategorisi yok
      const completedQuestionsCount = 0;
      
      // Build history arrays - modal ile aynı
      const completedTopicsHistory = [
        ...completedGeneral.map((item: any) => ({ ...item, source: 'general' })),
        ...completedBranch.map((item: any) => ({ ...item, source: 'branch' })),
        ...completedQuestion.map((item: any) => ({ ...item, source: 'question' })),
        ...completedFromMissing.map((item: any) => ({ ...item, source: 'missing' }))
      ].sort((a: any, b: any) => new Date(b.completedAt || b.date).getTime() - new Date(a.completedAt || a.date).getTime()).slice(0, 15);
      
      const completedQuestionsHistory: any[] = [];
      
      // Panel'deki Günlük Soru Çözüm Analizi'nin verilerini hesapla (hem sorulardan hem denemelerden)
      const selectedDateObj = new Date(selectedDate + 'T12:00:00');
      const dayQuestionLogs = allQuestionLogs.filter(log => log.study_date === selectedDate);
      const dayExamResults = allExamResults.filter(exam => exam.exam_date === selectedDate);
      
      // Soru kayıtlarından topla
      const questionTotalQuestions = dayQuestionLogs.reduce((sum, log) => sum + (parseInt(log.correct_count) || 0) + (parseInt(log.wrong_count) || 0), 0);
      const questionTotalCorrect = dayQuestionLogs.reduce((sum, log) => sum + (parseInt(log.correct_count) || 0), 0);
      const questionTotalWrong = dayQuestionLogs.reduce((sum, log) => sum + (parseInt(log.wrong_count) || 0), 0);
      const questionTotalEmpty = dayQuestionLogs.reduce((sum, log) => sum + (parseInt(log.blank_count) || 0), 0);
      
      // Deneme sonuçlarından topla - subjects_data'dan direkt al
      let examTotalCorrect = 0;
      let examTotalWrong = 0;
      let examTotalEmpty = 0;
      dayExamResults.forEach(exam => {
        if (!exam.subjects_data) return;
        try {
          const subjectsData = JSON.parse(exam.subjects_data);
          Object.values(subjectsData).forEach((subject: any) => {
            examTotalCorrect += parseInt(subject.correct || "0");
            examTotalWrong += parseInt(subject.wrong || "0");
            examTotalEmpty += parseInt(subject.blank || "0");
          });
        } catch (e) {
          console.error('Error parsing subjects_data:', e);
        }
      });
      
      // Her iki kaynağı birleştir
      const dayTotalQuestions = questionTotalQuestions + examTotalCorrect + examTotalWrong;
      const dayTotalCorrect = questionTotalCorrect + examTotalCorrect;
      const dayTotalWrong = questionTotalWrong + examTotalWrong;
      const dayTotalEmpty = questionTotalEmpty + examTotalEmpty;

      return apiRequest("POST", "/api/reports/send", { 
        isManualRequest: !params?.isAutomatic,
        dayTotalQuestions,
        dayTotalCorrect,
        dayTotalWrong,
        dayTotalEmpty,
        completedTopicsCount,
        completedQuestionsCount,
        completedTopicsHistory,
        completedQuestionsHistory
      });
    },
    onSuccess: (_, variables) => {
      if (variables?.isAutomatic) {
        // Otomatik gönderim başarılı oldu, bu tarihi kaydet (tekrar göndermeyi engelle)
        const now = new Date();
        const turkeyTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
        const todayStr = turkeyTime.toISOString().split('T')[0];
        localStorage.setItem('lastAutoReportDate', todayStr);
        
        toast({ title: "📧 Haftalık Rapor Otomatik Gönderildi", description: "Pazar 23:59 - Haftalık raporunuz otomatik olarak e-posta adresinize gönderildi.", duration: 3000 });
      } else {
        toast({ title: "📧 Rapor Gönderildi", description: "Aylık ilerleme raporunuz e-posta adresinize gönderildi.", duration: 1500 });
      }
      setIsReportButtonUnlocked(false);
      setShowReportModal(false);
    },
    onError: (_, variables) => {
      if (variables?.isAutomatic) {
        toast({ title: "❌ Otomatik Rapor Hatası", description: "Haftalık rapor otomatik gönderilemedi. EMAIL ayarlarını kontrol edin.", variant: "destructive", duration: 3000 });
      } else {
        toast({ title: "❌ Hata", description: "Rapor gönderilemedi. EMAIL ayarlarını kontrol edin.", variant: "destructive", duration: 1500 });
      }
    },
  });
  
  // Otomatik rapor gönderimi - Pazar 23:59'da
  useEffect(() => {
    const checkAndSendAutoReport = () => {
      const now = new Date();
      const turkeyTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
      
      // Pazar günü mü kontrol et (0 = Pazar)
      const currentDay = turkeyTime.getDay();
      const currentHour = turkeyTime.getHours();
      const currentMinute = turkeyTime.getMinutes();
      
      // Pazar günü 23:59'da mı kontrol et
      if (currentDay === 0 && currentHour === 23 && currentMinute === 59) {
        // Bu hafta için rapor gönderildi mi kontrol et
        const lastAutoReportDate = localStorage.getItem('lastAutoReportDate');
        const todayStr = turkeyTime.toISOString().split('T')[0];
        
        // Eğer bugün henüz otomatik rapor gönderilmediyse (başarıyla)
        if (lastAutoReportDate !== todayStr) {
          // Otomatik rapor gönder (başarılı olursa onSuccess'te tarih kaydedilecek)
          sendReportMutation.mutate({ isAutomatic: true });
          
          console.log('📧 Otomatik haftalık rapor gönderme denemesi - Pazar 23:59');
        }
      }
    };
    
    // Her dakika kontrol et
    const interval = setInterval(checkAndSendAutoReport, 60000); // 60 saniyede bir
    
    // İlk yüklemede de kontrol et
    checkAndSendAutoReport();
    
    return () => clearInterval(interval);
  }, [sendReportMutation]);
  
  // Takvim navigasyonu için durum (Türkiye saat dilimi)
  const getTurkeyDate = () => {
    const now = new Date();
    const turkeyTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
    return turkeyTime;
  };
  const currentDate = getTurkeyDate();
  const [displayYear, setDisplayYear] = useState(currentDate.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(currentDate.getMonth());
  
  // Türkiye saatine göre tarih güncellemesi - sadece displayYear ve displayMonth için
  useEffect(() => {
    const updateDisplay = () => {
      const turkeyDate = getTurkeyDate();
      setDisplayYear(turkeyDate.getFullYear());
      setDisplayMonth(turkeyDate.getMonth());
    };
    
    // İlk yüklemede çalıştır
    updateDisplay();
    
    // Gece yarısı değişimleri için periyodik kontrol (selectedDate'i değiştirmez)
    const interval = setInterval(updateDisplay, 60000); // 1 dakikada bir
    
    return () => clearInterval(interval);
  }, []);
  
  // Kategori isimlerini düzgün formatta gösterecek fonksiyon
  const getCategoryText = (category: string) => {
    switch (category) {
      case "genel":
        return "Genel";
      case "turkce":
        return "Türkçe";
      case "paragraf":
        return "Paragraf";
      case "sosyal":
        return "Sosyal Bilimler";
      case "matematik":
        return "TYT Matematik";
      case "problemler":
        return "Problemler";
      case "fizik":
        return "TYT Fizik";
      case "kimya":
        return "TYT Kimya";
      case "biyoloji":
        return "TYT Biyoloji";
      case "tyt-geometri":
        return "TYT Geometri";
      case "ayt-geometri":
        return "AYT Geometri";
      case "ayt-matematik":
        return "AYT Matematik";
      case "ayt-fizik":
        return "AYT Fizik";
      case "ayt-kimya":
        return "AYT Kimya";
      case "ayt-biyoloji":
        return "AYT Biyoloji";
      default:
        return category;
    }
  };
  
  const [expandedQuestionLogs, setExpandedQuestionLogs] = useState<Set<string>>(new Set());
  const [expandedExams, setExpandedExams] = useState<Set<string>>(new Set());

  const { data: calendarData } = useQuery<{
    date: string;
    dayNumber: number;
    daysRemaining: number;
    tasks: Task[];
    tasksCount: number;
  }>({
    queryKey: ["/api/calendar", selectedDate],
    queryFn: async () => {
      if (!selectedDate) return null;
      const response = await fetch(`/api/calendar/${selectedDate}`);
      if (!response.ok) throw new Error('Failed to fetch calendar data');
      return response.json();
    },
    enabled: !!selectedDate,
  });

  // Aktif verileri al
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });
  
  const { data: questionLogs = [] } = useQuery<QuestionLog[]>({
    queryKey: ["/api/question-logs"],
  });
  
  const { data: examResults = [] } = useQuery<ExamResult[]>({
    queryKey: ["/api/exam-results"],
  });

  const { data: studyHours = [] } = useQuery<any[]>({
    queryKey: ["/api/study-hours"],
  });

  // Arşivlenmiş verileri al - takvim için gerekli
  const { data: archivedTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks/archived"],
  });

  const { data: archivedQuestionLogs = [] } = useQuery<QuestionLog[]>({
    queryKey: ["/api/question-logs/archived"],
  });

  const { data: archivedExamResults = [] } = useQuery<ExamResult[]>({
    queryKey: ["/api/exam-results/archived"],
  });

  const { data: archivedStudyHours = [] } = useQuery<any[]>({
    queryKey: ["/api/study-hours/archived"],
  });

  // Takvimde gösterilmek için TÜM verileri birleştir (aktif + arşivlenmiş)
  const allTasks = useMemo(() => [...tasks, ...archivedTasks], [tasks, archivedTasks]);
  const allQuestionLogs = useMemo(() => [...questionLogs, ...archivedQuestionLogs], [questionLogs, archivedQuestionLogs]);
  const allExamResults = useMemo(() => [...examResults, ...archivedExamResults], [examResults, archivedExamResults]);
  const allStudyHours = useMemo(() => [...studyHours, ...archivedStudyHours], [studyHours, archivedStudyHours]);

  // Takvim günlerini önbelleğe almak için memoize edilmiş oluşturma
  const calendarDays = useMemo(() => {
    const year = displayYear;
    const month = displayMonth;
    const firstDay = new Date(year, month, 1);
    
    // Pazartesi gününden başlayın (haftalık düzenlemeyi sabitleyin)
    const startOffset = (firstDay.getDay() + 6) % 7;
    const startDate = new Date(year, month, 1 - startOffset);
    
    const days = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    
    return days;
  }, [displayYear, displayMonth]);

  // Güncel tarih sabitleri için karşılaştırma
  const today = currentDate.getDate();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Optimize edilmiş gezinme işlevleri için useCallback kullanımı
  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setDisplayMonth(prev => prev === 0 ? 11 : prev - 1);
      setDisplayYear(prev => displayMonth === 0 ? prev - 1 : prev);
    } else {
      setDisplayMonth(prev => prev === 11 ? 0 : prev + 1);
      setDisplayYear(prev => displayMonth === 11 ? prev + 1 : prev);
    }
  }, [displayMonth]);

  // Yeniden hesaplamayı önlemek için belleğe alınmış etkinlik kontrolü
  const hasActivities = useCallback((date: Date) => {
    const dateStr = dateToTurkeyString(date);
    
    // Tamamlanan görevleri kontrol edin (aktif + arşivlenmiş)
    const hasCompletedTasks = allTasks.some(task => {
      if (!task.completedAt) return false;
      const completedDate = dateToTurkeyString(task.completedAt);
      return completedDate === dateStr;
    });
    
    // Planlanmış görevleri kontrol et (due date'i olan görevler) (aktif + arşivlenmiş)
    const hasScheduledTasks = allTasks.some(task => {
      if (!task.dueDate) return false;
      const taskDate = dateToTurkeyString(task.dueDate);
      return taskDate === dateStr;
    });
    
    // Arşivlenen görevleri kontrol et
    const hasArchivedTasks = allTasks.some(task => {
      if (!task.archived || !task.archivedAt) return false;
      const archivedDate = dateToTurkeyString(task.archivedAt);
      return archivedDate === dateStr;
    });
    
    // Soru günlüklerini kontrol et (aktif + arşivlenmiş)
    const hasQuestionLogs = allQuestionLogs.some(log => log.study_date === dateStr);
    
    // Sınav sonuçlarını kontrol et (aktif + arşivlenmiş)
    const hasExamResults = allExamResults.some(exam => exam.exam_date === dateStr);
    
    // Çalışma saatlerini kontrol et (aktif + arşivlenmiş)
    const hasStudyHours = allStudyHours.some(sh => sh.study_date === dateStr);
    
    return hasCompletedTasks || hasScheduledTasks || hasArchivedTasks || hasQuestionLogs || hasExamResults || hasStudyHours;
  }, [allTasks, allQuestionLogs, allExamResults, allStudyHours]);

  // Belirli bir tarih için etkinlikleri al (aktif + arşivlenmiş)
  const getActivitiesForDate = useCallback((date: Date) => {
    const dateStr = dateToTurkeyString(date);
    
    const completedTasks = allTasks.filter(task => {
      if (!task.completedAt || task.archived) return false;
      const completedDate = dateToTurkeyString(task.completedAt);
      return completedDate === dateStr;
    });
    
    const scheduledTasks = allTasks.filter(task => {
      if (!task.dueDate || task.completedAt || task.archived) return false;
      const taskDate = dateToTurkeyString(task.dueDate);
      return taskDate === dateStr;
    });
    
    const archivedTasksOnThisDay = allTasks.filter(task => {
      if (!task.archived || !task.archivedAt) return false;
      const archivedDate = dateToTurkeyString(task.archivedAt);
      return archivedDate === dateStr;
    });
    
    const dayQuestionLogs = allQuestionLogs.filter(log => log.study_date === dateStr);
    const dayExamResults = allExamResults.filter(exam => exam.exam_date === dateStr);
    const dayStudyHours = allStudyHours.filter(sh => sh.study_date === dateStr);
    
    // Soru kayıtlarından topla
    const questionLogTotal = dayQuestionLogs.reduce((sum, log) => {
      return sum + (parseInt(log.correct_count) || 0) + (parseInt(log.wrong_count) || 0); // Boş dahil değil
    }, 0);
    
    // Deneme sonuçlarından topla - subjects_data'dan direkt al
    const examResultTotal = dayExamResults.reduce((sum, exam) => {
      if (!exam.subjects_data) return sum;
      try {
        const subjectsData = JSON.parse(exam.subjects_data);
        const examTotal = (Object.values(subjectsData) as any[]).reduce((subSum: number, subject: any) => {
          const correct = parseInt(subject.correct) || 0;
          const wrong = parseInt(subject.wrong) || 0;
          return subSum + correct + wrong; // Doğru + Yanlış
        }, 0);
        return sum + examTotal;
      } catch (e) {
        console.error('Error parsing subjects_data:', e);
        return sum;
      }
    }, 0);
    
    // Her iki kaynağı birleştir
    const totalQuestionsCount = questionLogTotal + examResultTotal;
    
    return {
      tasks: completedTasks,
      scheduledTasks: scheduledTasks,
      archivedTasks: archivedTasksOnThisDay,
      questionLogs: dayQuestionLogs,
      examResults: dayExamResults,
      studyHours: dayStudyHours,
      total: completedTasks.length + scheduledTasks.length + archivedTasksOnThisDay.length + totalQuestionsCount + dayExamResults.length,
      performanceTotal: completedTasks.length + totalQuestionsCount + dayExamResults.length
    };
  }, [allTasks, allQuestionLogs, allExamResults, allStudyHours]);

  // Ay sonuna kadar kalan günleri hesapla
  const getDaysUntilMonthEnd = useCallback(() => {
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const timeDiff = lastDayOfMonth.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff;
  }, []);

  const handleDateClick = (date: Date) => {
    // Düzeltme: Zaman dilimi sorunları olmadan gerçek tarihi kullanın.
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    setSelectedDate(dateStr);
  };

  // Pazar 23:59 geri sayım 
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const turkeyTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
      
      // Bir sonraki Pazar 23:59'u bul
      const nextSunday = new Date(turkeyTime);
      const currentDay = turkeyTime.getDay(); // 0 = Pazar, 6 = Cumartesi
      let daysUntilSunday;
      
      if (currentDay === 0) {
        // Bugün Pazar ise, gün sonuna kadar olan süreyi hesapla
        const targetTime = new Date(turkeyTime);
        targetTime.setHours(23, 59, 59, 999);
        daysUntilSunday = turkeyTime < targetTime ? 0 : 7;
      } else {
        // Pazar değil
        daysUntilSunday = 7 - currentDay;
      }
      
      nextSunday.setDate(nextSunday.getDate() + daysUntilSunday);
      nextSunday.setHours(23, 59, 59, 999);
      
      const diff = nextSunday.getTime() - turkeyTime.getTime();
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      const countdownEl = document.getElementById('month-countdown');
      if (countdownEl) {
        countdownEl.textContent = `${days}g ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Header hideClockOnHomepage={true} />
      

      {/* Saatli Ortaya Alınmış Karşılama Bölümü */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <CenteredWelcomeSection />
      </div>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">

        {/* Üst Sıra - Takvim ve Bugünün Görevleri Yan Yana */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6 items-stretch">
          {/* Modern Takvim Widget'ı - 3 sütun kaplar (biraz daha büyük) */}
          <div className="lg:col-span-3 bg-gradient-to-br from-card to-card/80 rounded-2xl border border-border/50 p-4 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent flex items-center">
                <Calendar className="h-5 w-5 mr-3 text-primary" />
                Takvim
              </h3>
              
              <div className="flex items-center gap-2">
                  {/* Rapor Gönder Butonu - Sol ok butonunun solunda */}
                  <div className="relative mr-2">
                    {/* Kilit İkonu - Red when locked, Green when unlocked */}
                    <button
                      onClick={() => {
                        if (!isReportButtonUnlocked) {
                          setIsReportButtonUnlocked(true);
                          toast({
                            title: "Kilit Açıldı",
                            description: "Şuana kadar yapmış olduğunuz veriyi gönderebilmek için butona tıklayın ve e-postanızda raporunuzu analiz etmeye başlayabilirsiniz",
                            duration: 1500,
                          });
                        } else {
                          setIsReportButtonUnlocked(false);
                          toast({
                            title: "Kilit Kapatıldı",
                            description: "Rapor gönderme butonu kilitlendi",
                            duration: 1500,
                          });
                        }
                      }}
                      className={`absolute -top-2 -right-2 z-10 p-1.5 rounded-full transition-all duration-300 ${
                        isReportButtonUnlocked 
                          ? 'bg-green-500 hover:bg-green-600' 
                          : 'bg-red-500 hover:bg-red-600'
                      } hover:scale-110 cursor-pointer shadow-lg`}
                      title={isReportButtonUnlocked ? "Kilidi Kapatmak İçin Tıklayın" : "Kilidi Açmak İçin Tıklayın"}
                    >
                      {isReportButtonUnlocked ? (
                        <Unlock className="h-4 w-4 text-white" />
                      ) : (
                        <Lock className="h-4 w-4 text-white" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => {
                        if (isReportButtonUnlocked) {
                          setShowReportModal(true);
                        }
                      }}
                      disabled={!isReportButtonUnlocked}
                      className={`px-4 py-2 bg-black/20 dark:bg-gray-950/20 rounded-lg transition-all duration-300 border border-purple-500/30 backdrop-blur-sm ${
                        isReportButtonUnlocked
                          ? 'hover:shadow-lg hover:shadow-purple-600/50 cursor-pointer opacity-100' 
                          : 'cursor-not-allowed opacity-30'
                      }`}
                      style={{
                        minWidth: '220px'
                      }}
                      title={isReportButtonUnlocked ? "Rapor Gönder" : "Önce kilidi açın"}
                    >
                      <div className="text-center">
                        <div 
                          className="text-sm font-bold mb-1"
                          style={{
                            color: '#a855f7',
                            textShadow: isReportButtonUnlocked ? '0 0 10px rgba(168, 85, 247, 0.6)' : 'none'
                          }}
                        >
                          Rapor Gönder
                        </div>
                        <div 
                          className="text-base font-mono tabular-nums font-bold"
                          id="month-countdown"
                          style={{
                            color: '#a855f7',
                            textShadow: isReportButtonUnlocked ? '0 0 8px rgba(168, 85, 247, 0.4)' : 'none'
                          }}
                        >
                          Loading...
                        </div>
                      </div>
                    </button>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateMonth('prev')}
                    className="h-8 w-8 p-0 hover:bg-primary/10"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-sm font-medium text-muted-foreground px-3 py-1 bg-muted/50 rounded-full min-w-[140px] text-center">
                    {new Date(displayYear, displayMonth).toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateMonth('next')}
                    className="h-8 w-8 p-0 hover:bg-primary/10"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

            {/* Modern Takvim Izgara */}
            <div className="space-y-2">
              {/* Hafta Başlıkları */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day, index) => (
                  <div key={day} className="text-center text-xs font-semibold text-muted-foreground/70 py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Takvim Günleri */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((date, index) => {
                  const isCurrentMonth = date.getMonth() === displayMonth;
                  const isToday = date.getDate() === today && isCurrentMonth && displayYear === currentYear && displayMonth === currentMonth;
                  const year = date.getFullYear();
                  const month_num = (date.getMonth() + 1).toString().padStart(2, '0');
                  const day = date.getDate().toString().padStart(2, '0');
                  const dateStr = `${year}-${month_num}-${day}`;
                  const isSelected = selectedDate === dateStr;
                  const dayHasActivities = hasActivities(date);
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleDateClick(date)}
                      className={`relative aspect-square flex flex-col items-center justify-center text-sm font-medium rounded-xl transition-all duration-200 transform hover:scale-105 ${
                        isToday
                          ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 scale-105"
                          : isSelected
                          ? "bg-gradient-to-br from-accent to-accent/80 text-accent-foreground ring-2 ring-primary/50 shadow-md"
                          : isCurrentMonth
                          ? "hover:bg-gradient-to-br hover:from-secondary hover:to-secondary/80 cursor-pointer text-foreground hover:shadow-md border border-transparent hover:border-border/50"
                          : "text-muted-foreground/30 cursor-pointer hover:text-muted-foreground/50"
                      }`}
                      data-testid={`calendar-day-${date.getDate()}`}
                    >
                      <span>{date.getDate()}</span>
                      {dayHasActivities && (
                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-0.5"></div>
                      )}
                      {isToday && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Gelişmiş Etkileşimli Takvim Rapor Paneli */}
            {selectedDate && (
              <div className="mt-6 space-y-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                {/* Ana Tarih Bilgisi Kartı */}
                <div className="p-5 bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl border border-border/30 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-lg text-foreground flex items-center">
                      <div className="w-3 h-3 bg-primary rounded-full mr-2 animate-pulse"></div>
                      {new Date(selectedDate + 'T12:00:00').toLocaleDateString('tr-TR', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric',
                        weekday: 'long'
                      })}
                    </h4>
                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                      {calendarData?.daysRemaining && calendarData.daysRemaining > 0 
                        ? `${calendarData.daysRemaining} gün sonra` 
                        : calendarData?.daysRemaining === 0 
                        ? "Bugün" 
                        : `${Math.abs(calendarData?.daysRemaining || 0)} gün önce`}
                    </span>
                  </div>
                  
                  {(() => {
                    const selectedDateObj = new Date(selectedDate + 'T12:00:00');
                    const todayDateStr = getTodayDateString();
                    
                    const isPast = selectedDate < todayDateStr;
                    const isToday = selectedDate === todayDateStr;
                    const isFuture = selectedDate > todayDateStr;
                    
                    const activities = getActivitiesForDate(selectedDateObj);
                    
                    if (isPast) {
                      // Geçmiş Tarih Raporu - KÜÇÜK popup
                      if (activities.total === 0) {
                        return (
                          <div className="text-center py-4">
                            <p className="text-sm font-medium text-muted-foreground">
                              Bugün hiç aktivite yapılmamış :(
                            </p>
                          </div>
                        );
                      } else {
                        const taskProgress = activities.tasks.length;
                        // Soru kayıtlarından topla
                        const questionLogProgress = activities.questionLogs.reduce((sum: number, log: any) => {
                          return sum + (parseInt(log.correct_count) || 0) + (parseInt(log.wrong_count) || 0); // Boş dahil değil
                        }, 0);
                        // Deneme sonuçlarından topla - subjects_data'dan direkt al
                        const examQuestionProgress = activities.examResults.reduce((sum: number, exam: any) => {
                          if (!exam.subjects_data) return sum;
                          try {
                            const subjectsData = JSON.parse(exam.subjects_data);
                            const examTotal = (Object.values(subjectsData) as any[]).reduce((subSum: number, subject: any) => {
                              return subSum + (parseInt(subject.correct) || 0) + (parseInt(subject.wrong) || 0);
                            }, 0);
                            return sum + examTotal;
                          } catch (e) {
                            return sum;
                          }
                        }, 0);
                        const questionProgress = questionLogProgress + examQuestionProgress;
                        const examProgress = activities.examResults.length;
                        
                        return (
                          <div className="space-y-4">
                            {/* Etkinlik Özeti Kartları */}
                            <div className="grid grid-cols-3 gap-3">
                              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{taskProgress}</div>
                                <div className="text-xs text-green-700 dark:text-green-300">Görev</div>
                              </div>
                              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{questionProgress}</div>
                                <div className="text-xs text-blue-700 dark:text-blue-300">Soru</div>
                              </div>
                              <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{examProgress}</div>
                                <div className="text-xs text-purple-700 dark:text-purple-300">Deneme</div>
                              </div>
                            </div>

                            {/* Toplam Aktivite İlerlemesi */}
                            <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-4 border border-primary/20">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-foreground">Günlük Performans</span>
                                <span className="text-lg font-bold text-primary">{activities.performanceTotal}</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-500" 
                                  style={{ width: `${Math.min((activities.performanceTotal / 10) * 100, 100)}%` }}
                                ></div>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {activities.performanceTotal >= 10 ? "Müthiş bir gün! 🎉" : activities.performanceTotal >= 5 ? "İyi gidiyor! 👍" : "Daha fazla çalışabiliriz! 💪"}
                              </div>
                            </div>
                            
                            {/* Bugünün Çalışma Saatleri */}
                            {activities.studyHours.length > 0 && (
                              <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg p-4 border border-cyan-300/30 dark:border-cyan-700/30">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                                    <span className="text-sm font-medium text-foreground">Bugün Çalışılan Saat</span>
                                  </div>
                                  <span className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                                    {(() => {
                                      const totalSeconds = activities.studyHours.reduce((sum: number, sh: any) => {
                                        const h = parseInt(sh.hours) || 0;
                                        const m = parseInt(sh.minutes) || 0;
                                        const s = parseInt(sh.seconds) || 0;
                                        return sum + (h * 3600 + m * 60 + s);
                                      }, 0);
                                      const hours = Math.floor(totalSeconds / 3600);
                                      const minutes = Math.floor((totalSeconds % 3600) / 60);
                                      return `${hours}s ${minutes}dk`;
                                    })()}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Detaylı Aktivite Listesi */}
                            <div className="space-y-2">
                              <h5 className="font-semibold text-sm text-foreground mb-3 flex items-center">
                                <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
                                Aktivite Detayları
                              </h5>
                              
                              {/* filtre butonları */}
                              <div className="flex gap-2 mb-3">
                                <button 
                                  onClick={() => setActivityFilter('all')}
                                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                                    activityFilter === 'all' 
                                      ? 'bg-primary text-white shadow-sm' 
                                      : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                                  }`}
                                  data-testid="button-filter-all"
                                >
                                  Tümü
                                </button>
                                <button 
                                  onClick={() => setActivityFilter('tasks')}
                                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                                    activityFilter === 'tasks' 
                                      ? 'bg-green-500 text-white shadow-sm' 
                                      : 'bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/30 text-green-700 dark:text-green-300'
                                  }`}
                                  data-testid="button-filter-tasks"
                                >
                                  Görev
                                </button>
                                <button 
                                  onClick={() => setActivityFilter('questions')}
                                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                                    activityFilter === 'questions' 
                                      ? 'bg-blue-500 text-white shadow-sm' 
                                      : 'bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                                  }`}
                                  data-testid="button-filter-questions"
                                >
                                  Soru
                                </button>
                                <button 
                                  onClick={() => setActivityFilter('exams')}
                                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                                    activityFilter === 'exams' 
                                      ? 'bg-purple-500 text-white shadow-sm' 
                                      : 'bg-purple-50 dark:bg-purple-950/20 hover:bg-purple-100 dark:hover:bg-purple-950/30 text-purple-700 dark:text-purple-300'
                                  }`}
                                  data-testid="button-filter-exams"
                                >
                                  Deneme
                                </button>
                              </div>
                              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                                {/* Tamamlanan görevleri göster */}
                                {(activityFilter === 'all' || activityFilter === 'tasks') && activities.tasks.map((task: Task) => {
                                  const isExpanded = expandedTasks.has(task.id);
                                  return (
                                  <div key={`${selectedDate}-completed-${task.id}`} className="flex flex-col gap-2 p-2 bg-green-50 dark:bg-green-950/10 rounded-lg">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center text-sm">
                                        <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                                        <span className="font-medium">Görev:</span>
                                        <span className="ml-2 text-muted-foreground">{task.title}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {task.deleted && (
                                          <div className="text-xs text-red-600 bg-red-100 dark:bg-red-900/20 px-2 py-1 rounded-full">
                                            🗑️ Silindi
                                          </div>
                                        )}
                                        {task.archived && (
                                          <div className="text-xs text-orange-600 bg-orange-100 dark:bg-orange-900/20 px-2 py-1 rounded-full">
                                            📦 Arşivlendi
                                          </div>
                                        )}
                                        {!task.deleted && !task.archived && (
                                          <div className="text-xs text-green-600 bg-green-100 dark:bg-green-900/20 px-2 py-1 rounded-full">
                                            ✓ Tamamlandı
                                          </div>
                                        )}
                                        <button
                                          onClick={() => {
                                            setExpandedTasks(prev => {
                                              const newSet = new Set(prev);
                                              if (newSet.has(task.id)) {
                                                newSet.delete(task.id);
                                              } else {
                                                newSet.add(task.id);
                                              }
                                              return newSet;
                                            });
                                          }}
                                          className="p-0.5 hover:bg-green-200 dark:hover:bg-green-900/30 rounded transition-colors"
                                          data-testid={`button-expand-completed-task-${task.id}`}
                                        >
                                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-green-700 dark:text-green-400" /> : <ChevronDown className="h-3.5 w-3.5 text-green-700 dark:text-green-400" />}
                                        </button>
                                      </div>
                                    </div>
                                    {isExpanded && (
                                      <div className="mt-1 pt-2 border-t border-green-200 dark:border-green-800 space-y-1.5 text-xs">
                                        {task.description && (
                                          <div className="flex gap-2">
                                            <span className="font-semibold text-green-700 dark:text-green-400 min-w-[65px]">Açıklama:</span>
                                            <span className="text-foreground">{task.description}</span>
                                          </div>
                                        )}
                                        <div className="flex gap-2">
                                          <span className="font-semibold text-green-700 dark:text-green-400 min-w-[65px]">Ders:</span>
                                          <span className="text-foreground">{getCategoryText(task.category)}</span>
                                        </div>
                                        {task.dueDate && (
                                          <div className="flex gap-2">
                                            <span className="font-semibold text-green-700 dark:text-green-400 min-w-[65px]">Tarih:</span>
                                            <span className="text-foreground">{new Date(task.dueDate).toLocaleDateString('tr-TR')}</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  );
                                })}
                                
                                {/* Planlanmış görevleri göster */}
                                {(activityFilter === 'all' || activityFilter === 'tasks') && activities.scheduledTasks && activities.scheduledTasks.map((task: Task) => {
                                  const isExpanded = expandedTasks.has(`scheduled-${task.id}`);
                                  return (
                                  <div key={`${selectedDate}-scheduled-${task.id}`} className="flex flex-col gap-2 p-2 bg-gray-50 dark:bg-gray-950/10 rounded-lg">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center text-sm">
                                        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full mr-3"></div>
                                        <span className="font-medium">Görev:</span>
                                        <span className="ml-2 text-muted-foreground">{task.title}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="text-xs text-gray-600 bg-gray-100 dark:bg-gray-900/20 px-2 py-1 rounded-full">
                                          📅 Planlandı
                                        </div>
                                        <button
                                          onClick={() => {
                                            setExpandedTasks(prev => {
                                              const newSet = new Set(prev);
                                              const key = `scheduled-${task.id}`;
                                              if (newSet.has(key)) {
                                                newSet.delete(key);
                                              } else {
                                                newSet.add(key);
                                              }
                                              return newSet;
                                            });
                                          }}
                                          className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-900/30 rounded transition-colors"
                                          data-testid={`button-expand-scheduled-task-${task.id}`}
                                        >
                                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-gray-700 dark:text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-700 dark:text-gray-400" />}
                                        </button>
                                      </div>
                                    </div>
                                    {isExpanded && (
                                      <div className="mt-1 pt-2 border-t border-gray-200 dark:border-gray-800 space-y-1.5 text-xs">
                                        {task.description && (
                                          <div className="flex gap-2">
                                            <span className="font-semibold text-gray-700 dark:text-gray-400 min-w-[65px]">Açıklama:</span>
                                            <span className="text-foreground">{task.description}</span>
                                          </div>
                                        )}
                                        <div className="flex gap-2">
                                          <span className="font-semibold text-gray-700 dark:text-gray-400 min-w-[65px]">Ders:</span>
                                          <span className="text-foreground">{getCategoryText(task.category)}</span>
                                        </div>
                                        {task.dueDate && (
                                          <div className="flex gap-2">
                                            <span className="font-semibold text-gray-700 dark:text-gray-400 min-w-[65px]">Tarih:</span>
                                            <span className="text-foreground">{new Date(task.dueDate).toLocaleDateString('tr-TR')}</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  );
                                })}
                                
                                {/* Arşivlenen görevleri göster */}
                                {(activityFilter === 'all' || activityFilter === 'tasks') && activities.archivedTasks && activities.archivedTasks.map((task: Task) => {
                                  const isExpanded = expandedTasks.has(`archived-${task.id}`);
                                  return (
                                  <div key={`${selectedDate}-archived-${task.id}`} className="flex flex-col gap-2 p-2 bg-orange-50 dark:bg-orange-950/10 rounded-lg border border-orange-200 dark:border-orange-800">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center text-sm">
                                        <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                                        <span className="font-medium">Görev:</span>
                                        <span className="ml-2 text-muted-foreground">{task.title}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="text-xs text-orange-600 bg-orange-100 dark:bg-orange-900/20 px-2 py-1 rounded-full">
                                          📦 Arşivlendi
                                        </div>
                                        <button
                                          onClick={() => {
                                            setExpandedTasks(prev => {
                                              const newSet = new Set(prev);
                                              const key = `archived-${task.id}`;
                                              if (newSet.has(key)) {
                                                newSet.delete(key);
                                              } else {
                                                newSet.add(key);
                                              }
                                              return newSet;
                                            });
                                          }}
                                          className="p-0.5 hover:bg-orange-200 dark:hover:bg-orange-900/30 rounded transition-colors"
                                          data-testid={`button-expand-archived-task-${task.id}`}
                                        >
                                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-orange-700 dark:text-orange-400" /> : <ChevronDown className="h-3.5 w-3.5 text-orange-700 dark:text-orange-400" />}
                                        </button>
                                      </div>
                                    </div>
                                    {isExpanded && (
                                      <div className="mt-1 pt-2 border-t border-orange-200 dark:border-orange-800 space-y-1.5 text-xs">
                                        {task.description && (
                                          <div className="flex gap-2">
                                            <span className="font-semibold text-orange-700 dark:text-orange-400 min-w-[65px]">Açıklama:</span>
                                            <span className="text-foreground">{task.description}</span>
                                          </div>
                                        )}
                                        <div className="flex gap-2">
                                          <span className="font-semibold text-orange-700 dark:text-orange-400 min-w-[65px]">Ders:</span>
                                          <span className="text-foreground">{getCategoryText(task.category)}</span>
                                        </div>
                                        {task.dueDate && (
                                          <div className="flex gap-2">
                                            <span className="font-semibold text-orange-700 dark:text-orange-400 min-w-[65px]">Tarih:</span>
                                            <span className="text-foreground">{new Date(task.dueDate).toLocaleDateString('tr-TR')}</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  );
                                })}
                                
                                {/* Soru günlüklerini göster */}
                                {(activityFilter === 'all' || activityFilter === 'questions') && activities.questionLogs.map((log: QuestionLog) => {
                                  const correct = Number(log.correct_count) || 0;
                                  const wrong = Number(log.wrong_count) || 0;
                                  const blank = Number(log.blank_count) || 0;
                                  const net = correct - (wrong * 0.25);
                                  const isExpanded = expandedQuestionLogs.has(log.id);
                                  
                                  return (
                                    <div key={log.id} className="flex flex-col gap-2 p-2 bg-blue-50 dark:bg-blue-950/10 rounded-lg">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center text-sm">
                                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                                          <span className="font-medium">Soru:</span>
                                          <span className="ml-2 text-muted-foreground">
                                            {[log.exam_type, log.subject].filter(Boolean).join(' ') || 'Soru Çözümü'}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs">
                                          <div className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-1 rounded-full font-semibold">
                                            ✓ {correct}
                                          </div>
                                          <div 
                                            className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-2 py-1 rounded-full cursor-pointer hover:bg-red-200 dark:hover:bg-red-800/30 transition-colors font-semibold"
                                            onClick={() => {
                                              setExpandedQuestionLogs(prev => {
                                                const newSet = new Set(prev);
                                                if (newSet.has(log.id)) {
                                                  newSet.delete(log.id);
                                                } else {
                                                  newSet.add(log.id);
                                                }
                                                return newSet;
                                              });
                                            }}
                                          >
                                            ✗ {wrong}
                                          </div>
                                          <div className="bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full font-semibold">
                                            ○ {blank}
                                          </div>
                                          <div className="bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full font-bold">
                                            Net: {net.toFixed(2)}
                                          </div>
                                        </div>
                                      </div>
                                      {isExpanded && log.wrong_topics && (typeof log.wrong_topics === 'string' ? JSON.parse(log.wrong_topics) : log.wrong_topics).length > 0 && (
                                        <div className="mt-1 pt-2 border-t border-blue-200 dark:border-blue-800 animate-in slide-in-from-top-2">
                                          <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">❌ Yanlış Konular:</div>
                                          <div className="flex flex-wrap gap-1">
                                            {(() => {
                                              try {
                                                const topics = typeof log.wrong_topics === 'string' ? JSON.parse(log.wrong_topics) : log.wrong_topics;
                                                return Array.isArray(topics) ? topics.map((topic: any, idx: number) => {
                                                  const topicName = typeof topic === 'string' ? topic : (topic.topic || topic.name || '');
                                                  return topicName ? (
                                                    <span key={idx} className="text-xs px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-full">
                                                      {topicName}
                                                    </span>
                                                  ) : null;
                                                }) : null;
                                              } catch (e) {
                                                return null;
                                              }
                                            })()}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                
                                {/* Sınav sonuçlarını göster */}
                                {(activityFilter === 'all' || activityFilter === 'exams') && activities.examResults.map((exam: ExamResult) => {
                                  const isExpanded = expandedExams.has(exam.id);
                                  // subjects_data'dan yanlış konuları ve toplam yanlışı hesapla
                                  let examSubjects: any[] = [];
                                  let totalWrong = 0;
                                  if (exam.subjects_data) {
                                    try {
                                      const subjectsData = JSON.parse(exam.subjects_data);
                                      examSubjects = Object.entries(subjectsData).map(([subject, data]: [string, any]) => ({
                                        subject,
                                        wrong_count: data.wrong || "0",
                                        wrong_topics_json: JSON.stringify(data.wrong_topics || [])
                                      }));
                                      totalWrong = (Object.values(subjectsData) as any[]).reduce((sum: number, data: any) => sum + (parseInt(data.wrong) || 0), 0);
                                    } catch (e) {
                                      console.error('Error parsing subjects_data:', e);
                                    }
                                  }
                                  
                                  return (
                                    <div key={exam.id} className="flex flex-col gap-2 p-2 bg-purple-50 dark:bg-purple-950/10 rounded-lg">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center text-sm">
                                          <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                                          <span className="font-medium">{exam.exam_scope === 'branch' ? 'Branş Denemesi:' : 'Genel Deneme:'}</span>
                                          <span className="ml-2 text-muted-foreground">{typeof (exam.display_name || exam.exam_name) === 'string' ? (exam.display_name || exam.exam_name) : 'Deneme'}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs">
                                          {totalWrong > 0 && (
                                            <div 
                                              className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-2 py-1 rounded-full cursor-pointer hover:bg-red-200 dark:hover:bg-red-800/30 transition-colors font-semibold"
                                              onClick={() => {
                                                setExpandedExams(prev => {
                                                  const newSet = new Set(prev);
                                                  if (newSet.has(exam.id)) {
                                                    newSet.delete(exam.id);
                                                  } else {
                                                    newSet.add(exam.id);
                                                  }
                                                  return newSet;
                                                });
                                              }}
                                            >
                                              ✗ {totalWrong}
                                            </div>
                                          )}
                                          <div className="text-xs text-purple-600 bg-purple-100 dark:bg-purple-900/20 px-2 py-1 rounded-full">
                                            {exam.exam_type === 'TYT' ? (
                                              `TYT: ${exam.tyt_net}`
                                            ) : exam.exam_type === 'AYT' ? (
                                              `AYT: ${exam.ayt_net}`
                                            ) : (
                                              `Net: ${parseFloat(exam.tyt_net) > 0 ? exam.tyt_net : exam.ayt_net}`
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      {isExpanded && (
                                        <div className="mt-1 pt-2 border-t border-purple-200 dark:border-purple-800 animate-in slide-in-from-top-2">
                                          <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">❌ Yanlış Konular:</div>
                                          <div className="flex flex-wrap gap-1">
                                            {examSubjects.map((subjectNet: any, idx: number) => {
                                              if (!subjectNet.wrong_topics_json) return null;
                                              try {
                                                const wrongTopics = JSON.parse(subjectNet.wrong_topics_json);
                                                if (!Array.isArray(wrongTopics) || wrongTopics.length === 0) return null;
                                                return wrongTopics.map((topic: any, topicIdx: number) => {
                                                  const topicName = typeof topic === 'string' ? topic : (topic.topic || topic.name || '');
                                                  return topicName ? (
                                                    <span key={`${idx}-${topicIdx}`} className="text-xs px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-full">
                                                      {topicName}
                                                    </span>
                                                  ) : null;
                                                });
                                              } catch (e) {
                                                return null;
                                              }
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      }
                    } else if (isToday) {
                      // Bugün - özel durum
                      if (activities.total === 0) {
                        return (
                          <div className="text-center py-8">
                            <div className="w-16 h-16 mx-auto mb-4 bg-muted/50 rounded-full flex items-center justify-center">
                              <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                            <p className="text-lg font-medium text-muted-foreground">
                              Bugün henüz hiçbir aktivite yapılmadı.
                            </p>
                          </div>
                        );
                      } else {
                        // Bugün için aktivite varsa normal göster
                        const taskProgress = activities.tasks.length;
                        const questionProgress = activities.questionLogs.reduce((sum: number, log: any) => {
                          return sum + (parseInt(log.correct_count) || 0) + (parseInt(log.wrong_count) || 0); // Boş dahil değil
                        }, 0);
                        const examProgress = activities.examResults.length;
                        
                        return (
                          <div className="space-y-4">
                            {/* Etkinlik Özeti Kartları */}
                            <div className="grid grid-cols-3 gap-3">
                              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{taskProgress}</div>
                                <div className="text-xs text-green-700 dark:text-green-300">Görev</div>
                              </div>
                              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{questionProgress}</div>
                                <div className="text-xs text-blue-700 dark:text-blue-300">Soru</div>
                              </div>
                              <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{examProgress}</div>
                                <div className="text-xs text-purple-700 dark:text-purple-300">Deneme</div>
                              </div>
                            </div>

                            {/* Toplam Aktivite İlerlemesi */}
                            <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-4 border border-primary/20">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-foreground">Günlük Performans</span>
                                <span className="text-lg font-bold text-primary">{activities.performanceTotal}</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-500" 
                                  style={{ width: `${Math.min((activities.performanceTotal / 10) * 100, 100)}%` }}
                                ></div>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {activities.performanceTotal >= 10 ? "Müthiş bir gün! 🎉" : activities.performanceTotal >= 5 ? "İyi gidiyor! 👍" : "Daha fazla çalışabiliriz! 💪"}
                              </div>
                            </div>
                            
                            {/* Bugünün Çalışma Saatleri */}
                            {activities.studyHours.length > 0 && (
                              <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg p-4 border border-cyan-300/30 dark:border-cyan-700/30">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                                    <span className="text-sm font-medium text-foreground">Bugün Çalışılan Saat</span>
                                  </div>
                                  <span className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                                    {(() => {
                                      const totalSeconds = activities.studyHours.reduce((sum: number, sh: any) => {
                                        const h = parseInt(sh.hours) || 0;
                                        const m = parseInt(sh.minutes) || 0;
                                        const s = parseInt(sh.seconds) || 0;
                                        return sum + (h * 3600 + m * 60 + s);
                                      }, 0);
                                      const hours = Math.floor(totalSeconds / 3600);
                                      const minutes = Math.floor((totalSeconds % 3600) / 60);
                                      return `${hours}s ${minutes}dk`;
                                    })()}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Detaylı Aktivite Listesi - same as past with activities */}
                            <div className="space-y-2">
                              <h5 className="font-semibold text-sm text-foreground mb-3 flex items-center">
                                <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
                                Aktivite Detayları
                              </h5>
                              
                              {/* Filter Buttons */}
                              <div className="flex gap-2 mb-3">
                                <button 
                                  onClick={() => setActivityFilter('all')}
                                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                                    activityFilter === 'all' 
                                      ? 'bg-primary text-white shadow-sm' 
                                      : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                                  }`}
                                  data-testid="button-filter-all"
                                >
                                  Tümü
                                </button>
                                <button 
                                  onClick={() => setActivityFilter('tasks')}
                                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                                    activityFilter === 'tasks' 
                                      ? 'bg-green-500 text-white shadow-sm' 
                                      : 'bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/30 text-green-700 dark:text-green-300'
                                  }`}
                                  data-testid="button-filter-tasks"
                                >
                                  Görev
                                </button>
                                <button 
                                  onClick={() => setActivityFilter('questions')}
                                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                                    activityFilter === 'questions' 
                                      ? 'bg-blue-500 text-white shadow-sm' 
                                      : 'bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                                  }`}
                                  data-testid="button-filter-questions"
                                >
                                  Soru
                                </button>
                                <button 
                                  onClick={() => setActivityFilter('exams')}
                                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                                    activityFilter === 'exams' 
                                      ? 'bg-purple-500 text-white shadow-sm' 
                                      : 'bg-purple-50 dark:bg-purple-950/20 hover:bg-purple-100 dark:hover:bg-purple-950/30 text-purple-700 dark:text-purple-300'
                                  }`}
                                  data-testid="button-filter-exams"
                                >
                                  Deneme
                                </button>
                              </div>
                              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                                {/* Tamamlanan görevleri göster */}
                                {(activityFilter === 'all' || activityFilter === 'tasks') && activities.tasks.map((task: Task) => {
                                  const isExpanded = expandedTasks.has(task.id);
                                  return (
                                  <div key={`${selectedDate}-completed-${task.id}`} className="flex flex-col gap-2 p-2 bg-green-50 dark:bg-green-950/10 rounded-lg">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center text-sm">
                                        <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                                        <span className="font-medium">Görev:</span>
                                        <span className="ml-2 text-muted-foreground">{task.title}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {task.deleted && (
                                          <div className="text-xs text-red-600 bg-red-100 dark:bg-red-900/20 px-2 py-1 rounded-full">
                                            🗑️ Silindi
                                          </div>
                                        )}
                                        {task.archived && (
                                          <div className="text-xs text-orange-600 bg-orange-100 dark:bg-orange-900/20 px-2 py-1 rounded-full">
                                            📦 Arşivlendi
                                          </div>
                                        )}
                                        {!task.deleted && !task.archived && (
                                          <div className="text-xs text-green-600 bg-green-100 dark:bg-green-900/20 px-2 py-1 rounded-full">
                                            ✓ Tamamlandı
                                          </div>
                                        )}
                                        <button
                                          onClick={() => {
                                            setExpandedTasks(prev => {
                                              const newSet = new Set(prev);
                                              if (newSet.has(task.id)) {
                                                newSet.delete(task.id);
                                              } else {
                                                newSet.add(task.id);
                                              }
                                              return newSet;
                                            });
                                          }}
                                          className="p-0.5 hover:bg-green-200 dark:hover:bg-green-900/30 rounded transition-colors"
                                          data-testid={`button-expand-completed-task-${task.id}`}
                                        >
                                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-green-700 dark:text-green-400" /> : <ChevronDown className="h-3.5 w-3.5 text-green-700 dark:text-green-400" />}
                                        </button>
                                      </div>
                                    </div>
                                    {isExpanded && (
                                      <div className="mt-1 pt-2 border-t border-green-200 dark:border-green-800 space-y-1.5 text-xs">
                                        {task.description && (
                                          <div className="flex gap-2">
                                            <span className="font-semibold text-green-700 dark:text-green-400 min-w-[65px]">Açıklama:</span>
                                            <span className="text-foreground">{task.description}</span>
                                          </div>
                                        )}
                                        <div className="flex gap-2">
                                          <span className="font-semibold text-green-700 dark:text-green-400 min-w-[65px]">Ders:</span>
                                          <span className="text-foreground">{getCategoryText(task.category)}</span>
                                        </div>
                                        {task.dueDate && (
                                          <div className="flex gap-2">
                                            <span className="font-semibold text-green-700 dark:text-green-400 min-w-[65px]">Tarih:</span>
                                            <span className="text-foreground">{new Date(task.dueDate).toLocaleDateString('tr-TR')}</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  );
                                })}
                                
                                {/* Planlanmış görevleri göster */}
                                {(activityFilter === 'all' || activityFilter === 'tasks') && activities.scheduledTasks && activities.scheduledTasks.map((task: Task) => {
                                  const isExpanded = expandedTasks.has(`scheduled-${task.id}`);
                                  return (
                                  <div key={`${selectedDate}-scheduled-${task.id}`} className="flex flex-col gap-2 p-2 bg-gray-50 dark:bg-gray-950/10 rounded-lg">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center text-sm">
                                        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full mr-3"></div>
                                        <span className="font-medium">Görev:</span>
                                        <span className="ml-2 text-muted-foreground">{task.title}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="text-xs text-gray-600 bg-gray-100 dark:bg-gray-900/20 px-2 py-1 rounded-full">
                                          📅 Planlandı
                                        </div>
                                        <button
                                          onClick={() => {
                                            setExpandedTasks(prev => {
                                              const newSet = new Set(prev);
                                              const key = `scheduled-${task.id}`;
                                              if (newSet.has(key)) {
                                                newSet.delete(key);
                                              } else {
                                                newSet.add(key);
                                              }
                                              return newSet;
                                            });
                                          }}
                                          className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-900/30 rounded transition-colors"
                                          data-testid={`button-expand-scheduled-task-${task.id}`}
                                        >
                                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-gray-700 dark:text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-700 dark:text-gray-400" />}
                                        </button>
                                      </div>
                                    </div>
                                    {isExpanded && (
                                      <div className="mt-1 pt-2 border-t border-gray-200 dark:border-gray-800 space-y-1.5 text-xs">
                                        {task.description && (
                                          <div className="flex gap-2">
                                            <span className="font-semibold text-gray-700 dark:text-gray-400 min-w-[65px]">Açıklama:</span>
                                            <span className="text-foreground">{task.description}</span>
                                          </div>
                                        )}
                                        <div className="flex gap-2">
                                          <span className="font-semibold text-gray-700 dark:text-gray-400 min-w-[65px]">Ders:</span>
                                          <span className="text-foreground">{getCategoryText(task.category)}</span>
                                        </div>
                                        {task.dueDate && (
                                          <div className="flex gap-2">
                                            <span className="font-semibold text-gray-700 dark:text-gray-400 min-w-[65px]">Tarih:</span>
                                            <span className="text-foreground">{new Date(task.dueDate).toLocaleDateString('tr-TR')}</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  );
                                })}
                                
                                {/* Arşivlenen görevleri göster */}
                                {(activityFilter === 'all' || activityFilter === 'tasks') && activities.archivedTasks && activities.archivedTasks.map((task: Task) => {
                                  const isExpanded = expandedTasks.has(`archived-${task.id}`);
                                  return (
                                  <div key={`${selectedDate}-archived-${task.id}`} className="flex flex-col gap-2 p-2 bg-orange-50 dark:bg-orange-950/10 rounded-lg border border-orange-200 dark:border-orange-800">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center text-sm">
                                        <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                                        <span className="font-medium">Görev:</span>
                                        <span className="ml-2 text-muted-foreground">{task.title}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className="text-xs text-orange-600 bg-orange-100 dark:bg-orange-900/20 px-2 py-1 rounded-full">
                                          📦 Arşivlendi
                                        </div>
                                        <button
                                          onClick={() => {
                                            setExpandedTasks(prev => {
                                              const newSet = new Set(prev);
                                              const key = `archived-${task.id}`;
                                              if (newSet.has(key)) {
                                                newSet.delete(key);
                                              } else {
                                                newSet.add(key);
                                              }
                                              return newSet;
                                            });
                                          }}
                                          className="p-0.5 hover:bg-orange-200 dark:hover:bg-orange-900/30 rounded transition-colors"
                                          data-testid={`button-expand-archived-task-${task.id}`}
                                        >
                                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-orange-700 dark:text-orange-400" /> : <ChevronDown className="h-3.5 w-3.5 text-orange-700 dark:text-orange-400" />}
                                        </button>
                                      </div>
                                    </div>
                                    {isExpanded && (
                                      <div className="mt-1 pt-2 border-t border-orange-200 dark:border-orange-800 space-y-1.5 text-xs">
                                        {task.description && (
                                          <div className="flex gap-2">
                                            <span className="font-semibold text-orange-700 dark:text-orange-400 min-w-[65px]">Açıklama:</span>
                                            <span className="text-foreground">{task.description}</span>
                                          </div>
                                        )}
                                        <div className="flex gap-2">
                                          <span className="font-semibold text-orange-700 dark:text-orange-400 min-w-[65px]">Ders:</span>
                                          <span className="text-foreground">{getCategoryText(task.category)}</span>
                                        </div>
                                        {task.dueDate && (
                                          <div className="flex gap-2">
                                            <span className="font-semibold text-orange-700 dark:text-orange-400 min-w-[65px]">Tarih:</span>
                                            <span className="text-foreground">{new Date(task.dueDate).toLocaleDateString('tr-TR')}</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  );
                                })}
                                
                                {/* Soru günlüklerini göster */}
                                {(activityFilter === 'all' || activityFilter === 'questions') && activities.questionLogs.map((log: QuestionLog) => {
                                  const correct = Number(log.correct_count) || 0;
                                  const wrong = Number(log.wrong_count) || 0;
                                  const blank = Number(log.blank_count) || 0;
                                  const net = correct - (wrong * 0.25);
                                  const isExpanded = expandedQuestionLogs.has(log.id);
                                  
                                  return (
                                    <div key={log.id} className="flex flex-col gap-2 p-2 bg-blue-50 dark:bg-blue-950/10 rounded-lg">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center text-sm">
                                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                                          <span className="font-medium">Soru:</span>
                                          <span className="ml-2 text-muted-foreground">
                                            {[log.exam_type, log.subject].filter(Boolean).join(' ') || 'Soru Çözümü'}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs">
                                          <div className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-1 rounded-full font-semibold">
                                            ✓ {correct}
                                          </div>
                                          <div 
                                            className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-2 py-1 rounded-full cursor-pointer hover:bg-red-200 dark:hover:bg-red-800/30 transition-colors font-semibold"
                                            onClick={() => {
                                              setExpandedQuestionLogs(prev => {
                                                const newSet = new Set(prev);
                                                if (newSet.has(log.id)) {
                                                  newSet.delete(log.id);
                                                } else {
                                                  newSet.add(log.id);
                                                }
                                                return newSet;
                                              });
                                            }}
                                          >
                                            ✗ {wrong}
                                          </div>
                                          <div className="bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full font-semibold">
                                            ○ {blank}
                                          </div>
                                          <div className="bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full font-bold">
                                            Net: {net.toFixed(2)}
                                          </div>
                                        </div>
                                      </div>
                                      {isExpanded && log.wrong_topics && (typeof log.wrong_topics === 'string' ? JSON.parse(log.wrong_topics) : log.wrong_topics).length > 0 && (
                                        <div className="mt-1 pt-2 border-t border-blue-200 dark:border-blue-800 animate-in slide-in-from-top-2">
                                          <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">❌ Yanlış Konular:</div>
                                          <div className="flex flex-wrap gap-1">
                                            {(() => {
                                              try {
                                                const topics = typeof log.wrong_topics === 'string' ? JSON.parse(log.wrong_topics) : log.wrong_topics;
                                                return Array.isArray(topics) ? topics.map((topic: any, idx: number) => {
                                                  const topicName = typeof topic === 'string' ? topic : (topic.topic || topic.name || '');
                                                  return topicName ? (
                                                    <span key={idx} className="text-xs px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-full">
                                                      {topicName}
                                                    </span>
                                                  ) : null;
                                                }) : null;
                                              } catch (e) {
                                                return null;
                                              }
                                            })()}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                
                                {/* Sınav sonuçlarını göster */}
                                {(activityFilter === 'all' || activityFilter === 'exams') && activities.examResults.map((exam: ExamResult) => {
                                  const isExpanded = expandedExams.has(exam.id);
                                  // subjects_data'dan yanlış konuları ve toplam yanlışı hesapla
                                  let examSubjects: any[] = [];
                                  let totalWrong = 0;
                                  if (exam.subjects_data) {
                                    try {
                                      const subjectsData = JSON.parse(exam.subjects_data);
                                      examSubjects = Object.entries(subjectsData).map(([subject, data]: [string, any]) => ({
                                        subject,
                                        wrong_count: data.wrong || "0",
                                        wrong_topics_json: JSON.stringify(data.wrong_topics || [])
                                      }));
                                      totalWrong = (Object.values(subjectsData) as any[]).reduce((sum: number, data: any) => sum + (parseInt(data.wrong) || 0), 0);
                                    } catch (e) {
                                      console.error('Error parsing subjects_data:', e);
                                    }
                                  }
                                  
                                  return (
                                    <div key={exam.id} className="flex flex-col gap-2 p-2 bg-purple-50 dark:bg-purple-950/10 rounded-lg">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center text-sm">
                                          <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                                          <span className="font-medium">{exam.exam_scope === 'branch' ? 'Branş Denemesi:' : 'Genel Deneme:'}</span>
                                          <span className="ml-2 text-muted-foreground">{typeof (exam.display_name || exam.exam_name) === 'string' ? (exam.display_name || exam.exam_name) : 'Deneme'}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs">
                                          {totalWrong > 0 && (
                                            <div 
                                              className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-2 py-1 rounded-full cursor-pointer hover:bg-red-200 dark:hover:bg-red-800/30 transition-colors font-semibold"
                                              onClick={() => {
                                                setExpandedExams(prev => {
                                                  const newSet = new Set(prev);
                                                  if (newSet.has(exam.id)) {
                                                    newSet.delete(exam.id);
                                                  } else {
                                                    newSet.add(exam.id);
                                                  }
                                                  return newSet;
                                                });
                                              }}
                                            >
                                              ✗ {totalWrong}
                                            </div>
                                          )}
                                          <div className="text-xs text-purple-600 bg-purple-100 dark:bg-purple-900/20 px-2 py-1 rounded-full">
                                            {exam.exam_type === 'TYT' ? (
                                              `TYT: ${exam.tyt_net}`
                                            ) : exam.exam_type === 'AYT' ? (
                                              `AYT: ${exam.ayt_net}`
                                            ) : (
                                              `Net: ${parseFloat(exam.tyt_net) > 0 ? exam.tyt_net : exam.ayt_net}`
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      {isExpanded && (
                                        <div className="mt-1 pt-2 border-t border-purple-200 dark:border-purple-800 animate-in slide-in-from-top-2">
                                          <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">❌ Yanlış Konular:</div>
                                          <div className="flex flex-wrap gap-1">
                                            {examSubjects.map((subjectNet: any, idx: number) => {
                                              if (!subjectNet.wrong_topics_json) return null;
                                              try {
                                                const wrongTopics = JSON.parse(subjectNet.wrong_topics_json);
                                                if (!Array.isArray(wrongTopics) || wrongTopics.length === 0) return null;
                                                return wrongTopics.map((topic: any, topicIdx: number) => {
                                                  const topicName = typeof topic === 'string' ? topic : (topic.topic || topic.name || '');
                                                  return topicName ? (
                                                    <span key={`${idx}-${topicIdx}`} className="text-xs px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-full">
                                                      {topicName}
                                                    </span>
                                                  ) : null;
                                                });
                                              } catch (e) {
                                                return null;
                                              }
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      }
                    } else if (isFuture) {
                      // Geliştirilmiş Gelecek Tarih Planlaması (SADECE gelecek günler için)
                      return (
                        <div className="space-y-4">
                          {/* Planlama Özeti */}
                          <div className="bg-gradient-to-r from-accent/5 to-accent/10 rounded-lg p-4 border border-accent/20">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-foreground">Planlanan Aktiviteler</span>
                              <span className="text-lg font-bold text-accent">{calendarData?.tasksCount || 0}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {(calendarData?.tasksCount || 0) === 0 
                                ? "Henüz bugüne özel görev planlanmamış" 
                                : `${calendarData?.tasksCount || 0} görev bugüne planlandı`}
                            </div>
                          </div>

                          {/* Planlanan Görevler */}
                          {calendarData?.tasks && calendarData.tasks.length > 0 && (
                            <div className="space-y-2">
                              <h5 className="font-semibold text-sm text-foreground mb-3 flex items-center">
                                <div className="w-2 h-2 bg-accent rounded-full mr-2"></div>
                                Planlanan Görevler
                              </h5>
                              {calendarData.tasks.slice(0, showAllTasks ? calendarData.tasks.length : 3).map((task: Task) => (
                                <div key={task.id} className="flex items-center justify-between p-3 bg-accent/5 rounded-lg border border-accent/10">
                                  <div className="flex items-center text-sm">
                                    <div className="w-2 h-2 bg-accent/60 rounded-full mr-3"></div>
                                    <span className="font-medium text-foreground">{task.title}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <div className="text-xs text-accent bg-accent/10 px-2 py-1 rounded-full">
                                      {task.priority === 'high' ? '🔴 Yüksek' : task.priority === 'medium' ? '🟠 Orta' : '🟢 Düşük'}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {getCategoryText(task.category)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {calendarData.tasks.length > 3 && (
                                <div className="text-center">
                                  <button 
                                    onClick={() => setShowAllTasks(!showAllTasks)}
                                    className="text-xs font-medium text-accent hover:text-accent/80 bg-accent/10 hover:bg-accent/20 px-4 py-2 rounded-lg transition-colors duration-200"
                                    data-testid="button-show-more-tasks"
                                  >
                                    {showAllTasks ? 'Daha az göster' : `${calendarData.tasks.length - 3} görev daha göster`}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                        </div>
                      );
                    }
                  })()
                  }
                </div>
              </div>
            )}
          </div>

          {/* Bugünün Görevleri Kolonu - 2 sütun alır */}
          <div className="lg:col-span-2 h-full">
            <TodaysTasksWidget />
          </div>
        </div>

        {/* Orta Satır - Hava Durumu Widget'ı (Tam Genişlik) */}
        <div className="mb-8">
          <EnhancedWeatherWidget />
        </div>

        {/* Geri Sayım Bölümü - Aşağı Taşındı */}
        <div className="mb-8">
          <CountdownWidget className="p-5 md:p-6" />
        </div>
      </main>

      {/* Rapor Gönderme Modalı */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              📊 Haftalık Aktivite Raporu
            </DialogTitle>
            <DialogDescription>
              Son 7 gün içinde yapılan tüm aktiviteler (bugün dahil)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* İstatistikler */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="text-sm text-muted-foreground mb-1">Toplam Aktivite (Son 7 Gün)</div>
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {(() => {
                    const today = new Date();
                    const last7Days = new Date(today);
                    last7Days.setDate(today.getDate() - 6); // Son 7 gün = bugün dahil 6 gün geriye
                    const last7DaysStr = last7Days.toISOString().split('T')[0];
                    const todayStr = today.toISOString().split('T')[0];
                    
                    const weekTasks = tasks.filter(t => {
                      if (!t.completedAt) return false;
                      const completedDate = new Date(t.completedAt).toISOString().split('T')[0];
                      return completedDate >= last7DaysStr && completedDate <= todayStr;
                    });
                    const weekQuestions = questionLogs.filter(log => log.study_date >= last7DaysStr && log.study_date <= todayStr);
                    const weekExams = examResults.filter(exam => exam.exam_date >= last7DaysStr && exam.exam_date <= todayStr);
                    
                    return weekTasks.length + weekQuestions.length + weekExams.length;
                  })()}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-sm text-muted-foreground mb-1">Tamamlanan Görevler (Son 7 Gün)</div>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {(() => {
                    const today = new Date();
                    const last7Days = new Date(today);
                    last7Days.setDate(today.getDate() - 6); // Son 7 gün = bugün dahil 6 gün geriye
                    const last7DaysStr = last7Days.toISOString().split('T')[0];
                    const todayStr = today.toISOString().split('T')[0];
                    
                    const weekTasks = tasks.filter(t => {
                      if (!t.completedAt) return false;
                      const completedDate = new Date(t.completedAt).toISOString().split('T')[0];
                      return completedDate >= last7DaysStr && completedDate <= todayStr;
                    });
                    
                    return weekTasks.filter(t => t.completed).length;
                  })()} / {(() => {
                    const today = new Date();
                    const last7Days = new Date(today);
                    last7Days.setDate(today.getDate() - 6); // Son 7 gün = bugün dahil 6 gün geriye
                    const last7DaysStr = last7Days.toISOString().split('T')[0];
                    const todayStr = today.toISOString().split('T')[0];
                    
                    return tasks.filter(t => {
                      if (!t.completedAt) return false;
                      const completedDate = new Date(t.completedAt).toISOString().split('T')[0];
                      return completedDate >= last7DaysStr && completedDate <= todayStr;
                    }).length;
                  })()}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-sm text-muted-foreground mb-1">Çözülen Soru Sayısı (Son 7 Gün)</div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {(() => {
                    const today = new Date();
                    const last7Days = new Date(today);
                    last7Days.setDate(today.getDate() - 6); // Son 7 gün = bugün dahil 6 gün geriye
                    const last7DaysStr = last7Days.toISOString().split('T')[0];
                    const todayStr = today.toISOString().split('T')[0];
                    
                    // Soru kayıtlarından sorular
                    const questionCount = questionLogs
                      .filter(log => log.study_date >= last7DaysStr && log.study_date <= todayStr)
                      .reduce((sum, log) => sum + (Number(log.correct_count) || 0) + (Number(log.wrong_count) || 0), 0);
                    
                    // Denemelerden gelen sorular - subjects_data'dan direkt al
                    const weekExams = examResults.filter(exam => exam.exam_date >= last7DaysStr && exam.exam_date <= todayStr);
                    let examQuestionCount = 0;
                    weekExams.forEach(exam => {
                      if (!exam.subjects_data) return;
                      try {
                        const subjectsData = JSON.parse(exam.subjects_data);
                        Object.values(subjectsData).forEach((subject: any) => {
                          examQuestionCount += (Number(subject.correct) || 0) + (Number(subject.wrong) || 0);
                        });
                      } catch (e) {
                        console.error('Error parsing subjects_data:', e);
                      }
                    });
                    
                    return questionCount + examQuestionCount;
                  })()}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="text-sm text-muted-foreground mb-1">Toplam Denemeler (Son 7 Gün)</div>
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {(() => {
                    const today = new Date();
                    const last7Days = new Date(today);
                    last7Days.setDate(today.getDate() - 6); // Son 7 gün = bugün dahil 6 gün geriye
                    const last7DaysStr = last7Days.toISOString().split('T')[0];
                    const todayStr = today.toISOString().split('T')[0];
                    
                    return examResults.filter(exam => exam.exam_date >= last7DaysStr && exam.exam_date <= todayStr).length;
                  })()}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/30 dark:to-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800 col-span-2">
                <div className="text-sm text-muted-foreground mb-1">Toplam Çalışma Saati (Son 7 Gün)</div>
                <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                  {(() => {
                    const today = new Date();
                    const last7Days = new Date(today);
                    last7Days.setDate(today.getDate() - 6); // Son 7 gün = bugün dahil 6 gün geriye
                    const last7DaysStr = last7Days.toISOString().split('T')[0];
                    const todayStr = today.toISOString().split('T')[0];
                    
                    return studyHours
                      .filter(sh => sh.study_date >= last7DaysStr && sh.study_date <= todayStr)
                      .reduce((sum, sh) => sum + (Number(sh.hours) || 0), 0);
                  })()} saat
                </div>
              </div>
            </div>
            
            {/* Email Bilgisi */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
              <Label className="text-sm font-medium mb-2 block">Rapor Gönderilecek E-Posta Adresi</Label>
              <Input 
                type="email" 
                value="Belirlediğiniz e-posta adresine rapor gönderilecektir"
                disabled
                className="bg-muted/30 text-muted-foreground blur-[2px] cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-2">
                📧 .env dosyasında tanımlı EMAIL_FROM adresine detaylı rapor gönderilecek
              </p>
            </div>
            
            {/* Bilgilendirme */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
              <p className="text-sm font-medium text-center">
                💡 Detaylı Analiz Raporu İçin Gönder Butonuna Tıklayın
              </p>
            </div>
          </div>
          
          <div className="flex gap-2 justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setShowReportModal(false)}
              disabled={sendReportMutation.isPending}
            >
              İptal
            </Button>
            <Button
              onClick={() => sendReportMutation.mutate({ isAutomatic: false })}
              disabled={sendReportMutation.isPending}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
            >
              {sendReportMutation.isPending ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Gönderiliyor...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Gönder
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* copyright beroooş */}
      <footer className="bg-muted/30 border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()}-2026 QuantPraxus. Tüm hakları saklıdır.
          </div>
        </div>
      </footer>
    </div>
  );
}

