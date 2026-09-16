import { useQuery, useMutation } from "@tanstack/react-query";
import { Task } from "@shared/sema";
import { CheckCircle2, Circle, Plus, ArrowRight } from "lucide-react";
import { apiRequest, sorguIstemcisi } from "@/kutuphane/sorguIstemcisi";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { Link } from "wouter";

export function TodaysTasksWidget() {
  const { toast } = useToast();
  const [celebratingTask, setCelebratingTask] = useState<string | null>(null);

  const getCategoryText = (category: string) => {
    switch (category) {
      case "genel": return "Genel";
      case "turkce": return "Türkçe";
      case "paragraf": return "Paragraf";
      case "sosyal": return "Sosyal";
      case "matematik": return "Matematik";
      case "problemler": return "Problemler";
      case "fizik": return "Fizik";
      case "kimya": return "Kimya";
      case "biyoloji": return "Biyoloji";
      case "tyt-geometri": return "Geometri";
      case "ayt-geometri": return "AYT Geometri";
      case "ayt-matematik": return "AYT Matematik";
      case "ayt-fizik": return "AYT Fizik";
      case "ayt-kimya": return "AYT Kimya";
      case "ayt-biyoloji": return "AYT Biyoloji";
      default: return category;
    }
  };

  const getTurkeyDateString = () => {
    const now = new Date();
    const turkeyTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
    const year = turkeyTime.getFullYear();
    const month = (turkeyTime.getMonth() + 1).toString().padStart(2, '0');
    const day = turkeyTime.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayStr = getTurkeyDateString();

  const { data: todaysData, isLoading } = useQuery<{
    date: string;
    dayNumber: number;
    daysRemaining: number;
    tasks: Task[];
    tasksCount: number;
  }>({
    queryKey: ["/api/calendar", todayStr],
    queryFn: async () => {
      const response = await fetch(`/api/calendar/${todayStr}`);
      if (!response.ok) throw new Error('Failed to fetch today\'s tasks');
      return response.json();
    },
    refetchInterval: 2000,
  });

  const toggleTaskMutation = useMutation({
    mutationFn: (taskId: string) =>
      apiRequest("PATCH", `/api/tasks/${taskId}/toggle`),
    onSuccess: (_, taskId) => {
      const task = allTasks.find(t => t.id === taskId);
      const wasCompleted = task?.completed;

      if (wasCompleted) {
        sorguIstemcisi.invalidateQueries({ queryKey: ["/api/calendar", todayStr] });
        sorguIstemcisi.invalidateQueries({ queryKey: ["/api/tasks"] });
      }

      if (!wasCompleted) {
        setCelebratingTask(taskId);
        toast({ title: "Tebrikler!", description: "Görev tamamlandı." });
        setTimeout(() => {
          setCelebratingTask(null);
          sorguIstemcisi.invalidateQueries({ queryKey: ["/api/calendar", todayStr] });
          sorguIstemcisi.invalidateQueries({ queryKey: ["/api/tasks"] });
        }, 800);
      } else {
        toast({ title: "Görev güncellendi", description: "Durum değiştirildi." });
      }
    },
    onError: () => {
      toast({ title: "Hata", description: "Görev durumu değiştirilemedi.", variant: "destructive" });
    },
  });

  const allTasks = todaysData?.tasks || [];

  const tasks = useMemo(() => {
    const tasksUnordered = allTasks.filter(task => !task.completed && !task.archived && !task.deleted);
    try {
      const savedOrder = localStorage.getItem('taskOrder');
      if (savedOrder) {
        const orderArray = JSON.parse(savedOrder) as string[];
        return [...tasksUnordered].sort((a, b) => {
          const indexA = orderArray.indexOf(a.id);
          const indexB = orderArray.indexOf(b.id);
          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          return 0;
        });
      }
      return tasksUnordered;
    } catch {
      return tasksUnordered;
    }
  }, [todaysData]);

  const activeTasks = allTasks.filter(task => !task.archived && !task.deleted);
  const completedCount = activeTasks.filter(task => task.completed).length;
  const totalCount = activeTasks.length;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/20 bg-card/30 p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Bugünün Planı</h3>
        <div className="animate-pulse space-y-2.5">
          <div className="h-4 bg-muted/40 rounded w-3/4"></div>
          <div className="h-3 bg-muted/30 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/20 bg-card/30 flex flex-col relative overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <h3 className="text-sm font-semibold text-foreground">Bugünün Planı</h3>
        <div className="text-xs font-medium text-muted-foreground tabular-nums" data-testid="text-today-counts">
          {completedCount}/{totalCount}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-5 py-5 text-center">
          <p className="text-sm font-medium text-foreground/80">Henüz planlanmış bir çalışma yok.</p>
          <p className="text-xs text-muted-foreground mt-1">Bugünün planını oluştur.</p>
          <Link href="/timer">
            <button className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
              Plan oluştur
              <ArrowRight className="w-3 h-3" />
            </button>
          </Link>
        </div>
      ) : (
        <>
          {/* Progress bar — subtle */}
          <div className="px-4 pb-2">
            <div className="w-full bg-muted/40 rounded-full h-[3px]">
              <div
                className="bg-primary h-[3px] rounded-full transition-all duration-500"
                style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className={`space-y-2 px-4 pb-3.5 ${tasks.length > 6 ? 'overflow-y-auto max-h-[280px]' : ''} custom-scrollbar`}>
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all duration-200 relative ${
                  celebratingTask === task.id
                    ? 'bg-primary/5 border-primary/20'
                    : task.completed
                    ? 'bg-muted/15 border-border/15'
                    : 'bg-background/30 border-border/15 hover:border-border/30'
                }`}
                data-testid={`list-task-${task.id}`}
              >
                <div
                  className="absolute left-0 top-0 bottom-0 w-[2px] rounded-l-lg"
                  style={{ backgroundColor: task.color || 'hsl(262 72% 62%)' }}
                />
                <button
                  onClick={() => toggleTaskMutation.mutate(task.id)}
                  className={`flex-shrink-0 mt-0.5 transition-all duration-200 ${
                    task.completed
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-primary'
                  }`}
                  disabled={toggleTaskMutation.isPending}
                  data-testid={`button-toggle-task-${task.id}`}
                >
                  {task.completed ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className={`text-[13px] font-medium leading-tight ${
                    task.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                  }`}>
                    {task.title}
                  </div>

                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground font-medium">
                      {getCategoryText(task.category)}
                    </span>
                    {task.priority === 'high' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium">
                        Yüksek
                      </span>
                    )}
                    {task.priority === 'medium' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                        Orta
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {tasks.length > 0 && (
            <div className="px-4 py-2 border-t border-border/10">
              <div className="text-[11px] text-muted-foreground text-center">
                {completedCount === totalCount
                  ? "Tüm görevler tamamlandı"
                  : `${totalCount - completedCount} görev kaldı`
                }
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
