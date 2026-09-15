import { useState, useCallback } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Task, QuestionLog, ExamResult } from "@shared/sema";

export interface DayActivities {
  tasks: Task[];
  scheduledTasks: Task[];
  archivedTasks: Task[];
  questionLogs: QuestionLog[];
  examResults: ExamResult[];
  studyHours: any[];
  total: number;
  performanceTotal: number;
}

export type ActivityFilter = "all" | "tasks" | "questions" | "exams";

const getCategoryText = (category: string) => {
  const map: Record<string, string> = {
    genel: "Genel", turkce: "Türkçe", paragraf: "Paragraf",
    sosyal: "Sosyal Bilimler", matematik: "TYT Matematik", problemler: "Problemler",
    fizik: "TYT Fizik", kimya: "TYT Kimya", biyoloji: "TYT Biyoloji",
    "tyt-geometri": "TYT Geometri", "ayt-geometri": "AYT Geometri",
    "ayt-matematik": "AYT Matematik", "ayt-fizik": "AYT Fizik",
    "ayt-kimya": "AYT Kimya", "ayt-biyoloji": "AYT Biyoloji",
  };
  return map[category] || category;
};

interface ActivityListProps {
  activities: DayActivities;
  filter: ActivityFilter;
  onFilterChange: (f: ActivityFilter) => void;
  expandedTasks: Set<string>;
  onToggleTask: (key: string) => void;
  expandedQuestionLogs: Set<string>;
  onToggleQuestionLog: (id: string) => void;
  expandedExams: Set<string>;
  onToggleExam: (id: string) => void;
  selectedDate: string;
}

