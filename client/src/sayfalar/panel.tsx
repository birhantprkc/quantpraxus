import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/bilesenler/baslik";
import { TrendingUp, BarChart3, Target, Brain, BookOpen, Plus, CalendarDays, X, FlaskConical, Trash2, AlertTriangle, Sparkles, Award, Clock, Zap, Edit, Search, Tag, BookX, Lightbulb, Eye, Calendar, FileText, Archive, CheckCircle, Circle, Lock, Mail } from "lucide-react";
import { Task, Goal, QuestionLog, InsertQuestionLog, ExamResult, InsertExamResult, SUBJECT_LIMITS } from "@shared/sema";
import { DashboardSummaryCards } from "@/bilesenler/panel-ozet-kartlar";
import { AdvancedCharts } from "@/bilesenler/gelismis-grafikler";
import { QuestionAnalysisCharts } from "@/bilesenler/soru-analiz-grafikleri";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/bilesenler/arayuz/dialog";
import { Button } from "@/bilesenler/arayuz/button";
import { Input } from "@/bilesenler/arayuz/input";
import { Textarea } from "@/bilesenler/arayuz/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/bilesenler/arayuz/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/bilesenler/arayuz/card";
import { Badge } from "@/bilesenler/arayuz/badge";
import { Progress } from "@/bilesenler/arayuz/progress";
import { Separator } from "@/bilesenler/arayuz/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/bilesenler/arayuz/popover";
import { Calendar as CalendarComponent } from "@/bilesenler/arayuz/calendar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/bilesenler/arayuz/alert-dialog";
import { apiRequest, sorguIstemcisi } from "@/kutuphane/sorguIstemcisi";
import { useToast } from "@/hooks/use-toast";
import { tytTopics, aytTopics } from "@/data/yks-konular";