export function ActivityList({
  activities, filter, onFilterChange,
  expandedTasks, onToggleTask,
  expandedQuestionLogs, onToggleQuestionLog,
  expandedExams, onToggleExam,
}: ActivityListProps) {
  const FILTERS: { key: ActivityFilter; label: string; dot: string }[] = [
    { key: "all", label: "Tümü", dot: "bg-primary" },
    { key: "tasks", label: "Görev", dot: "bg-emerald-500" },
    { key: "questions", label: "Soru", dot: "bg-sky-500" },
    { key: "exams", label: "Deneme", dot: "bg-violet-500" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aktiviteler</span>
        <div className="h-px flex-1 bg-border/40" />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => onFilterChange(f.key)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              filter === f.key
                ? "bg-foreground text-background"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            data-testid={`button-filter-${f.key}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${f.dot}`} />
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
        {/* Completed tasks */}
        {(filter === "all" || filter === "tasks") && activities.tasks.map((task) => {
          const key = task.id;
          const expanded = expandedTasks.has(key);
          return (
            <div key={`c-${key}`} className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-medium text-foreground truncate">{task.title}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Tamamlandı</span>
                  <button onClick={() => onToggleTask(key)} className="p-0.5 rounded hover:bg-emerald-500/10 transition-colors" data-testid={`button-expand-completed-task-${task.id}`}>
                    {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                </div>
              </div>
              {expanded && (
                <div className="mt-2 pt-2 border-t border-emerald-500/15 space-y-1 text-xs text-muted-foreground">
                  {task.description && <div><span className="font-medium text-foreground">Açıklama: </span>{task.description}</div>}
                  <div><span className="font-medium text-foreground">Ders: </span>{getCategoryText(task.category)}</div>
                  {task.dueDate && <div><span className="font-medium text-foreground">Tarih: </span>{new Date(task.dueDate).toLocaleDateString("tr-TR")}</div>}
                </div>
              )}
            </div>
          );
        })}

        {/* Scheduled tasks */}
        {(filter === "all" || filter === "tasks") && activities.scheduledTasks.map((task) => {
          const key = `s-${task.id}`;
          const expanded = expandedTasks.has(key);
          return (
            <div key={key} className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground shrink-0" />
                  <span className="font-medium text-foreground truncate">{task.title}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Planlandı</span>
                  <button onClick={() => onToggleTask(key)} className="p-0.5 rounded hover:bg-muted transition-colors" data-testid={`button-expand-scheduled-task-${task.id}`}>
                    {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                </div>
              </div>
              {expanded && (
                <div className="mt-2 pt-2 border-t border-border/40 space-y-1 text-xs text-muted-foreground">
                  {task.description && <div><span className="font-medium text-foreground">Açıklama: </span>{task.description}</div>}
                  <div><span className="font-medium text-foreground">Ders: </span>{getCategoryText(task.category)}</div>
                  {task.dueDate && <div><span className="font-medium text-foreground">Tarih: </span>{new Date(task.dueDate).toLocaleDateString("tr-TR")}</div>}
                </div>
              )}
            </div>
          );
        })}

        {/* Archived tasks */}
        {(filter === "all" || filter === "tasks") && activities.archivedTasks.map((task) => {
          const key = `a-${task.id}`;
          const expanded = expandedTasks.has(key);
          return (
            <div key={key} className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="font-medium text-foreground truncate">{task.title}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">Arşivlendi</span>
                  <button onClick={() => onToggleTask(key)} className="p-0.5 rounded hover:bg-amber-500/10 transition-colors" data-testid={`button-expand-archived-task-${task.id}`}>
                    {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                </div>
              </div>
              {expanded && (
                <div className="mt-2 pt-2 border-t border-amber-500/15 space-y-1 text-xs text-muted-foreground">
                  {task.description && <div><span className="font-medium text-foreground">Açıklama: </span>{task.description}</div>}
                  <div><span className="font-medium text-foreground">Ders: </span>{getCategoryText(task.category)}</div>
                  {task.dueDate && <div><span className="font-medium text-foreground">Tarih: </span>{new Date(task.dueDate).toLocaleDateString("tr-TR")}</div>}
                </div>
              )}
            </div>
          );
        })}

        {/* Question logs */}
        {(filter === "all" || filter === "questions") && activities.questionLogs.map((log) => {
          const correct = Number(log.correct_count) || 0;
          const wrong = Number(log.wrong_count) || 0;
          const blank = Number(log.blank_count) || 0;
          const net = correct - wrong * 0.25;
          const expanded = expandedQuestionLogs.has(log.id);
          return (
            <div key={log.id} className="rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                  <span className="font-medium text-foreground truncate">{[log.exam_type, log.subject].filter(Boolean).join(" ") || "Soru Çözümü"}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0 text-[10px] font-semibold">
                  <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">✓ {correct}</span>
                  <button onClick={() => onToggleQuestionLog(log.id)} className="text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 px-1.5 py-0.5 rounded transition-colors">✗ {wrong}</button>
                  <span className="text-muted-foreground bg-muted px-1.5 py-0.5 rounded">○ {blank}</span>
                  <span className="text-sky-600 dark:text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded">Net {net.toFixed(2)}</span>
                </div>
              </div>
              {expanded && log.wrong_topics && (() => {
                try {
                  const topics = typeof log.wrong_topics === "string" ? JSON.parse(log.wrong_topics) : log.wrong_topics;
                  if (!Array.isArray(topics) || topics.length === 0) return null;
                  return (
                    <div className="mt-2 pt-2 border-t border-sky-500/15">
                      <div className="text-[10px] font-semibold text-red-500 mb-1">Yanlış Konular</div>
                      <div className="flex flex-wrap gap-1">
                        {topics.map((t: any, i: number) => {
                          const name = typeof t === "string" ? t : t.topic || t.name || "";
                          return name ? <span key={i} className="text-[10px] px-1.5 py-0.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded">{name}</span> : null;
                        })}
                      </div>
                    </div>
                  );
                } catch { return null; }
              })()}
            </div>
          );
        })}

        {/* Exam results */}
        {(filter === "all" || filter === "exams") && activities.examResults.map((exam) => {
          const expanded = expandedExams.has(exam.id);
          let examSubjects: any[] = [];
          let totalWrong = 0;
          if (exam.subjects_data) {
            try {
              const sd = JSON.parse(exam.subjects_data);
              examSubjects = Object.entries(sd).map(([subject, data]: [string, any]) => ({
                subject, wrong_count: data.wrong || "0", wrong_topics_json: JSON.stringify(data.wrong_topics || []),
              }));
              totalWrong = Object.values(sd).reduce((s: number, d: any) => s + (parseInt(d.wrong) || 0), 0);
            } catch {}
          }
          return (
            <div key={exam.id} className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                  <span className="font-medium text-foreground truncate">{exam.exam_scope === "branch" ? "Branş" : "Genel"}: {exam.display_name || exam.exam_name || "Deneme"}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0 text-[10px] font-semibold">
                  {totalWrong > 0 && (
                    <button onClick={() => onToggleExam(exam.id)} className="text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 px-1.5 py-0.5 rounded transition-colors">✗ {totalWrong}</button>
                  )}
                  <span className="text-violet-600 dark:text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">
                    {exam.exam_type === "TYT" ? `TYT ${exam.tyt_net}` : exam.exam_type === "AYT" ? `AYT ${exam.ayt_net}` : `Net ${parseFloat(exam.tyt_net) > 0 ? exam.tyt_net : exam.ayt_net}`}
                  </span>
                </div>
              </div>
              {expanded && (
                <div className="mt-2 pt-2 border-t border-violet-500/15">
                  <div className="text-[10px] font-semibold text-red-500 mb-1">Yanlış Konular</div>
                  <div className="flex flex-wrap gap-1">
                    {examSubjects.map((sn, i) => {
                      if (!sn.wrong_topics_json) return null;
                      try {
                        const wt = JSON.parse(sn.wrong_topics_json);
                        if (!Array.isArray(wt) || wt.length === 0) return null;
                        return wt.map((t: any, ti: number) => {
                          const name = typeof t === "string" ? t : t.topic || t.name || "";
                          return name ? <span key={`${i}-${ti}`} className="text-[10px] px-1.5 py-0.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded">{name}</span> : null;
                        });
                      } catch { return null; }
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StudyHoursRow({ studyHours }: { studyHours: any[] }) {
  if (!studyHours.length) return null;
  const totalSeconds = studyHours.reduce((sum, sh) => {
    return sum + (parseInt(sh.hours) || 0) * 3600 + (parseInt(sh.minutes) || 0) * 60 + (parseInt(sh.seconds) || 0);
  }, 0);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-border/50 bg-muted/30">
      <span className="text-xs font-medium text-muted-foreground">Çalışma Süresi</span>
      <span className="text-sm font-semibold tabular-nums text-foreground">{h}s {m}dk</span>
    </div>
  );
}

export function PerformanceBar({ total }: { total: number }) {
  const pct = Math.min((total / 10) * 100, 100);
  const label = total >= 10 ? "Mükemmel bir gün" : total >= 5 ? "İyi gidiyor" : "Biraz daha çalışabilirsin";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Günlük Performans</span>
        <span className="text-sm font-bold text-foreground tabular-nums">{total}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

export function StatGrid({ activities }: { activities: DayActivities }) {
  const questionCount = activities.questionLogs.reduce((s, log) => s + (parseInt(log.correct_count) || 0) + (parseInt(log.wrong_count) || 0), 0);
  const examQuestionCount = activities.examResults.reduce((s, exam) => {
    if (!exam.subjects_data) return s;
    try {
      const sd = JSON.parse(exam.subjects_data);
      return s + Object.values(sd).reduce((ss: number, d: any) => ss + (parseInt(d.correct) || 0) + (parseInt(d.wrong) || 0), 0);
    } catch { return s; }
  }, 0);
  const stats = [
    { label: "Görev", value: activities.tasks.length, color: "text-emerald-600 dark:text-emerald-400" },
    { label: "Soru", value: questionCount + examQuestionCount, color: "text-sky-600 dark:text-sky-400" },
    { label: "Deneme", value: activities.examResults.length, color: "text-violet-600 dark:text-violet-400" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {stats.map((s) => (
        <div key={s.label} className="rounded-lg border border-border/50 bg-card/50 px-2 py-2.5 text-center">
          <div className={`text-xl font-bold tabular-nums ${s.color}`}>{s.value}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

export function useExpandState() {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [expandedQuestionLogs, setExpandedQuestionLogs] = useState<Set<string>>(new Set());
  const [expandedExams, setExpandedExams] = useState<Set<string>>(new Set());

  const toggleTask = useCallback((key: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);
  const toggleQuestionLog = useCallback((id: string) => {
    setExpandedQuestionLogs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);
  const toggleExam = useCallback((id: string) => {
    setExpandedExams((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  return { expandedTasks, toggleTask, expandedQuestionLogs, toggleQuestionLog, expandedExams, toggleExam };
}