// Türkiye saatine göre bugünün tarihini döndüren yardımcı fonksiyon (UTC sorununu çöz)
const getTurkeyDate = (): string => {
  const now = new Date();
  // Türkiye saatinde YYYY-MM-DD formatını al
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

// Başlık harflerinin dönüştürülmesi için yardımcı işlev
const toTitleCase = (str: string): string => {
  return str.trim()
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Deneme adlarındaki paragraf ve problemler kelimelerini düzelten fonksiyon
const formatExamName = (examName: string): string => {
  if (!examName) return examName;
  
  return examName
    .replace(/\bparagraf\b/gi, 'Paragraf')
    .replace(/\bproblemler\b/gi, 'Problemler');
};

// Sayı inputlarından önde gelen sıfırları temizleyen yardımcı fonksiyon
const cleanNumberInput = (value: string): string => {
  // Boş string veya sadece "0" ise olduğu gibi bırak
  if (value === '' || value === '0') return value;
  // Önde gelen sıfırları temizle (örn: "015" -> "15")
  return value.replace(/^0+/, '') || '0';
};

// Konu isimlerinden TYT/AYT ve ders başlıklarını kaldıran yardımcı fonksiyon
const normalizeTopic = (topic: any): string => {
  // topic'in string olduğundan emin ol
  if (typeof topic !== 'string') {
    if (topic && typeof topic === 'object') {
      topic = topic.topic || topic.name || String(topic);
    } else {
      topic = String(topic || '');
    }
  }
  // "TYT Paragraf - " veya "TYT Problemler - " durumlarında başlığı koru
  const paragrafMatch = topic.match(/^TYT\s+Paragraf\s*-\s*(.+)$/);
  if (paragrafMatch) {
    return `TYT Paragraf - ${paragrafMatch[1].trim()}`;
  }
  const problemlerMatch = topic.match(/^TYT\s+Problemler\s*-\s*(.+)$/);
  if (problemlerMatch) {
    return `TYT Problemler - ${problemlerMatch[1].trim()}`;
  }
  // Diğer "TYT Türkçe - " veya "AYT Fizik - " gibi desenleri konu isimlerinden kaldırır
  return topic.replace(/^(TYT|AYT)\s+[^-]+\s*-\s*/, '').trim();
};

// Ders adına göre örnek konular döndüren yardımcı fonksiyon
const getTopicExamples = (examType: string, subject: string): string => {
  const allTopics = examType === 'TYT' ? tytTopics : aytTopics;
  const subjectData = allTopics.find(s => s.name === subject || s.name.includes(subject));
  
  if (subjectData && subjectData.topics.length > 0) {
    const exampleTopics = subjectData.topics.slice(0, 3).map(t => t.topic).join(', ');
    return `Örnek: ${exampleTopics}...`;
  }
  
  return "Konu adını yazın ve Enter'a basın...";
};

// Deneme modalı için ders adına göre örnek konular döndüren yardımcı fonksiyon
const getTopicExamplesForExam = (examType: string, subjectKey: string): string => {
  // Paragraf için özel konular
  if (subjectKey === 'Paragraf' || subjectKey === 'paragraf') {
    return `Örnek: Ana Fikir, Yardımcı Fikir, Anlam Bilgisi, Söz Sanatları...`;
  }
  
  // Problemler için özel konular
  if (subjectKey === 'Problemler' || subjectKey === 'problemler') {
    return `Örnek: Yüzde Problemleri, Yaş Problemleri, Hareket Problemleri, Oran-Orantı...`;
  }
  
  const subjectNameMap: {[key: string]: string} = {
    'turkce': 'Türkçe',
    'matematik': 'Matematik',
    'fizik': 'Fizik',
    'kimya': 'Kimya',
    'biyoloji': 'Biyoloji',
    'sosyal': 'Sosyal Bilimler',
    'fen': 'Fen Bilimleri',
    'geometri': 'Geometri'
  };
  
  const subjectName = subjectNameMap[subjectKey] || subjectKey;
  const allTopics = examType === 'TYT' ? tytTopics : aytTopics;
  const subjectData = allTopics.find(s => {
    if (examType === 'TYT') {
      return s.name === `TYT ${subjectName}` || s.name.includes(subjectName);
    } else {
      return s.name === `AYT ${subjectName}` || s.name.includes(subjectName);
    }
  });
  
  if (subjectData && subjectData.topics.length > 0) {
    const exampleTopics = subjectData.topics.slice(0, 4).map(t => t.topic).join(', ');
    return `Örnek: ${exampleTopics}...`;
  }
  
  return `Örnek konular: konu1, konu2, konu3...`;
};

interface DailySummary {
  date: string;
  tasksCompleted: number;
  totalTasks: number;
  moods: any[];
  productivity: number;
}

interface TopicStats {
  topic: string;
  wrongMentions: number;
  totalSessions: number;
  mentionFrequency: number;
}

interface PriorityTopic {
  topic: string;
  priority: number;
  lastSeen: string;
  improvementNeeded: boolean;
}

export default function Dashboard() {
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [editingQuestionLog, setEditingQuestionLog] = useState<QuestionLog | null>(null);
  const [showDeleteAllQuestionsDialog, setShowDeleteAllQuestionsDialog] = useState(false);
  const [showDeleteAllExamsDialog, setShowDeleteAllExamsDialog] = useState(false);
  const [showArchivedExamsModal, setShowArchivedExamsModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ 
    exam_type: "TYT" as "TYT" | "AYT", 
    subject: "Türkçe", 
    correct_count: "", 
    wrong_count: "", 
    blank_count: "", 
    study_date: getTurkeyDate(),
    wrong_topics: [] as Array<{
      topic: string;
      difficulty: 'kolay' | 'orta' | 'zor';
      category: 'kavram' | 'hesaplama' | 'analiz' | 'dikkatsizlik';
      notes?: string;
    }>,
    time_spent_minutes: ""
  });
  const [wrongTopicInput, setWrongTopicInput] = useState("");
  const [selectedTopicDifficulty, setSelectedTopicDifficulty] = useState<'kolay' | 'orta' | 'zor'>('kolay');
  const [selectedTopicCategory, setSelectedTopicCategory] = useState<'kavram' | 'hesaplama' | 'analiz' | 'dikkatsizlik'>('kavram');
  const [showExamDialog, setShowExamDialog] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamResult | null>(null);
  const [newExamResult, setNewExamResult] = useState({ 
    exam_name: "", 
    display_name: "",
    exam_date: getTurkeyDate(), 
    exam_type: "TYT" as "TYT" | "AYT",
    examScope: "full" as "full" | "branch",
    selectedSubject: "turkce" as string,
    wrongTopicsText: "",
    time_spent_minutes: "",
    subjects: {
      turkce: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
      matematik: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
      sosyal: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
      fen: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
      fizik: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
      kimya: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
      biyoloji: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
      geometri: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
      paragraf: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
      problemler: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] }
    }
  });
  const [currentWrongTopics, setCurrentWrongTopics] = useState<{[key: string]: string}>({});
  const [selectedHeatmapDay, setSelectedHeatmapDay] = useState<{
    date: string;
    count: number;
    questionCount: number;
    taskCount: number;
    intensity: number;
    dayActivities: {
      questions: any[];
      tasks: any[];
      exams: any[];
      studyHours?: any[];
    };
  } | null>(null);
  const [expandedExams, setExpandedExams] = useState<Set<string>>(new Set());

  // Çalışma Saati Modal Durumu
  const [showStudyHoursModal, setShowStudyHoursModal] = useState(false);
  const [newStudyHours, setNewStudyHours] = useState({
    study_date: getTurkeyDate(),
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Arşivlenen Veriler Modal Durumu
  const [showArchivedDataModal, setShowArchivedDataModal] = useState(false);
  const [archivedTab, setArchivedTab] = useState<'questions' | 'exams' | 'tasks' | 'studyHours'>('questions');
  const [nextArchiveCountdown, setNextArchiveCountdown] = useState<string>("");
  const [showDeleteAllDataDialog, setShowDeleteAllDataDialog] = useState(false);
  const [showDeleteAllDataConfirmDialog, setShowDeleteAllDataConfirmDialog] = useState(false);
  
  // Heatmap otomatik güncelleme trigger - her yeni günde yenilensin
  const [currentDayKey, setCurrentDayKey] = useState<string>(() => {
    const today = new Date();
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(today);
  });
  
  // Deneme Geçmişi Modal Durumu
  const [showExamHistoryModal, setShowExamHistoryModal] = useState(false);
  const [examHistoryFilter, setExamHistoryFilter] = useState<'all' | 'tyt-general' | 'ayt-general' | 'tyt-branch' | 'ayt-branch'>('all');
  
  // Soru Geçmişi Modal Durumu
  const [showQuestionHistoryModal, setShowQuestionHistoryModal] = useState(false);
  const [questionHistoryFilter, setQuestionHistoryFilter] = useState<'all' | 'tyt' | 'ayt'>('all');
  
  // Tamamlanan Hatalı Konular Modal Durumu
  const [showCompletedTopicsModal, setShowCompletedTopicsModal] = useState(false);
  const [completedTopicsRefreshKey, setCompletedTopicsRefreshKey] = useState(0);
  
  // Rapor Gönderme Modal ve Lock Durumu
  const [reportLockEnabled, setReportLockEnabled] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  
  // Ay sonu geri sayım hesaplama - gerçek zamanlı
  const [monthEndCountdown, setMonthEndCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const diff = lastDayOfMonth.getTime() - now.getTime();
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setMonthEndCountdown({ hours, minutes, seconds });
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Heatmap için gün değişimi kontrolü - her dakika kontrol et
  useEffect(() => {
    const checkDayChange = () => {
      const today = new Date();
      const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(today);
      
      if (todayKey !== currentDayKey) {
        console.log('🗓️ Yeni gün tespit edildi:', todayKey, '(önceki:', currentDayKey, ')');
        setCurrentDayKey(todayKey);
      }
    };
    
    // İlk yüklemede kontrol et
    checkDayChange();
    
    // Her 60 saniyede bir kontrol et
    const interval = setInterval(checkDayChange, 60000);
    
    return () => clearInterval(interval);
  }, [currentDayKey]);

  // URL parametresi kontrolü - Rapor modalını aç
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('openReport') === 'true') {
      setShowReportModal(true);
      // URL'den parametreyi temizle
      window.history.replaceState({}, '', '/panel');
    }
  }, []);
  
  // Tüm Verileri Temizle 3. Modal ve Geri Sayım -  - 03:03:03
  const [showDeleteAllDataCountdownDialog, setShowDeleteAllDataCountdownDialog] = useState(false);
  const [deleteCountdown, setDeleteCountdown] = useState(300); // 5 dakika = 300 saniye
  const [isDeleteButtonUnlocked, setIsDeleteButtonUnlocked] = useState(false);

  // Arşivlenen verileri getir (modal için)
  const { data: archivedQuestionsModal = [] } = useQuery<QuestionLog[]>({
    queryKey: ["/api/question-logs/archived"],
    enabled: showArchivedDataModal,
  });

  const { data: archivedExamsModal = [] } = useQuery<ExamResult[]>({
    queryKey: ["/api/exam-results/archived"],
    enabled: showArchivedDataModal,
  });

  // Arşivlenen deneme sonuçlarını ayrı modal için getir
  const { data: archivedExams = [] } = useQuery<ExamResult[]>({
    queryKey: ["/api/exam-results/archived"],
    enabled: showArchivedExamsModal,
  });

  const { data: archivedTasksModal = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks/archived"],
    enabled: showArchivedDataModal,
  });

  const { data: archivedStudyHoursModal = [] } = useQuery<any[]>({
    queryKey: ["/api/study-hours/archived"],
    enabled: showArchivedDataModal,
  });

  // Tüm mutasyonları sil
  const deleteAllQuestionLogsMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/question-logs/all"),
    onSuccess: () => {
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/question-logs"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/topics/stats"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/topics/priority"] });
      toast({ title: "🗑️ Tüm soru kayıtları silindi", description: "Tüm soru çözüm kayıtlarınız başarıyla silindi." });
    },
    onError: () => {
      toast({ title: "❌ Hata", description: "Soru kayıtları silinemedi.", variant: "destructive" });
    },
  });

  const deleteAllExamResultsMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/exam-results/all"),
    onSuccess: () => {
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/exam-results"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/exam-subject-nets"] });
      toast({ title: "🗑️ Tüm denemeler silindi", description: "Tüm deneme sınav sonuçlarınız başarıyla silindi." });
    },
    onError: () => {
      toast({ title: "❌ Hata", description: "Denemeler silinemedi.", variant: "destructive" });
    },
  });

  const deleteExamResultMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/exam-results/${id}`),
    onSuccess: () => {
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/exam-results"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/exam-results/archived"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/exam-subject-nets"] });
      toast({ title: "🗑️ Deneme silindi", description: "Deneme sınav sonucu başarıyla silindi.", duration: 3000 });
    },
    onError: () => {
      toast({ title: "❌ Hata", description: "Deneme silinemedi.", variant: "destructive", duration: 3000 });
    },
  });

  const archiveExamResultMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PUT", `/api/exam-results/${id}`, { archived: true, archivedAt: new Date().toISOString() }),
    onSuccess: () => {
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/exam-results"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/exam-results/archived"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/exam-subject-nets"] });
      toast({ title: "📦 Arşivlendi", description: "Deneme arşive taşındı. Raporlarda görünmeye devam edecek.", duration: 3000 });
    },
    onError: () => {
      toast({ title: "❌ Hata", description: "Deneme arşivlenemedi.", variant: "destructive", duration: 3000 });
    },
  });

  const unarchiveExamResultMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PUT", `/api/exam-results/${id}`, { archived: false, archivedAt: null }),
    onSuccess: () => {
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/exam-results"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/exam-results/archived"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/exam-subject-nets"] });
      toast({ title: "📤 Arşivden Çıkarıldı", description: "Deneme aktif denemelere geri taşındı.", duration: 3000 });
    },
    onError: () => {
      toast({ title: "❌ Hata", description: "Deneme arşivden çıkarılamadı.", variant: "destructive", duration: 3000 });
    },
  });

  const sendReportMutation = useMutation({
    mutationFn: () => {
      // "✅ Tamamlanan Hatalı Konular Geçmişi" modalından veri al
      // Bu modal 4 kaynak içeriyor: Genel Deneme, Branş Deneme, Soru Hataları, FromMissing
      const completedGeneral = JSON.parse(localStorage.getItem('completedGeneralExamErrors') || '[]');
      const completedBranch = JSON.parse(localStorage.getItem('completedBranchExamErrors') || '[]');
      const completedQuestion = JSON.parse(localStorage.getItem('completedQuestionErrors') || '[]');
      const completedFromMissing = JSON.parse(localStorage.getItem('completedTopicsFromMissing') || '[]');
      
      const completedTopicsHistory = [
        ...completedGeneral.map((item: any) => ({ ...item, source: 'general_exam' })),
        ...completedBranch.map((item: any) => ({ ...item, source: 'branch_exam' })),
        ...completedQuestion.map((item: any) => ({ ...item, source: 'question' })),
        ...completedFromMissing.map((item: any) => ({ ...item, source: 'missing_topics' })),
      ].sort((a: any, b: any) => new Date(b.completedAt || b.date).getTime() - new Date(a.completedAt || a.date).getTime())
       .slice(0, 15);
      
      // "✅ Tamamlanan Hatalı Sorular Geçmişi" modalından veri al
      // Bu modal 3 kaynak içeriyor: Genel Deneme, Branş Deneme, Soru Hataları (FromMissing YOK)
      const completedGeneralErrors = JSON.parse(localStorage.getItem('completedGeneralExamErrors') || '[]');
      const completedBranchErrors = JSON.parse(localStorage.getItem('completedBranchExamErrors') || '[]');
      const completedQuestionErrorsData = JSON.parse(localStorage.getItem('completedQuestionErrors') || '[]');
      
      const completedQuestionsHistory = [
        ...completedGeneralErrors.map((item: any) => ({ ...item, source: 'general_exam' })),
        ...completedBranchErrors.map((item: any) => ({ ...item, source: 'branch_exam' })),
        ...completedQuestionErrorsData.map((item: any) => ({ ...item, source: 'question' })),
      ].sort((a: any, b: any) => new Date(b.completedAt || b.date).getTime() - new Date(a.completedAt || a.date).getTime())
       .slice(0, 15);
      
      // Bugünün tarihini al ve günlük soru çözüm analizi verilerini hesapla (hem sorulardan hem denemelerden)
      const todayDate = getTurkeyDate();
      const dayQuestionLogs = allQuestionLogs.filter(log => log.study_date === todayDate);
      const dayExamResults = allExamResults.filter(exam => exam.exam_date === todayDate);
      
      // Soru kayıtlarından topla
      const questionTotalQuestions = dayQuestionLogs.reduce((sum, log) => sum + (parseInt(log.correct_count) || 0) + (parseInt(log.wrong_count) || 0), 0);
      const questionTotalCorrect = dayQuestionLogs.reduce((sum, log) => sum + (parseInt(log.correct_count) || 0), 0);
      const questionTotalWrong = dayQuestionLogs.reduce((sum, log) => sum + (parseInt(log.wrong_count) || 0), 0);
      const questionTotalEmpty = dayQuestionLogs.reduce((sum, log) => sum + (parseInt(log.blank_count) || 0), 0);
      
      // Deneme sonuçlarından topla
      let examTotalCorrect = 0;
      let examTotalWrong = 0;
      let examTotalEmpty = 0;
      dayExamResults.forEach(exam => {
        const examNets = examSubjectNets.filter((n: any) => n.exam_id === exam.id);
        examNets.forEach((netData: any) => {
          examTotalCorrect += parseInt(netData.correct_count || "0");
          examTotalWrong += parseInt(netData.wrong_count || "0");
          examTotalEmpty += parseInt(netData.blank_count || netData.empty_count || "0");
        });
      });
      
      // Her iki kaynağı birleştir
      const dayTotalQuestions = questionTotalQuestions + examTotalCorrect + examTotalWrong;
      const dayTotalCorrect = questionTotalCorrect + examTotalCorrect;
      const dayTotalWrong = questionTotalWrong + examTotalWrong;
      const dayTotalEmpty = questionTotalEmpty + examTotalEmpty;
      
      return apiRequest("POST", "/api/reports/send", {
        isManualRequest: true,
        dayTotalQuestions,
        dayTotalCorrect,
        dayTotalWrong,
        dayTotalEmpty,
        completedTopicsHistory,
        completedQuestionsHistory,
        completedTopicsCount: completedGeneral.length + completedBranch.length + completedQuestion.length + completedFromMissing.length,
        completedQuestionsCount: completedGeneralErrors.length + completedBranchErrors.length + completedQuestionErrorsData.length,
      });
    },
    onSuccess: () => {
      toast({ title: "📧 Rapor Gönderildi", description: "Aylık ilerleme raporunuz .env dosyasındaki email adresine gönderildi.", duration: 5000 });
      setShowReportModal(false);
    },
    onError: () => {
      toast({ title: "❌ Hata", description: "Rapor gönderilemedi. .env dosyasındaki EMAIL_USER ve EMAIL_PASS ayarlarını kontrol edin.", variant: "destructive", duration: 5000 });
    },
  });

  const archiveAllExamResultsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/exam-results");
      const results = await response.json() as ExamResult[];
      const archivePromises = results.map((exam: ExamResult) => 
        apiRequest("PUT", `/api/exam-results/${exam.id}`, { archived: true, archivedAt: new Date().toISOString() })
      );
      await Promise.all(archivePromises);
    },
    onSuccess: () => {
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/exam-results"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/exam-results/archived"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/exam-subject-nets"] });
      toast({ title: "📦 Tümü Arşivlendi", description: "Tüm deneme sonuçları arşive taşındı. Raporlarda görünmeye devam edecek.", duration: 3000 });
    },
    onError: () => {
      toast({ title: "❌ Hata", description: "Denemeler arşivlenemedi.", variant: "destructive", duration: 3000 });
    },
  });

  // TÜM VERİLERİ VE CACHE'LERİ TEMİZLE
  const deleteAllDataMutation = useMutation({
    mutationFn: async () => {
      // Tüm verileri sil - hataları görmezden gel (bazı endpoint'ler olmayabilir)
      const deletePromises = [
        apiRequest("DELETE", "/api/question-logs/all").catch(() => null),
        apiRequest("DELETE", "/api/exam-results/all").catch(() => null),
        apiRequest("DELETE", "/api/study-hours/all").catch(() => null),
      ];
      
      await Promise.allSettled(deletePromises);
      
      //  - 03:03:03 - TÜM DEPOLAMALARI TEMİZLE
      // localStorage'daki TÜM verileri temizle
      localStorage.clear();
      
      // sessionStorage'daki TÜM verileri temizle
      sessionStorage.clear();
      
      // IndexedDB'deki TÜM verileri temizle
      if ('indexedDB' in window) {
        try {
          const databases = await window.indexedDB.databases();
          for (const db of databases) {
            if (db.name) {
              window.indexedDB.deleteDatabase(db.name);
            }
          }
        } catch (e) {
          console.log('IndexedDB temizlenemedi:', e);
        }
      }
      
      // Service Worker cache'lerini temizle
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        } catch (e) {
          console.log('Cache temizlenemedi:', e);
        }
      }
      
      return { success: true };
    },
    onSuccess: () => {
      // Tüm query cache'lerini temizle
      sorguIstemcisi.clear();
      
      // Tüm queryKey'leri invalidate et
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/tasks"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/question-logs"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/exam-results"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/study-hours"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/exam-subject-nets"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/topics/stats"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/topics/priority"] });
      
      toast({ 
        title: "🗑️ Tüm veriler temizlendi", 
        description: "Tüm verileriniz ve cache'ler başarıyla silindi. Uygulama yenileniyor...",
        duration: 3000
      });
      
      // 2 saniye sonra sayfayı yenile
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    },
    onError: () => {
      toast({ title: "❌ Hata", description: "Veriler temizlenemedi.", variant: "destructive" });
    },
  });

  // Arşivden silme mutations
  const deleteArchivedQuestionMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/question-logs/${id}`),
    onSuccess: () => {
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/question-logs/archived"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/question-logs"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/topics/stats"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/topics/priority"] });
      toast({ title: "🗑️ Soru silindi", description: "Arşivlenen soru başarıyla silindi." });
    },
  });

  const deleteArchivedExamMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/exam-results/${id}`),
    onSuccess: () => {
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/exam-results/archived"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/exam-results"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/exam-subject-nets"] });
      toast({ title: "🗑️ Deneme silindi", description: "Arşivlenen deneme başarıyla silindi." });
    },
  });

  const deleteArchivedTaskMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/tasks/${id}`),
    onSuccess: () => {
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/tasks/archived"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "🗑️ Görev silindi", description: "Arşivlenen görev başarıyla silindi." });
    },
  });

  const { toast } = useToast();

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    staleTime: 30000,
    gcTime: 300000,
  });

  const { data: archivedTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks/archived"],
    staleTime: 60000,
    gcTime: 600000,
  });

  const { data: dailySummary = [] } = useQuery<DailySummary[]>({
    queryKey: ["/api/summary/daily"],
    staleTime: 60000,
    gcTime: 600000,
  });
  
  const { data: questionLogs = [] } = useQuery<QuestionLog[]>({
    queryKey: ["/api/question-logs"],
    staleTime: 30000,
    gcTime: 300000,
  });

  const { data: archivedQuestionLogs = [] } = useQuery<QuestionLog[]>({
    queryKey: ["/api/question-logs/archived"],
    staleTime: 60000,
    gcTime: 600000,
  });
  
  const { data: examResults = [] } = useQuery<ExamResult[]>({
    queryKey: ["/api/exam-results"],
    staleTime: 30000,
    gcTime: 300000,
  });

  const { data: archivedExamResults = [] } = useQuery<ExamResult[]>({
    queryKey: ["/api/exam-results/archived"],
    staleTime: 60000,
    gcTime: 600000,
  });

  const { data: topicStats = [] } = useQuery<TopicStats[]>({
    queryKey: ["/api/topics/stats"],
    staleTime: 30000,
    gcTime: 300000,
  });

  const { data: priorityTopics = [] } = useQuery<PriorityTopic[]>({
    queryKey: ["/api/topics/priority"],
    staleTime: 30000,
    gcTime: 300000,
  });

  const { data: studyHours = [] } = useQuery<any[]>({
    queryKey: ["/api/study-hours"],
    staleTime: 30000,
    gcTime: 300000,
  });

  const { data: archivedStudyHours = [] } = useQuery<any[]>({
    queryKey: ["/api/study-hours/archived"],
    staleTime: 60000,
    gcTime: 600000,
  });

  const { data: examSubjectNets = [] } = useQuery<any[]>({
    queryKey: ["/api/exam-subject-nets"],
    staleTime: 30000,
    gcTime: 300000,
  });

  // Heatmap/takvim ve raporlar için TÜM verileri birleştir (arşivli + aktif)
  const allTasks = useMemo(() => [...tasks, ...archivedTasks], [tasks, archivedTasks]);
  const allQuestionLogs = useMemo(() => [...questionLogs, ...archivedQuestionLogs], [questionLogs, archivedQuestionLogs]);
  const allStudyHours = useMemo(() => [...studyHours, ...archivedStudyHours], [studyHours, archivedStudyHours]);
  const allExamResults = useMemo(() => [...examResults, ...archivedExamResults], [examResults, archivedExamResults]);
  
  // Geri Sayım Yönetimi - Tüm Verileri Sil
  useEffect(() => {
    if (!showDeleteAllDataCountdownDialog) return;
    
    const timer = setInterval(() => {
      setDeleteCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Geri sayım bitti, verileri sil
          deleteAllDataMutation.mutate();
          setShowDeleteAllDataCountdownDialog(false);
          return 300;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [showDeleteAllDataCountdownDialog]);

  // localStorage değişikliklerini dinle (Tamamlanan Hatalı Konular için)
  useEffect(() => {
    const handleLocalStorageUpdate = () => {
      setCompletedTopicsRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('localStorageUpdate', handleLocalStorageUpdate);
    
    return () => {
      window.removeEventListener('localStorageUpdate', handleLocalStorageUpdate);
    };
  }, []);

  // Eski çalışma saatlerini SİLME - ar şivleme sistemi kullan
  // useEffect kaldırıldı - veriler artık otomatik arşivleniyor, silinmiyor

  // Gereksiz yeniden render işlemlerini önle
  // ARŞİVLENEN VERİLERİ DAHİL ET - Arşivlenen veriler de performans özetinde gösterilecek
  const memoizedStats = useMemo(() => {
    const totalQuestions = allQuestionLogs.reduce((sum, log) => {
      return sum + (parseInt(log.correct_count) || 0) + (parseInt(log.wrong_count) || 0) + (parseInt(log.blank_count) || 0);
    }, 0);

    const totalCorrect = allQuestionLogs.reduce((sum, log) => {
      return sum + (parseInt(log.correct_count) || 0);
    }, 0);

    const totalWrong = allQuestionLogs.reduce((sum, log) => {
      return sum + (parseInt(log.wrong_count) || 0);
    }, 0);

    const averageAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
    
    return {
      totalQuestions,
      totalCorrect,
      totalWrong,
      averageAccuracy
    };
  }, [allQuestionLogs]);

  const memoizedExamStats = useMemo(() => {
    const totalExams = allExamResults.length;
    const tytExams = allExamResults.filter(exam => exam.tyt_net && parseFloat(exam.tyt_net) > 0).length;
    const aytExams = allExamResults.filter(exam => exam.ayt_net && parseFloat(exam.ayt_net) > 0).length;
    
    const lastTytNet = allExamResults
      .filter(exam => exam.tyt_net && parseFloat(exam.tyt_net) > 0)
      .sort((a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime())[0]?.tyt_net || "0";
    
    const lastAytNet = allExamResults
      .filter(exam => exam.ayt_net && parseFloat(exam.ayt_net) > 0)
      .sort((a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime())[0]?.ayt_net || "0";

    return {
      totalExams,
      tytExams,
      aytExams,
      lastTytNet: parseFloat(lastTytNet),
      lastAytNet: parseFloat(lastAytNet)
    };
  }, [allExamResults]);

  const createQuestionLogMutation = useMutation({
    mutationFn: (data: InsertQuestionLog) => apiRequest("POST", "/api/question-logs", data),
    onSuccess: () => {
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/question-logs"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/topics/stats"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/topics/priority"] });
      toast({ title: "✅ Soru kaydı eklendi", description: "Soru çözüm kaydınız eklendi ve analiz güncellendi!" });
      setShowQuestionDialog(false);
      setNewQuestion({ 
        exam_type: "TYT", 
        subject: "Türkçe", 
        correct_count: "", 
        wrong_count: "", 
        blank_count: "", 
        study_date: getTurkeyDate(),
        wrong_topics: [],
        time_spent_minutes: ""
      });
      setWrongTopicInput("");
    },
    onError: () => {
      toast({ title: "❌ Hata", description: "Soru kaydı eklenemedi.", variant: "destructive" });
    },
  });

  const deleteQuestionLogMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/question-logs/${id}`),
    onSuccess: () => {
      // Tüm ilgili query'leri invalidate et
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/question-logs"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/question-logs/archived"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/topics/stats"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/topics/priority"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/calendar"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/summary/daily"] });
      toast({ title: "🗑️ Soru kaydı silindi", description: "Soru çözüm kaydınız başarıyla silindi." });
    },
    onError: (error: any) => {
      console.error("Delete error:", error);
      toast({ title: "❌ Hata", description: error?.message || "Soru kaydı silinemedi.", variant: "destructive" });
    },
  });

  const archiveQuestionLogMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PUT", `/api/question-logs/${id}`, { archived: true, archivedAt: new Date().toISOString() }),
    onSuccess: () => {
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/question-logs"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/question-logs/archived"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/topics/stats"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/topics/priority"] });
      toast({ title: "📦 Arşivlendi", description: "Soru kaydı arşive taşındı. Raporlarda görünmeye devam edecek.", duration: 3000 });
    },
    onError: () => {
      toast({ title: "❌ Hata", description: "Soru kaydı arşivlenemedi.", variant: "destructive", duration: 3000 });
    },
  });

  const updateQuestionLogMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertQuestionLog> }) => 
      apiRequest("PUT", `/api/question-logs/${id}`, data),
    onSuccess: () => {
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/question-logs"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/topics/stats"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/topics/priority"] });
      setEditingQuestionLog(null);
      setShowQuestionDialog(false);
      toast({ title: "📝 Soru kaydı güncellendi", description: "Soru çözüm kaydınız başarıyla güncellendi." });
    },
    onError: () => {
      toast({ title: "❌ Hata", description: "Soru kaydı güncellenemedi.", variant: "destructive" });
    },
  });

  const updateExamResultMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertExamResult> }) => 
      apiRequest("PUT", `/api/exam-results/${id}`, data),
    onSuccess: () => {
      setEditingExam(null);
      setShowExamDialog(false);
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/exam-results"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/exam-subject-nets"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/topics/stats"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/topics/priority"] });
      toast({ title: "📝 Deneme güncellendi", description: "Deneme sınav sonucunuz başarıyla güncellendi." });
      setCurrentWrongTopics({});
      setNewExamResult({ 
        exam_name: "", 
        display_name: "",
        exam_date: getTurkeyDate(), 
        exam_type: "TYT" as "TYT" | "AYT",
        examScope: "full" as "full" | "branch",
        selectedSubject: "turkce" as string,
        wrongTopicsText: "",
        time_spent_minutes: "",
        subjects: {
          turkce: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
          matematik: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
          sosyal: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
          fen: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
          fizik: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
          kimya: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
          biyoloji: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
          geometri: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
          paragraf: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
          problemler: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] }
        }
      });
    },
    onError: () => {
      toast({ title: "❌ Hata", description: "Deneme güncellenemedi.", variant: "destructive" });
    },
  });
  
  const createExamResultMutation = useMutation({
    mutationFn: (data: InsertExamResult) => apiRequest("POST", "/api/exam-results", data),
    onSuccess: () => {
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/exam-results"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/exam-subject-nets"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/question-logs"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/topics/stats"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/topics/priority"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/calendar"] });
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/summary/daily"] });
      toast({ title: "Deneme sonucu başarıyla kaydedildi", description: "Deneme sınav sonucunuz kaydedildi." });
      setShowExamDialog(false);
      setEditingExam(null);
      setNewExamResult({ 
        exam_name: "", 
        display_name: "",
        exam_date: getTurkeyDate(), 
        exam_type: "TYT" as "TYT" | "AYT",
        examScope: "full" as "full" | "branch",
        selectedSubject: "turkce" as string,
        wrongTopicsText: "",
        time_spent_minutes: "",
        subjects: {
          turkce: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
          matematik: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
          sosyal: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
          fen: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
          fizik: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
          kimya: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
          biyoloji: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
          geometri: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
          paragraf: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
          problemler: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] }
        }
      });
      setCurrentWrongTopics({}); // Tüm yanlış konu giriş alanlarını temizle
    },
    onError: () => {
      toast({ title: "Deneme sonucu eklenemedi", description: "Deneme sonucu eklenemedi.", variant: "destructive" });
    },
  });

  const createStudyHoursMutation = useMutation({
    mutationFn: (data: any) => {
      // Aynı gün için zaten kayıt var mı kontrol et
      const existingEntry = studyHours.find((sh: any) => sh.study_date === data.study_date);
      if (existingEntry) {
        throw new Error("Bu tarih için zaten çalışma saati kaydı var!");
      }
      return apiRequest("POST", "/api/study-hours", data);
    },
    onSuccess: () => {
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/study-hours"] });
      toast({ title: "⏱️ Çalışma saati eklendi", description: "Çalışma süreniz başarıyla kaydedildi!" });
      setShowStudyHoursModal(false);
      setNewStudyHours({
        study_date: getTurkeyDate(),
        hours: 0,
        minutes: 0,
        seconds: 0,
      });
    },
    onError: (error: any) => {
      const message = error?.message || "Çalışma saati eklenemedi.";
      toast({ title: "❌ Hata", description: message, variant: "destructive" });
    },
  });

  const deleteStudyHoursMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/study-hours/${id}`),
    onSuccess: () => {
      sorguIstemcisi.invalidateQueries({ queryKey: ["/api/study-hours"] });
      toast({ title: "🗑️ Çalışma saati silindi", description: "Çalışma süreniz başarıyla silindi." });
    },
    onError: () => {
      toast({ title: "Hata", description: "Çalışma saati silinemedi.", variant: "destructive" });
    },
  });

  // Gereksiz yeniden render işlemlerini önlemek için useCallback
  const handleQuestionLogSubmit = useCallback(() => {
    const questionData: InsertQuestionLog = {
      exam_type: newQuestion.exam_type,
      subject: newQuestion.subject,
      correct_count: newQuestion.correct_count,
      wrong_count: newQuestion.wrong_count,
      blank_count: newQuestion.blank_count,
      study_date: newQuestion.study_date,
      wrong_topics_json: JSON.stringify(newQuestion.wrong_topics),
      time_spent_minutes: newQuestion.time_spent_minutes ? parseInt(newQuestion.time_spent_minutes) : null
    };

    if (editingQuestionLog) {
      updateQuestionLogMutation.mutate({ id: editingQuestionLog.id, data: questionData });
    } else {
      createQuestionLogMutation.mutate(questionData);
    }
  }, [newQuestion, editingQuestionLog, updateQuestionLogMutation, createQuestionLogMutation]);

  const handleResetQuestionForm = useCallback(() => {
    setNewQuestion({ 
      exam_type: "TYT", 
      subject: "Türkçe", 
      correct_count: "", 
      wrong_count: "", 
      blank_count: "", 
      study_date: getTurkeyDate(),
      wrong_topics: [],
      time_spent_minutes: ""
    });
    setWrongTopicInput("");
    setEditingQuestionLog(null);
    setShowQuestionDialog(false);
  }, []);

  const handleAddWrongTopic = useCallback(() => {
    if (wrongTopicInput.trim()) {
      const titleCaseTopic = toTitleCase(wrongTopicInput.trim());
      
      // Frekans tracking - localStorage'da say
      try {
        const topicFrequencies = JSON.parse(localStorage.getItem('topicErrorFrequencies') || '{}');
        const topicKey = titleCaseTopic.toLowerCase();
        topicFrequencies[topicKey] = (topicFrequencies[topicKey] || 0) + 1;
        localStorage.setItem('topicErrorFrequencies', JSON.stringify(topicFrequencies));
        
        // 2 veya daha fazla kez yapılmışsa uyarı göster
        if (topicFrequencies[topicKey] >= 2) {
          toast({ 
            title: "📊 Frekans Bilgisi", 
            description: `Bu hata ${topicFrequencies[topicKey]} kez yapılmıştır.`, 
            duration: 4000 
          });
        }
      } catch (error) {
        console.error('Topic frequency tracking error:', error);
      }
      
      const topic = {
        topic: titleCaseTopic,
        difficulty: selectedTopicDifficulty,
        category: selectedTopicCategory,
        notes: ""
      };
      setNewQuestion(prev => ({
        ...prev,
        wrong_topics: [...prev.wrong_topics, topic]
      }));
      setWrongTopicInput("");
    }
  }, [wrongTopicInput, selectedTopicDifficulty, selectedTopicCategory]);

  const handleRemoveWrongTopic = useCallback((index: number) => {
    setNewQuestion(prev => ({
      ...prev,
      wrong_topics: prev.wrong_topics.filter((_, i) => i !== index)
    }));
  }, []);

  const handleOpenQuestionDialog = useCallback(() => {
    // Diyalog penceresini açarken tarihi her zaman bugüne güncelle
    setNewQuestion(prev => ({
      ...prev,
      study_date: getTurkeyDate() // Bugünün tarihine ayarla
    }));
    setShowQuestionDialog(true);
  }, []);

  const handleExamResultSubmit = useCallback(() => {
    // Soru limitleri - SUBJECT_LIMITS'den alınacak
    const getSubjectLimit = (examType: string, subject: string): number => {
      // konu isimlerini eşle
      const subjectMap: Record<string, string> = {
        'turkce': 'Türkçe',
        'sosyal': 'Sosyal Bilimler',
        'matematik': 'Matematik',
                                'geometri': 'Geometri',
        'fen': 'Fen Bilimleri',
        'fizik': 'Fizik',
        'kimya': 'Kimya',
        'biyoloji': 'Biyoloji'
      };
      const mappedSubject = subjectMap[subject] || subject;
      return SUBJECT_LIMITS[examType]?.[mappedSubject] || 100;
    };
    
    // Soru sayısı kontrolü yap
    const tytSubjects = ['turkce', 'sosyal', 'matematik', 'geometri', 'fen'];
    const aytSubjects = ['matematik', 'geometri', 'fizik', 'kimya', 'biyoloji'];
    
    // Branş denemesi için sadece seçilen dersi kontrol et, Genel deneme için tüm dersleri kontrol et
    const subjectsToCheck = newExamResult.examScope === "branch" 
      ? [newExamResult.selectedSubject] 
      : (newExamResult.exam_type === 'TYT' ? tytSubjects : aytSubjects);
    
    for (const subjectKey of subjectsToCheck) {
      const subject = newExamResult.subjects[subjectKey];
      if (subject) {
        const correct = parseInt(subject.correct) || 0;
        const wrong = parseInt(subject.wrong) || 0;
        const blank = parseInt(subject.blank) || 0;
        const total = correct + wrong + blank;
        
        // Branş denemesi için exam_type'a göre limit belirle
        const examTypeForLimit = newExamResult.exam_type;
        const limit = getSubjectLimit(examTypeForLimit, subjectKey);
        
        if (total > limit) {
          toast({ 
            title: "❌ Hata", 
            description: `${examTypeForLimit} ${subjectKey.charAt(0).toUpperCase() + subjectKey.slice(1)} için toplam soru sayısı ${limit}'i geçemez! (Girilen: ${total})`,
            variant: "destructive" 
          });
          return;
        }
      }
    }
    
    // Branş denemesiyse, wrongTopicsText'i subjects array'ine ekle
    let updatedSubjects = { ...newExamResult.subjects };
    if (newExamResult.examScope === "branch" && newExamResult.wrongTopicsText && newExamResult.wrongTopicsText.trim()) {
      const topics = newExamResult.wrongTopicsText
        .split(',')
        .map(t => toTitleCase(t.trim()))
        .filter(t => t.length > 0);
      const uniqueTopics = [...new Set(topics)];
      
      updatedSubjects = {
        ...updatedSubjects,
        [newExamResult.selectedSubject]: {
          ...updatedSubjects[newExamResult.selectedSubject],
          wrong_topics: uniqueTopics
        }
      };
    }
    
    // TYT ve AYT Net Hesapla - SADECE seçilen sınav tipi için hesaplama yap
    let tytNet = 0;
    let aytNet = 0;
    
    // Branş denemesi için sadece seçilen dersin netini hesapla, Genel deneme için tüm dersleri hesapla
    if (newExamResult.exam_type === 'TYT') {
      const subjectsToCalculate = newExamResult.examScope === "branch" 
        ? [newExamResult.selectedSubject] 
        : tytSubjects;
      
      subjectsToCalculate.forEach(subjectKey => {
        const subject = updatedSubjects[subjectKey];
        if (subject) {
          const correct = parseInt(subject.correct) || 0;
          const wrong = parseInt(subject.wrong) || 0;
          tytNet += correct - (wrong * 0.25);
        }
      });
    }
    
    // AYT seçildiyse sadece AYT netini hesapla
    if (newExamResult.exam_type === 'AYT') {
      const subjectsToCalculate = newExamResult.examScope === "branch" 
        ? [newExamResult.selectedSubject] 
        : aytSubjects;
      
      subjectsToCalculate.forEach(subjectKey => {
        const subject = updatedSubjects[subjectKey];
        if (subject) {
          const correct = parseInt(subject.correct) || 0;
          const wrong = parseInt(subject.wrong) || 0;
          aytNet += correct - (wrong * 0.25);
        }
      });
    }
    
    createExamResultMutation.mutate({
      exam_name: newExamResult.exam_name,
      exam_date: newExamResult.exam_date,
      exam_type: newExamResult.exam_type, // Kritik: TYT/AYT ayrımı için exam_type'ı dahil et
      exam_scope: newExamResult.examScope, // Kritik: Genel/Branş ayrımı için exam_scope'u dahil et
      selected_subject: newExamResult.examScope === 'branch' ? newExamResult.selectedSubject : null,
      tyt_net: Math.max(0, tytNet).toFixed(2), // Negatif olmamasını sağla ve 2 ondalık basamak
      ayt_net: Math.max(0, aytNet).toFixed(2), // Negatif olmamasını sağla ve 2 ondalık basamak
      subjects_data: JSON.stringify(updatedSubjects),
      time_spent_minutes: parseInt(newExamResult.time_spent_minutes) || null
    });
  }, [newExamResult, createExamResultMutation]);

  // Subject options for Yeni Soru Kaydı (NO Fen Bilimleri)
  const getQuestionSubjectOptions = (examType: string) => {
    if (examType === "TYT") {
      return ["Türkçe", "Paragraf", "Sosyal Bilimler", "Matematik", "Problemler", "Geometri", "Fizik", "Kimya", "Biyoloji"];
    } else {
      return ["Matematik", "Geometri", "Fizik", "Kimya", "Biyoloji"];
    }
  };

  // Subject options for Branş Denemesi (WITH Fen Bilimleri, grouped for TYT)
  const getBranchExamSubjectOptions = (examType: string) => {
    if (examType === "TYT") {
      return ["Türkçe", "Paragraf", "Sosyal Bilimler", "Matematik", "Problemler", "Geometri", "Fizik", "Kimya", "Biyoloji", "Fen Bilimleri"];
    } else {
      return ["Matematik", "Geometri", "Fizik", "Kimya", "Biyoloji", "Fen Bilimleri"];
    }
  };

  // Heatmap verilerini oluştur - 1 Ocak'tan bugüne kadar tam yıl 
  const generateYearlyHeatmapData = () => {
    const data = [];
    // Türkiye saati için bugünün tarihini al
    const today = new Date();
    const turkeyTimeString = today.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' });
    const turkeyDate = new Date(turkeyTimeString);
    const currentYear = turkeyDate.getFullYear();
    const currentMonth = turkeyDate.getMonth();
    const currentDay = turkeyDate.getDate();
    
    // Türkiye saatinde YYYY-MM-DD formatını al (UTC kaymadan)
    const todayDateStr = new Intl.DateTimeFormat('en-CA', { 
      timeZone: 'Europe/Istanbul' 
    }).format(today);
    
    // Tüm verileri tarih bazında grupla
    const questionsByDate = new Map<string, number>();
    const tasksByDate = new Map<string, number>();
    const studyHoursByDate = new Map<string, number>();
    const generalExamsByDate = new Map<string, number>();
    const branchExamsByDate = new Map<string, number>();
    const deletedQuestionsByDate = new Map<string, number>();
    const deletedTasksByDate = new Map<string, number>();
    const deletedStudyHoursByDate = new Map<string, number>();
    const archivedTasksByDate = new Map<string, number>();
    const archivedQuestionsByDate = new Map<string, number>();
    const archivedStudyHoursByDate = new Map<string, number>();
    const archivedGeneralExamsByDate = new Map<string, number>();
    const archivedBranchExamsByDate = new Map<string, number>();
    
    allQuestionLogs.forEach(log => {
      const questionCount = (parseInt(log.correct_count) || 0) + (parseInt(log.wrong_count) || 0) + (parseInt(log.blank_count || '0') || 0);
      questionsByDate.set(log.study_date, (questionsByDate.get(log.study_date) || 0) + questionCount);
      if (log.deleted) {
        deletedQuestionsByDate.set(log.study_date, (deletedQuestionsByDate.get(log.study_date) || 0) + questionCount);
      }
      if (log.archived) {
        archivedQuestionsByDate.set(log.study_date, (archivedQuestionsByDate.get(log.study_date) || 0) + questionCount);
      }
    });
    
    allExamResults.forEach(exam => {
      if (exam.exam_scope === 'full') {
        generalExamsByDate.set(exam.exam_date, (generalExamsByDate.get(exam.exam_date) || 0) + 1);
        if (exam.archived) {
          archivedGeneralExamsByDate.set(exam.exam_date, (archivedGeneralExamsByDate.get(exam.exam_date) || 0) + 1);
        }
      } else if (exam.exam_scope === 'branch') {
        branchExamsByDate.set(exam.exam_date, (branchExamsByDate.get(exam.exam_date) || 0) + 1);
        if (exam.archived) {
          archivedBranchExamsByDate.set(exam.exam_date, (archivedBranchExamsByDate.get(exam.exam_date) || 0) + 1);
        }
      }
    });
    
    allTasks.forEach(task => {
      // Görevleri şu öncelikle göster:
      // 1. Arşivlenmişse -> archivedAt tarihinde
      // 2. Silinmişse -> deletedAt tarihinde (varsa)
      // 3. Tamamlanmışsa -> completedAt tarihinde (SADECE TAMAMLANMIŞSA!)
      // 4. Değilse -> dueDate veya createdAt'te
      //BUNDAN SONRASINI DİKKATLİ KODLA! masaüstündeki loglara kaydetmeyi unutma !
      let taskDate: string | null = null;
      
      if (task.archived && task.archivedAt) {
        taskDate = dateToTurkeyString(task.archivedAt);
      } else if (task.deleted && task.deletedAt) {
        taskDate = dateToTurkeyString(task.deletedAt);
      } else if (task.completed && task.completedAt) {
        taskDate = dateToTurkeyString(task.completedAt);
      } else if (task.dueDate) {
        taskDate = task.dueDate.split('T')[0];
      } else if (task.createdAt) {
        taskDate = dateToTurkeyString(task.createdAt);
      }
      
      if (taskDate) {
        tasksByDate.set(taskDate, (tasksByDate.get(taskDate) || 0) + 1);
        if (task.deleted) {
          deletedTasksByDate.set(taskDate, (deletedTasksByDate.get(taskDate) || 0) + 1);
        }
        if (task.archived) {
          archivedTasksByDate.set(taskDate, (archivedTasksByDate.get(taskDate) || 0) + 1);
        }
      }
    });
    
    allStudyHours.forEach(sh => {
      studyHoursByDate.set(sh.study_date, (studyHoursByDate.get(sh.study_date) || 0) + 1);
      if (sh.deleted) {
        deletedStudyHoursByDate.set(sh.study_date, (deletedStudyHoursByDate.get(sh.study_date) || 0) + 1);
      }
      if (sh.archived) {
        archivedStudyHoursByDate.set(sh.study_date, (archivedStudyHoursByDate.get(sh.study_date) || 0) + 1);
      }
    });
    
    // 1 Ocak'tan bugüne kadar tüm günleri oluştur (bugün DAHİL)
    const startDate = new Date(currentYear, 0, 1);
    
    // Tüm günleri oluştur - bugünkü tarihe ulaşana kadar
    for (let i = 0; ; i++) {
      const currentDate = new Date(currentYear, 0, 1 + i, 12, 0, 0); // Öğlen saati = timezone safe
      const dateStr = dateToTurkeyString(currentDate); // YYYY-MM-DD format (Türkiye saati)
      
      // Bugünü geçtiysek dur bakalım kardeş
      if (dateStr > todayDateStr) break;
      
      // O günün verilerini al
      const questionCount = questionsByDate.get(dateStr) || 0;
      const taskCount = tasksByDate.get(dateStr) || 0;
      const studyHoursCount = studyHoursByDate.get(dateStr) || 0;
      const generalExamCount = generalExamsByDate.get(dateStr) || 0;
      const branchExamCount = branchExamsByDate.get(dateStr) || 0;
      const deletedQuestionCount = deletedQuestionsByDate.get(dateStr) || 0;
      const deletedTaskCount = deletedTasksByDate.get(dateStr) || 0;
      const deletedStudyHoursCount = deletedStudyHoursByDate.get(dateStr) || 0;
      const archivedTaskCount = archivedTasksByDate.get(dateStr) || 0;
      const archivedQuestionCount = archivedQuestionsByDate.get(dateStr) || 0;
      const archivedStudyHoursCount = archivedStudyHoursByDate.get(dateStr) || 0;
      const archivedGeneralExamCount = archivedGeneralExamsByDate.get(dateStr) || 0;
      const archivedBranchExamCount = archivedBranchExamsByDate.get(dateStr) || 0;
      
      // Soru sayısını 50'lik gruplara böl (1-50: 1 aktivite, 50-100: 2 aktivite, vb.)
      const normalizedQuestionCount = questionCount > 0 ? Math.ceil(questionCount / 50) : 0;
      
      // Toplam aktivite sayısını hesapla
      const totalCount = normalizedQuestionCount + taskCount + studyHoursCount + generalExamCount + branchExamCount;
      
      // Aktivite sayısına göre intensity hesapla (basamaklı sistem)
      // 1-2 aktivite: çok açık renk, 10+ aktivite: daha koyu renkler
      let studyIntensity = 0;
      if (totalCount === 0) {
        studyIntensity = 0;
      } else if (totalCount < 3) {
        studyIntensity = 0.15; // Çok açık
      } else if (totalCount < 6) {
        studyIntensity = 0.35; // Açık
      } else if (totalCount < 10) {
        studyIntensity = 0.55; // Orta
      } else if (totalCount < 15) {
        studyIntensity = 0.75; // Koyu
      } else if (totalCount < 25) {
        studyIntensity = 0.90; // Çok koyu
      } else {
        studyIntensity = 1; // En koyu (25+ aktivite)
      }
      
      // Bugün olup olmadığını kontrol et
      const isToday = dateStr === todayDateStr;
      
      data.push({
        date: dateStr,
        day: currentDate.getDate(),
        month: currentDate.getMonth(),
        year: currentDate.getFullYear(),
        dayOfWeek: currentDate.getDay(), // 0=Pazar, 1=Pazartesi, ...
        intensity: studyIntensity,
        count: totalCount,
        questionCount: questionCount,
        taskCount: taskCount,
        studyHoursCount: studyHoursCount,
        generalExamCount: generalExamCount,
        branchExamCount: branchExamCount,
        deletedQuestionCount: deletedQuestionCount,
        deletedTaskCount: deletedTaskCount,
        deletedStudyHoursCount: deletedStudyHoursCount,
        archivedTaskCount: archivedTaskCount,
        archivedQuestionCount: archivedQuestionCount,
        archivedStudyHoursCount: archivedStudyHoursCount,
        archivedGeneralExamCount: archivedGeneralExamCount,
        archivedBranchExamCount: archivedBranchExamCount,
        isToday: isToday
      });
    }
    
    return data;
  };

  // Heatmap'i haftalara organize et - sadece bugüne kadar
  const organizeHeatmapIntoWeeks = (data: any[]) => {
    const weeks = [];
    
    if (data.length === 0) return weeks;
    
    // İlk günden başla
    const firstDate = new Date(data[0].date);
    const firstDayOfWeek = firstDate.getDay(); // 0=Paz, 1=Pzt, ...
    const daysToMonday = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    
    // Hafta başlangıcı (Pazartesi)
    const startDate = new Date(firstDate);
    startDate.setDate(firstDate.getDate() - daysToMonday);
    
    // Bugüne kadar - haftayı tamamlama
    const today = new Date();
    
    // Veri haritası oluştur
    const dateMap = new Map();
    data.forEach(day => {
      dateMap.set(day.date, day);
    });
    
    // Haftaları oluştur
    const currentDate = new Date(startDate);
    
    while (currentDate <= today) {
      const week = [];
      
      // Her hafta 7 gün (Pzt-Paz)
      for (let i = 0; i < 7; i++) {
        const dateStr = dateToTurkeyString(currentDate);
        const dayData = dateMap.get(dateStr);
        
        // Sadece bugüne kadar olan günleri ekle
        if (currentDate <= today) {
          week.push(dayData || null);
        } else {
          week.push(null);
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Haftanın en az bir gerçek günü varsa ekle
      const hasRealDay = week.some(day => day !== null);
      if (hasRealDay) {
        weeks.push(week);
      }
    }
    
    // Maksimum gösterilecek hafta sayısı (ekrana sığacak kadar, en az 1 sütun boşluk bırakarak)
    // Her sütun ~28px genişliğinde, sayfa genişliği ~1280px olduğunda yaklaşık 40 hafta sığar
    const MAX_WEEKS = 40;
    
    // Eğer hafta sayısı maksimumdan fazlaysa, en soldaki haftaları sil
    if (weeks.length > MAX_WEEKS) {
      const weeksToRemove = weeks.length - MAX_WEEKS;
      return weeks.slice(weeksToRemove); // En soldaki haftaları sil(tek sütun)
    }
    
    return weeks;
  };

  // OPTİMİZE EDİLDİ ->  useMemo ile performans iyileştirmesi
  const yearlyHeatmapData = useMemo(() => {
    return generateYearlyHeatmapData();
  }, [allQuestionLogs, allTasks, allStudyHours, allExamResults, currentDayKey]);
  
  const heatmapWeeks = useMemo(() => {
    return organizeHeatmapIntoWeeks(yearlyHeatmapData);
  }, [yearlyHeatmapData]);

  // Isı haritası gün tıklamasını işleme (ARŞİVLİ VERİLER DAHİL) 
  const handleHeatmapDayClick = useCallback((day: any) => {
    const dayQuestions = allQuestionLogs.filter(log => log.study_date === day.date);
    const dayTasks = allTasks.filter(task => {
      // Görevleri şu öncelikle filtrele:
      // 1. Arşivlenmişse -> archivedAt tarihinde
      // 2. Silinmişse -> deletedAt tarihinde
      // 3. Tamamlanmışsa -> completedAt tarihinde (SADECE TAMAMLANMIŞSA!)
      // 4. Değilse -> dueDate veya createdAt'te
      let taskDate: string | null = null;
      
      if (task.archived && task.archivedAt) {
        taskDate = dateToTurkeyString(task.archivedAt);
      } else if (task.deleted && task.deletedAt) {
        taskDate = dateToTurkeyString(task.deletedAt);
      } else if (task.completed && task.completedAt) {
        taskDate = dateToTurkeyString(task.completedAt);
      } else if (task.dueDate) {
        taskDate = task.dueDate.split('T')[0];
      } else if (task.createdAt) {
        taskDate = dateToTurkeyString(task.createdAt);
      }
      
      return taskDate === day.date;
    });
    const dayExams = allExamResults.filter(exam => exam.exam_date === day.date);
    const dayStudyHours = allStudyHours.filter(sh => sh.study_date === day.date);
    
    setSelectedHeatmapDay({
      ...day,
      dayActivities: {
        questions: dayQuestions,
        tasks: dayTasks,
        exams: dayExams,
        studyHours: dayStudyHours
      }
    });
  }, [allQuestionLogs, allTasks, allExamResults, allStudyHours]);

  // Modal açıkken veriler değiştiğinde (ör. görev arşivlendiğinde) modal içeriğini güncelle
  useEffect(() => {
    if (selectedHeatmapDay) {
      const dayQuestions = allQuestionLogs.filter(log => log.study_date === selectedHeatmapDay.date);
      const dayTasks = allTasks.filter(task => {
        // Görevleri şu öncelikle filtrele:
        // 1. Arşivlenmişse -> archivedAt tarihinde
        // 2. Silinmişse -> deletedAt tarihinde
        // 3. Tamamlanmışsa -> completedAt tarihinde
        // 4. Değilse -> dueDate veya createdAt'te
        let taskDate: string | null = null;
        
        if (task.archived && task.archivedAt) {
          taskDate = new Date(task.archivedAt).toISOString().split('T')[0];
        } else if (task.deleted && task.deletedAt) {
          taskDate = new Date(task.deletedAt).toISOString().split('T')[0];
        } else if (task.completedAt) {
          taskDate = new Date(task.completedAt).toISOString().split('T')[0];
        } else if (task.dueDate) {
          taskDate = task.dueDate.split('T')[0];
        } else if (task.createdAt) {
          taskDate = new Date(task.createdAt).toISOString().split('T')[0];
        }
        
        return taskDate === selectedHeatmapDay.date;
      });
      const dayExams = allExamResults.filter(exam => exam.exam_date === selectedHeatmapDay.date);
      const dayStudyHours = allStudyHours.filter(sh => sh.study_date === selectedHeatmapDay.date);
      
      setSelectedHeatmapDay({
        ...selectedHeatmapDay,
        dayActivities: {
          questions: dayQuestions,
          tasks: dayTasks,
          exams: dayExams,
          studyHours: dayStudyHours
        }
      });
    }
  }, [allQuestionLogs, allTasks, allExamResults, allStudyHours]);

  // Bir sonraki arşiv için geri sayım sayacı (Pazar 23:59 Türkiye saati)b
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const turkeyTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
      
      // HESAPLA: Bir sonraki Pazar günü 23:59
      const nextSunday = new Date(turkeyTime);
      const currentDay = nextSunday.getDay(); // 0 = Sunday
      
      // Bugün Pazar ise ve saat 23:59'u geçmemişse, bugün arşivle
      // Bugün Pazar ise ve saat 23:59'u geçtiyse, gelecek Pazar arşivle
      // Diğer günlerdeyse, bu haftanın veya gelecek haftanın Pazarına göre hesapla
      let daysUntilSunday: number;
      if (currentDay === 0) {
        // Pazar günü
        const targetTime = new Date(turkeyTime);
        targetTime.setHours(23, 59, 0, 0);
        daysUntilSunday = turkeyTime < targetTime ? 0 : 7;
      } else {
        // Pazar değil
        daysUntilSunday = 7 - currentDay;
      }
      
      nextSunday.setDate(nextSunday.getDate() + daysUntilSunday);
      nextSunday.setHours(23, 59, 0, 0);
      
      const msUntilSunday = nextSunday.getTime() - turkeyTime.getTime();
      
      // Günlere saatlere dakikalara saniyelere dönüştür
      const days = Math.floor(msUntilSunday / (1000 * 60 * 60 * 24));
      const hours = Math.floor((msUntilSunday % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((msUntilSunday % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((msUntilSunday % (1000 * 60)) / 1000);
      
      let countdownText = `${days}g ${String(hours).padStart(2, '0')}sa:${String(minutes).padStart(2, '0')}dk:${String(seconds).padStart(2, '0')}sn`;
      
      setNextArchiveCountdown(countdownText);
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Electron IPC listener - Tray'den "Tüm Verileri Temizle" modal açma
  useEffect(() => {
    const handleOpenDeleteAllModal = () => {
      setShowDeleteAllDataDialog(true);
    };

    if ((window as any).electronAPI?.ipcRenderer) {
      (window as any).electronAPI.ipcRenderer.on('open-delete-all-data-modal', handleOpenDeleteAllModal);
      
      return () => {
        (window as any).electronAPI.ipcRenderer.removeListener('open-delete-all-data-modal', handleOpenDeleteAllModal);
      };
    }
  }, []);

  // Son etkinlikler (son 10 öğe birleştirilmiş) -
  const recentActivities = useMemo(() => [
    ...questionLogs.slice(0, 5).map(log => ({
      type: 'question',
      title: `${log.exam_type} ${log.subject} - ${log.correct_count} doğru`,
      date: log.study_date,
      icon: Brain
    })),
    ...examResults.slice(0, 5).map(exam => ({
      type: 'exam',
      title: `${typeof (exam.display_name || exam.exam_name) === 'string' ? formatExamName(exam.display_name || exam.exam_name) : 'Deneme'} - TYT: ${exam.tyt_net}`,
      date: exam.exam_date,
      icon: BarChart3
    })),
    ...tasks.filter(t => t.completed).slice(0, 5).map(task => ({
      type: 'task',
      title: task.title,
      date: task.createdAt || new Date().toISOString(),
      icon: Target
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8), [questionLogs, examResults, tasks]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex flex-col">
      <Header />
      

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 w-full">
        {/* Modern Kontrol Paneli Başlığı */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary via-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center justify-center gap-3">
            <BarChart3 className="h-10 w-10 text-primary" />
            📊 Raporlarım
            <Target className="h-10 w-10 text-blue-600" />
          </h1>
          <p className="text-lg text-muted-foreground">Çalışma verilerim için kapsamlı analiz ve kişiselleştirilmiş sayfa</p>
          
          {/* Arşiv, Tamamlanan Hatalı Konular ve Veri Temizleme Butonları */}
          <div className="mt-6 flex justify-center gap-4 flex-wrap">
            <Button
              onClick={() => setShowArchivedDataModal(true)}
              variant="outline"
              className="border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 px-8 py-3 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              data-testid="button-view-archived"
            >
              <Archive className="mr-2 h-5 w-5" />
              📁 Arşivlenen Veriler
            </Button>
          </div>
        </div>

        {/* Özet Kartları */}
        <DashboardSummaryCards 
          onAddStudyHours={() => setShowStudyHoursModal(true)}
        />
        
        {/* Geliştirilmiş Çalışma Isı Haritası */}
        <div className="mb-8">
          <Card className="bg-gradient-to-br from-purple-50/50 via-card to-indigo-50/50 dark:from-purple-950/30 dark:via-card dark:to-indigo-950/30 backdrop-blur-sm border-2 border-purple-200/30 dark:border-purple-800/30 shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-t-lg border-b border-purple-200/30">
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
                <CalendarDays className="h-6 w-6 text-purple-500" />
                📈 Yıllık Aktivite Heatmap
              </CardTitle>
              <p className="text-sm text-purple-600/70 dark:text-purple-400/70 font-medium mt-1">Yıllık yaptığınız tüm aktiviteleri bu bölümde kutucuklara tıklayarak görebilirsiniz.</p>
            </CardHeader>
            <CardContent className="p-4">
              {/* Heatmap Container - Düzgün Boyut ve Boşluklar */}
              <div className="w-full">
                <div className="flex flex-col gap-2">
                  {/* Ay Etiketleri */}
                  <div className="flex gap-1 pl-10 relative h-5 mb-1">
                    {(() => {
                      const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
                      const currentMonth = new Date().getMonth();
                      
                      const monthsMap = new Map();
                      heatmapWeeks.forEach((week, weekIndex) => {
                        week.forEach((day) => {
                          if (day) {
                            if (!monthsMap.has(day.month)) {
                              monthsMap.set(day.month, { start: weekIndex, end: weekIndex });
                            } else {
                              monthsMap.get(day.month).end = weekIndex;
                            }
                          }
                        });
                      });
                      
                      return Array.from(monthsMap.entries())
                        .sort((a, b) => a[0] - b[0])
                        .map(([monthIdx, { start, end }]) => {
                          const weeks = end - start + 1;
                          const w = weeks * 28;
                          const centerPosition = start * 28 + (w * 0.35);
                          
                          return (
                            <div 
                              key={monthIdx}
                              className={`absolute text-xs font-semibold ${
                                monthIdx === currentMonth 
                                  ? 'text-purple-600 dark:text-purple-400 font-bold' 
                                  : 'text-gray-600 dark:text-gray-400'
                              }`}
                              style={{ left: `${centerPosition}px` }}
                            >
                              {months[monthIdx]}
                            </div>
                          );
                        });
                    })()}
                  </div>
                  
                  {/* Heatmap Grid */}
                  <div className="flex gap-1">
                    {/* Gün İsimleri */}
                    <div className="flex flex-col gap-1 w-9 pr-1">
                      <div className="h-6 flex items-center justify-end text-[10px] font-medium text-gray-500 dark:text-gray-400">Pzt</div>
                      <div className="h-6 flex items-center justify-end text-[10px] font-medium text-gray-500 dark:text-gray-400">Sal</div>
                      <div className="h-6 flex items-center justify-end text-[10px] font-medium text-gray-500 dark:text-gray-400">Çar</div>
                      <div className="h-6 flex items-center justify-end text-[10px] font-medium text-gray-500 dark:text-gray-400">Per</div>
                      <div className="h-6 flex items-center justify-end text-[10px] font-medium text-gray-500 dark:text-gray-400">Cum</div>
                      <div className="h-6 flex items-center justify-end text-[10px] font-medium text-gray-500 dark:text-gray-400">Cmt</div>
                      <div className="h-6 flex items-center justify-end text-[10px] font-medium text-gray-500 dark:text-gray-400">Paz</div>
                    </div>
                    
                    {/* Heatmap Kutuları - Daha Büyük ve Rahat */}
                    <div className="flex gap-1">
                      {heatmapWeeks.map((week, weekIndex) => (
                        <div key={weekIndex} className="flex flex-col gap-1">
                          {week.map((day, dayIndex) => {
                            if (!day) {
                              return (
                                <div
                                  key={dayIndex}
                                  className="w-6 h-6 rounded-sm bg-transparent"
                                />
                              );
                            }
                            
                            // Aktivite sayısına göre renk belirleme (görevler, sorular, denemeler, çalışma saatleri)
                            const activityCount = day.count;
                            
                            // Mor ve pembe tonlarında renk gradyan sistemi - Aktivite sayısına göre renk belirleme
                            let bgColor = '';
                            
                            // Aktivite sayısına göre rengi belirle - Düzeltildi: Az aktivite (1-9) koyu renkler, Çok aktivite (10+) açık renkler/beyaz
                            if (activityCount === 0) {
                              bgColor = 'bg-gray-200/80 dark:bg-gray-800/80';
                            } else if (activityCount <= 2) {
                              // 1-2 aktivite - en koyu mor
                              bgColor = 'bg-purple-900 dark:bg-purple-950';
                            } else if (activityCount <= 4) {
                              // 3-4 aktivite - çok koyu mor
                              bgColor = 'bg-purple-800 dark:bg-purple-900';
                            } else if (activityCount <= 6) {
                              // 5-6 aktivite - koyu mor
                              bgColor = 'bg-purple-700 dark:bg-purple-800';
                            } else if (activityCount <= 8) {
                              // 7-8 aktivite - orta koyu mor
                              bgColor = 'bg-purple-600 dark:bg-purple-700';
                            } else if (activityCount <= 9) {
                              // 9 aktivite - orta mor
                              bgColor = 'bg-purple-500 dark:bg-purple-600';
                            } else if (activityCount <= 14) {
                              // 10-14 aktivite - orta açık mor (beyaz tonları başlangıcı)
                              bgColor = 'bg-purple-400 dark:bg-purple-500';
                            } else if (activityCount <= 19) {
                              // 15-19 aktivite - açık mor
                              bgColor = 'bg-purple-300 dark:bg-purple-400';
                            } else if (activityCount <= 25) {
                              // 20-25 aktivite - çok açık mor
                              bgColor = 'bg-purple-200 dark:bg-purple-300';
                            } else if (activityCount <= 29) {
                              // 26-29 aktivite - en açık mor
                              bgColor = 'bg-purple-100 dark:bg-purple-200';
                            } else {
                              // 30+ aktivite - beyaz/en açık renk
                              bgColor = 'bg-purple-50 dark:bg-purple-100';
                            }
                            
                            // BUGÜN ise ekstra parlak gölge efekti ekle (renk aktiviteye göre kalsın)
                            if (day.isToday) {
                              bgColor += ' shadow-lg shadow-purple-400/60 dark:shadow-purple-500/60';
                            }
                            
                            //   - Arşivlenmiş veriler tooltip'te gösterilsin
                            const hasArchivedData = (day.archivedTaskCount || 0) + (day.archivedQuestionCount || 0) + (day.archivedStudyHoursCount || 0) + (day.archivedGeneralExamCount || 0) + (day.archivedBranchExamCount || 0) > 0;
                            
                            // Tooltip içeriğini oluştur
                            let tooltipText = `${day.date}\n`;
                            if (day.questionCount > 0) tooltipText += `📚 Çözülen Sorular: ${day.questionCount}\n`;
                            if (day.generalExamCount > 0) tooltipText += `📝 Genel Denemeler: ${day.generalExamCount}\n`;
                            if (day.branchExamCount > 0) tooltipText += `📖 Branş Denemeler: ${day.branchExamCount}\n`;
                            if (day.taskCount > 0) tooltipText += `✓ Görevler: ${day.taskCount}\n`;
                            if (day.studyHoursCount > 0) tooltipText += `⏱ Çalışma Saatleri: ${day.studyHoursCount}\n`;
                            if (hasArchivedData) {
                              tooltipText += `\n📦 Arşivlenmiş:`;
                              if (day.archivedQuestionCount > 0) tooltipText += `\n  • ${day.archivedQuestionCount} soru`;
                              if (day.archivedGeneralExamCount > 0) tooltipText += `\n  • ${day.archivedGeneralExamCount} genel deneme`;
                              if (day.archivedBranchExamCount > 0) tooltipText += `\n  • ${day.archivedBranchExamCount} branş deneme`;
                              if (day.archivedTaskCount > 0) tooltipText += `\n  • ${day.archivedTaskCount} görev`;
                              if (day.archivedStudyHoursCount > 0) tooltipText += `\n  • ${day.archivedStudyHoursCount} çalışma saati`;
                            }
                            if (activityCount === 0 && !hasArchivedData) tooltipText += `Aktivite yok`;
                            
                            return (
                              <div
                                key={dayIndex}
                                className={`w-6 h-6 rounded-sm cursor-pointer transition-all duration-200 relative ${bgColor} ${
                                  day.isToday 
                                    ? 'ring-4 ring-purple-400 dark:ring-purple-300 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 z-20 scale-110' 
                                    : 'hover:scale-125 hover:z-10 hover:shadow-md'
                                } ${
                                  activityCount === 0 
                                    ? 'hover:bg-gray-300 dark:hover:bg-gray-700' 
                                    : ''
                                }`}
                                style={{
                                  animation: day.isToday ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite, purpleGlow 2s ease-in-out infinite' : undefined
                                }}
                                onClick={() => handleHeatmapDayClick(day)}
                                data-testid={`heatmap-day-${day.date}`}
                                title={tooltipText}
                              >
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Aktivite göstergesi - Renk Paleti - Ters çevrilmiş */}
              <div className="flex flex-col gap-3 mt-6">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium">Aktivite Seviyesi</span>
                </div>
                <div className="flex gap-2 items-center justify-center">
                  <span className="text-xs text-muted-foreground mr-1">Az</span>
                  <div className="flex gap-1">
                    <div className="w-4 h-4 bg-purple-800 dark:bg-purple-900 rounded-sm"></div>
                    <div className="w-4 h-4 bg-purple-700 dark:bg-purple-800 rounded-sm"></div>
                    <div className="w-4 h-4 bg-purple-600 dark:bg-purple-700 rounded-sm"></div>
                    <div className="w-4 h-4 bg-purple-500 dark:bg-purple-600 rounded-sm"></div>
                    <div className="w-4 h-4 bg-purple-400 dark:bg-purple-500 rounded-sm"></div>
                    <div className="w-4 h-4 bg-purple-300 dark:bg-purple-400 rounded-sm"></div>
                    <div className="w-4 h-4 bg-purple-200 dark:bg-purple-300 rounded-sm"></div>
                    <div className="w-4 h-4 bg-purple-100 dark:bg-purple-200 rounded-sm"></div>
                  </div>
                  <span className="text-xs text-muted-foreground ml-1">Çok</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        

        {/* Çözülen Sorular Sayısı Bölümü ile CRUD */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-green-50/50 via-card to-emerald-50/50 dark:from-green-950/30 dark:via-card dark:to-emerald-950/30 backdrop-blur-sm border-2 border-green-200/30 dark:border-green-800/30 shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-t-lg border-b border-green-200/30">
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-green-500" />
                  📊 Çözülmüş Sorular
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setShowQuestionHistoryModal(true)}
                    size="sm" 
                    variant="outline"
                    className="text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Soru Geçmişi
                  </Button>
                  {questionLogs.length > 0 && (
                    <Button 
                      onClick={() => setShowDeleteAllQuestionsDialog(true)}
                      size="sm" 
                      variant="outline"
                      className="text-xs border-red-300 text-red-700 hover:bg-red-50"
                      disabled={deleteAllQuestionLogsMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      {deleteAllQuestionLogsMutation.isPending ? 'Siliniyor...' : 'Tüm Soruları Sil'}
                    </Button>
                  )}
                  <Button 
                    onClick={handleOpenQuestionDialog}
                    size="sm" 
                    variant="outline"
                    className="text-xs border-green-300 text-green-700 hover:bg-green-50"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Soru Ekle
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {questionLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <h3 className="font-medium mb-1">Henüz soru kaydı yok</h3>
                  <p className="text-sm">Çözdüğünüz soruları kaydetmeye başlayın - istatistiklerinizi görmek için! 📊</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Özet İstatistikleri - İyileştirilmiş Tasarım */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {/* Toplam Çözülen Soru Sayısı - SADECE soru kayıtlarından */}
                    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50/80 via-cyan-50/60 to-blue-50/80 dark:from-blue-950/40 dark:via-cyan-950/30 dark:to-blue-950/40 border border-blue-200/50 dark:border-blue-700/40 p-3 hover:scale-105 transition-all duration-300 hover:shadow-lg">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-2">
                          <div className="p-1.5 bg-blue-100/80 dark:bg-blue-900/40 rounded-lg">
                            <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                        </div>
                        <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mb-1">
                          {allQuestionLogs.reduce((total, log) => total + parseInt(log.correct_count) + parseInt(log.wrong_count), 0)}
                        </div>
                        <div className="text-xs font-semibold text-blue-700/80 dark:text-blue-300/80">📊 Toplam Çözülen Soru</div>
                      </div>
                    </div>

                    {/* Toplam Doğru - SADECE soru kayıtlarından */}
                    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-50/80 via-emerald-50/60 to-green-50/80 dark:from-green-950/40 dark:via-emerald-950/30 dark:to-green-950/40 border border-green-200/50 dark:border-green-700/40 p-3 hover:scale-105 transition-all duration-300 hover:shadow-lg">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-2">
                          <div className="p-1.5 bg-green-100/80 dark:bg-green-900/40 rounded-lg">
                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                        </div>
                        <div className="text-2xl font-black text-green-600 dark:text-green-400 mb-1">
                          {allQuestionLogs.reduce((total, log) => total + parseInt(log.correct_count), 0)}
                        </div>
                        <div className="text-xs font-semibold text-green-700/80 dark:text-green-300/80">✓ Toplam Doğru</div>
                      </div>
                    </div>

                    {/* Toplam Yanlış - SADECE soru kayıtlarından */}
                    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-red-50/80 via-rose-50/60 to-red-50/80 dark:from-red-950/40 dark:via-rose-950/30 dark:to-red-950/40 border border-red-200/50 dark:border-red-700/40 p-3 hover:scale-105 transition-all duration-300 hover:shadow-lg">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-red-400/20 to-rose-400/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-2">
                          <div className="p-1.5 bg-red-100/80 dark:bg-red-900/40 rounded-lg">
                            <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                          </div>
                        </div>
                        <div className="text-2xl font-black text-red-600 dark:text-red-400 mb-1">
                          {allQuestionLogs.reduce((total, log) => total + parseInt(log.wrong_count), 0)}
                        </div>
                        <div className="text-xs font-semibold text-red-700/80 dark:text-red-300/80">✗ Toplam Yanlış</div>
                      </div>
                    </div>

                    {/* Toplam Boş - SADECE soru kayıtlarından */}
                    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-50/80 via-yellow-50/60 to-amber-50/80 dark:from-amber-950/40 dark:via-yellow-950/30 dark:to-amber-950/40 border border-amber-200/50 dark:border-amber-700/40 p-3 hover:scale-105 transition-all duration-300 hover:shadow-lg">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-amber-400/20 to-yellow-400/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-2">
                          <div className="p-1.5 bg-amber-100/80 dark:bg-amber-900/40 rounded-lg">
                            <Circle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          </div>
                        </div>
                        <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mb-1">
                          {allQuestionLogs.reduce((total, log) => total + parseInt(log.blank_count || '0'), 0)}
                        </div>
                        <div className="text-xs font-semibold text-amber-700/80 dark:text-amber-300/80">○ Toplam Boş</div>
                      </div>
                    </div>
                  </div>

                  {/* Soru Kayıtları Listesi - Düzenleme/Silme ile - SADECE AKTİF */}
                  <div className="space-y-3">
                    <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                      {questionLogs.map((log, index) => (
                      <div key={log.id} className="p-4 bg-gradient-to-r from-green-100/30 to-emerald-100/30 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200/50 transition-all hover:scale-102 hover:shadow-md">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">
                                {log.exam_type} - {log.subject}
                              </div>
                              <div className="text-xs flex items-center gap-2">
                                <span className="text-muted-foreground">{new Date(log.study_date).toLocaleDateString('tr-TR')}</span>
                                {log.time_spent_minutes && log.time_spent_minutes > 0 && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/40 dark:to-green-900/40 rounded-full border border-emerald-200 dark:border-emerald-700">
                                    <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                                      {Math.floor(log.time_spent_minutes / 60) > 0 && `${Math.floor(log.time_spent_minutes / 60)}s `}
                                      {log.time_spent_minutes % 60}dk
                                    </span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => archiveQuestionLogMutation.mutate(log.id)}
                              disabled={archiveQuestionLogMutation.isPending}
                              className="text-blue-500 hover:text-blue-700 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                              title="Arşive Taşı"
                            >
                              <Archive className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => deleteQuestionLogMutation.mutate(log.id)}
                              disabled={deleteQuestionLogMutation.isPending}
                              className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title="Sil"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-sm">
                          <div className="text-center p-2 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                            <div className="font-bold text-green-600">{log.correct_count}</div>
                            <div className="text-xs text-muted-foreground">Doğru</div>
                          </div>
                          <div className="text-center p-2 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                            <div className="font-bold text-red-600">{log.wrong_count}</div>
                            <div className="text-xs text-muted-foreground">Yanlış</div>
                          </div>
                          <div className="text-center p-2 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                            <div className="font-bold text-yellow-600">{log.blank_count || '0'}</div>
                            <div className="text-xs text-muted-foreground">Boş</div>
                          </div>
                          <div className="text-center p-2 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                            <div className="font-bold text-blue-600">
                              {(parseInt(log.correct_count) - (parseInt(log.wrong_count) / 4)).toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">Net</div>
                          </div>
                        </div>
                      </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Günlük Soru Analizi - Çözülen Sorulardan Sonra Buraya Taşı */}
        <div className="mb-8">
          <QuestionAnalysisCharts />
        </div>

        {/* Kompakt Deneme Sonuçları */}
        <div className="grid grid-cols-1 gap-4 mb-6">
          <Card className="border-emerald-200/50 dark:border-emerald-800/30 bg-gradient-to-br from-emerald-50/40 via-white/60 to-green-50/40 dark:from-emerald-950/30 dark:via-gray-900/60 dark:to-green-950/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                  <Target className="h-5 w-5" />
                  🎯 Deneme Sonuçları
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setShowExamHistoryModal(true)}
                    size="sm" 
                    variant="outline"
                    className="border-emerald-500 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-600 dark:text-emerald-400"
                    data-testid="button-view-exam-history"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Deneme Geçmişi
                  </Button>
                  {examResults.length > 0 && (
                    <Button 
                      onClick={() => setShowDeleteAllExamsDialog(true)}
                      size="sm" 
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                      disabled={deleteAllExamResultsMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {deleteAllExamResultsMutation.isPending ? 'Siliniyor...' : 'Tüm Denemeleri Sil'}
                    </Button>
                  )}
                  <Button 
                    onClick={() => setShowExamDialog(true)}
                    size="sm" 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    data-testid="button-add-exam-result"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Deneme Sonucu Ekle
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
            
            {examResults.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 flex items-center justify-center mx-auto mb-8 shadow-2xl animate-pulse">
                  <Target className="h-16 w-16 text-emerald-500" />
                </div>
                <h4 className="text-3xl font-bold text-emerald-700 dark:text-emerald-300 mb-4">Deneme sonuçları bulunmamaktadır</h4>
                <p className="text-lg opacity-75 mb-8 max-w-md mx-auto">Deneme eklemeden veriler gözükmez.</p>
                <div className="flex justify-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-bounce"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-bounce delay-150"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-600 animate-bounce delay-300"></div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* SADECE AKTİF DENEMELER - Arşivlenenler hariç */}
                <div className="space-y-6 max-h-[800px] overflow-y-auto custom-scrollbar">
                  {examResults
                    .sort((a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime())
                    .map((exam, index) => {
                  // Sınav türünü ve ilgili net puanı öğrenin
                  const examType = exam.exam_type || (parseFloat(exam.ayt_net) > 0 ? 'AYT' : 'TYT');
                  const relevantNet = examType === 'TYT' ? parseFloat(exam.tyt_net) || 0 : parseFloat(exam.ayt_net) || 0;
                  
                  // Sınav türünü ve ilgili net puanı alınBu sınav türü için sınav numarasını hesaplayın
                  const sameTypeExams = examResults
                    .filter(e => (e.exam_type || (parseFloat(e.ayt_net) > 0 ? 'AYT' : 'TYT')) === examType)
                    .sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime());
                  const examNumber = sameTypeExams.findIndex(e => e.id === exam.id) + 1;
                  
                  // Performans göstergelerini hesaplayın
                  const isRecentExam = new Date(exam.exam_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                  const examDate = new Date(exam.exam_date);
                  const daysSinceExam = Math.floor((Date.now() - examDate.getTime()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <Card key={exam.id} className="group bg-white dark:bg-slate-800 hover:shadow-md transition-all duration-200 border-emerald-200/60 dark:border-emerald-700/50 relative overflow-hidden">
                      
                      <CardContent className="p-4 relative">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-4">
                            <div>
                              <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mb-1">
                                {formatExamName(exam.display_name || exam.exam_name || 'Deneme')}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>
                                  {examDate.toLocaleDateString('tr-TR', { 
                                    day: '2-digit', 
                                    month: '2-digit', 
                                    year: 'numeric' 
                                  })} • {exam.createdAt ? new Date(exam.createdAt).toLocaleTimeString('tr-TR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : ''}
                                </span>
                                {exam.time_spent_minutes && exam.time_spent_minutes > 0 && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-cyan-100 to-blue-100 dark:from-cyan-900/40 dark:to-blue-900/40 rounded-full border border-cyan-200 dark:border-cyan-700">
                                    <Clock className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                                    <span className="font-semibold text-cyan-700 dark:text-cyan-300">
                                      {Math.floor(exam.time_spent_minutes / 60) > 0 && `${Math.floor(exam.time_spent_minutes / 60)}s `}
                                      {exam.time_spent_minutes % 60}dk
                                    </span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-700">
                              <div className="flex items-center justify-center gap-1.5 mb-1">
                                <div className={`w-2 h-2 rounded-full ${examType === 'TYT' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
                                <span className={`text-xs font-bold ${examType === 'TYT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                  {examType}
                                </span>
                              </div>
                              <div className={`text-2xl font-bold ${examType === 'TYT' ? 'text-emerald-700 dark:text-emerald-300' : 'text-blue-700 dark:text-blue-300'}`}>
                                {relevantNet.toFixed(2)}
                              </div>
                              <div className={`text-xs ${examType === 'TYT' ? 'text-emerald-600/70 dark:text-emerald-400/70' : 'text-blue-600/70 dark:text-blue-400/70'}`}>
                                / {(() => {
                                  // Branş denemesi ise belirli dersin soru sayısını göster
                                  if (exam.exam_scope === 'branch' && exam.selected_subject) {
                                    const subjectLimits: {[key: string]: {TYT?: number, AYT?: number}} = {
                                      turkce: { TYT: 40 },
                                      sosyal: { TYT: 20 },
                                      matematik: { TYT: 40, AYT: 40 },
                                      geometri: { TYT: 10, AYT: 10 },
                                      fen: { TYT: 20 },
                                      fizik: { TYT: 7, AYT: 14 },
                                      kimya: { TYT: 7, AYT: 13 },
                                      biyoloji: { TYT: 6, AYT: 13 },
                                      paragraf: { TYT: 26 },
                                      problemler: { TYT: 13 }
                                    };
                                    return subjectLimits[exam.selected_subject]?.[examType as 'TYT' | 'AYT'] || '?';
                                  }
                                  // Tam deneme ise standart soru sayısını göster
                                  return examType === 'TYT' ? '120' : '80';
                                })()} soruluk
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  const newExpanded = new Set(expandedExams);
                                  if (newExpanded.has(exam.id)) {
                                    newExpanded.delete(exam.id);
                                  } else {
                                    newExpanded.add(exam.id);
                                  }
                                  setExpandedExams(newExpanded);
                                }}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingExam(exam);
                                  setNewExamResult({
                                    exam_name: exam.exam_name || exam.display_name || "",
                                    display_name: exam.display_name || exam.exam_name || "",
                                    exam_date: exam.exam_date.split('T')[0],
                                    exam_type: exam.exam_type || "TYT",
                                    examScope: exam.exam_scope || "full",
                                    selectedSubject: exam.selected_subject || "turkce",
                                    wrongTopicsText: "",
                                    time_spent_minutes: (exam.time_spent_minutes || 0).toString(),
                                    subjects: {
                                      turkce: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                                      matematik: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                                      sosyal: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                                      fen: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                                      fizik: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                                      kimya: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                                      biyoloji: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                                      geometri: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                                      paragraf: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                                      problemler: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] }
                                    }
                                  });
                                  setShowExamDialog(true);
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => archiveExamResultMutation.mutate(exam.id)}
                                disabled={archiveExamResultMutation.isPending}
                                className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-all"
                                title="Arşivle"
                              >
                                <Archive className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => deleteExamResultMutation.mutate(exam.id)}
                                disabled={deleteExamResultMutation.isPending}
                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Konu Ayrıntıları Bölümü */}
                        {expandedExams.has(exam.id) && exam.subjects_data && (() => {
                          try {
                            const subjectsData = JSON.parse(exam.subjects_data);
                            const subjects = Object.entries(subjectsData).map(([key, data]: [string, any]) => {
                              const subjectNames: {[key: string]: string} = {
                                'turkce': 'Türkçe',
                                'matematik': 'Matematik',
                                'geometri': 'Geometri',
                                'sosyal': 'Sosyal Bilimler',
                                'fen': 'Fen Bilimleri',
                                'fizik': 'Fizik',
                                'kimya': 'Kimya',
                                'biyoloji': 'Biyoloji',
                                'paragraf': 'Paragraf',
                                'problemler': 'Problemler'
                              };
                              return {
                                name: subjectNames[key] || key,
                                correct: parseInt(data.correct) || 0,
                                wrong: parseInt(data.wrong) || 0,
                                blank: parseInt(data.blank) || 0,
                                total: (parseInt(data.correct) || 0) + (parseInt(data.wrong) || 0) + (parseInt(data.blank) || 0)
                              };
                            }).filter(subject => subject.total > 0);
                            
                            if (subjects.length > 0) {
                              return (
                                <div className="mt-6 pt-4 border-t border-emerald-200/50 dark:border-emerald-700/30">
                                  <h4 className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mb-3 flex items-center gap-2">
                                    📊 Ders Detayları
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {subjects.map((subject, idx) => (
                                      <div key={idx} className="bg-gradient-to-r from-white/60 to-emerald-50/40 dark:from-gray-800/60 dark:to-emerald-900/20 rounded-xl p-3 border border-emerald-200/40 dark:border-emerald-700/30">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                                            {subject.name}
                                          </span>
                                          <span className="text-xs text-muted-foreground font-medium">
                                            {subject.total} soru
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                          <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1">
                                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                              <span className="text-green-600 dark:text-green-400 font-semibold">{subject.correct}D</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                              <span className="text-red-600 dark:text-red-400 font-semibold">{subject.wrong}Y</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                                              <span className="text-gray-600 dark:text-gray-400 font-semibold">{subject.blank}B</span>
                                            </div>
                                          </div>
                                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                            {(subject.correct - subject.wrong * 0.25).toFixed(1)} net
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            }
                          } catch (e) {
                            console.error('Error parsing subjects_data:', e);
                          }
                          return null;
                        })()}
                        
                        {/* Ekleme Tarihi ve Saati */}
                        <div className="flex items-center justify-between pt-4 border-t border-emerald-200/50 dark:border-emerald-700/30">
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-muted-foreground">
                              {exam.createdAt ? new Date(exam.createdAt).toLocaleDateString('tr-TR', { 
                                day: 'numeric', 
                                month: 'long', 
                                year: 'numeric' 
                              }) + ' Saat ' + new Date(exam.createdAt).toLocaleTimeString('tr-TR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'Tarih belirtilmemiş'}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Award className="h-4 w-4" />
                            <span>{formatExamName(exam.display_name || exam.exam_name)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                </div>
              </div>
            )}
            </CardContent>
          </Card>
        </div>

        {/* Analitik Grafikler - Bu önemli analitikleri koru */}
        <div className="space-y-8 mb-8">
          <AdvancedCharts />
        </div>

      </main>

      {/* Isı Haritası Gün Detayları Diyaloğu */}
      <Dialog open={selectedHeatmapDay !== null} onOpenChange={(open) => !open && setSelectedHeatmapDay(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-purple-500" />
              {selectedHeatmapDay && (
                <>
                  {new Date(selectedHeatmapDay.date + 'T12:00:00').toLocaleDateString('tr-TR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    timeZone: 'Europe/Istanbul'
                  })} Aktiviteleri
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Seçilen gün için detaylı aktivite bilgilerini görüntüleyin.
            </DialogDescription>
          </DialogHeader>
          {selectedHeatmapDay && (
            <div className="space-y-6">
              {/* Özet */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl">
                  <div className="text-2xl font-bold text-blue-600">{selectedHeatmapDay.dayActivities.tasks.filter((task: any) => task.completed).length}</div>
                  <div className="text-sm text-muted-foreground">Tamamlanan Görev</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl">
                  <div className="text-2xl font-bold text-green-600">{selectedHeatmapDay.dayActivities.questions.reduce((sum: number, q: any) => sum + ((parseInt(q.correct_count) || 0) + (parseInt(q.wrong_count) || 0) + (parseInt(q.blank_count || '0') || 0)), 0)}</div>
                  <div className="text-sm text-muted-foreground">Çözülen Toplam Soru</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl">
                  <div className="text-2xl font-bold text-purple-600">{selectedHeatmapDay.dayActivities.exams.length}</div>
                  <div className="text-sm text-muted-foreground">Çözülen Toplam Deneme</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-r from-cyan-100 to-teal-100 dark:from-cyan-900/20 dark:to-teal-900/20 rounded-xl">
                  <div className="text-2xl font-bold text-cyan-600">
                    {(() => {
                      if (!selectedHeatmapDay.dayActivities.studyHours || selectedHeatmapDay.dayActivities.studyHours.length === 0) return "0s 0dk";
                      const totalSeconds = selectedHeatmapDay.dayActivities.studyHours.reduce((sum: number, sh: any) => {
                        const h = parseInt(sh.hours) || 0;
                        const m = parseInt(sh.minutes) || 0;
                        const s = parseInt(sh.seconds) || 0;
                        return sum + (h * 3600 + m * 60 + s);
                      }, 0);
                      const hours = Math.floor(totalSeconds / 3600);
                      const minutes = Math.floor((totalSeconds % 3600) / 60);
                      return `${hours}s ${minutes}dk`;
                    })()}
                  </div>
                  <div className="text-sm text-muted-foreground">Toplam Çalışılan Saat</div>
                </div>
              </div>

              {/* Detaylı Aktiviteler */}
              {selectedHeatmapDay.dayActivities.questions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Brain className="h-5 w-5 text-green-500" />
                    Çözülen Sorular
                  </h3>
                  <div className="space-y-2">
                    {selectedHeatmapDay.dayActivities.questions.map((question: any, index: number) => (
                      <div key={question.id || `question-${index}-${question.subject}`} className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">
                              {question.exam_type} - {question.subject}
                              {question.deleted && <span className="ml-2 text-xs text-red-500">(silinen)</span>}
                              {question.archived && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200">(arşivlendi)</span>}
                            </span>
                            <div className="flex items-center gap-1 text-xs">
                              <div className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-1 rounded-full font-semibold">
                                ✓ {question.correct_count}
                              </div>
                              <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-2 py-1 rounded-full font-semibold">
                                ✗ {question.wrong_count}
                              </div>
                              <div className="bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full font-semibold">
                                ○ {question.blank_count || 0}
                              </div>
                              <div className="bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full font-semibold">
                                Net: {(parseInt(question.correct_count) - (parseInt(question.wrong_count) / 4)).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Planlanan Görevler */}
              {selectedHeatmapDay.dayActivities.tasks.filter((task: any) => !task.completed).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-orange-500" />
                    Planlanan Görevler
                  </h3>
                  <div className="space-y-2">
                    {selectedHeatmapDay.dayActivities.tasks.filter((task: any) => !task.completed).map((task: any, index: number) => (
                      <div key={task.id || `task-pending-${index}`} className="p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
                        <div className="font-medium">
                          {task.title}
                          {task.archived && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200">(arşivlendi)</span>}
                          {task.deleted && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200">(silindi)</span>}
                        </div>
                        {task.description && (
                          <div className="text-sm text-muted-foreground mt-1">{task.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tamamlanan Görevler */}
              {selectedHeatmapDay.dayActivities.tasks.filter((task: any) => task.completed).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-500" />
                    Tamamlanan Görevler
                  </h3>
                  <div className="space-y-2">
                    {selectedHeatmapDay.dayActivities.tasks.filter((task: any) => task.completed).map((task: any, index: number) => (
                      <div key={task.id || `task-completed-${index}`} className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="font-medium">
                          {task.title}
                          {task.archived && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200">(arşivlendi)</span>}
                          {task.deleted && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200">(silindi)</span>}
                        </div>
                        {task.description && (
                          <div className="text-sm text-muted-foreground mt-1">{task.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedHeatmapDay.dayActivities.exams.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Award className="h-5 w-5 text-purple-500" />
                    Deneme Sınavları
                  </h3>
                  <div className="space-y-2">
                    {selectedHeatmapDay.dayActivities.exams.map((exam: any, index: number) => (
                      <div key={exam.id || `exam-${index}-${exam.exam_name}`} className="p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">
                            {formatExamName(exam.display_name || exam.exam_name)}
                            {exam.deleted && <span className="ml-2 text-xs text-red-500">(silinen)</span>}
                            {exam.archived && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200">(arşivlendi)</span>}
                          </span>
                          <div className="text-xs text-muted-foreground">
                            {exam.exam_type === 'TYT' ? (
                              `TYT: ${exam.tyt_net}`
                            ) : exam.exam_type === 'AYT' ? (
                              `AYT: ${exam.ayt_net}`
                            ) : (
                              // Exam_type yoksa netlere göre karar ver
                              parseFloat(exam.tyt_net) > 0 && parseFloat(exam.ayt_net) > 0 ? (
                                `TYT: ${exam.tyt_net} • AYT: ${exam.ayt_net}`
                              ) : parseFloat(exam.tyt_net) > 0 ? (
                                `TYT: ${exam.tyt_net}`
                              ) : (
                                `AYT: ${exam.ayt_net}`
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Aktivite yok mesajı - sadece gerçekten hiçbir aktivite yoksa göster */}
              {selectedHeatmapDay.dayActivities.questions.length === 0 && 
               selectedHeatmapDay.dayActivities.tasks.length === 0 && 
               selectedHeatmapDay.dayActivities.exams.length === 0 && 
               (!selectedHeatmapDay.dayActivities.studyHours || selectedHeatmapDay.dayActivities.studyHours.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>Bugünde herhangi bir aktivite kaydedilmemiş.</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Soru Diyaloğu */}
      <Dialog open={showQuestionDialog} onOpenChange={(open) => {
        setShowQuestionDialog(open);
        if (!open) {
          setEditingQuestionLog(null);
          setNewQuestion({ 
            exam_type: "TYT", 
            subject: "Türkçe", 
            correct_count: "", 
            wrong_count: "", 
            blank_count: "", 
            study_date: getTurkeyDate(),
            wrong_topics: [],
            time_spent_minutes: ""
          });
          setWrongTopicInput("");
          setSelectedTopicDifficulty('kolay');
          setSelectedTopicCategory('kavram');
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingQuestionLog ? 'Soru Kaydını Düzenle' : 'Yeni Soru Kaydı'}
            </DialogTitle>
            <DialogDescription>
              Soru çözüm kaydınızı ekleyin veya düzenleyin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Sınav Türü</label>
                <Select value={newQuestion.exam_type} onValueChange={(value) => {
                  setNewQuestion({
                    ...newQuestion, 
                    exam_type: value as "TYT" | "AYT",
                    subject: getQuestionSubjectOptions(value as "TYT" | "AYT")[0],
                    correct_count: "",
                    wrong_count: "",
                    blank_count: "",
                    wrong_topics: []
                  });
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TYT">TYT</SelectItem>
                    <SelectItem value="AYT">AYT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ders</label>
                <Select value={newQuestion.subject} onValueChange={(value) => {
                  setNewQuestion({
                    ...newQuestion, 
                    subject: value,
                    correct_count: "",
                    wrong_count: "",
                    blank_count: "",
                    wrong_topics: []
                  });
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getQuestionSubjectOptions(newQuestion.exam_type).map(subject => (
                      <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Doğru</label>
                <Input
                  type="number"
                  value={newQuestion.correct_count}
                  onChange={(e) => {
                    const maxLimit = (newQuestion.subject === "Paragraf" || newQuestion.subject === "Problemler") ? 1000 : (SUBJECT_LIMITS[newQuestion.exam_type]?.[newQuestion.subject] || 100);
                    const inputValue = parseInt(e.target.value) || 0;
                    const currentWrong = parseInt(newQuestion.wrong_count) || 0;
                    const currentBlank = parseInt(newQuestion.blank_count) || 0;
                    const remaining = maxLimit - currentWrong - currentBlank;
                    const value = Math.min(Math.max(0, inputValue), remaining);
                    setNewQuestion({...newQuestion, correct_count: value.toString()});
                  }}
                  placeholder="0"
                  min="0"
                  max={(newQuestion.subject === "Paragraf" || newQuestion.subject === "Problemler") ? 1000 : (SUBJECT_LIMITS[newQuestion.exam_type]?.[newQuestion.subject] || 100)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Yanlış</label>
                <Input
                  type="number"
                  value={newQuestion.wrong_count}
                  onChange={(e) => {
                    const maxLimit = (newQuestion.subject === "Paragraf" || newQuestion.subject === "Problemler") ? 1000 : (SUBJECT_LIMITS[newQuestion.exam_type]?.[newQuestion.subject] || 100);
                    const inputValue = parseInt(e.target.value) || 0;
                    const currentCorrect = parseInt(newQuestion.correct_count) || 0;
                    const currentBlank = parseInt(newQuestion.blank_count) || 0;
                    const remaining = maxLimit - currentCorrect - currentBlank;
                    const value = Math.min(Math.max(0, inputValue), remaining);
                    setNewQuestion({...newQuestion, wrong_count: value.toString()});
                  }}
                  placeholder="0"
                  min="0"
                  max={(newQuestion.subject === "Paragraf" || newQuestion.subject === "Problemler") ? 1000 : (SUBJECT_LIMITS[newQuestion.exam_type]?.[newQuestion.subject] || 100)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Boş</label>
                <Input
                  type="number"
                  value={newQuestion.blank_count}
                  onChange={(e) => {
                    const maxLimit = (newQuestion.subject === "Paragraf" || newQuestion.subject === "Problemler") ? 1000 : (SUBJECT_LIMITS[newQuestion.exam_type]?.[newQuestion.subject] || 100);
                    const inputValue = parseInt(e.target.value) || 0;
                    const currentCorrect = parseInt(newQuestion.correct_count) || 0;
                    const currentWrong = parseInt(newQuestion.wrong_count) || 0;
                    const remaining = maxLimit - currentCorrect - currentWrong;
                    const value = Math.min(Math.max(0, inputValue), remaining);
                    setNewQuestion({...newQuestion, blank_count: value.toString()});
                  }}
                  placeholder="0"
                  min="0"
                  max={(newQuestion.subject === "Paragraf" || newQuestion.subject === "Problemler") ? 1000 : (SUBJECT_LIMITS[newQuestion.exam_type]?.[newQuestion.subject] || 100)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tarih</label>
                <Input
                  type="date"
                  value={newQuestion.study_date}
                  onChange={(e) => setNewQuestion({...newQuestion, study_date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Süre (dk)</label>
                <Input
                  type="number"
                  value={newQuestion.time_spent_minutes}
                  onChange={(e) => {
                    const value = e.target.value.replace(/^0+(?=\d)/, '');
                    setNewQuestion({...newQuestion, time_spent_minutes: value});
                  }}
                  placeholder="45"
                  min="0"
                />
              </div>
            </div>

            {/* Geliştirilmiş Yanlış Konular Bölümü - Sadece yanlış sayısı > 0 ise göster */}
            {parseInt(newQuestion.wrong_count) > 0 && (
            <div className="bg-gradient-to-r from-red-50/50 to-orange-50/50 dark:from-red-900/10 dark:to-orange-900/10 rounded-xl p-6 border border-red-200/30 dark:border-red-700/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg shadow-md">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <label className="text-lg font-semibold text-red-700 dark:text-red-300">🔍 Yanlış Konu Analizi</label>
                  <p className="text-sm text-red-600/70 dark:text-red-400/70">Detaylı hata analizi ile eksik konuları belirleyin</p>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Kategori ve Zorluk Seçimi */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-2">Hata Kategorisi</label>
                    <Select value={selectedTopicCategory} onValueChange={(value) => setSelectedTopicCategory(value as any)}>
                      <SelectTrigger className="bg-white/80 dark:bg-gray-800/80 border-red-200 dark:border-red-700/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kavram">🧠 Kavram Eksikliği</SelectItem>
                        <SelectItem value="hesaplama">🔢 Hesaplama Hatası</SelectItem>
                        <SelectItem value="analiz">🔍 Analiz Sorunu</SelectItem>
                        <SelectItem value="dikkatsizlik">⚠️ Dikkatsizlik</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-2">Zorluk Derecesi</label>
                    <Select value={selectedTopicDifficulty} onValueChange={(value) => setSelectedTopicDifficulty(value as any)}>
                      <SelectTrigger className="bg-white/80 dark:bg-gray-800/80 border-red-200 dark:border-red-700/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kolay">🟢 Kolay</SelectItem>
                        <SelectItem value="orta">🟠 Orta</SelectItem>
                        <SelectItem value="zor">🔴 Zor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Geliştirilmiş Konu Girişi */}
                <div className="relative">
                  <Input
                    value={wrongTopicInput}
                    onChange={(e) => setWrongTopicInput(e.target.value)}
                    placeholder={getTopicExamples(newQuestion.exam_type, newQuestion.subject)}
                    className="pl-10 pr-16 h-12 text-base bg-white/80 dark:bg-gray-800/80 border-red-200 dark:border-red-700/50 focus:border-red-400 dark:focus:border-red-500 rounded-xl shadow-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && wrongTopicInput.trim()) {
                        // Title case conversion: her kelimenin baş harfini büyük yap
                        const titleCaseTopic = toTitleCase(wrongTopicInput);
                        
                        // Frekans tracking - localStorage'da say
                        try {
                          const topicFrequencies = JSON.parse(localStorage.getItem('topicErrorFrequencies') || '{}');
                          const topicKey = titleCaseTopic.toLowerCase();
                          topicFrequencies[topicKey] = (topicFrequencies[topicKey] || 0) + 1;
                          localStorage.setItem('topicErrorFrequencies', JSON.stringify(topicFrequencies));
                          
                          // 2 veya daha fazla kez yapılmışsa uyarı göster
                          if (topicFrequencies[topicKey] >= 2) {
                            toast({ 
                              title: "📊 Frekans Bilgisi", 
                              description: `Bu hata ${topicFrequencies[topicKey]} kez yapılmıştır.`, 
                              duration: 4000 
                            });
                          }
                        } catch (error) {
                          console.error('Topic frequency tracking error:', error);
                        }
                        
                        setNewQuestion({
                          ...newQuestion, 
                          wrong_topics: [...newQuestion.wrong_topics, {
                            topic: titleCaseTopic,
                            difficulty: selectedTopicDifficulty,
                            category: selectedTopicCategory
                          }]
                        });
                        setWrongTopicInput("");
                      }
                    }}
                    data-testid="input-wrong-topics"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-red-400 dark:text-red-500" />
                  {wrongTopicInput.trim() && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
                      onClick={() => {
                        if (wrongTopicInput.trim()) {
                          // Başlık durumuna dönüştürme
                          const titleCaseTopic = toTitleCase(wrongTopicInput);

                          // Frekans tracking - localStorage'da say
                          try {
                            const topicFrequencies = JSON.parse(localStorage.getItem('topicErrorFrequencies') || '{}');
                            const topicKey = titleCaseTopic.toLowerCase();
                            topicFrequencies[topicKey] = (topicFrequencies[topicKey] || 0) + 1;
                            localStorage.setItem('topicErrorFrequencies', JSON.stringify(topicFrequencies));
                            
                            // 2 veya daha fazla kez yapılmışsa uyarı göster
                            if (topicFrequencies[topicKey] >= 2) {
                              toast({ 
                                title: "📊 Frekans Bilgisi", 
                                description: `Bu hata ${topicFrequencies[topicKey]} kez yapılmıştır.`, 
                                duration: 4000 
                              });
                            }
                          } catch (error) {
                            console.error('Topic frequency tracking error:', error);
                          }
                          
                          setNewQuestion({
                            ...newQuestion, 
                            wrong_topics: [...newQuestion.wrong_topics, {
                              topic: titleCaseTopic,
                              difficulty: selectedTopicDifficulty,
                              category: selectedTopicCategory
                            }]
                          });
                          setWrongTopicInput("");
                        }
                      }}
                      data-testid="button-add-topic"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Geliştirilmiş Konu Etiketleri Görüntüleme */}
                {newQuestion.wrong_topics.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Tag className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <span className="text-sm font-medium text-red-700 dark:text-red-300">
                        Eklenen Konular ({newQuestion.wrong_topics.length})
                      </span>
                    </div>
                    <div className={`space-y-3 ${newQuestion.wrong_topics.length > 9 ? 'max-h-96 overflow-y-auto custom-scrollbar pr-2' : ''}`}>
                      {newQuestion.wrong_topics.map((topicData, index) => {
                        const getDifficultyIcon = (difficulty: string) => {
                          switch(difficulty) {
                            case 'kolay': return '🟢';
                            case 'orta': return '🟠';
                            case 'zor': return '🔴';
                            default: return '⚪';
                          }
                        };
                        
                        const getCategoryIcon = (category: string) => {
                          switch(category) {
                            case 'kavram': return '🧠';
                            case 'hesaplama': return '🔢';
                            case 'analiz': return '🔍';
                            case 'dikkatsizlik': return '⚠️';
                            default: return '📝';
                          }
                        };
                        
                        const getDifficultyBg = (difficulty: string) => {
                          switch(difficulty) {
                            case 'kolay': return 'from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 border-green-200 dark:border-green-700/50';
                            case 'orta': return 'from-orange-100 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/40 border-orange-200 dark:border-orange-700/50';
                            case 'zor': return 'from-red-100 to-rose-100 dark:from-red-900/40 dark:to-rose-900/40 border-red-200 dark:border-red-700/50';
                            default: return 'from-gray-100 to-slate-100 dark:from-gray-900/40 dark:to-slate-900/40 border-gray-200 dark:border-gray-700/50';
                          }
                        };
                        
                        return (
                          <div
                            key={index}
                            className={`group bg-gradient-to-r ${getDifficultyBg(topicData.difficulty)} border rounded-xl p-4 transition-all duration-300 hover:shadow-lg hover:scale-105`}
                            data-testid={`topic-tag-${index}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">{getCategoryIcon(topicData.category)}</span>
                                    <span className="text-lg font-bold text-red-700 dark:text-red-300">
                                      {topicData.topic}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 text-sm">
                                    <span>{getDifficultyIcon(topicData.difficulty)}</span>
                                    <span className="capitalize text-muted-foreground">
                                      {topicData.difficulty}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span className="capitalize">
                                    {topicData.category === 'kavram' && 'Kavram Eksikliği'}
                                    {topicData.category === 'hesaplama' && 'Hesaplama Hatası'}
                                    {topicData.category === 'analiz' && 'Analiz Sorunu'}
                                    {topicData.category === 'dikkatsizlik' && 'Dikkatsizlik'}
                                  </span>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-red-500 hover:text-red-700 hover:bg-red-200 dark:hover:bg-red-800/50 rounded-full"
                                onClick={() => {
                                  setNewQuestion({
                                    ...newQuestion,
                                    wrong_topics: newQuestion.wrong_topics.filter((_, i) => i !== index)
                                  });
                                }}
                                data-testid={`button-remove-topic-${index}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Geliştirilmiş Konu Önizlemesi */}
                {wrongTopicInput.trim() && (
                  <div className="p-4 bg-gradient-to-r from-blue-50/50 via-purple-50/30 to-indigo-50/50 dark:from-blue-950/30 dark:via-purple-950/20 dark:to-indigo-950/30 rounded-xl border border-blue-200/40 dark:border-blue-800/40">
                    <div className="flex items-center gap-2 mb-3">
                      <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Önizleme</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                      <span className="text-lg">
                        {selectedTopicCategory === 'kavram' && '🧠'}
                        {selectedTopicCategory === 'hesaplama' && '🔢'}
                        {selectedTopicCategory === 'analiz' && '🔍'}
                        {selectedTopicCategory === 'dikkatsizlik' && '⚠️'}
                      </span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">{wrongTopicInput.trim()}</span>
                      <span className="text-sm">
                        {selectedTopicDifficulty === 'kolay' && '🟢'}
                        {selectedTopicDifficulty === 'orta' && '🟠'}
                        {selectedTopicDifficulty === 'zor' && '🔴'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  // Doğru + Yanlış + Boş toplamı kontrolü
                  const maxLimit = SUBJECT_LIMITS[newQuestion.exam_type]?.[newQuestion.subject] || 100;
                  const totalAnswered = (parseInt(newQuestion.correct_count) || 0) + (parseInt(newQuestion.wrong_count) || 0) + (parseInt(newQuestion.blank_count) || 0);
                  
                  if (totalAnswered > maxLimit) {
                    toast({
                      title: "⚠️ Uyarı",
                      description: `Doğru + Yanlış + Boş toplamı (${totalAnswered}) maksimum soru sayısını (${maxLimit}) aşamaz!`,
                      variant: "destructive"
                    });
                    return;
                  }

                  // Yapılandırılmış analiz verilerini basit konu adlarından ayır
                  const wrong_topics_json = newQuestion.wrong_topics.length > 0 ? 
                    JSON.stringify(newQuestion.wrong_topics) : null;
                  const wrong_topics_simple = newQuestion.wrong_topics.map(topic => 
                    typeof topic === 'string' ? topic : topic.topic
                  );

                  if (editingQuestionLog) {
                    updateQuestionLogMutation.mutate({
                      id: editingQuestionLog.id,
                      data: {
                        exam_type: newQuestion.exam_type as "TYT" | "AYT",
                        subject: newQuestion.subject,
                        correct_count: newQuestion.correct_count,
                        wrong_count: newQuestion.wrong_count,
                        blank_count: newQuestion.blank_count || "0",
                        study_date: newQuestion.study_date,
                        wrong_topics: wrong_topics_simple,
                        wrong_topics_json: wrong_topics_json,
                        time_spent_minutes: parseInt(newQuestion.time_spent_minutes) || null
                      }
                    });
                  } else {
                    createQuestionLogMutation.mutate({
                      exam_type: newQuestion.exam_type as "TYT" | "AYT",
                      subject: newQuestion.subject,
                      correct_count: newQuestion.correct_count,
                      wrong_count: newQuestion.wrong_count,
                      blank_count: newQuestion.blank_count || "0",
                      study_date: newQuestion.study_date,
                      wrong_topics: wrong_topics_simple,
                      wrong_topics_json: wrong_topics_json,
                      time_spent_minutes: parseInt(newQuestion.time_spent_minutes) || null
                    });
                  }
                }}
                disabled={!newQuestion.correct_count || !newQuestion.wrong_count || createQuestionLogMutation.isPending}
                className="flex-1"
              >
                {createQuestionLogMutation.isPending ? 'Kaydediliyor...' : (editingQuestionLog ? 'Güncelle' : 'Kaydet')}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowQuestionDialog(false);
                  setEditingQuestionLog(null);
                  setNewQuestion({ 
                    exam_type: "TYT", 
                    subject: "Türkçe", 
                    correct_count: "", 
                    wrong_count: "", 
                    blank_count: "", 
                    study_date: getTurkeyDate(),
                    wrong_topics: [],
                    time_spent_minutes: ""
                  });
                  setWrongTopicInput("");
                  setSelectedTopicDifficulty('kolay');
                  setSelectedTopicCategory('kavram');
                }}
              >
                İptal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sınav Sonucu Diyaloğu */}
      <Dialog open={showExamDialog} onOpenChange={(open) => {
        setShowExamDialog(open);
        if (!open) {
          setEditingExam(null);
          setCurrentWrongTopics({});
          setNewExamResult({ 
            exam_name: "", 
            display_name: "",
            exam_date: getTurkeyDate(), 
            exam_type: "TYT" as "TYT" | "AYT",
            examScope: "full" as "full" | "branch",
            selectedSubject: "turkce" as string,
            wrongTopicsText: "",
            time_spent_minutes: "",
            subjects: {
              turkce: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
              matematik: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
              sosyal: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
              fen: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
              fizik: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
              kimya: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
              biyoloji: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
              geometri: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
              paragraf: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
              problemler: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] }
            }
          });
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle>{editingExam ? "Deneme Düzenle" : "Yeni Deneme Sonucu"}</DialogTitle>
            <DialogDescription>
              {editingExam ? "Deneme adı ve süresini düzenleyin." : "Deneme sınav sonuçlarınızı girin ve net analizinizi takip edin."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!editingExam && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tarih</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {newExamResult.exam_date ? new Date(newExamResult.exam_date).toLocaleDateString('tr-TR', { 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric' 
                        }) : "Tarih seçin"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={newExamResult.exam_date ? new Date(newExamResult.exam_date) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setNewExamResult({
                              ...newExamResult, 
                              exam_date: date.toLocaleDateString('en-CA')
                            });
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Süre (dakika)</label>
                  <Input
                    type="number"
                    value={newExamResult.time_spent_minutes}
                    onChange={(e) => {
                      const value = e.target.value.replace(/^0+(?=\d)/, '');
                      setNewExamResult({...newExamResult, time_spent_minutes: value});
                    }}
                    placeholder="120"
                    min="0"
                    className="bg-white dark:bg-gray-800"
                  />
                </div>
              </div>
            )}
            
            {editingExam && (
              <div>
                <label className="block text-sm font-medium mb-1">Süre (dakika)</label>
                <Input
                  type="number"
                  value={newExamResult.time_spent_minutes}
                  onChange={(e) => setNewExamResult({...newExamResult, time_spent_minutes: e.target.value})}
                  placeholder="120"
                  min="0"
                  className="bg-white dark:bg-gray-800"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Deneme İsmi {!editingExam && "(Opsiyonel)"}
              </label>
              <Input
                type="text"
                placeholder={
                  newExamResult.examScope === "branch"
                    ? "Örn: 345 TYT Fizik Branş Denemesi, Bilgi Sarmal AYT Matematik Denemesi"
                    : "Örn: 345 AYT Genel Deneme, Bilgi Sarmal TYT Genel Deneme, Özdebir Türkiye Geneli TYT Denemesi 1"
                }
                value={newExamResult.display_name}
                onChange={(e) => setNewExamResult({...newExamResult, display_name: e.target.value})}
                className="bg-white dark:bg-gray-800"
              />
              {!editingExam && (
                <p className="text-xs text-muted-foreground mt-1">
                  Boş bırakırsanız otomatik isim oluşturulacak
                </p>
              )}
            </div>

            {!editingExam && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Deneme Türü</label>
                    <Select 
                      value={newExamResult.examScope} 
                      onValueChange={(value: "full" | "branch") => {
                      setCurrentWrongTopics({});
                      setNewExamResult({
                        ...newExamResult, 
                        examScope: value,
                        selectedSubject: "turkce",
                        wrongTopicsText: "",
                        subjects: {
                          turkce: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                          matematik: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                          sosyal: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                          fen: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                          fizik: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                          kimya: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                          biyoloji: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                          geometri: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                          paragraf: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                          problemler: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] }
                        }
                      });
                    }}
                    data-testid="select-exam-scope"
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Genel Deneme</SelectItem>
                      <SelectItem value="branch">Branş Denemesi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Alan</label>
                  <Select 
                    value={newExamResult.exam_type} 
                    onValueChange={(value: "TYT" | "AYT") => {
                      setCurrentWrongTopics({});
                      setNewExamResult({
                        ...newExamResult, 
                        exam_type: value,
                        selectedSubject: "turkce",
                        wrongTopicsText: "",
                        subjects: {
                          turkce: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                          matematik: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                          sosyal: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                          fen: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                          fizik: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                          kimya: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                          biyoloji: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                          geometri: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                          paragraf: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                          problemler: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] }
                        }
                      });
                    }}
                    data-testid="select-exam-type"
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TYT">TYT</SelectItem>
                      <SelectItem value="AYT">Sayısal(AYT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Branş Denemesi Modu */}
              {newExamResult.examScope === "branch" && (
              <div className="border-2 border-purple-300 rounded-lg p-4 space-y-4 bg-purple-50 dark:bg-purple-900/10">
                <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300">Branş Denemesi</h3>
                
                {/* Ders Seçimi */}
                <div>
                  <label className="block text-sm font-medium mb-1">Ders</label>
                  <Select 
                    value={newExamResult.selectedSubject} 
                    onValueChange={(value: string) => {
                      setCurrentWrongTopics({});
                      setNewExamResult({
                        ...newExamResult, 
                        selectedSubject: value,
                        wrongTopicsText: "",
                        subjects: {
                          turkce: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                          matematik: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                          sosyal: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                          fen: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                          fizik: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                          kimya: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                          biyoloji: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                          geometri: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                          paragraf: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                          problemler: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] }
                        }
                      });
                    }}
                    data-testid="select-branch-subject"
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {newExamResult.exam_type === "TYT" ? (
                        <>
                          <SelectItem value="turkce">Türkçe</SelectItem>
                          <SelectItem value="paragraf">Paragraf</SelectItem>
                          <SelectItem value="sosyal">Sosyal Bilimler</SelectItem>
                          <SelectItem value="matematik">Matematik</SelectItem>
                          <SelectItem value="problemler">Problemler</SelectItem>
                          <SelectItem value="geometri">Geometri</SelectItem>
                          <SelectItem value="fizik">Fizik</SelectItem>
                          <SelectItem value="kimya">Kimya</SelectItem>
                          <SelectItem value="biyoloji">Biyoloji</SelectItem>
                          <SelectItem value="fen">Fen Bilimleri</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="matematik">Matematik</SelectItem>
                          <SelectItem value="geometri">Geometri</SelectItem>
                          <SelectItem value="fizik">Fizik</SelectItem>
                          <SelectItem value="kimya">Kimya</SelectItem>
                          <SelectItem value="biyoloji">Biyoloji</SelectItem>
                          <SelectItem value="fen">Fen Bilimleri</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Doğru Yanlış Boş */}
                {(() => {
                  // Branş deneme soru limitleri
                  const getMaxQuestions = (subject: string, examType: string) => {
                    const limits: {[key: string]: {TYT?: number, AYT?: number}} = {
                      turkce: { TYT: 40 },
                      sosyal: { TYT: 20 },
                      matematik: { TYT: 40, AYT: 40 },
                      geometri: { TYT: 10, AYT: 10 },
                      fen: { TYT: 20 },
                      fizik: { TYT: 7, AYT: 14 },
                      kimya: { TYT: 7, AYT: 13 },
                      biyoloji: { TYT: 6, AYT: 13 },
                      paragraf: { TYT: 26 },
                      problemler: { TYT: 13 }
                    };
                    return limits[subject]?.[examType as 'TYT' | 'AYT'] || 100;
                  };

                  const maxQuestions = getMaxQuestions(newExamResult.selectedSubject, newExamResult.exam_type);
                  const currentCorrect = parseInt(newExamResult.subjects[newExamResult.selectedSubject]?.correct || "0");
                  const currentWrong = parseInt(newExamResult.subjects[newExamResult.selectedSubject]?.wrong || "0");
                  const currentBlank = parseInt(newExamResult.subjects[newExamResult.selectedSubject]?.blank || "0");
                  const totalAnswered = currentCorrect + currentWrong + currentBlank;

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                          📝 Soru Girişi
                        </span>
                        <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full">
                          {totalAnswered} / {maxQuestions} soru
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Doğru</label>
                          <Input
                            type="number"
                            min="0"
                            max={maxQuestions}
                            value={newExamResult.subjects[newExamResult.selectedSubject]?.correct || ""}
                            onChange={(e) => {
                              const inputValue = parseInt(e.target.value) || 0;
                              const remaining = maxQuestions - currentWrong - currentBlank;
                              const value = Math.min(Math.max(0, inputValue), remaining);
                              setNewExamResult({
                                ...newExamResult,
                                subjects: {
                                  ...newExamResult.subjects,
                                  [newExamResult.selectedSubject]: { 
                                    ...newExamResult.subjects[newExamResult.selectedSubject], 
                                    correct: value.toString()
                                  }
                                }
                              });
                            }}
                            placeholder="Doğru sayısı"
                            data-testid="input-branch-correct"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Yanlış</label>
                          <Input
                            type="number"
                            min="0"
                            max={maxQuestions}
                            value={newExamResult.subjects[newExamResult.selectedSubject]?.wrong || ""}
                            onChange={(e) => {
                              const inputValue = parseInt(e.target.value) || 0;
                              const remaining = maxQuestions - currentCorrect - currentBlank;
                              const value = Math.min(Math.max(0, inputValue), remaining);
                              setNewExamResult({
                                ...newExamResult,
                                subjects: {
                                  ...newExamResult.subjects,
                                  [newExamResult.selectedSubject]: { 
                                    ...newExamResult.subjects[newExamResult.selectedSubject], 
                                    wrong: value.toString()
                                  }
                                }
                              });
                            }}
                            placeholder="Yanlış sayısı"
                            data-testid="input-branch-wrong"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Boş</label>
                          <Input
                            type="number"
                            min="0"
                            max={maxQuestions}
                            value={newExamResult.subjects[newExamResult.selectedSubject]?.blank || ""}
                            onChange={(e) => {
                              const inputValue = parseInt(e.target.value) || 0;
                              const remaining = maxQuestions - currentCorrect - currentWrong;
                              const value = Math.min(Math.max(0, inputValue), remaining);
                              setNewExamResult({
                                ...newExamResult,
                                subjects: {
                                  ...newExamResult.subjects,
                                  [newExamResult.selectedSubject]: { 
                                    ...newExamResult.subjects[newExamResult.selectedSubject], 
                                    blank: value.toString()
                                  }
                                }
                              });
                            }}
                            placeholder="Boş sayısı"
                            data-testid="input-branch-blank"
                          />
                        </div>
                      </div>
                      {totalAnswered > maxQuestions && (
                        <div className="flex items-center gap-2 p-2 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-700/40">
                          <span className="text-xs text-red-700 dark:text-red-300">
                            ⚠️ Toplam soru sayısı {maxQuestions}'i geçemez!
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Yanlış Konular - Geliştirilmiş Önizleme ile */}
                {(() => {
                  const subjectColors: {[key: string]: {bg: string; border: string; text: string; icon: string; badge: string; input: string}} = {
                    turkce: {
                      bg: "from-green-50/80 via-white/60 to-emerald-50/60 dark:from-green-950/30 dark:via-gray-800/60 dark:to-emerald-950/30",
                      border: "border-green-200/50 dark:border-green-700/40",
                      text: "text-green-800 dark:text-green-200",
                      icon: "from-green-500 to-green-600",
                      badge: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
                      input: "border-green-300/60 dark:border-green-600/50 focus:border-green-500 dark:focus:border-green-400 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-800/50"
                    },
                    matematik: {
                      bg: "from-blue-50/80 via-white/60 to-cyan-50/60 dark:from-blue-950/30 dark:via-gray-800/60 dark:to-cyan-950/30",
                      border: "border-blue-200/50 dark:border-blue-700/40",
                      text: "text-blue-800 dark:text-blue-200",
                      icon: "from-blue-500 to-blue-600",
                      badge: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
                      input: "border-blue-300/60 dark:border-blue-600/50 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50"
                    },
                    fizik: {
                      bg: "from-indigo-50/80 via-white/60 to-purple-50/60 dark:from-indigo-950/30 dark:via-gray-800/60 dark:to-purple-950/30",
                      border: "border-indigo-200/50 dark:border-indigo-700/40",
                      text: "text-indigo-800 dark:text-indigo-200",
                      icon: "from-indigo-500 to-indigo-600",
                      badge: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
                      input: "border-indigo-300/60 dark:border-indigo-600/50 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800/50"
                    },
                    kimya: {
                      bg: "from-emerald-50/80 via-white/60 to-green-50/60 dark:from-emerald-950/30 dark:via-gray-800/60 dark:to-green-950/30",
                      border: "border-emerald-200/50 dark:border-emerald-700/40",
                      text: "text-emerald-800 dark:text-emerald-200",
                      icon: "from-emerald-500 to-emerald-600",
                      badge: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
                      input: "border-emerald-300/60 dark:border-emerald-600/50 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-800/50"
                    },
                    biyoloji: {
                      bg: "from-teal-50/80 via-white/60 to-cyan-50/60 dark:from-teal-950/30 dark:via-gray-800/60 dark:to-cyan-950/30",
                      border: "border-teal-200/50 dark:border-teal-700/40",
                      text: "text-teal-800 dark:text-teal-200",
                      icon: "from-teal-500 to-teal-600",
                      badge: "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300",
                      input: "border-teal-300/60 dark:border-teal-600/50 focus:border-teal-500 dark:focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:focus:ring-teal-800/50"
                    },
                    sosyal: {
                      bg: "from-amber-50/80 via-white/60 to-yellow-50/60 dark:from-amber-950/30 dark:via-gray-800/60 dark:to-yellow-950/30",
                      border: "border-amber-200/50 dark:border-amber-700/40",
                      text: "text-amber-800 dark:text-amber-200",
                      icon: "from-amber-500 to-amber-600",
                      badge: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
                      input: "border-amber-300/60 dark:border-amber-600/50 focus:border-amber-500 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-800/50"
                    },
                    fen: {
                      bg: "from-purple-50/80 via-white/60 to-pink-50/60 dark:from-purple-950/30 dark:via-gray-800/60 dark:to-pink-950/30",
                      border: "border-purple-200/50 dark:border-purple-700/40",
                      text: "text-purple-800 dark:text-purple-200",
                      icon: "from-purple-500 to-purple-600",
                      badge: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
                      input: "border-purple-300/60 dark:border-purple-600/50 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800/50"
                    },
                    geometri: {
                      bg: "from-pink-50/80 via-white/60 to-rose-50/60 dark:from-pink-950/30 dark:via-gray-800/60 dark:to-rose-950/30",
                      border: "border-pink-200/50 dark:border-pink-700/40",
                      text: "text-pink-800 dark:text-pink-200",
                      icon: "from-pink-500 to-pink-600",
                      badge: "bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300",
                      input: "border-pink-300/60 dark:border-pink-600/50 focus:border-pink-500 dark:focus:border-pink-400 focus:ring-2 focus:ring-pink-200 dark:focus:ring-pink-800/50"
                    }
                  };

                  const subjectExamples: {[key: string]: string} = {
                    turkce: "Örnek: cümle çözümleme, sözcük türleri, yazım kuralları, anlatım bozuklukları...",
                    matematik: "Örnek: türev, integral, logaritma, fonksiyonlar, diziler...",
                    fizik: "Örnek: hareket, kuvvet, enerji, elektrik, manyetizma...",
                    kimya: "Örnek: mol kavramı, kimyasal bağlar, asit-baz, elektrokimya...",
                    biyoloji: "Örnek: hücre, kalıtım, ekosistem, sinir sistemi, fotosentez...",
                    sosyal: "Örnek: Osmanlı tarihi, coğrafya, felsefe, Atatürk ilkeleri...",
                    fen: "Örnek: madde ve özellikleri, ışık, ses, basınç, ekosistem...",
                    geometri: "Örnek: üçgenler, dörtgenler, çember, analitik geometri, trigonometri..."
                  };

                  const selectedSubject = newExamResult.selectedSubject;
                  const colors = subjectColors[selectedSubject] || subjectColors.turkce;
                  const placeholder = getTopicExamplesForExam(newExamResult.exam_type, selectedSubject);
                  const wrongCount = parseInt(newExamResult.subjects[newExamResult.selectedSubject]?.wrong) || 0;

                  // Sadece yanlış sayısı > 0 olduğunda göster
                  if (wrongCount === 0) {
                    return null;
                  }

                  return (
                    <div className={`bg-gradient-to-br ${colors.bg} rounded-2xl p-5 border-2 ${colors.border} shadow-lg backdrop-blur-sm`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 bg-gradient-to-br ${colors.icon} rounded-xl shadow-lg`}>
                          <Search className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <label className={`text-sm font-bold ${colors.text} flex items-center gap-2`}>
                            🔍 Yanlış Konu Analizi
                            <div className={`text-xs ${colors.badge} px-2 py-1 rounded-full`}>
                              {wrongCount} yanlış
                            </div>
                          </label>
                          <p className={`text-xs ${colors.text} opacity-80 mt-1`}>
                            Eksik konuları belirterek öncelik listesine ekleyin
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <Textarea
                          value={newExamResult.wrongTopicsText}
                          onChange={(e) => setNewExamResult({...newExamResult, wrongTopicsText: e.target.value})}
                          placeholder={placeholder}
                          className={`h-20 bg-white/90 dark:bg-gray-800/90 ${colors.input} rounded-xl shadow-sm`}
                          data-testid="textarea-branch-wrong-topics"
                        />
                        <p className="text-xs text-gray-500/80 dark:text-gray-400/80">Virgülle ayırarak birden fazla konu girebilirsiniz</p>
                    
                        {newExamResult.wrongTopicsText && newExamResult.wrongTopicsText.trim() && (
                          <div className="flex items-center gap-2 p-3 bg-red-100/60 dark:bg-red-900/30 rounded-xl border border-red-200/60 dark:border-red-700/40">
                            <Lightbulb className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                            <div className="text-xs text-red-700/90 dark:text-red-300/90">
                              <strong>{newExamResult.wrongTopicsText.split(',').filter(t => t.trim()).length} konu</strong> öncelik listesine eklenecek ve hata sıklığı analizinde gösterilecek
                            </div>
                          </div>
                        )}
                        
                        {newExamResult.wrongTopicsText && newExamResult.wrongTopicsText.trim() && (
                          <div className="bg-white/70 dark:bg-gray-800/70 rounded-xl p-4 border border-purple-200/60 dark:border-purple-700/40">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="p-1.5 bg-purple-500 rounded-lg">
                                <FileText className="h-3.5 w-3.5 text-white" />
                              </div>
                              <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">Konu Önizlemesi</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {newExamResult.wrongTopicsText.split(',').filter(t => t.trim()).map((topic, index) => (
                                <div key={index} className="px-3 py-1.5 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 rounded-lg border border-purple-200 dark:border-purple-700 text-xs font-medium text-purple-800 dark:text-purple-200 shadow-sm">
                                  {topic.trim()}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* TYT Konular */}
            {newExamResult.examScope === "full" && newExamResult.exam_type === "TYT" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">TYT Dersleri</h3>
                
                {/* Türkçe */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-green-600">Türkçe</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-medium mb-1">Doğru</label>
                      <Input
                        type="number"
                        min="0"
                        max="40"
                        value={newExamResult.subjects.turkce.correct}
                        onChange={(e) => {
                          const cleanedValue = cleanNumberInput(e.target.value);
          const value = parseInt(cleanedValue) || 0;
                          const wrong = parseInt(newExamResult.subjects.turkce.wrong) || 0;
                          const blank = parseInt(newExamResult.subjects.turkce.blank) || 0;
                          const maxAllowed = SUBJECT_LIMITS.TYT['Türkçe'] - wrong - blank;
                          const limitedValue = Math.min(value, maxAllowed);
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              turkce: { ...newExamResult.subjects.turkce, correct: limitedValue.toString() }
                            }
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Yanlış</label>
                      <Input
                        type="number"
                        min="0"
                        max="40"
                        value={newExamResult.subjects.turkce.wrong}
                        onChange={(e) => {
                          const cleanedValue = cleanNumberInput(e.target.value);
          const value = parseInt(cleanedValue) || 0;
                          const correct = parseInt(newExamResult.subjects.turkce.correct) || 0;
                          const blank = parseInt(newExamResult.subjects.turkce.blank) || 0;
                          const maxAllowed = SUBJECT_LIMITS.TYT['Türkçe'] - correct - blank;
                          const limitedValue = Math.min(value, maxAllowed);
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              turkce: { ...newExamResult.subjects.turkce, wrong: limitedValue.toString() }
                            }
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Boş</label>
                      <Input
                        type="number"
                        min="0"
                        max="40"
                        value={newExamResult.subjects.turkce.blank}
                        onChange={(e) => {
                          const cleanedValue = cleanNumberInput(e.target.value);
          const value = parseInt(cleanedValue) || 0;
                          const correct = parseInt(newExamResult.subjects.turkce.correct) || 0;
                          const wrong = parseInt(newExamResult.subjects.turkce.wrong) || 0;
                          const maxAllowed = SUBJECT_LIMITS.TYT['Türkçe'] - correct - wrong;
                          const limitedValue = Math.min(value, maxAllowed);
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              turkce: { ...newExamResult.subjects.turkce, blank: limitedValue.toString() }
                            }
                          });
                        }}
                      />
                    </div>
                  </div>
                  {parseInt(newExamResult.subjects.turkce.wrong) > 0 && (
                    <div className="bg-gradient-to-br from-red-50/80 via-white/60 to-orange-50/60 dark:from-red-950/30 dark:via-gray-800/60 dark:to-orange-950/30 rounded-2xl p-5 border-2 border-red-200/50 dark:border-red-700/40 shadow-lg backdrop-blur-sm mt-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg">
                          <Search className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <label className="text-sm font-bold text-red-800 dark:text-red-200 flex items-center gap-2">
                            🔍 Türkçe Yanlış Konu Analizi
                            <div className="text-xs bg-red-100 dark:bg-red-900/40 px-2 py-1 rounded-full text-red-700 dark:text-red-300">
                              {parseInt(newExamResult.subjects.turkce.wrong)} yanlış
                            </div>
                          </label>
                          <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">
                            Eksik konuları belirterek öncelik listesine ekleyin
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <Input
                          value={currentWrongTopics.turkce || ""}
                          onChange={(e) => {
                            setCurrentWrongTopics({...currentWrongTopics, turkce: e.target.value});
                            const topics = e.target.value.split(',').map(t => toTitleCase(t.trim())).filter(t => t.length > 0);
                            const uniqueTopics = [...new Set(topics)];
                            setNewExamResult({
                              ...newExamResult,
                              subjects: {
                                ...newExamResult.subjects,
                                turkce: { ...newExamResult.subjects.turkce, wrong_topics: uniqueTopics }
                              }
                            });
                          }}
                          placeholder="Örnek: cümle çözümleme, sözcük türleri, yazım kuralları..."
                          className="bg-white/90 dark:bg-gray-800/90 border-red-300/60 dark:border-red-600/50 focus:border-red-500 dark:focus:border-red-400 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-800/50 rounded-xl shadow-sm text-sm"
                        />
                        {currentWrongTopics.turkce && (
                          <div className="flex items-center gap-2 p-3 bg-red-100/60 dark:bg-red-900/30 rounded-xl border border-red-200/60 dark:border-red-700/40">
                            <Lightbulb className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                            <div className="text-xs text-red-700/90 dark:text-red-300/90">
                              <strong>{currentWrongTopics.turkce.split(',').length} konu</strong> öncelik listesine eklenecek ve hata sıklığı analizinde gösterilecek
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {/* Sosyal */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-purple-600">Sosyal Bilimler</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-medium mb-1">Doğru</label>
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        value={newExamResult.subjects.sosyal.correct}
                        onChange={(e) => {
                          const cleanedValue = cleanNumberInput(e.target.value);
          const value = parseInt(cleanedValue) || 0;
                          const wrong = parseInt(newExamResult.subjects.sosyal.wrong) || 0;
                          const blank = parseInt(newExamResult.subjects.sosyal.blank) || 0;
                          const maxAllowed = SUBJECT_LIMITS.TYT['Sosyal Bilimler'] - wrong - blank;
                          const limitedValue = Math.min(value, maxAllowed);
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              sosyal: { ...newExamResult.subjects.sosyal, correct: limitedValue.toString() }
                            }
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Yanlış</label>
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        value={newExamResult.subjects.sosyal.wrong}
                        onChange={(e) => {
                          const cleanedValue = cleanNumberInput(e.target.value);
          const value = parseInt(cleanedValue) || 0;
                          const correct = parseInt(newExamResult.subjects.sosyal.correct) || 0;
                          const blank = parseInt(newExamResult.subjects.sosyal.blank) || 0;
                          const maxAllowed = SUBJECT_LIMITS.TYT['Sosyal Bilimler'] - correct - blank;
                          const limitedValue = Math.min(value, maxAllowed);
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              sosyal: { ...newExamResult.subjects.sosyal, wrong: limitedValue.toString() }
                            }
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Boş</label>
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        value={newExamResult.subjects.sosyal.blank}
                        onChange={(e) => {
                          const cleanedValue = cleanNumberInput(e.target.value);
          const value = parseInt(cleanedValue) || 0;
                          const correct = parseInt(newExamResult.subjects.sosyal.correct) || 0;
                          const wrong = parseInt(newExamResult.subjects.sosyal.wrong) || 0;
                          const maxAllowed = SUBJECT_LIMITS.TYT['Sosyal Bilimler'] - correct - wrong;
                          const limitedValue = Math.min(value, maxAllowed);
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              sosyal: { ...newExamResult.subjects.sosyal, blank: limitedValue.toString() }
                            }
                          });
                        }}
                      />
                    </div>
                  </div>
                  {parseInt(newExamResult.subjects.sosyal.wrong) > 0 && (
                    <div className="bg-gradient-to-br from-purple-50/80 via-white/60 to-indigo-50/60 dark:from-purple-950/30 dark:via-gray-800/60 dark:to-indigo-950/30 rounded-2xl p-5 border-2 border-purple-200/50 dark:border-purple-700/40 shadow-lg backdrop-blur-sm mt-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
                          <Search className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <label className="text-sm font-bold text-purple-800 dark:text-purple-200 flex items-center gap-2">
                            🔍 Sosyal Bilimler Yanlış Konu Analizi
                            <div className="text-xs bg-purple-100 dark:bg-purple-900/40 px-2 py-1 rounded-full text-purple-700 dark:text-purple-300">
                              {parseInt(newExamResult.subjects.sosyal.wrong)} yanlış
                            </div>
                          </label>
                          <p className="text-xs text-purple-600/80 dark:text-purple-400/80 mt-1">
                            Eksik konuları belirterek öncelik listesine ekleyin
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <Input
                          value={currentWrongTopics.sosyal || ""}
                          onChange={(e) => {
                            setCurrentWrongTopics({...currentWrongTopics, sosyal: e.target.value});
                            const topics = e.target.value.split(',').map(t => toTitleCase(t.trim())).filter(t => t.length > 0);
                            const uniqueTopics = [...new Set(topics)];
                            setNewExamResult({
                              ...newExamResult,
                              subjects: {
                                ...newExamResult.subjects,
                                sosyal: { ...newExamResult.subjects.sosyal, wrong_topics: uniqueTopics }
                              }
                            });
                          }}
                          placeholder="Örnek: Osmanlı tarihi, fiziki coğrafya, felsefe akımları, din kültürü konuları..."
                          className="bg-white/90 dark:bg-gray-800/90 border-purple-300/60 dark:border-purple-600/50 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800/50 rounded-xl shadow-sm text-sm"
                        />
                        {currentWrongTopics.sosyal && (
                          <div className="flex items-center gap-2 p-3 bg-purple-100/60 dark:bg-purple-900/30 rounded-xl border border-purple-200/60 dark:border-purple-700/40">
                            <Lightbulb className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                            <div className="text-xs text-purple-700/90 dark:text-purple-300/90">
                              <strong>{currentWrongTopics.sosyal.split(',').length} konu</strong> öncelik listesine eklenecek ve hata sıklığı analizinde gösterilecek
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {/* Matematik */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-blue-600">Matematik</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-medium mb-1">Doğru</label>
                      <Input
                        type="number"
                        min="0"
                        max="30"
                        value={newExamResult.subjects.matematik.correct}
                        onChange={(e) => {
                          const cleanedValue = cleanNumberInput(e.target.value);
          const value = parseInt(cleanedValue) || 0;
                          const wrong = parseInt(newExamResult.subjects.matematik.wrong) || 0;
                          const blank = parseInt(newExamResult.subjects.matematik.blank) || 0;
                          const maxAllowed = SUBJECT_LIMITS.TYT['Matematik'] - wrong - blank;
                          const limitedValue = Math.min(value, maxAllowed);
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              matematik: { ...newExamResult.subjects.matematik, correct: limitedValue.toString() }
                            }
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Yanlış</label>
                      <Input
                        type="number"
                        min="0"
                        max="30"
                        value={newExamResult.subjects.matematik.wrong}
                        onChange={(e) => {
                          const cleanedValue = cleanNumberInput(e.target.value);
          const value = parseInt(cleanedValue) || 0;
                          const correct = parseInt(newExamResult.subjects.matematik.correct) || 0;
                          const blank = parseInt(newExamResult.subjects.matematik.blank) || 0;
                          const maxAllowed = SUBJECT_LIMITS.TYT['Matematik'] - correct - blank;
                          const limitedValue = Math.min(value, maxAllowed);
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              matematik: { ...newExamResult.subjects.matematik, wrong: limitedValue.toString() }
                            }
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Boş</label>
                      <Input
                        type="number"
                        min="0"
                        max="30"
                        value={newExamResult.subjects.matematik.blank}
                        onChange={(e) => {
                          const cleanedValue = cleanNumberInput(e.target.value);
          const value = parseInt(cleanedValue) || 0;
                          const correct = parseInt(newExamResult.subjects.matematik.correct) || 0;
                          const wrong = parseInt(newExamResult.subjects.matematik.wrong) || 0;
                          const maxAllowed = SUBJECT_LIMITS.TYT['Matematik'] - correct - wrong;
                          const limitedValue = Math.min(value, maxAllowed);
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              matematik: { ...newExamResult.subjects.matematik, blank: limitedValue.toString() }
                            }
                          });
                        }}
                      />
                    </div>
                  </div>
                  {parseInt(newExamResult.subjects.matematik.wrong) > 0 && (
                    <div className="bg-gradient-to-br from-blue-50/80 via-white/60 to-cyan-50/60 dark:from-blue-950/30 dark:via-gray-800/60 dark:to-cyan-950/30 rounded-2xl p-5 border-2 border-blue-200/50 dark:border-blue-700/40 shadow-lg backdrop-blur-sm mt-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                          <Search className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <label className="text-sm font-bold text-blue-800 dark:text-blue-200 flex items-center gap-2">
                            🔍 Matematik Yanlış Konu Analizi
                            <div className="text-xs bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded-full text-blue-700 dark:text-blue-300">
                              {parseInt(newExamResult.subjects.matematik.wrong)} yanlış
                            </div>
                          </label>
                          <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1">
                            Eksik konuları belirterek öncelik listesine ekleyin
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <Input
                          value={currentWrongTopics.matematik || ""}
                          onChange={(e) => {
                            setCurrentWrongTopics({...currentWrongTopics, matematik: e.target.value});
                            const topics = e.target.value.split(',').map(t => toTitleCase(t.trim())).filter(t => t.length > 0);
                            const uniqueTopics = [...new Set(topics)];
                            setNewExamResult({
                              ...newExamResult,
                              subjects: {
                                ...newExamResult.subjects,
                                matematik: { ...newExamResult.subjects.matematik, wrong_topics: uniqueTopics }
                              }
                            });
                          }}
                          placeholder="Örnek: temel kavramlar, problemler, fonksiyonlar, permütasyon-kombinasyon, olasılık..."
                          className="bg-white/90 dark:bg-gray-800/90 border-blue-300/60 dark:border-blue-600/50 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800/50 rounded-xl shadow-sm text-sm"
                        />
                        {currentWrongTopics.matematik && (
                          <div className="flex items-center gap-2 p-3 bg-blue-100/60 dark:bg-blue-900/30 rounded-xl border border-blue-200/60 dark:border-blue-700/40">
                            <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            <div className="text-xs text-blue-700/90 dark:text-blue-300/90">
                              <strong>{currentWrongTopics.matematik.split(',').length} konu</strong> öncelik listesine eklenecek ve hata sıklığı analizinde gösterilecek
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {/* TYT Geometri */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-pink-600">Geometri</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-medium mb-1">Doğru</label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={newExamResult.subjects.geometri.correct}
                        onChange={(e) => {
                          const cleanedValue = cleanNumberInput(e.target.value);
                          const value = parseInt(cleanedValue) || 0;
                          const wrong = parseInt(newExamResult.subjects.geometri.wrong) || 0;
                          const blank = parseInt(newExamResult.subjects.geometri.blank) || 0;
                          const maxAllowed = SUBJECT_LIMITS.TYT['Geometri'] - wrong - blank;
                          const limitedValue = Math.min(value, maxAllowed);
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              geometri: { ...newExamResult.subjects.geometri, correct: limitedValue.toString() }
                            }
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Yanlış</label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={newExamResult.subjects.geometri.wrong}
                        onChange={(e) => {
                          const cleanedValue = cleanNumberInput(e.target.value);
                          const value = parseInt(cleanedValue) || 0;
                          const correct = parseInt(newExamResult.subjects.geometri.correct) || 0;
                          const blank = parseInt(newExamResult.subjects.geometri.blank) || 0;
                          const maxAllowed = SUBJECT_LIMITS.TYT['Geometri'] - correct - blank;
                          const limitedValue = Math.min(value, maxAllowed);
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              geometri: { ...newExamResult.subjects.geometri, wrong: limitedValue.toString() }
                            }
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Boş</label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={newExamResult.subjects.geometri.blank}
                        onChange={(e) => {
                          const cleanedValue = cleanNumberInput(e.target.value);
                          const value = parseInt(cleanedValue) || 0;
                          const correct = parseInt(newExamResult.subjects.geometri.correct) || 0;
                          const wrong = parseInt(newExamResult.subjects.geometri.wrong) || 0;
                          const maxAllowed = SUBJECT_LIMITS.TYT['Geometri'] - correct - wrong;
                          const limitedValue = Math.min(value, maxAllowed);
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              geometri: { ...newExamResult.subjects.geometri, blank: limitedValue.toString() }
                            }
                          });
                        }}
                      />
                    </div>
                  </div>
                  {parseInt(newExamResult.subjects.geometri.wrong) > 0 && (
                    <div className="bg-gradient-to-br from-pink-50/80 via-white/60 to-rose-50/60 dark:from-pink-950/30 dark:via-gray-800/60 dark:to-rose-950/30 rounded-2xl p-5 border-2 border-pink-200/50 dark:border-pink-700/40 shadow-lg backdrop-blur-sm mt-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl shadow-lg">
                          <Search className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <label className="text-sm font-bold text-pink-800 dark:text-pink-200 flex items-center gap-2">
                            🔍 Geometri Yanlış Konu Analizi
                            <div className="text-xs bg-pink-100 dark:bg-pink-900/40 px-2 py-1 rounded-full text-pink-700 dark:text-pink-300">
                              {parseInt(newExamResult.subjects.geometri.wrong)} yanlış
                            </div>
                          </label>
                          <p className="text-xs text-pink-600/80 dark:text-pink-400/80 mt-1">
                            Eksik konuları belirterek öncelik listesine ekleyin
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <Input
                          value={currentWrongTopics.geometri || ""}
                          onChange={(e) => {
                            setCurrentWrongTopics({...currentWrongTopics, geometri: e.target.value});
                            const topics = e.target.value.split(',').map(t => toTitleCase(t.trim())).filter(t => t.length > 0);
                            const uniqueTopics = [...new Set(topics)];
                            setNewExamResult({
                              ...newExamResult,
                              subjects: {
                                ...newExamResult.subjects,
                                geometri: { ...newExamResult.subjects.geometri, wrong_topics: uniqueTopics }
                              }
                            });
                          }}
                          placeholder="Örnek: açılar ve üçgenler, çokgenler, çember ve daire, analitik geometri, katı cisimler..."
                          className="bg-white/90 dark:bg-gray-800/90 border-pink-300/60 dark:border-pink-600/50 focus:border-pink-500 dark:focus:border-pink-400 focus:ring-2 focus:ring-pink-200 dark:focus:ring-pink-800/50 rounded-xl shadow-sm text-sm"
                        />
                        {currentWrongTopics.geometri && (
                          <div className="flex items-center gap-2 p-3 bg-pink-100/60 dark:bg-pink-900/30 rounded-xl border border-pink-200/60 dark:border-pink-700/40">
                            <Lightbulb className="h-4 w-4 text-pink-600 dark:text-pink-400 flex-shrink-0" />
                            <div className="text-xs text-pink-700/90 dark:text-pink-300/90">
                              <strong>{currentWrongTopics.geometri.split(',').length} konu</strong> öncelik listesine eklenecek ve hata sıklığı analizinde gösterilecek
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {/* Fen */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-orange-600">Fen Bilimleri</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-medium mb-1">Doğru</label>
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        value={newExamResult.subjects.fen.correct}
                        onChange={(e) => {
                          const cleanedValue = cleanNumberInput(e.target.value);
          const value = parseInt(cleanedValue) || 0;
                          const wrong = parseInt(newExamResult.subjects.fen.wrong) || 0;
                          const blank = parseInt(newExamResult.subjects.fen.blank) || 0;
                          const maxAllowed = SUBJECT_LIMITS.TYT['Fen Bilimleri'] - wrong - blank;
                          const limitedValue = Math.min(value, maxAllowed);
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              fen: { ...newExamResult.subjects.fen, correct: limitedValue.toString() }
                            }
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Yanlış</label>
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        value={newExamResult.subjects.fen.wrong}
                        onChange={(e) => {
                          const cleanedValue = cleanNumberInput(e.target.value);
          const value = parseInt(cleanedValue) || 0;
                          const correct = parseInt(newExamResult.subjects.fen.correct) || 0;
                          const blank = parseInt(newExamResult.subjects.fen.blank) || 0;
                          const maxAllowed = SUBJECT_LIMITS.TYT['Fen Bilimleri'] - correct - blank;
                          const limitedValue = Math.min(value, maxAllowed);
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              fen: { ...newExamResult.subjects.fen, wrong: limitedValue.toString() }
                            }
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Boş</label>
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        value={newExamResult.subjects.fen.blank}
                        onChange={(e) => {
                          const cleanedValue = cleanNumberInput(e.target.value);
          const value = parseInt(cleanedValue) || 0;
                          const correct = parseInt(newExamResult.subjects.fen.correct) || 0;
                          const wrong = parseInt(newExamResult.subjects.fen.wrong) || 0;
                          const maxAllowed = SUBJECT_LIMITS.TYT['Fen Bilimleri'] - correct - wrong;
                          const limitedValue = Math.min(value, maxAllowed);
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              fen: { ...newExamResult.subjects.fen, blank: limitedValue.toString() }
                            }
                          });
                        }}
                      />
                    </div>
                  </div>
                  {parseInt(newExamResult.subjects.fen.wrong) > 0 && (
                    <div className="bg-gradient-to-br from-orange-50/80 via-white/60 to-amber-50/60 dark:from-orange-950/30 dark:via-gray-800/60 dark:to-amber-950/30 rounded-2xl p-5 border-2 border-orange-200/50 dark:border-orange-700/40 shadow-lg backdrop-blur-sm mt-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg">
                          <Search className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <label className="text-sm font-bold text-orange-800 dark:text-orange-200 flex items-center gap-2">
                            🔍 Fen Bilimleri Yanlış Konu Analizi
                            <div className="text-xs bg-orange-100 dark:bg-orange-900/40 px-2 py-1 rounded-full text-orange-700 dark:text-orange-300">
                              {parseInt(newExamResult.subjects.fen.wrong)} yanlış
                            </div>
                          </label>
                          <p className="text-xs text-orange-600/80 dark:text-orange-400/80 mt-1">
                            Eksik konuları belirterek öncelik listesine ekleyin
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <Input
                          value={currentWrongTopics.fen || ""}
                          onChange={(e) => {
                            setCurrentWrongTopics({...currentWrongTopics, fen: e.target.value});
                            const topics = e.target.value.split(',').map(t => {
                              const cleanTopic = toTitleCase(t.trim());
                              return cleanTopic ? `${newExamResult.exam_type} Fen Bilimleri - ${cleanTopic}` : '';
                            }).filter(t => t.length > 0);
                            
                            // Yinelenenleri kaldır
                            const uniqueTopics = [...new Set(topics)];
                            
                            setNewExamResult({
                              ...newExamResult,
                              subjects: {
                                ...newExamResult.subjects,
                                fen: { ...newExamResult.subjects.fen, wrong_topics: uniqueTopics }
                              }
                            });
                          }}
                          placeholder="Örnek: kuvvet ve hareket, maddenin halleri, hücre ve organelleri..."
                          className="bg-white/90 dark:bg-gray-800/90 border-orange-300/60 dark:border-orange-600/50 focus:border-orange-500 dark:focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-800/50 rounded-xl shadow-sm text-sm"
                        />
                        {currentWrongTopics.fen && (
                          <div className="flex items-center gap-2 p-3 bg-orange-100/60 dark:bg-orange-900/30 rounded-xl border border-orange-200/60 dark:border-orange-700/40">
                            <Lightbulb className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                            <div className="text-xs text-orange-700/90 dark:text-orange-300/90">
                              <strong>{currentWrongTopics.fen.split(',').length} konu</strong> öncelik listesine eklenecek ve hata sıklığı analizinde gösterilecek
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AYT Sayısal Konular */}
            {newExamResult.examScope === "full" && newExamResult.exam_type === "AYT" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">AYT Sayısal Dersleri</h3>
                
                {/* Matematik */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-blue-600">Matematik</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-medium mb-1">Doğru</label>
                      <Input
                        type="number"
                        min="0"
                        max="30"
                        value={newExamResult.subjects.matematik.correct}
                        onChange={(e) => {
                          const cleanedValue = cleanNumberInput(e.target.value);
          const value = parseInt(cleanedValue) || 0;
                          const wrong = parseInt(newExamResult.subjects.matematik.wrong) || 0;
                          const blank = parseInt(newExamResult.subjects.matematik.blank) || 0;
                          const maxAllowed = SUBJECT_LIMITS.AYT['Matematik'] - wrong - blank;
                          const limitedValue = Math.min(value, maxAllowed);
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              matematik: { ...newExamResult.subjects.matematik, correct: limitedValue.toString() }
                            }
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Yanlış</label>
                      <Input
                        type="number"
                        min="0"
                        max="30"
                        value={newExamResult.subjects.matematik.wrong}
                        onChange={(e) => {
                          const cleanedValue = cleanNumberInput(e.target.value);
          const value = parseInt(cleanedValue) || 0;
                          const correct = parseInt(newExamResult.subjects.matematik.correct) || 0;
                          const blank = parseInt(newExamResult.subjects.matematik.blank) || 0;
                          const maxAllowed = SUBJECT_LIMITS.AYT['Matematik'] - correct - blank;
                          const limitedValue = Math.min(value, maxAllowed);
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              matematik: { ...newExamResult.subjects.matematik, wrong: limitedValue.toString() }
                            }
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Boş</label>
                      <Input
                        type="number"
                        min="0"
                        max="30"
                        value={newExamResult.subjects.matematik.blank}
                        onChange={(e) => {
                          const cleanedValue = cleanNumberInput(e.target.value);
          const value = parseInt(cleanedValue) || 0;
                          const correct = parseInt(newExamResult.subjects.matematik.correct) || 0;
                          const wrong = parseInt(newExamResult.subjects.matematik.wrong) || 0;
                          const maxAllowed = SUBJECT_LIMITS.AYT['Matematik'] - correct - wrong;
                          const limitedValue = Math.min(value, maxAllowed);
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              matematik: { ...newExamResult.subjects.matematik, blank: limitedValue.toString() }
                            }
                          });
                        }}
                      />
                    </div>
                  </div>
                  {parseInt(newExamResult.subjects.matematik.wrong) > 0 && (
                    <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/15 rounded-xl p-4 border border-blue-200/40 dark:border-blue-700/30 mt-3">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-4 w-4 text-blue-500" />
                        <label className="text-sm font-semibold text-blue-700 dark:text-blue-300">🔍 Matematik Eksik Konular</label>
                      </div>
                      <Input
                        value={currentWrongTopics.matematik || ""}
                        onChange={(e) => {
                          setCurrentWrongTopics({...currentWrongTopics, matematik: e.target.value});
                          const topics = e.target.value.split(',').map(t => toTitleCase(t.trim())).filter(t => t.length > 0);
                          const uniqueTopics = [...new Set(topics)];
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              matematik: { ...newExamResult.subjects.matematik, wrong_topics: uniqueTopics }
                            }
                          });
                        }}
                        placeholder="Limit, Türev, İntegral, Trigonometri, Logaritma gibi..."
                        className="bg-white/80 dark:bg-gray-800/80 border-blue-200 dark:border-blue-700/50 focus:border-blue-400 dark:focus:border-blue-500 rounded-xl shadow-sm"
                      />
                      {currentWrongTopics.matematik && (
                        <div className="mt-2 text-xs text-blue-600/70 dark:text-blue-400/70">
                          💡 Bu konular öncelik listesine eklenecek
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* AYT Geometri */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-pink-600">Geometri</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-medium mb-1">Doğru</label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={newExamResult.subjects.geometri.correct}
                        onChange={(e) => {
                          const cleanedValue = cleanNumberInput(e.target.value);
          const value = parseInt(cleanedValue) || 0;
                          const wrong = parseInt(newExamResult.subjects.geometri.wrong) || 0;
                          const blank = parseInt(newExamResult.subjects.geometri.blank) || 0;
                          const maxAllowed = SUBJECT_LIMITS.AYT['Geometri'] - wrong - blank;
                          const limitedValue = Math.min(value, maxAllowed);
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              geometri: { ...newExamResult.subjects.geometri, correct: limitedValue.toString() }
                            }
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Yanlış</label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={newExamResult.subjects.geometri.wrong}
                        onChange={(e) => {
                          const cleanedValue = cleanNumberInput(e.target.value);
          const value = parseInt(cleanedValue) || 0;
                          const correct = parseInt(newExamResult.subjects.geometri.correct) || 0;
                          const blank = parseInt(newExamResult.subjects.geometri.blank) || 0;
                          const maxAllowed = SUBJECT_LIMITS.AYT['Geometri'] - correct - blank;
                          const limitedValue = Math.min(value, maxAllowed);
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              geometri: { ...newExamResult.subjects.geometri, wrong: limitedValue.toString() }
                            }
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Boş</label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={newExamResult.subjects.geometri.blank}
                        onChange={(e) => {
                          const cleanedValue = cleanNumberInput(e.target.value);
          const value = parseInt(cleanedValue) || 0;
                          const correct = parseInt(newExamResult.subjects.geometri.correct) || 0;
                          const wrong = parseInt(newExamResult.subjects.geometri.wrong) || 0;
                          const maxAllowed = SUBJECT_LIMITS.AYT['Geometri'] - correct - wrong;
                          const limitedValue = Math.min(value, maxAllowed);
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              geometri: { ...newExamResult.subjects.geometri, blank: limitedValue.toString() }
                            }
                          });
                        }}
                      />
                    </div>
                  </div>
                  {parseInt(newExamResult.subjects.geometri.wrong) > 0 && (
                    <div className="bg-gradient-to-r from-pink-50/70 to-rose-50/50 dark:from-pink-900/20 dark:to-rose-900/15 rounded-xl p-4 border border-pink-200/40 dark:border-pink-700/30 mt-3">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-4 w-4 text-pink-500" />
                        <label className="text-sm font-semibold text-pink-700 dark:text-pink-300">🔍 Geometri Eksik Konular</label>
                      </div>
                      <Input
                        value={currentWrongTopics.geometri || ""}
                        onChange={(e) => {
                          setCurrentWrongTopics({...currentWrongTopics, geometri: e.target.value});
                          const topics = e.target.value.split(',').map(t => toTitleCase(t.trim())).filter(t => t.length > 0);
                          const uniqueTopics = [...new Set(topics)];
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              geometri: { ...newExamResult.subjects.geometri, wrong_topics: uniqueTopics }
                            }
                          });
                        }}
                        placeholder="Örnek: doğruda ve üçgende açı, özel üçgenler, çember ve daire, doğrunun analitiği, çemberin analitiği..."
                        className="bg-white/80 dark:bg-gray-800/80 border-pink-200 dark:border-pink-700/50 focus:border-pink-400 dark:focus:border-pink-500 rounded-xl shadow-sm"
                      />
                      {currentWrongTopics.geometri && (
                        <div className="mt-2 text-xs text-pink-600/70 dark:text-pink-400/70">
                          💡 Bu konular öncelik listesine eklenecek
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Fizik */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-red-600">Fizik</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-medium mb-1">Doğru</label>
                      <Input
                        type="number"
                        min="0"
                        max="14"
                        value={newExamResult.subjects.fizik.correct}
                        onChange={(e) => {
                          const cleanedValue = cleanNumberInput(e.target.value);
          const value = parseInt(cleanedValue) || 0;
                          const wrong = parseInt(newExamResult.subjects.fizik.wrong) || 0;
                          const blank = parseInt(newExamResult.subjects.fizik.blank) || 0;
                          const maxAllowed = SUBJECT_LIMITS.AYT['Fizik'] - wrong - blank;
                          const limitedValue = Math.min(value, maxAllowed);
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              fizik: { ...newExamResult.subjects.fizik, correct: limitedValue.toString() }
                            }
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Yanlış</label>
                      <Input
                        type="number"
                        min="0"
                        max="14"
                        value={newExamResult.subjects.fizik.wrong}
                        onChange={(e) => {
                          const cleanedValue = cleanNumberInput(e.target.value);
          const value = parseInt(cleanedValue) || 0;
                          const correct = parseInt(newExamResult.subjects.fizik.correct) || 0;
                          const blank = parseInt(newExamResult.subjects.fizik.blank) || 0;
                          const maxAllowed = SUBJECT_LIMITS.AYT['Fizik'] - correct - blank;
                          const limitedValue = Math.min(value, maxAllowed);
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              fizik: { ...newExamResult.subjects.fizik, wrong: limitedValue.toString() }
                            }
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Boş</label>
                      <Input
                        type="number"
                        min="0"
                        max="14"
                        value={newExamResult.subjects.fizik.blank}
                        onChange={(e) => {
                          const cleanedValue = cleanNumberInput(e.target.value);
          const value = parseInt(cleanedValue) || 0;
                          const correct = parseInt(newExamResult.subjects.fizik.correct) || 0;
                          const wrong = parseInt(newExamResult.subjects.fizik.wrong) || 0;
                          const maxAllowed = SUBJECT_LIMITS.AYT['Fizik'] - correct - wrong;
                          const limitedValue = Math.min(value, maxAllowed);
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              fizik: { ...newExamResult.subjects.fizik, blank: limitedValue.toString() }
                            }
                          });
                        }}
                      />
                    </div>
                  </div>
                  {parseInt(newExamResult.subjects.fizik.wrong) > 0 && (
                    <div className="bg-gradient-to-r from-indigo-50/70 to-blue-50/50 dark:from-indigo-900/20 dark:to-blue-900/15 rounded-xl p-4 border border-indigo-200/40 dark:border-indigo-700/30 mt-3">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-4 w-4 text-indigo-500" />
                        <label className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">🔍 Fizik Eksik Konular</label>
                      </div>
                      <Input
                        value={currentWrongTopics.fizik || ""}
                        onChange={(e) => {
                          setCurrentWrongTopics({...currentWrongTopics, fizik: e.target.value});
                          const topics = e.target.value.split(',').map(t => toTitleCase(t.trim())).filter(t => t.length > 0);
                          const uniqueTopics = [...new Set(topics)];
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              fizik: { ...newExamResult.subjects.fizik, wrong_topics: uniqueTopics }
                            }
                          });
                        }}
                        placeholder="Hareket, Newton'un Hareket Yasaları, İş Güç Enerji gibi..."
                        className="bg-white/80 dark:bg-gray-800/80 border-indigo-200 dark:border-indigo-700/50 focus:border-indigo-400 dark:focus:border-indigo-500 rounded-xl shadow-sm"
                      />
                      {currentWrongTopics.fizik && (
                        <div className="mt-2 text-xs text-indigo-600/70 dark:text-indigo-400/70">
                          💡 Bu konular öncelik listesine eklenecek
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Kimya */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-green-600">Kimya</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-medium mb-1">Doğru</label>
                      <Input
                        type="number"
                        min="0"
                        max="13"
                        value={newExamResult.subjects.kimya.correct}
                        onChange={(e) => {
                          const cleanedValue = cleanNumberInput(e.target.value);
          const value = parseInt(cleanedValue) || 0;
                          const wrong = parseInt(newExamResult.subjects.kimya.wrong) || 0;
                          const blank = parseInt(newExamResult.subjects.kimya.blank) || 0;
                          const maxAllowed = SUBJECT_LIMITS.AYT['Kimya'] - wrong - blank;
                          const limitedValue = Math.min(value, maxAllowed);
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              kimya: { ...newExamResult.subjects.kimya, correct: limitedValue.toString() }
                            }
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Yanlış</label>
                      <Input
                        type="number"
                        min="0"
                        max="13"
                        value={newExamResult.subjects.kimya.wrong}
                        onChange={(e) => {
                          const cleanedValue = cleanNumberInput(e.target.value);
          const value = parseInt(cleanedValue) || 0;
                          const correct = parseInt(newExamResult.subjects.kimya.correct) || 0;
                          const blank = parseInt(newExamResult.subjects.kimya.blank) || 0;
                          const maxAllowed = SUBJECT_LIMITS.AYT['Kimya'] - correct - blank;
                          const limitedValue = Math.min(value, maxAllowed);
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              kimya: { ...newExamResult.subjects.kimya, wrong: limitedValue.toString() }
                            }
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Boş</label>
                      <Input
                        type="number"
                        min="0"
                        max="13"
                        value={newExamResult.subjects.kimya.blank}
                        onChange={(e) => {
                          const cleanedValue = cleanNumberInput(e.target.value);
          const value = parseInt(cleanedValue) || 0;
                          const correct = parseInt(newExamResult.subjects.kimya.correct) || 0;
                          const wrong = parseInt(newExamResult.subjects.kimya.wrong) || 0;
                          const maxAllowed = SUBJECT_LIMITS.AYT['Kimya'] - correct - wrong;
                          const limitedValue = Math.min(value, maxAllowed);
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              kimya: { ...newExamResult.subjects.kimya, blank: limitedValue.toString() }
                            }
                          });
                        }}
                      />
                    </div>
                  </div>
                  {parseInt(newExamResult.subjects.kimya.wrong) > 0 && (
                    <div className="bg-gradient-to-r from-green-50/70 to-emerald-50/50 dark:from-green-900/20 dark:to-emerald-900/15 rounded-xl p-4 border border-green-200/40 dark:border-green-700/30 mt-3">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-4 w-4 text-green-500" />
                        <label className="text-sm font-semibold text-green-700 dark:text-green-300">🔍 Kimya Eksik Konular</label>
                      </div>
                      <Input
                        value={currentWrongTopics.kimya || ""}
                        onChange={(e) => {
                          setCurrentWrongTopics({...currentWrongTopics, kimya: e.target.value});
                          const topics = e.target.value.split(',').map(t => toTitleCase(t.trim())).filter(t => t.length > 0);
                          const uniqueTopics = [...new Set(topics)];
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              kimya: { ...newExamResult.subjects.kimya, wrong_topics: uniqueTopics }
                            }
                          });
                        }}
                        placeholder="Kimyasal Denge, Asit-Baz, Elektrokimya, Organik Kimya gibi..."
                        className="bg-white/80 dark:bg-gray-800/80 border-green-200 dark:border-green-700/50 focus:border-green-400 dark:focus:border-green-500 rounded-xl shadow-sm"
                      />
                      {currentWrongTopics.kimya && (
                        <div className="mt-2 text-xs text-green-600/70 dark:text-green-400/70">
                          💡 Bu konular öncelik listesine eklenecek
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Biyoloji */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-teal-600">Biyoloji</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-medium mb-1">Doğru</label>
                      <Input
                        type="number"
                        min="0"
                        max="13"
                        value={newExamResult.subjects.biyoloji.correct}
                        onChange={(e) => {
                          const cleanedValue = cleanNumberInput(e.target.value);
          const value = parseInt(cleanedValue) || 0;
                          const wrong = parseInt(newExamResult.subjects.biyoloji.wrong) || 0;
                          const blank = parseInt(newExamResult.subjects.biyoloji.blank) || 0;
                          const maxAllowed = SUBJECT_LIMITS.AYT['Biyoloji'] - wrong - blank;
                          const limitedValue = Math.min(value, maxAllowed);
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              biyoloji: { ...newExamResult.subjects.biyoloji, correct: limitedValue.toString() }
                            }
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Yanlış</label>
                      <Input
                        type="number"
                        min="0"
                        max="13"
                        value={newExamResult.subjects.biyoloji.wrong}
                        onChange={(e) => {
                          const cleanedValue = cleanNumberInput(e.target.value);
          const value = parseInt(cleanedValue) || 0;
                          const correct = parseInt(newExamResult.subjects.biyoloji.correct) || 0;
                          const blank = parseInt(newExamResult.subjects.biyoloji.blank) || 0;
                          const maxAllowed = SUBJECT_LIMITS.AYT['Biyoloji'] - correct - blank;
                          const limitedValue = Math.min(value, maxAllowed);
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              biyoloji: { ...newExamResult.subjects.biyoloji, wrong: limitedValue.toString() }
                            }
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Boş</label>
                      <Input
                        type="number"
                        min="0"
                        max="13"
                        value={newExamResult.subjects.biyoloji.blank}
                        onChange={(e) => {
                          const cleanedValue = cleanNumberInput(e.target.value);
          const value = parseInt(cleanedValue) || 0;
                          const correct = parseInt(newExamResult.subjects.biyoloji.correct) || 0;
                          const wrong = parseInt(newExamResult.subjects.biyoloji.wrong) || 0;
                          const maxAllowed = SUBJECT_LIMITS.AYT['Biyoloji'] - correct - wrong;
                          const limitedValue = Math.min(value, maxAllowed);
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              biyoloji: { ...newExamResult.subjects.biyoloji, blank: limitedValue.toString() }
                            }
                          });
                        }}
                      />
                    </div>
                  </div>
                  {parseInt(newExamResult.subjects.biyoloji.wrong) > 0 && (
                    <div className="bg-gradient-to-r from-teal-50/70 to-cyan-50/50 dark:from-teal-900/20 dark:to-cyan-900/15 rounded-xl p-4 border border-teal-200/40 dark:border-teal-700/30 mt-3">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-4 w-4 text-teal-500" />
                        <label className="text-sm font-semibold text-teal-700 dark:text-teal-300">🔍 Biyoloji Eksik Konular</label>
                      </div>
                      <Input
                        value={currentWrongTopics.biyoloji || ""}
                        onChange={(e) => {
                          setCurrentWrongTopics({...currentWrongTopics, biyoloji: e.target.value});
                          const topics = e.target.value.split(',').map(t => toTitleCase(t.trim())).filter(t => t.length > 0);
                          const uniqueTopics = [...new Set(topics)];
                          setNewExamResult({
                            ...newExamResult,
                            subjects: {
                              ...newExamResult.subjects,
                              biyoloji: { ...newExamResult.subjects.biyoloji, wrong_topics: uniqueTopics }
                            }
                          });
                        }}
                        placeholder="Sinir Sistemi, Hücre Bölünmesi, Ekosistem, Kalıtım gibi..."
                        className="bg-white/80 dark:bg-gray-800/80 border-teal-200 dark:border-teal-700/50 focus:border-teal-400 dark:focus:border-teal-500 rounded-xl shadow-sm"
                      />
                      {currentWrongTopics.biyoloji && (
                        <div className="mt-2 text-xs text-teal-600/70 dark:text-teal-400/70">
                          💡 Bu konular öncelik listesine eklenecek
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            </>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (editingExam) {
                    // Düzenleme modu - sadece display_name ve time_spent_minutes güncelle
                    updateExamResultMutation.mutate({
                      id: editingExam.id,
                      data: {
                        display_name: newExamResult.display_name.trim() || undefined,
                        time_spent_minutes: parseInt(newExamResult.time_spent_minutes) || null
                      }
                    });
                  } else {
                    // Yeni kayıt modu - tüm deneme verisini kaydet
                    
                    // Genel deneme ise, ilgili sınav türüne göre GEREKLİ dersler için veri girilmiş olmalı
                    if (newExamResult.examScope === "full") {
                      // TYT için: Türkçe, Sosyal, Matematik, Geometri, Fen
                      // AYT için: Matematik, Geometri, Fizik, Kimya, Biyoloji
                      const requiredSubjects = newExamResult.exam_type === "TYT" 
                        ? ['turkce', 'sosyal', 'matematik', 'geometri', 'fen']
                        : ['matematik', 'geometri', 'fizik', 'kimya', 'biyoloji'];
                      
                      const subjectDisplayNames: {[key: string]: string} = {
                        'turkce': 'Türkçe',
                        'sosyal': 'Sosyal Bilimler',
                        'matematik': 'Matematik',
                                'geometri': 'Geometri',
                        'fen': 'Fen Bilimleri',
                        'fizik': 'Fizik',
                        'kimya': 'Kimya',
                        'biyoloji': 'Biyoloji'
                      };
                      
                      // Boş dersleri bul - bir dersin boş olması için doğru, yanlış VE boş hepsinin 0 olması gerekir
                      // Doğru=0, Yanlış=0 ama Boş>0 ise geçerlidir (ders eklenebilir)
                      const emptySubjects = requiredSubjects.filter(subjectKey => {
                        const subject = newExamResult.subjects[subjectKey];
                        const correct = parseInt(subject?.correct || "0") || 0;
                        const wrong = parseInt(subject?.wrong || "0") || 0;
                        const blank = parseInt(subject?.blank || "0") || 0;
                        // Doğru VE yanlış VE boş hepsi 0 ise ders boş sayılır
                        return correct === 0 && wrong === 0 && blank === 0;
                      });
                      
                      if (emptySubjects.length > 0) {
                        const emptySubjectNames = emptySubjects.map(key => subjectDisplayNames[key] || key).join(', ');
                        toast({
                          title: "❌ Deneme sonucu eklenemedi",
                          description: `Bir Deneme Verisi Eklemek İçin Tüm Alanlardan Veri Eklemen Gerek! Eksik dersler: ${emptySubjectNames}`,
                          variant: "destructive"
                        });
                        return;
                      }
                    }
                    
                    // Branş denemesi için de süre kontrolü
                    if (newExamResult.examScope === "branch") {
                      const selectedSubject = newExamResult.selectedSubject;
                      const subjectData = newExamResult.subjects[selectedSubject];
                      const correct = parseInt(subjectData?.correct || "0") || 0;
                      const wrong = parseInt(subjectData?.wrong || "0") || 0;
                      
                      // Branş denemesinde seçilen ders için en az doğru veya yanlış olmalı
                      if (correct === 0 && wrong === 0) {
                        toast({
                          title: "❌ Deneme sonucu eklenemedi",
                          description: "Branş denemesi için en az doğru veya yanlış sayısı girmelisiniz!",
                          variant: "destructive"
                        });
                        return;
                      }
                    }
                    
                    let tytNet = 0;
                    let aytNet = 0;
                    let submittedSubjects = { ...newExamResult.subjects };
                    let generatedExamName = '';

                    const getSubjectDisplayName = (subjectKey: string) => {
                      const subjectMap: {[key: string]: string} = {
                        'sosyal': 'Sosyal Bilimler',
                        'turkce': 'Türkçe',
                        'matematik': 'Matematik',
                                'geometri': 'Geometri',
                        'fizik': 'Fizik',
                        'kimya': 'Kimya',
                        'biyoloji': 'Biyoloji',
                        'fen': 'Fen Bilimleri',
                        'paragraf': 'Paragraf',
                        'problemler': 'Problemler'
                      };
                      return subjectMap[subjectKey] || subjectKey;
                    };

                    if (newExamResult.examScope === "branch") {
                      const selectedSubject = newExamResult.selectedSubject;
                      const subjectData = newExamResult.subjects[selectedSubject];
                      const subjectDisplayName = getSubjectDisplayName(selectedSubject);
                      
                      generatedExamName = `${newExamResult.exam_type} ${subjectDisplayName} Branş Denemesi`;
                      
                      const wrongTopics = newExamResult.wrongTopicsText
                        .split(',')
                        .map(t => toTitleCase(t.trim()))
                        .filter(t => t.length > 0);
                      
                      const uniqueWrongTopics = [...new Set(wrongTopics)];
                      
                      submittedSubjects = {
                        turkce: { correct: "", wrong: "", blank: "", wrong_topics: [] },
                        matematik: { correct: "", wrong: "", blank: "", wrong_topics: [] },
                        sosyal: { correct: "", wrong: "", blank: "", wrong_topics: [] },
                        fen: { correct: "", wrong: "", blank: "", wrong_topics: [] },
                        fizik: { correct: "", wrong: "", blank: "", wrong_topics: [] },
                        kimya: { correct: "", wrong: "", blank: "", wrong_topics: [] },
                        biyoloji: { correct: "", wrong: "", blank: "", wrong_topics: [] },
                        geometri: { correct: "", wrong: "", blank: "", wrong_topics: [] },
                        paragraf: { correct: "", wrong: "", blank: "", wrong_topics: [] },
                        problemler: { correct: "", wrong: "", blank: "", wrong_topics: [] },
                        [selectedSubject]: {
                          ...subjectData,
                          wrong_topics: uniqueWrongTopics
                        }
                      };
                      
                      const correct = parseInt(subjectData.correct) || 0;
                      const wrong = parseInt(subjectData.wrong) || 0;
                      const branchNet = Math.max(0, correct - (wrong * 0.25));
                      
                      if (newExamResult.exam_type === "TYT") {
                        tytNet = branchNet;
                        aytNet = 0;
                      } else {
                        tytNet = 0;
                        aytNet = branchNet;
                      }
                    } else {
                      generatedExamName = `Genel ${newExamResult.exam_type} Deneme`;
                      
                      // TYT dersleri: Türkçe, Sosyal, Matematik, Geometri, Fen
                      const tytSubjects = ['turkce', 'sosyal', 'matematik', 'geometri', 'fen'];
                      // AYT dersleri: Matematik, Geometri, Fizik, Kimya, Biyoloji
                      const aytSubjects = ['matematik', 'geometri', 'fizik', 'kimya', 'biyoloji'];
                      
                      // SADECE seçilen sınav tipi için hesaplama yap
                      if (newExamResult.exam_type === 'TYT') {
                        tytSubjects.forEach(subjectKey => {
                          const subject = newExamResult.subjects[subjectKey];
                          if (subject) {
                            const correct = parseInt(subject.correct) || 0;
                            const wrong = parseInt(subject.wrong) || 0;
                            tytNet += correct - (wrong * 0.25);
                          }
                        });
                        aytNet = 0; // AYT netini 0 yap
                      } else if (newExamResult.exam_type === 'AYT') {
                        aytSubjects.forEach(subjectKey => {
                          const subject = newExamResult.subjects[subjectKey];
                          if (subject) {
                            const correct = parseInt(subject.correct) || 0;
                            const wrong = parseInt(subject.wrong) || 0;
                            aytNet += correct - (wrong * 0.25);
                          }
                        });
                        tytNet = 0; // TYT netini 0 yap
                      }
                    }
                    
                    createExamResultMutation.mutate({
                      exam_name: generatedExamName,
                      display_name: newExamResult.display_name.trim() || undefined,
                      exam_date: newExamResult.exam_date,
                      exam_type: newExamResult.exam_type,
                      exam_scope: newExamResult.examScope,
                      selected_subject: newExamResult.examScope === 'branch' ? newExamResult.selectedSubject : undefined,
                      tyt_net: Math.max(0, tytNet).toFixed(2),
                      ayt_net: Math.max(0, aytNet).toFixed(2),
                      subjects_data: JSON.stringify(submittedSubjects),
                      time_spent_minutes: parseInt(newExamResult.time_spent_minutes) || null
                    });
                  }
                }}
                disabled={editingExam ? updateExamResultMutation.isPending : createExamResultMutation.isPending}
                className="flex-1"
                data-testid="button-save-exam"
              >
                {editingExam 
                  ? (updateExamResultMutation.isPending ? 'Güncelleniyor...' : 'Güncelle')
                  : (createExamResultMutation.isPending ? 'Kaydediliyor...' : 'Kaydet')
                }
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowExamDialog(false);
                  setNewExamResult({ 
                    exam_name: "", 
                    display_name: "",
                    exam_date: getTurkeyDate(), 
                    exam_type: "TYT" as "TYT" | "AYT",
                    examScope: "full" as "full" | "branch",
                    selectedSubject: "turkce" as string,
                    wrongTopicsText: "",
                    time_spent_minutes: "",
                    subjects: {
                      turkce: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                      matematik: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                      sosyal: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                      fen: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                      fizik: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                      kimya: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                      biyoloji: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                      geometri: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                      paragraf: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] },
                      problemler: { correct: "", wrong: "", blank: "", wrong_topics: [] as string[] }
                    }
                  });
                  setCurrentWrongTopics({}); // Tüm yanlış konu giriş alanlarını temizle
                }}
                data-testid="button-cancel-exam"
              >
                İptal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Çalışma Saati Ekle Modalı */}
      <Dialog open={showStudyHoursModal} onOpenChange={setShowStudyHoursModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              ⏱️ Çalıştığım Süreyi Ekle
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              Bugün çalıştığınız süreyi kaydedin
            </DialogDescription>
          </DialogHeader>
          
          {/* Aylık Toplam Gösterim */}
          {(() => {
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const monthlyTotal = allStudyHours
              .filter((sh: any) => {
                const date = new Date(sh.study_date);
                return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
              })
              .reduce((total: number, sh: any) => {
                return total + (sh.hours * 3600) + (sh.minutes * 60) + sh.seconds;
              }, 0);
            
            const totalHours = Math.floor(monthlyTotal / 3600);
            const totalMinutes = Math.floor((monthlyTotal % 3600) / 60);
            const totalSeconds = monthlyTotal % 60;
            
            return (
              <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-2 border-purple-200 dark:border-purple-700 mb-4">
                <CardContent className="py-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">Bu Ay Toplam Çalışma Sürem</p>
                    <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                      {String(totalHours).padStart(2, '0')}:{String(totalMinutes).padStart(2, '0')}:{String(totalSeconds).padStart(2, '0')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })()}
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                📅 Tarih
              </label>
              <Input
                type="date"
                value={newStudyHours.study_date}
                onChange={(e) => setNewStudyHours(prev => ({ ...prev, study_date: e.target.value }))}
                className="w-full"
                data-testid="input-study-date"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  ⏰ Saat
                </label>
                <Input
                  type="number"
                  min="0"
                  max="24"
                  placeholder="0"
                  value={newStudyHours.hours}
                  onChange={(e) => setNewStudyHours(prev => ({ ...prev, hours: parseInt(e.target.value) || 0 }))}
                  className="w-full"
                  data-testid="input-study-hours"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  ⏱️ Dakika
                </label>
                <Input
                  type="number"
                  min="0"
                  max="60"
                  placeholder="0"
                  value={newStudyHours.minutes}
                  onChange={(e) => setNewStudyHours(prev => ({ ...prev, minutes: parseInt(e.target.value) || 0 }))}
                  className="w-full"
                  data-testid="input-study-minutes"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  ⏲️ Saniye
                </label>
                <Input
                  type="number"
                  min="0"
                  max="60"
                  placeholder="0"
                  value={newStudyHours.seconds}
                  onChange={(e) => setNewStudyHours(prev => ({ ...prev, seconds: parseInt(e.target.value) || 0 }))}
                  className="w-full"
                  data-testid="input-study-seconds"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              onClick={() => createStudyHoursMutation.mutate(newStudyHours)}
              disabled={createStudyHoursMutation.isPending}
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              data-testid="button-save-study-hours"
            >
              💾 Kaydet
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                setShowStudyHoursModal(false);
                setNewStudyHours({
                  study_date: getTurkeyDate(),
                  hours: 0,
                  minutes: 0,
                  seconds: 0,
                });
              }}
              className="px-6"
              data-testid="button-cancel-study-hours"
            >
              İptal
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deneme Geçmişi Modalı */}
      <Dialog open={showExamHistoryModal} onOpenChange={setShowExamHistoryModal}>
        <DialogContent className="sm:max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-center bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent">
              📚 Deneme Geçmişi
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground text-lg">
              Tüm deneme sınavlarınızın detaylı geçmişi (Arşivlenmiş denemeler dahil)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* İstatistikler */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              <Card className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-950/30 dark:to-gray-950/30 border-2 border-slate-200 dark:border-slate-800">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-slate-600 dark:text-slate-400">{allExamResults.length}</div>
                  <div className="text-sm text-muted-foreground">Toplam Deneme</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-2 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {allExamResults.filter(e => (e.exam_type === 'TYT' || parseFloat(e.tyt_net) > 0) && e.exam_scope !== 'branch').length}
                  </div>
                  <div className="text-sm text-muted-foreground">TYT Genel Denemesi</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-2 border-purple-200 dark:border-purple-800">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {allExamResults.filter(e => (e.exam_type === 'AYT' || parseFloat(e.ayt_net) > 0) && e.exam_scope !== 'branch').length}
                  </div>
                  <div className="text-sm text-muted-foreground">AYT Genel Denemesi</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-2 border-orange-200 dark:border-orange-800">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {allExamResults.filter(e => e.exam_scope === 'branch').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Branş Denemesi</div>
                </CardContent>
              </Card>
            </div>

            {/* Filtre Butonları */}
            <div className="flex gap-2 flex-wrap justify-center mb-4">
              <Button
                variant={examHistoryFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setExamHistoryFilter('all')}
                size="sm"
                className="flex-1 min-w-[120px]"
              >
                Tümü ({allExamResults.length})
              </Button>
              {allExamResults.some(e => (e.exam_type === 'TYT' || parseFloat(e.tyt_net) > 0) && e.exam_scope !== 'branch') && (
                <Button
                  variant={examHistoryFilter === 'tyt-general' ? 'default' : 'outline'}
                  onClick={() => setExamHistoryFilter('tyt-general')}
                  size="sm"
                  className="flex-1 min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white"
                >
                  TYT Genel ({allExamResults.filter(e => (e.exam_type === 'TYT' || parseFloat(e.tyt_net) > 0) && e.exam_scope !== 'branch').length})
                </Button>
              )}
              {allExamResults.some(e => (e.exam_type === 'AYT' || parseFloat(e.ayt_net) > 0) && e.exam_scope !== 'branch') && (
                <Button
                  variant={examHistoryFilter === 'ayt-general' ? 'default' : 'outline'}
                  onClick={() => setExamHistoryFilter('ayt-general')}
                  size="sm"
                  className="flex-1 min-w-[120px] bg-purple-600 hover:bg-purple-700 text-white"
                >
                  AYT Genel ({allExamResults.filter(e => (e.exam_type === 'AYT' || parseFloat(e.ayt_net) > 0) && e.exam_scope !== 'branch').length})
                </Button>
              )}
              {allExamResults.some(e => e.exam_scope === 'branch' && (e.exam_type === 'TYT' || parseFloat(e.tyt_net) > 0)) && (
                <Button
                  variant={examHistoryFilter === 'tyt-branch' ? 'default' : 'outline'}
                  onClick={() => setExamHistoryFilter('tyt-branch')}
                  size="sm"
                  className="flex-1 min-w-[120px] bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  TYT Branş ({allExamResults.filter(e => e.exam_scope === 'branch' && (e.exam_type === 'TYT' || parseFloat(e.tyt_net) > 0)).length})
                </Button>
              )}
              {allExamResults.some(e => e.exam_scope === 'branch' && (e.exam_type === 'AYT' || parseFloat(e.ayt_net) > 0)) && (
                <Button
                  variant={examHistoryFilter === 'ayt-branch' ? 'default' : 'outline'}
                  onClick={() => setExamHistoryFilter('ayt-branch')}
                  size="sm"
                  className="flex-1 min-w-[120px] bg-pink-600 hover:bg-pink-700 text-white"
                >
                  AYT Branş ({allExamResults.filter(e => e.exam_scope === 'branch' && (e.exam_type === 'AYT' || parseFloat(e.ayt_net) > 0)).length})
                </Button>
              )}
            </div>

            {/* Deneme Listesi */}
            <div className="space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
              {allExamResults.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="h-16 w-16 mx-auto mb-4 opacity-40" />
                  <p className="text-lg">Henüz deneme kaydı yok</p>
                </div>
              ) : (
                allExamResults
                  .filter(exam => {
                    const examType = exam.exam_type || (parseFloat(exam.ayt_net) > 0 ? 'AYT' : 'TYT');
                    const isBranchExam = exam.exam_scope === 'branch';
                    
                    if (examHistoryFilter === 'all') return true;
                    if (examHistoryFilter === 'tyt-general') return examType === 'TYT' && !isBranchExam;
                    if (examHistoryFilter === 'ayt-general') return examType === 'AYT' && !isBranchExam;
                    if (examHistoryFilter === 'tyt-branch') return examType === 'TYT' && isBranchExam;
                    if (examHistoryFilter === 'ayt-branch') return examType === 'AYT' && isBranchExam;
                    return true;
                  })
                  .sort((a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime())
                  .slice(0, (() => {
                    // Genel denemeleri son 5, branş denemeleri son 10 ile sınırla
                    if (examHistoryFilter === 'tyt-general' || examHistoryFilter === 'ayt-general') return 5;
                    if (examHistoryFilter === 'tyt-branch' || examHistoryFilter === 'ayt-branch') return 10;
                    // 'all' filtresinde: genel ve branş karışık olacağından daha geniş limit (15)
                    return 15;
                  })())
                  .map((exam, index) => {
                    const examType = exam.exam_type || (parseFloat(exam.ayt_net) > 0 ? 'AYT' : 'TYT');
                    const isArchived = exam.archived;
                    const isBranchExam = exam.exam_scope === 'branch';
                    
                    // subjects_data'yı parse et
                    let subjectsData: any = {};
                    try {
                      if (exam.subjects_data) {
                        subjectsData = JSON.parse(exam.subjects_data);
                      }
                    } catch (e) {
                      console.error('Parse error:', e);
                    }
                    
                    // Ders sıralaması: TYT için Türkçe, Sosyal Bilimler, Matematik, Geometri, Fen Bilimleri
                    // AYT için: Matematik, Geometri, Fizik, Kimya, Biyoloji
                    const subjectOrder = examType === 'TYT' 
                      ? ['turkce', 'sosyal', 'matematik', 'geometri', 'fen']
                      : ['matematik', 'geometri', 'fizik', 'kimya', 'biyoloji'];
                    
                    const orderedSubjects = Object.entries(subjectsData).sort(([a], [b]) => {
                      const aIndex = subjectOrder.indexOf(a);
                      const bIndex = subjectOrder.indexOf(b);
                      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
                    });

                    return (
                      <Card 
                        key={exam.id} 
                        className={`${
                          isArchived 
                            ? 'bg-gradient-to-br from-gray-100 to-slate-100 dark:from-gray-900/50 dark:to-slate-900/50 border-gray-300 dark:border-gray-700 opacity-75' 
                            : 'bg-gradient-to-br from-white to-emerald-50/30 dark:from-gray-900 dark:to-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                        } border-2 shadow-md hover:shadow-xl transition-all duration-300`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-3 rounded-lg ${
                                examType === 'TYT' 
                                  ? 'bg-blue-100 dark:bg-blue-900/30' 
                                  : 'bg-purple-100 dark:bg-purple-900/30'
                              }`}>
                                <Target className={`h-6 w-6 ${
                                  examType === 'TYT' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'
                                }`} />
                              </div>
                              <div>
                                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                  {formatExamName(exam.display_name || exam.exam_name)}
                                  {isArchived && <Badge variant="outline" className="text-xs">Arşivlenmiş</Badge>}
                                  {isBranchExam && <Badge className="text-xs bg-orange-500">Branş</Badge>}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  📅 {new Date(exam.exam_date).toLocaleDateString('tr-TR', { 
                                    day: 'numeric', 
                                    month: 'long', 
                                    year: 'numeric' 
                                  })}
                                  {exam.createdAt && (
                                    <span className="text-xs ml-2">
                                      | Saat: {new Date(exam.createdAt).toLocaleTimeString('tr-TR', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                              <div className="flex items-center gap-2">
                                <Badge className={`text-lg px-4 py-2 ${
                                  examType === 'TYT' 
                                    ? 'bg-blue-600 hover:bg-blue-700' 
                                    : 'bg-purple-600 hover:bg-purple-700'
                                }`}>
                                  {examType}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm(`"${formatExamName(exam.display_name || exam.exam_name)}" isimli denemeyi silmek istediğinizden emin misiniz?`)) {
                                      deleteExamResultMutation.mutate(exam.id);
                                    }
                                  }}
                                  className="h-9 w-9 p-0 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                  title="Denemeyi Sil"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              {(() => {
                                const subjectNames: {[key: string]: string} = {
                                  'turkce': 'Türkçe', 'matematik': 'Matematik', 'geometri': 'Geometri',
                                  'sosyal': 'Sosyal Bilimler', 'fen': 'Fen Bilimleri',
                                  'fizik': 'Fizik', 'kimya': 'Kimya', 'biyoloji': 'Biyoloji'
                                };
                                
                                let defaultName = '';
                                if (exam.exam_scope === 'full') {
                                  defaultName = `${examType} Genel Deneme`;
                                } else if (exam.exam_scope === 'branch' && exam.selected_subject) {
                                  const subjectName = subjectNames[exam.selected_subject] || exam.selected_subject;
                                  defaultName = `${examType} ${subjectName} Branş Denemesi`;
                                }
                                
                                return defaultName ? (
                                  <p className="text-xs text-muted-foreground/70 italic">
                                    {defaultName}
                                  </p>
                                ) : null;
                              })()}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {/* Net Skorları */}
                          <div className="grid grid-cols-1 gap-4 mb-4">
                            {examType === 'TYT' && (
                              <div className={`${isBranchExam ? 'bg-cyan-50 dark:bg-cyan-950/30 border-2 border-cyan-200 dark:border-cyan-800' : 'bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800'} p-4 rounded-lg`}>
                                <div className="text-sm text-muted-foreground mb-1">
                                  {isBranchExam ? 'TYT Branş Denemesi Toplam Net' : 'Toplam Net'}
                                </div>
                                <div className={`text-3xl font-bold ${isBranchExam ? 'text-cyan-600 dark:text-cyan-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                  {parseFloat(exam.tyt_net).toFixed(2)}
                                </div>
                              </div>
                            )}
                            {examType === 'AYT' && (
                              <div className={`${isBranchExam ? 'bg-pink-50 dark:bg-pink-950/30 border-2 border-pink-200 dark:border-pink-800' : 'bg-purple-50 dark:bg-purple-950/30 border-2 border-purple-200 dark:border-purple-800'} p-4 rounded-lg`}>
                                <div className="text-sm text-muted-foreground mb-1">
                                  {isBranchExam ? 'AYT Branş Denemesi Toplam Net' : 'Toplam Net'}
                                </div>
                                <div className={`text-3xl font-bold ${isBranchExam ? 'text-pink-600 dark:text-pink-400' : 'text-purple-600 dark:text-purple-400'}`}>
                                  {parseFloat(exam.ayt_net).toFixed(2)}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Ders Detayları */}
                          {orderedSubjects.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm text-muted-foreground mb-3">Ders Detayları:</h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                {orderedSubjects.map(([subject, data]: [string, any]) => {
                                  const correct = parseInt(data.correct) || 0;
                                  const wrong = parseInt(data.wrong) || 0;
                                  const blank = parseInt(data.blank) || 0;
                                  const net = correct - (wrong * 0.25);
                                  
                                  if (correct === 0 && wrong === 0 && blank === 0) return null;

                                  return (
                                    <div key={subject} className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                                      <div className="font-semibold text-xs text-muted-foreground mb-2 capitalize">
                                        {subject === 'turkce' ? 'Türkçe' : 
                                         subject === 'sosyal' ? 'Sosyal Bilimler' :
                                         subject === 'matematik' ? 'Matematik' :
                                         subject === 'geometri' ? 'Geometri' :
                                         subject === 'fen' ? 'Fen Bilimleri' :
                                         subject === 'fizik' ? 'Fizik' :
                                         subject === 'kimya' ? 'Kimya' :
                                         subject === 'biyoloji' ? 'Biyoloji' :
                                         subject === 'paragraf' ? 'Paragraf' :
                                         subject === 'problemler' ? 'Problemler' : subject}
                                      </div>
                                      <div className="space-y-1 text-xs">
                                        <div className="flex justify-between">
                                          <span className="text-green-600 dark:text-green-400">D: {correct}</span>
                                          <span className="text-red-600 dark:text-red-400">Y: {wrong}</span>
                                          <span className="text-yellow-600 dark:text-yellow-400">B: {blank}</span>
                                        </div>
                                        <div className="font-bold text-center text-blue-600 dark:text-blue-400">
                                          Net: {net.toFixed(2)}
                                        </div>
                                      </div>
                                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                        {(() => {
                                          let topics = data.wrong_topics;
                                          
                                          // Eğer undefined veya null ise boş array
                                          if (!topics) {
                                            topics = [];
                                          }
                                          // Eğer string ise parse et
                                          else if (typeof topics === 'string') {
                                            const trimmed = topics.trim();
                                            if (!trimmed) {
                                              topics = [];
                                            } else {
                                              try {
                                                // JSON parse dene
                                                topics = JSON.parse(trimmed);
                                              } catch (e) {
                                                // JSON değilse, comma-separated olabilir
                                                if (trimmed.includes(',')) {
                                                  topics = trimmed.split(',').map(t => t.trim()).filter(Boolean);
                                                } else {
                                                  // Tek değer
                                                  topics = [trimmed];
                                                }
                                              }
                                            }
                                          }
                                          
                                          // Eğer array değilse boş array yap
                                          if (!Array.isArray(topics)) {
                                            topics = [];
                                          }
                                          
                                          // Boş olmayan elementleri filtrele
                                          const filteredTopics = topics.filter((t: any) => t && typeof t === 'string' && t.trim && t.trim());
                                          
                                          return filteredTopics.length > 0 ? (
                                            <>
                                              <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">
                                                Hatalı Konular ({filteredTopics.length}):
                                              </div>
                                              <div className="text-xs text-muted-foreground space-y-0.5">
                                                {filteredTopics.slice(0, 3).map((topic: string, i: number) => (
                                                  <div key={i} className="truncate">• {normalizeTopic(topic)}</div>
                                                ))}
                                                {filteredTopics.length > 3 && (
                                                  <div className="text-xs italic">+{filteredTopics.length - 3} daha...</div>
                                                )}
                                              </div>
                                            </>
                                          ) : (
                                            <div className="text-xs text-muted-foreground italic">
                                              Bu derste hatalı konu girişi yapılmamıştır.
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Süre Bilgisi */}
                          <div className="mt-4 text-sm text-muted-foreground flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>
                              {exam.time_spent_minutes && exam.time_spent_minutes > 0 
                                ? `Denemenin Çözüldüğü Süre: ${exam.time_spent_minutes} dakika`
                                : 'Bu denemeye ait süre verisi girilmemiştir.'}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowExamHistoryModal(false)}
            >
              Kapat
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Soru Geçmişi Modalı */}
      <Dialog open={showQuestionHistoryModal} onOpenChange={setShowQuestionHistoryModal}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-center bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
              📚 Soru Çözüm Geçmişi
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground text-lg">
              Çözülmüş Sorular kısmından eklenen tüm soru kayıtlarınız
            </DialogDescription>
          </DialogHeader>

          {(() => {
            // Sadece soru kayıtlarını filtrele
            let filteredQuestionLogs = allQuestionLogs;
            
            if (questionHistoryFilter === 'tyt') {
              filteredQuestionLogs = allQuestionLogs.filter(log => log.exam_type === 'TYT');
            } else if (questionHistoryFilter === 'ayt') {
              filteredQuestionLogs = allQuestionLogs.filter(log => log.exam_type === 'AYT');
            }
            
            // İstatistikleri hesapla - sadece soru kayıtlarından
            // Toplam Çözülen Soru = Doğru + Yanlış (Boş dahil değil)
            const totalStats = {
              total: filteredQuestionLogs.reduce((sum, log) => sum + (Number(log.correct_count) || 0) + (Number(log.wrong_count) || 0), 0),
              correct: filteredQuestionLogs.reduce((sum, log) => sum + (Number(log.correct_count) || 0), 0),
              wrong: filteredQuestionLogs.reduce((sum, log) => sum + (Number(log.wrong_count) || 0), 0),
              blank: filteredQuestionLogs.reduce((sum, log) => sum + (Number(log.blank_count) || 0), 0)
            };
            
            // TYT ve AYT istatistikleri - sadece Doğru + Yanlış
            const tytQuestionCount = allQuestionLogs
              .filter(log => log.exam_type === 'TYT')
              .reduce((sum, log) => sum + (Number(log.correct_count) || 0) + (Number(log.wrong_count) || 0), 0);
            
            const aytQuestionCount = allQuestionLogs
              .filter(log => log.exam_type === 'AYT')
              .reduce((sum, log) => sum + (Number(log.correct_count) || 0) + (Number(log.wrong_count) || 0), 0);
            
            return (
              <div className="space-y-4">
                {/* Özet İstatistikler - Kompakt ve Büyük Rakamlar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-2 bg-gradient-to-br from-green-50/50 via-emerald-50/30 to-teal-50/20 dark:from-green-950/20 dark:via-emerald-950/15 dark:to-teal-950/10 rounded-lg border border-green-200/30 dark:border-green-800/30">
                  <div className="group text-center bg-white/70 dark:bg-gray-900/70 rounded-lg p-2 border border-green-200/40 dark:border-green-700/40 hover:shadow-md transition-all">
                    <div className="text-4xl font-extrabold bg-gradient-to-br from-green-600 to-emerald-600 bg-clip-text text-transparent mb-0.5">
                      {totalStats.total}
                    </div>
                    <div className="text-[10px] font-bold text-green-700/80 dark:text-green-300/80">Çözülen Soru</div>
                  </div>
                  <div className="group text-center bg-white/70 dark:bg-gray-900/70 rounded-lg p-2 border border-green-200/40 dark:border-green-700/40 hover:shadow-md transition-all">
                    <div className="text-4xl font-extrabold bg-gradient-to-br from-green-600 to-emerald-700 bg-clip-text text-transparent mb-0.5">
                      {totalStats.correct}
                    </div>
                    <div className="text-[10px] font-bold text-green-700/80 dark:text-green-300/80">Doğru</div>
                  </div>
                  <div className="group text-center bg-white/70 dark:bg-gray-900/70 rounded-lg p-2 border border-red-200/40 dark:border-red-700/40 hover:shadow-md transition-all">
                    <div className="text-4xl font-extrabold bg-gradient-to-br from-red-600 to-orange-600 bg-clip-text text-transparent mb-0.5">
                      {totalStats.wrong}
                    </div>
                    <div className="text-[10px] font-bold text-red-700/80 dark:text-red-300/80">Yanlış</div>
                  </div>
                  <div className="group text-center bg-white/70 dark:bg-gray-900/70 rounded-lg p-2 border border-amber-200/40 dark:border-amber-700/40 hover:shadow-md transition-all">
                    <div className="text-4xl font-extrabold bg-gradient-to-br from-amber-600 to-yellow-600 bg-clip-text text-transparent mb-0.5">
                      {totalStats.blank}
                    </div>
                    <div className="text-[10px] font-bold text-amber-700/80 dark:text-amber-300/80">Boş</div>
                  </div>
                </div>

                {/* Filtrele Butonlar - Kutuların Altına Taşındı */}
                <div className="flex gap-2 justify-center">
                  <Button
                    variant={questionHistoryFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setQuestionHistoryFilter('all')}
                    className="flex-1 max-w-[140px]"
                  >
                    📊 Tümü
                  </Button>
                  <Button
                    variant={questionHistoryFilter === 'tyt' ? 'default' : 'outline'}
                    onClick={() => setQuestionHistoryFilter('tyt')}
                    className="flex-1 max-w-[140px]"
                  >
                    📘 TYT ({tytQuestionCount})
                  </Button>
                  <Button
                    variant={questionHistoryFilter === 'ayt' ? 'default' : 'outline'}
                    onClick={() => setQuestionHistoryFilter('ayt')}
                    className="flex-1 max-w-[140px]"
                  >
                    📗 AYT ({aytQuestionCount})
                  </Button>
                </div>

                {/* Soru Kayıtları Listesi - Yeni Tasarım */}
                <div className="space-y-3">
                  {filteredQuestionLogs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-16 w-16 mx-auto mb-4 opacity-40" />
                      <p className="text-lg">Henüz soru kaydı yok</p>
                      <p className="text-sm mt-2">Çözülmüş Sorular bölümünden soru ekleyebilirsiniz</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto pr-2" style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgb(134 239 172) transparent'
                    }}>
                      {filteredQuestionLogs
                        .sort((a, b) => {
                          const dateA = a.createdAt ? new Date(a.createdAt) : new Date(a.study_date);
                          const dateB = b.createdAt ? new Date(b.createdAt) : new Date(b.study_date);
                          return dateB.getTime() - dateA.getTime();
                        })
                        .map((log) => {
                          const netScore = (Number(log.correct_count) || 0) - ((Number(log.wrong_count) || 0) * 0.25);
                          const parsedWrongTopics = log.wrong_topics_json ? JSON.parse(log.wrong_topics_json) : [];
                          const createdDate = log.createdAt ? new Date(log.createdAt) : new Date(log.study_date);
                          
                          return (
                            <Card 
                              key={log.id} 
                              className={`relative bg-gradient-to-br ${log.exam_type === 'TYT' ? 'from-blue-50/80 via-white to-cyan-50/40 dark:from-blue-950/40 dark:via-gray-900 dark:to-cyan-950/20 border-blue-300 dark:border-blue-700' : 'from-purple-50/80 via-white to-pink-50/40 dark:from-purple-950/40 dark:via-gray-900 dark:to-pink-950/20 border-purple-300 dark:border-purple-700'} border-2 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group`}
                            >
                              {/* Üst Etiket Çubuğu - Süre Verisi ve Silme Butonu */}
                              <div className={`flex items-center justify-between px-4 py-2 ${log.exam_type === 'TYT' ? 'bg-blue-500/10 dark:bg-blue-900/30' : 'bg-purple-500/10 dark:bg-purple-900/30'} border-b ${log.exam_type === 'TYT' ? 'border-blue-200 dark:border-blue-700' : 'border-purple-200 dark:border-purple-700'}`}>
                                {log.time_spent_minutes && log.time_spent_minutes > 0 ? (
                                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>{log.time_spent_minutes} dakika</span>
                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-foreground/60">Soru Kaydı</div>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteQuestionLogMutation.mutate(log.id)}
                                  disabled={deleteQuestionLogMutation.isPending}
                                  className="h-7 w-7 p-0 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                  title="Soru Kaydını Sil"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>

                              <CardContent className="p-4 space-y-3">
                                {/* Başlık Bilgileri */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Badge className={`text-sm font-bold px-2.5 py-1 ${log.exam_type === 'TYT' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
                                      {log.exam_type}
                                    </Badge>
                                    <span className="text-base font-bold text-gray-700 dark:text-gray-200">{log.subject}</span>
                                  </div>
                                </div>

                                {/* Tarih Bilgisi */}
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span>
                                    {createdDate.toLocaleDateString('tr-TR', {
                                      day: 'numeric',
                                      month: 'long',
                                      year: 'numeric'
                                    })}
                                  </span>
                                  <span className="mx-1">•</span>
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>
                                    {createdDate.toLocaleTimeString('tr-TR', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>

                                {/* Skor Grid - Kompakt */}
                                <div className="grid grid-cols-4 gap-2">
                                  <div className="text-center p-2 bg-green-100 dark:bg-green-900/30 rounded-md">
                                    <div className="text-lg font-extrabold text-green-600 dark:text-green-400">{log.correct_count}</div>
                                    <div className="text-[9px] font-bold text-green-700/70 dark:text-green-300/70">Doğru</div>
                                  </div>
                                  <div className="text-center p-2 bg-red-100 dark:bg-red-900/30 rounded-md">
                                    <div className="text-lg font-extrabold text-red-600 dark:text-red-400">{log.wrong_count}</div>
                                    <div className="text-[9px] font-bold text-red-700/70 dark:text-red-300/70">Yanlış</div>
                                  </div>
                                  <div className="text-center p-2 bg-amber-100 dark:bg-amber-900/30 rounded-md">
                                    <div className="text-lg font-extrabold text-amber-600 dark:text-amber-400">{log.blank_count || '0'}</div>
                                    <div className="text-[9px] font-bold text-amber-700/70 dark:text-amber-300/70">Boş</div>
                                  </div>
                                  <div className={`text-center p-2 rounded-md ${log.exam_type === 'TYT' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-purple-100 dark:bg-purple-900/30'}`}>
                                    <div className={`text-lg font-extrabold ${log.exam_type === 'TYT' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'}`}>{netScore.toFixed(1)}</div>
                                    <div className={`text-[9px] font-bold ${log.exam_type === 'TYT' ? 'text-blue-700/70 dark:text-blue-300/70' : 'text-purple-700/70 dark:text-purple-300/70'}`}>Net</div>
                                  </div>
                                </div>

                                {/* Hatalı Konular - Kompakt Tasarım */}
                                {parsedWrongTopics.length > 0 && (
                                  <div className="p-2.5 bg-red-50/70 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800/50">
                                    <div className="text-[10px] font-bold text-red-600 dark:text-red-400 mb-1.5 flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" />
                                      <span>Hatalı Konular ({parsedWrongTopics.length})</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {parsedWrongTopics.map((topicItem: any, idx: number) => {
                                        const topicName = typeof topicItem === 'string' ? topicItem : topicItem.topic;
                                        const difficulty = typeof topicItem === 'object' ? topicItem.difficulty : 'kolay';
                                        const category = typeof topicItem === 'object' ? topicItem.category : 'kavram';
                                        
                                        const getDifficultyIcon = (diff: string) => {
                                          switch(diff) {
                                            case 'kolay': return '🟢';
                                            case 'orta': return '🟠';
                                            case 'zor': return '🔴';
                                            default: return '⚪';
                                          }
                                        };
                                        
                                        const getCategoryIcon = (cat: string) => {
                                          switch(cat) {
                                            case 'kavram': return '🧠';
                                            case 'hesaplama': return '🔢';
                                            case 'analiz': return '🔍';
                                            case 'dikkatsizlik': return '⚠️';
                                            default: return '📝';
                                          }
                                        };
                                        
                                        const getDifficultyBg = (diff: string) => {
                                          switch(diff) {
                                            case 'kolay': return 'from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border-green-200 dark:border-green-700/50';
                                            case 'orta': return 'from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 border-orange-200 dark:border-orange-700/50';
                                            case 'zor': return 'from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 border-red-200 dark:border-red-700/50';
                                            default: return 'from-gray-100 to-slate-100 dark:from-gray-900/30 dark:to-slate-900/30 border-gray-200 dark:border-gray-700/50';
                                          }
                                        };
                                        
                                        const getCategoryName = (cat: string) => {
                                          switch(cat) {
                                            case 'kavram': return 'Kavram Eksikliği';
                                            case 'hesaplama': return 'Hesaplama Hatası';
                                            case 'analiz': return 'Analiz Sorunu';
                                            case 'dikkatsizlik': return 'Dikkatsizlik';
                                            default: return 'Diğer';
                                          }
                                        };
                                        
                                        const getDifficultyName = (diff: string) => {
                                          switch(diff) {
                                            case 'kolay': return 'Kolay';
                                            case 'orta': return 'Orta';
                                            case 'zor': return 'Zor';
                                            default: return 'Bilinmeyen';
                                          }
                                        };
                                        
                                        return (
                                          <div key={idx} className="flex flex-wrap gap-1.5 items-center">
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getDifficultyBg(difficulty)} bg-gradient-to-r`}>
                                              {topicName}
                                            </span>
                                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/50 text-blue-700 dark:text-blue-300">
                                              {getCategoryIcon(category)} {getCategoryName(category)}
                                            </span>
                                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700/50 text-purple-700 dark:text-purple-300">
                                              {getDifficultyIcon(difficulty)} {getDifficultyName(difficulty)}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowQuestionHistoryModal(false)}
            >
              Kapat
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Arşivlenen Veriler Modalı */}
      <Dialog open={showArchivedDataModal} onOpenChange={setShowArchivedDataModal}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              📁 Arşivlenen Veriler
            </DialogTitle>
            <div className="text-center space-y-2">
              <div className="text-muted-foreground text-sm">
                Her Pazar 23:59'da otomatik olarak arşivlenen eski verileriniz
              </div>
              {nextArchiveCountdown && (
                <div className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg py-2 px-4 inline-block">
                  ⏳ Tüm Verilerin Arşivlenmesine Kalan Süre (Pazar 23.59) : {nextArchiveCountdown}
                </div>
              )}
            </div>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-2 border-b pb-2">
              <Button
                variant={archivedTab === 'questions' ? 'default' : 'outline'}
                onClick={() => setArchivedTab('questions')}
                className="flex-1"
              >
                📝 Sorular ({archivedQuestionsModal.length})
              </Button>
              <Button
                variant={archivedTab === 'exams' ? 'default' : 'outline'}
                onClick={() => setArchivedTab('exams')}
                className="flex-1"
              >
                🎯 Denemeler ({archivedExamsModal.length})
              </Button>
              <Button
                variant={archivedTab === 'tasks' ? 'default' : 'outline'}
                onClick={() => setArchivedTab('tasks')}
                className="flex-1"
              >
                ✓ Görevler ({archivedTasksModal.length})
              </Button>
              <Button
                variant={archivedTab === 'studyHours' ? 'default' : 'outline'}
                onClick={() => setArchivedTab('studyHours')}
                className="flex-1"
              >
                ⏱️ Çalışma ({archivedStudyHoursModal.length})
              </Button>
            </div>

            {/* Tab Content */}
            <div className="min-h-[300px]">
              {archivedTab === 'questions' && (
                <div className={`space-y-3 ${archivedQuestionsModal.length > 5 ? 'max-h-[500px] overflow-y-auto pr-2' : ''}`}>
                  {archivedQuestionsModal.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <BookX className="h-12 w-12 mx-auto mb-3 opacity-40" />
                      <p>Arşivlenmiş soru kaydı yok</p>
                    </div>
                  ) : (
                    archivedQuestionsModal.map((log) => {
                      const correct = parseInt(log.correct_count) || 0;
                      const wrong = parseInt(log.wrong_count) || 0;
                      const blank = parseInt(log.blank_count) || 0;
                      const netScore = correct - (wrong * 0.25);
                      
                      return (
                        <div key={log.id} className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg border border-green-200 dark:border-green-800 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-foreground text-lg">{log.exam_type} {log.subject}</div>
                              {log.topic && <div className="text-sm font-medium text-muted-foreground">📚 Konu: {log.topic}</div>}
                              <div className="text-sm text-muted-foreground">📅 Sorunun Eklendiği Tarih: {new Date(log.study_date).toLocaleDateString('tr-TR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}</div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteArchivedQuestionMutation.mutate(log.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                              data-testid={`button-delete-archived-question-${log.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="flex gap-2 flex-wrap">
                            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                              ✅ Doğru: {correct}
                            </Badge>
                            <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                              ❌ Yanlış: {wrong}
                            </Badge>
                            <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
                              ⭕ Boş: {blank}
                            </Badge>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 font-bold">
                              📊 Net: {netScore.toFixed(2)}
                            </Badge>
                          </div>
                          
                          {log.wrong_topics && log.wrong_topics.length > 0 && (
                            <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-950/20 rounded border border-orange-200 dark:border-orange-800">
                              <div className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-1">🔍 Yanlış Yapılan Konular:</div>
                              <div className="flex flex-wrap gap-1">
                                {log.wrong_topics.map((topic, idx) => (
                                  <span key={idx} className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded">
                                    {typeof topic === 'string' ? topic : (topic as any).topic || (topic as any).name || ''}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {archivedTab === 'exams' && (
                <div className={`space-y-3 ${archivedExamsModal.length > 5 ? 'max-h-[500px] overflow-y-auto pr-2' : ''}`}>
                  {archivedExamsModal.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-40" />
                      <p>Arşivlenmiş deneme yok</p>
                    </div>
                  ) : (
                    archivedExamsModal.map((exam) => {
                      // Parse subjects data if available
                      let subjects: any[] = [];
                      if (exam.subjects_data) {
                        try {
                          const subjectsData = JSON.parse(exam.subjects_data);
                          const subjectNames: {[key: string]: string} = {
                            'turkce': 'Türkçe', 'matematik': 'Matematik', 'geometri': 'Geometri', 'sosyal': 'Sosyal Bilimler', 'fen': 'Fen Bilimleri',
                            'fizik': 'Fizik', 'kimya': 'Kimya', 'biyoloji': 'Biyoloji', 'paragraf': 'Paragraf', 'problemler': 'Problemler'
                          };
                          subjects = Object.entries(subjectsData).map(([key, data]: [string, any]) => {
                            const correct = parseInt(data.correct) || 0;
                            const wrong = parseInt(data.wrong) || 0;
                            const blank = parseInt(data.blank) || 0;
                            const netScore = correct - (wrong * 0.25);
                            return {
                              name: subjectNames[key] || key,
                              correct,
                              wrong,
                              blank,
                              netScore,
                              wrong_topics: data.wrong_topics || []
                            };
                          }).filter(s => (s.correct + s.wrong + s.blank) > 0);
                        } catch (e) {
                          console.error('Error parsing subjects_data:', e);
                        }
                      }
                      
                      const examTypeLabel = exam.exam_scope === 'full' ? 'Genel Deneme' : 'Branş Denemesi';
                      
                      return (
                        <div key={exam.id} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border border-blue-200 dark:border-blue-800 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-foreground text-lg">{formatExamName(exam.display_name || exam.exam_name)}</div>
                              <div className="text-sm font-medium text-muted-foreground">{examTypeLabel}</div>
                              <div className="text-sm text-muted-foreground">📅 {new Date(exam.exam_date).toLocaleDateString('tr-TR')}</div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteArchivedExamMutation.mutate(exam.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                              data-testid={`button-delete-archived-exam-${exam.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="flex gap-2">
                            {exam.exam_type === 'TYT' || exam.exam_scope === 'full' ? (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 font-bold">
                                📊 TYT Net: {exam.tyt_net}
                              </Badge>
                            ) : null}
                            {exam.exam_type === 'AYT' || exam.exam_scope === 'full' ? (
                              <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 font-bold">
                                📊 AYT Net: {exam.ayt_net}
                              </Badge>
                            ) : null}
                          </div>
                          
                          {subjects.length > 0 && (
                            <div className="mt-2 space-y-2">
                              <div className="text-xs font-semibold text-blue-700 dark:text-blue-400">📚 Ders Detayları:</div>
                              {subjects.map((subject, idx) => (
                                <div key={idx} className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-blue-200/50 dark:border-blue-700/30 space-y-2">
                                  <div className="font-semibold text-sm">{subject.name}</div>
                                  <div className="flex gap-2 flex-wrap text-xs">
                                    <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                      ✅ {subject.correct}
                                    </Badge>
                                    <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                      ❌ {subject.wrong}
                                    </Badge>
                                    <Badge variant="outline" className="bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
                                      ⭕ {subject.blank}
                                    </Badge>
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-bold">
                                      Net: {subject.netScore.toFixed(2)}
                                    </Badge>
                                  </div>
                                  
                                  {subject.wrong_topics && subject.wrong_topics.length > 0 && (
                                    <div className="p-2 bg-orange-50 dark:bg-orange-950/20 rounded border border-orange-200 dark:border-orange-800">
                                      <div className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-1">🔍 Yanlış Konular:</div>
                                      <div className="flex flex-wrap gap-1">
                                        {subject.wrong_topics.map((topic: any, tIdx: number) => (
                                          <span key={tIdx} className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded">
                                            {typeof topic === 'string' ? topic : topic.topic || topic.name || ''}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {archivedTab === 'tasks' && (
                <div className={`space-y-3 ${archivedTasksModal.length > 5 ? 'max-h-[500px] overflow-y-auto pr-2' : ''}`}>
                  {archivedTasksModal.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Target className="h-12 w-12 mx-auto mb-3 opacity-40" />
                      <p>Arşivlenmiş görev yok</p>
                    </div>
                  ) : (
                    archivedTasksModal.map((task) => {
                      // Get the most relevant date (archivedAt > completedAt > dueDate > createdAt)
                      let displayDate = task.archivedAt || task.completedAt || task.dueDate || task.createdAt;
                      let dateLabel = task.archivedAt ? 'Arşivlenme' : task.completedAt ? 'Tamamlanma' : task.dueDate ? 'Bitiş' : 'Oluşturma';
                      
                      return (
                        <div key={task.id} className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-lg border border-purple-200 dark:border-purple-800 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-foreground text-lg">{task.title}</div>
                              {task.description && (
                                <div className="text-sm text-muted-foreground mt-1 p-2 bg-purple-50/50 dark:bg-purple-900/20 rounded border border-purple-200/50 dark:border-purple-700/30">
                                  📝 {task.description}
                                </div>
                              )}
                              {displayDate && (
                                <div className="text-xs text-muted-foreground mt-2">
                                  📅 {dateLabel} Tarihi: {new Date(displayDate).toLocaleDateString('tr-TR')}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteArchivedTaskMutation.mutate(task.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 ml-2"
                              data-testid={`button-delete-archived-task-${task.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="flex gap-2">
                            {task.completed && (
                              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                                ✅ Tamamlandı
                              </Badge>
                            )}
                            {!task.completed && (
                              <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400">
                                ⏳ Tamamlanmadı
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {archivedTab === 'studyHours' && (
                <div className={`space-y-3 ${archivedStudyHoursModal.length > 5 ? 'max-h-[500px] overflow-y-auto pr-2' : ''}`}>
                  {archivedStudyHoursModal.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-3 opacity-40" />
                      <p>Arşivlenmiş çalışma saati yok</p>
                    </div>
                  ) : (
                    archivedStudyHoursModal.map((sh: any) => (
                      <div key={sh.id} className="p-4 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 rounded-lg border border-cyan-200 dark:border-cyan-800">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-foreground">
                              {sh.hours}s {sh.minutes}d {sh.seconds}sn
                            </div>
                            <div className="text-sm text-muted-foreground">{new Date(sh.study_date).toLocaleDateString('tr-TR')}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400">
                              ⏱️ Çalışma Saati
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteStudyHoursMutation.mutate(sh.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                              disabled={deleteStudyHoursMutation.isPending}
                              data-testid={`button-delete-archived-study-hour-${sh.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowArchivedDataModal(false)}
            >
              Kapat
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tamamlanan Hatalı Konular Modalı */}
      <Dialog open={showCompletedTopicsModal} onOpenChange={setShowCompletedTopicsModal}>
        <DialogContent className="sm:max-w-5xl max-h-[85vh] overflow-y-auto" key={completedTopicsRefreshKey}>
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-center bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
              ✅ Tamamlanan Hatalı Konular Geçmişi
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground text-lg">
              Checkbox ile işaretlediğiniz ve tamamladığınız tüm konuların geçmişi
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {(() => {
              // LocalStorage'dan tüm tamamlanan konuları topla
              const completedGeneral = JSON.parse(localStorage.getItem('completedGeneralExamErrors') || '[]');
              const completedBranch = JSON.parse(localStorage.getItem('completedBranchExamErrors') || '[]');
              const completedQuestion = JSON.parse(localStorage.getItem('completedQuestionErrors') || '[]');
              const completedFromMissing = JSON.parse(localStorage.getItem('completedTopicsFromMissing') || '[]');
              
              const allCompleted = [...completedGeneral, ...completedBranch, ...completedQuestion, ...completedFromMissing]
                .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
              
              if (allCompleted.length === 0) {
                return (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle className="h-16 w-16 mx-auto mb-4 opacity-40" />
                    <p className="text-lg">Henüz tamamlanmış konu yok</p>
                    <p className="text-sm mt-2">Eksik Olduğum Konular veya Hata Sıklığı bölümlerinden konuları işaretleyerek tamamlayabilirsiniz</p>
                  </div>
                );
              }
              
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <div className="text-sm font-semibold text-green-700 dark:text-green-400">
                      Toplam {allCompleted.length} konu tamamlandı 🎉
                    </div>
                  </div>
                  
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                    {allCompleted.map((item, index) => (
                      <div 
                        key={index} 
                        className="bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-xl p-4 border-2 border-green-200/50 dark:border-green-800/50 hover:shadow-lg transition-all duration-300"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                                {item.subject || 'Ders'}
                              </span>
                              <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                                item.tag === 'Genel Deneme' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' :
                                item.tag === 'Branş Denemesi' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400' :
                                'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400'
                              }`}>
                                {item.tag}
                              </span>
                            </div>
                            <div className="text-base font-bold text-gray-800 dark:text-gray-200 mb-1">
                              {item.topic || 'Konu'}
                            </div>
                            {item.frequency && (
                              <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1.5">
                                ⚠️ {item.frequency} kez yanlış yapılmıştır
                              </div>
                            )}
                            <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5" />
                              <span className="font-semibold">Tamamlanma Tarihi:</span>
                              {new Date(item.completedAt).toLocaleDateString('tr-TR', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                          <div className="flex-shrink-0 flex items-center gap-2">
                            <div className="p-3 bg-green-100 dark:bg-green-900/40 rounded-xl">
                              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-10 w-10 p-0 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
                              onClick={() => {
                                // Hangi kaynaktan geldiğini belirle
                                let storageKey = '';
                                if (item.tag === 'Genel Deneme') {
                                  storageKey = 'completedGeneralExamErrors';
                                } else if (item.tag === 'Branş Denemesi' || item.tag === 'Branş Deneme') {
                                  storageKey = 'completedBranchExamErrors';
                                } else if (item.tag === 'Soru') {
                                  // Eksik Olduğum Konular'dan gelenleri de kontrol et
                                  const fromMissing = JSON.parse(localStorage.getItem('completedTopicsFromMissing') || '[]');
                                  const foundInMissing = fromMissing.find((entry: any) => entry.key === item.key);
                                  storageKey = foundInMissing ? 'completedTopicsFromMissing' : 'completedQuestionErrors';
                                } else {
                                  storageKey = 'completedQuestionErrors';
                                }
                                
                                console.log('Silme işlemi:', { storageKey, itemKey: item.key, itemTag: item.tag, itemTopic: item.topic });
                                
                                const saved = localStorage.getItem(storageKey);
                                if (saved) {
                                  const arr = JSON.parse(saved);
                                  console.log('Mevcut veriler:', arr);
                                  const filtered = arr.filter((entry: any) => entry.key !== item.key);
                                  console.log('Filtrelenmiş veriler:', filtered);
                                  localStorage.setItem(storageKey, JSON.stringify(filtered));
                                  window.dispatchEvent(new Event('localStorageUpdate'));
                                  
                                  // Modalı yenile
                                  setCompletedTopicsRefreshKey(prev => prev + 1);
                                  
                                  toast({ 
                                    title: "🗑️ Silindi", 
                                    description: `${item.topic} tamamlanmış konulardan kaldırıldı.`
                                  });
                                } else {
                                  console.error('localStorage\'da veri bulunamadı:', storageKey);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Tüm Soruları Sil Onay Modalı */}
      <AlertDialog open={showDeleteAllQuestionsDialog} onOpenChange={setShowDeleteAllQuestionsDialog}>
        <AlertDialogContent className="bg-white dark:bg-gray-900 border-red-200 dark:border-red-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-700 dark:text-red-400 text-xl flex items-center gap-2">
              <Trash2 className="h-6 w-6" />
              Tüm Soru Kayıtlarını Sil
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              Tüm soru çözüm kayıtlarınızı silmek üzeresiniz. Bu işlem geri alınamaz!
            </AlertDialogDescription>
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">⚠️ Uyarı:</p>
              <ul className="mt-2 text-sm text-red-600 dark:text-red-400 list-disc list-inside">
                <li>Tüm soru çözüm kayıtlarınız silinecek</li>
                <li>İstatistikler ve analizler etkilenecek</li>
                <li>Bu işlem geri alınamaz</li>
              </ul>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-300 dark:border-gray-700">İptal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                deleteAllQuestionLogsMutation.mutate();
                setShowDeleteAllQuestionsDialog(false);
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Evet, Tümünü Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tüm Denemeleri Sil Onay Modalı */}
      <AlertDialog open={showDeleteAllExamsDialog} onOpenChange={setShowDeleteAllExamsDialog}>
        <AlertDialogContent className="bg-white dark:bg-gray-900 border-red-200 dark:border-red-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-700 dark:text-red-400 text-xl flex items-center gap-2">
              <Trash2 className="h-6 w-6" />
              Tüm Deneme Sonuçlarını Sil
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              Tüm deneme sınav sonuçlarınızı silmek üzeresiniz. Bu işlem geri alınamaz!
            </AlertDialogDescription>
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">⚠️ Uyarı:</p>
              <ul className="mt-2 text-sm text-red-600 dark:text-red-400 list-disc list-inside">
                <li>Tüm deneme sonuçlarınız silinecek</li>
                <li>Net grafikleri ve analizler sıfırlanacak</li>
                <li>Bu işlem geri alınamaz</li>
              </ul>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-300 dark:border-gray-700">İptal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                deleteAllExamResultsMutation.mutate();
                setShowDeleteAllExamsDialog(false);
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Evet, Tümünü Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* TÜM VERİLERİ TEMİZLE İLK MODAL - UYARI */}
      <AlertDialog open={showDeleteAllDataDialog} onOpenChange={setShowDeleteAllDataDialog}>
        <AlertDialogContent className="bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-orange-950/40 dark:via-gray-900 dark:to-red-950/40 border-2 border-red-300 dark:border-red-700 shadow-2xl max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-3xl font-bold text-center bg-gradient-to-r from-orange-600 via-red-600 to-orange-600 bg-clip-text text-transparent flex items-center justify-center gap-3">
              ⚠️ UYARI: Uygulama Sıfırlanacak!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-700 dark:text-gray-300 text-base font-medium text-center mt-4">
              Bu işlem komple uygulamayı sıfıra döndürecektir. <span className="font-bold text-red-600 dark:text-red-400">TÜM VERİLERİNİZ KALICI OLARAK SİLİNECEK!</span>
            </AlertDialogDescription>
            <div className="mt-6 space-y-4">
              <div className="p-6 bg-gradient-to-br from-red-100 to-orange-50 dark:from-red-950/60 dark:to-orange-950/40 rounded-xl border-2 border-red-400 dark:border-red-700 shadow-lg">
                <p className="text-lg font-bold text-red-700 dark:text-red-300 mb-4 flex items-center gap-2">
                  💥 Silinecek Veriler:
                </p>
                <ul className="space-y-3 text-sm text-gray-800 dark:text-gray-200">
                  <li className="flex items-start gap-3 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                    <span className="text-xl">📝</span>
                    <span><strong className="text-orange-700 dark:text-orange-400">Görevler:</strong> Tamamlanan ve bekleyen tüm görevleriniz</span>
                  </li>
                  <li className="flex items-start gap-3 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                    <span className="text-xl">📚</span>
                    <span><strong className="text-red-700 dark:text-red-400">Soru Kayıtları:</strong> Çözdüğünüz tüm sorular ve istatistikler</span>
                  </li>
                  <li className="flex items-start gap-3 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                    <span className="text-xl">🎯</span>
                    <span><strong className="text-orange-700 dark:text-orange-400">Deneme Sonuçları:</strong> TYT/AYT tüm deneme sınav kayıtları</span>
                  </li>
                  <li className="flex items-start gap-3 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                    <span className="text-xl">⏱️</span>
                    <span><strong className="text-red-700 dark:text-red-400">Çalışma Saatleri:</strong> Tüm çalışma saati kayıtları</span>
                  </li>
                  <li className="flex items-start gap-3 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                    <span className="text-xl">💾</span>
                    <span><strong className="text-orange-700 dark:text-orange-400">Tüm Ayarlar:</strong> Düzeltilen konular, hedef netler, localStorage verileri</span>
                  </li>
                </ul>
              </div>
              
              <div className="p-4 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-950/50 dark:to-orange-950/50 rounded-xl border-2 border-yellow-400 dark:border-yellow-700 shadow-lg">
                <p className="text-sm font-bold text-yellow-800 dark:text-yellow-300 mb-2 flex items-center gap-2">
                  ℹ️ İşlem Sonrası Durum:
                </p>
                <ul className="text-sm text-yellow-800 dark:text-yellow-300 space-y-2 list-none">
                  <li className="flex items-center gap-2">
                    <span className="text-yellow-600 dark:text-yellow-400">✓</span>
                    Uygulama otomatik olarak yenilenecek
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-yellow-600 dark:text-yellow-400">✓</span>
                    Sıfırdan başlayacaksınız (tüm veriler silinmiş olacak)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-yellow-600 dark:text-yellow-400">✓</span>
                    Bu işlem 2-3 saniye sürebilir
                  </li>
                  <li className="flex items-center gap-2 mt-3 font-bold text-red-700 dark:text-red-400">
                    <span className="text-red-600 dark:text-red-400">⚠️</span>
                    Bu işlem GERİ ALINAMAZ!
                  </li>
                </ul>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel 
              className="border-2 border-gray-400 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-950/30 text-gray-700 dark:text-gray-300 font-semibold"
            >
              İptal Et
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setShowDeleteAllDataDialog(false);
                setShowDeleteAllDataConfirmDialog(true);
              }}
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold px-8 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              1. Adım: Devam Et
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* TÜM VERİLERİ TEMİZLE İKİNCİ MODAL - SON ONAY */}
      <AlertDialog open={showDeleteAllDataConfirmDialog} onOpenChange={setShowDeleteAllDataConfirmDialog}>
        <AlertDialogContent className="bg-gradient-to-br from-red-50 via-white to-red-50 dark:from-red-950/40 dark:via-gray-900 dark:to-red-950/40 border-2 border-red-500 dark:border-red-700 shadow-2xl max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold text-center text-red-700 dark:text-red-400 flex items-center justify-center gap-3">
              🚨 Son Onay
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-700 dark:text-gray-300 text-lg font-semibold text-center mt-4">
              Temizlemek istediğinize <span className="font-bold text-red-600 dark:text-red-400">EMİN MİSİNİZ?</span>
            </AlertDialogDescription>
            <div className="mt-6 p-6 bg-red-100 dark:bg-red-950/60 rounded-xl border-2 border-red-500 dark:border-red-700">
              <p className="text-center text-base font-bold text-red-800 dark:text-red-300 mb-4">
                ⚠️ Bu işlem GERİ ALINAMAZ!
              </p>
              <p className="text-center text-sm text-red-700 dark:text-red-400">
                Tüm çalışma verileriniz, deneme sonuçlarınız, görevleriniz ve ayarlarınız kalıcı olarak silinecek.
              </p>
              <p className="text-center text-sm font-bold text-red-800 dark:text-red-300 mt-4">
                💾 Yedek almadıysanız, verilerinizi geri alamazsınız!
              </p>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel 
              className="border-2 border-gray-400 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-950/30 text-gray-700 dark:text-gray-300 font-semibold"
              disabled={deleteAllDataMutation.isPending}
            >
              Hayır, İptal Et
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setShowDeleteAllDataConfirmDialog(false);
                setShowDeleteAllDataCountdownDialog(true);
                setDeleteCountdown(300); // 5 dakika geri sayımı başlat
              }}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold px-8 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              2. Adım: Son Onay
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* TÜM VERİLERİ TEMİZLE 3. MODAL - 5 DAKİKALIK GERİ SAYIM -  - 03:03:03 */}
      <AlertDialog open={showDeleteAllDataCountdownDialog} onOpenChange={(open) => {
        if (!open) {
          setShowDeleteAllDataCountdownDialog(false);
          setDeleteCountdown(300);
        }
      }}>
        <AlertDialogContent className="bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-red-950/40 dark:via-gray-900 dark:to-orange-950/40 border-4 border-red-600 dark:border-red-700 shadow-2xl max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-4xl font-black text-center bg-gradient-to-r from-red-600 via-orange-600 to-red-600 bg-clip-text text-transparent flex items-center justify-center gap-3 mb-4">
              ⏰ GERİ SAYIM BAŞLADI!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-700 dark:text-gray-300 text-lg font-bold text-center mt-4">
              Tüm verileriniz {Math.floor(deleteCountdown / 60)} dakika {deleteCountdown % 60} saniye içinde <span className="font-black text-red-600 dark:text-red-400 text-2xl">SİLİNECEK!</span>
            </AlertDialogDescription>
            
            <div className="mt-8 space-y-6">
              {/* Dev Geri Sayım Göstergesi */}
              <div className="relative">
                <div className="flex items-center justify-center">
                  <div className="relative w-64 h-64">
                    {/* Daire Progress */}
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="128"
                        cy="128"
                        r="120"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        className="text-gray-200 dark:text-gray-700"
                      />
                      <circle
                        cx="128"
                        cy="128"
                        r="120"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 120}`}
                        strokeDashoffset={`${2 * Math.PI * 120 * (1 - deleteCountdown / 300)}`}
                        className="text-red-600 dark:text-red-400 transition-all duration-1000"
                        strokeLinecap="round"
                      />
                    </svg>
                    
                    {/* Merkez Sayı */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-7xl font-black text-red-600 dark:text-red-400 tabular-nums">
                        {Math.floor(deleteCountdown / 60)}:{String(deleteCountdown % 60).padStart(2, '0')}
                      </div>
                      <div className="text-lg font-bold text-gray-600 dark:text-gray-400 mt-2">
                        kalan süre
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Uyarı Mesajı */}
              <div className="p-6 bg-gradient-to-br from-red-100 to-orange-50 dark:from-red-950/60 dark:to-orange-950/40 rounded-xl border-4 border-red-500 dark:border-red-700 shadow-2xl animate-pulse">
                <p className="text-center text-xl font-black text-red-800 dark:text-red-300 mb-4 flex items-center justify-center gap-3">
                  🚨 SON UYARI!
                </p>
                <p className="text-center text-base font-bold text-red-700 dark:text-red-400">
                  Geri sayım bittiğinde TÜM VERİLERİNİZ kalıcı olarak silinecek!
                </p>
                <p className="text-center text-sm font-semibold text-orange-700 dark:text-orange-400 mt-3">
                  İptal etmek için aşağıdaki butona tıklayın.
                </p>
              </div>
            </div>
          </AlertDialogHeader>
          
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel 
              className="flex-1 border-4 border-green-600 dark:border-green-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/50 dark:hover:to-emerald-900/50 text-green-700 dark:text-green-300 font-black text-xl py-6 shadow-xl hover:shadow-2xl transition-all duration-300"
              onClick={() => {
                setShowDeleteAllDataCountdownDialog(false);
                setDeleteCountdown(300);
                toast({
                  title: "✅ İptal Edildi",
                  description: "Veri silme işlemi iptal edildi. Verileriniz güvende!",
                });
              }}
            >
              ❌ DURDUR VE İPTAL ET
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Arşivlenen Deneme Sonuçları Modalı */}
      <Dialog open={showArchivedExamsModal} onOpenChange={setShowArchivedExamsModal}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-center bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 bg-clip-text text-transparent">
              📦 Arşivlenen Deneme Sonuçları
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground text-lg">
              Arşivlenmiş deneme sonuçlarınız. Veriler raporlarda görünmeye devam eder.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {archivedExams.length === 0 ? (
              <div className="text-center py-12">
                <Archive className="h-24 w-24 text-amber-300 mx-auto mb-4 opacity-50" />
                <div className="text-xl font-semibold text-muted-foreground">Arşivlenmiş deneme bulunmuyor</div>
                <div className="text-sm text-muted-foreground mt-2">Deneme sonuçlarını arşivleyerek burada saklayabilirsiniz.</div>
              </div>
            ) : (
              <div className="grid gap-4">
                {archivedExams
                  .sort((a, b) => new Date(b.archivedAt || b.exam_date).getTime() - new Date(a.archivedAt || a.exam_date).getTime())
                  .map((exam) => {
                    const examType = exam.exam_type || (parseFloat(exam.ayt_net) > 0 ? 'AYT' : 'TYT');
                    const relevantNet = examType === 'TYT' ? parseFloat(exam.tyt_net) || 0 : parseFloat(exam.ayt_net) || 0;
                    
                    return (
                      <Card key={exam.id} className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                                  examType === 'TYT' 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-purple-500 text-white'
                                }`}>
                                  {examType}
                                </div>
                                <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100">
                                  {formatExamName(exam.display_name || exam.exam_name || 'Deneme')}
                                </h3>
                              </div>
                              
                              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  <span>
                                    {new Date(exam.exam_date).toLocaleDateString('tr-TR', {
                                      day: '2-digit',
                                      month: 'long',
                                      year: 'numeric'
                                    })}
                                  </span>
                                </div>
                                
                                {exam.archivedAt && (
                                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                                    <Archive className="h-4 w-4" />
                                    <span className="text-xs">
                                      {new Date(exam.archivedAt).toLocaleDateString('tr-TR', {
                                        day: '2-digit',
                                        month: 'short'
                                      })} arşivlendi
                                    </span>
                                  </div>
                                )}
                                
                                <div className="font-bold text-lg text-amber-700 dark:text-amber-300">
                                  Net: {relevantNet.toFixed(2)}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => unarchiveExamResultMutation.mutate(exam.id)}
                                disabled={unarchiveExamResultMutation.isPending}
                                className="p-2 bg-green-100 hover:bg-green-200 dark:bg-green-900/40 dark:hover:bg-green-900/60 text-green-700 dark:text-green-300 rounded-lg transition-all"
                                title="Arşivden Çıkar"
                              >
                                <CheckCircle className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => deleteExamResultMutation.mutate(exam.id)}
                                disabled={deleteExamResultMutation.isPending}
                                className="p-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 rounded-lg transition-all"
                                title="Sil"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Rapor Gönderme Modal - Detaylı İstatistikler */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-report-button="true">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              <FileText className="h-6 w-6" />
              📊 Haftalık Aktivite Raporu
            </DialogTitle>
            <DialogDescription>
              Son 7 günde yapılan tüm aktiviteler
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Toplam Aktivite */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-bold text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-2">
                📈 Toplam Aktivite (Son 7 Gün)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {(() => {
                      const sevenDaysAgo = new Date();
                      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                      const allTasks = [...tasks, ...archivedTasks];
                      return allTasks.filter(t => new Date(t.createdAt) >= sevenDaysAgo).length;
                    })()}
                  </div>
                  <div className="text-xs text-muted-foreground">Toplam Görev</div>
                </div>
                <div className="text-center p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {(() => {
                      const sevenDaysAgo = new Date();
                      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                      const allTasks = [...tasks, ...archivedTasks];
                      return allTasks.filter(t => t.completed && new Date(t.createdAt) >= sevenDaysAgo).length;
                    })()}
                  </div>
                  <div className="text-xs text-muted-foreground">Tamamlanan Görev</div>
                </div>
              </div>
            </div>

            {/* Çözülen Denemeler */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
              <h3 className="font-bold text-purple-700 dark:text-purple-400 mb-3 flex items-center gap-2">
                📝 Çözülen Denemeler (Son 7 Gün)
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {(() => {
                      const sevenDaysAgo = new Date();
                      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                      return allExamResults.filter(e => new Date(e.exam_date) >= sevenDaysAgo).length;
                    })()}
                  </div>
                  <div className="text-xs text-muted-foreground">Toplam Deneme</div>
                </div>
                <div className="text-center p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {(() => {
                      const sevenDaysAgo = new Date();
                      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                      return allExamResults.filter(e => e.exam_scope === 'full' && new Date(e.exam_date) >= sevenDaysAgo).length;
                    })()}
                  </div>
                  <div className="text-xs text-muted-foreground">Genel Deneme</div>
                </div>
                <div className="text-center p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                  <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                    {(() => {
                      const sevenDaysAgo = new Date();
                      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                      return allExamResults.filter(e => e.exam_scope === 'branch' && new Date(e.exam_date) >= sevenDaysAgo).length;
                    })()}
                  </div>
                  <div className="text-xs text-muted-foreground">Branş Deneme</div>
                </div>
              </div>
            </div>

            {/* Çözülen Sorular */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <h3 className="font-bold text-green-700 dark:text-green-400 mb-3 flex items-center gap-2">
                ✅ Çözülen Sorular (Son 7 Gün)
              </h3>
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {(() => {
                      const sevenDaysAgo = new Date();
                      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                      const recentLogs = allQuestionLogs.filter(log => new Date(log.study_date) >= sevenDaysAgo);
                      return recentLogs.reduce((sum, log) => sum + (Number(log.correct_count) || 0) + (Number(log.wrong_count) || 0) + (Number(log.blank_count) || 0), 0);
                    })()}
                  </div>
                  <div className="text-xs text-muted-foreground">Toplam Soru</div>
                </div>
                <div className="text-center p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {(() => {
                      const sevenDaysAgo = new Date();
                      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                      const recentLogs = allQuestionLogs.filter(log => new Date(log.study_date) >= sevenDaysAgo);
                      return recentLogs.reduce((sum, log) => sum + (Number(log.correct_count) || 0), 0);
                    })()}
                  </div>
                  <div className="text-xs text-muted-foreground">✓ Doğru</div>
                </div>
                <div className="text-center p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {(() => {
                      const sevenDaysAgo = new Date();
                      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                      const recentLogs = allQuestionLogs.filter(log => new Date(log.study_date) >= sevenDaysAgo);
                      return recentLogs.reduce((sum, log) => sum + (Number(log.wrong_count) || 0), 0);
                    })()}
                  </div>
                  <div className="text-xs text-muted-foreground">✗ Yanlış</div>
                </div>
                <div className="text-center p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {(() => {
                      const sevenDaysAgo = new Date();
                      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                      const recentLogs = allQuestionLogs.filter(log => new Date(log.study_date) >= sevenDaysAgo);
                      return recentLogs.reduce((sum, log) => sum + (Number(log.blank_count) || 0), 0);
                    })()}
                  </div>
                  <div className="text-xs text-muted-foreground">○ Boş</div>
                </div>
              </div>
            </div>

            {/* Email Gönderme Bilgisi */}
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-800">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                <strong>Email Raporu:</strong> .env dosyasında tanımlı EMAIL_FROM adresine detaylı rapor gönderilecek
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 font-mono">
                Ay sonuna kalan süre: <strong className="text-purple-600 dark:text-purple-400">
                  {String(monthEndCountdown.hours).padStart(2, '0')}:{String(monthEndCountdown.minutes).padStart(2, '0')}:{String(monthEndCountdown.seconds).padStart(2, '0')}
                </strong>
              </p>
            </div>
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowReportModal(false)}
              disabled={sendReportMutation.isPending}
            >
              Kapat
            </Button>
            <Button
              onClick={() => sendReportMutation.mutate()}
              disabled={sendReportMutation.isPending}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              {sendReportMutation.isPending ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Gönderiliyor...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Email Gönder
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tüm Verileri Temizle Butonu - Sayfa Sonu - Kilit Mekanizmalı */}
      <div className="mt-16 mb-8 flex justify-center">
        <div className="relative inline-flex flex-col items-center gap-3">
          {!isDeleteButtonUnlocked && (
            <button
              onClick={() => setIsDeleteButtonUnlocked(true)}
              className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-4xl hover:scale-110 transition-transform duration-200 cursor-pointer z-10"
              style={{
                animation: 'breathe 3s ease-in-out infinite'
              }}
              title="Kilidi açmak için tıklayın"
            >
              🔒
            </button>
          )}
          <style>{`
            @keyframes breathe {
              0%, 100% { opacity: 0.4; transform: translate(-50%, 0) scale(1); }
              50% { opacity: 1; transform: translate(-50%, 0) scale(1.05); }
            }
          `}</style>
          <Button
            onClick={() => {
              if (isDeleteButtonUnlocked) {
                setShowDeleteAllDataDialog(true);
                setIsDeleteButtonUnlocked(false);
              }
            }}
            disabled={!isDeleteButtonUnlocked}
            variant="outline"
            className={`border-4 px-12 py-6 rounded-2xl text-xl font-bold shadow-2xl transition-all duration-300 ${
              isDeleteButtonUnlocked 
                ? 'border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 hover:shadow-3xl' 
                : 'border-gray-300 text-gray-400 cursor-not-allowed opacity-50'
            }`}
            data-testid="button-delete-all-data"
          >
            <Trash2 className="mr-3 h-6 w-6" />
            Tüm Verileri Temizle
          </Button>
          {!isDeleteButtonUnlocked && (
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Kilidi açmak için 🔒 simgesine tıklayın
            </p>
          )}
        </div>
      </div>
      
      <footer className="bg-muted/30 border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-muted-foreground">
            © 2025-2026 QuantPraxus. Tüm hakları saklıdır.
          </div>
        </div>
      </footer>
    </div>
  );
}

