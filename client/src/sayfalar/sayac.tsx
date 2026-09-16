import { useState, useEffect, useReducer, useRef } from "react";
import { Header } from "@/bilesenler/baslik";
import { Button } from "@/bilesenler/arayuz/button";
import { Input } from "@/bilesenler/arayuz/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/bilesenler/arayuz/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/bilesenler/arayuz/tabs";
import { Card, CardContent } from "@/bilesenler/arayuz/card";
import { Badge } from "@/bilesenler/arayuz/badge";
import { Volume2, VolumeX, Play, Pause, RotateCcw, Clock, Timer as TimerIcon, AlarmClock, Plus, Trash2, Target } from "lucide-react";
import { Switch } from "@/bilesenler/arayuz/switch";
import { useToast } from "@/hooks/use-toast";
import Confetti from 'react-confetti';

interface TimerState {
  time: number;
  isRunning: boolean;
  laps: Array<{ id: number; time: number; split: number; }>;
  lapCounter: number;
}

type TimerAction =
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESET' }
  | { type: 'TICK'; payload: number }
  | { type: 'ADD_LAP'; payload: number };

const timerReducer = (state: TimerState, action: TimerAction): TimerState => {
  switch (action.type) {
    case 'START':
      return { ...state, isRunning: true };
    case 'PAUSE':
      return { ...state, isRunning: false };
    case 'RESET':
      return { time: 0, isRunning: false, laps: [], lapCounter: 0 };
    case 'TICK':
      return { ...state, time: action.payload };
    case 'ADD_LAP':
      const previousLapTime = state.laps.length > 0 ? state.laps[state.laps.length - 1].time : 0;
      const split = action.payload - previousLapTime;
      return {
        ...state,
        laps: [...state.laps, { id: state.lapCounter + 1, time: action.payload, split }],
        lapCounter: state.lapCounter + 1
      };
    default:
      return state;
  }
};

interface PomodoroSettings {
  workTime: number;
  breakTime: number;
  longBreakTime: number;
  cycles: number;
}

interface AlarmSettings {
  time: string;
  sound: string;
  enabled: boolean;
}

const formatTime = (ms: number, includeMs = true): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor((ms % 1000) / 10);

  if (hours > 0) {
    return includeMs
      ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${milliseconds.toString().padStart(2, '0')}`
      : `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  return includeMs
    ? `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${milliseconds.toString().padStart(2, '0')}`
    : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const POMODORO_MODE_LABELS: Record<string, string> = {
  work: 'Çalışma',
  break: 'Kısa Mola',
  longBreak: 'Uzun Mola',
};

export default function Timer() {
  const [soundEnabled, setSoundEnabled] = useState(() =>
    localStorage.getItem('timer-sound-enabled') !== 'false'
  );
  const [doNotDisturb, setDoNotDisturb] = useState(() =>
    localStorage.getItem('timer-do-not-disturb') === 'true'
  );
  const [alarmSound, setAlarmSound] = useState(() =>
    localStorage.getItem('timer-alarm-sound') || 'beep'
  );

  const [stopwatchState, dispatchStopwatch] = useReducer(
    timerReducer,
    { time: 0, isRunning: false, laps: [], lapCounter: 0 },
    (initialState) => {
      const saved = localStorage.getItem('timer-stopwatch-state');
      const savedStartTime = localStorage.getItem('timer-stopwatch-start');
      if (saved) {
        const state = JSON.parse(saved);
        if (state.isRunning && savedStartTime) {
          const startTime = parseInt(savedStartTime);
          const elapsed = Date.now() - startTime;
          return { ...state, time: elapsed };
        }
        return state;
      }
      return initialState;
    }
  );

  const [pomodoroSettings, setPomodoroSettings] = useState<PomodoroSettings>(() => ({
    workTime: 25, breakTime: 5, longBreakTime: 15, cycles: 4
  }));

  const [pomodoroState, setPomodoroState] = useState(() => {
    const saved = localStorage.getItem('timer-pomodoro-state');
    const savedStartTime = localStorage.getItem('timer-pomodoro-start');
    if (saved) {
      const state = JSON.parse(saved);
      if (state.isRunning && savedStartTime) {
        const startTime = parseInt(savedStartTime);
        const elapsed = Date.now() - startTime;
        const remainingTime = Math.max(0, state.time - elapsed);
        return { ...state, time: remainingTime };
      }
      return state;
    }
    return {
      time: 25 * 60 * 1000,
      isRunning: false,
      isBreak: false,
      currentCycle: 1,
      mode: 'work' as 'work' | 'break' | 'longBreak'
    };
  });

  const [alarms, setAlarms] = useState<AlarmSettings[]>(() => {
    const saved = localStorage.getItem('timer-alarms');
    return saved ? JSON.parse(saved) : [];
  });
  const [newAlarmTime, setNewAlarmTime] = useState('');
  const [activeTab, setActiveTab] = useState('stopwatch');
  const [timerGoal, setTimerGoal] = useState<number>(0);
  const [goalInput, setGoalInput] = useState<string>('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [goalAchieved, setGoalAchieved] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const playSound = (frequency = 800, duration = 200, type: 'beep' | 'lap' | 'alarm' = 'beep') => {
    if (!soundEnabled) return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      if (type === 'alarm') {
        if (alarmSound === 'chime') {
          oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.2);
          oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.4);
          duration = 800;
        } else if (alarmSound === 'bell') {
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
          duration = 500;
        } else {
          oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
        }
      } else if (type === 'lap') {
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        duration = 100;
      } else {
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      }

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (error) {
      console.warn('Sound playback failed:', error);
    }
  };

  useEffect(() => {
    if (timerGoal > 0 && stopwatchState.time >= timerGoal * 60 * 1000 && !goalAchieved) {
      setGoalAchieved(true);
      setShowConfetti(true);
      playSound(1000, 1000, 'alarm');
      toast({ title: 'Hedefe ulaştın', description: `${timerGoal} dakikalık hedefini tamamladın.` });
      setTimeout(() => setShowConfetti(false), 5000);
    }
  }, [stopwatchState.time, timerGoal, goalAchieved, toast]);

  useEffect(() => {
    if (stopwatchState.isRunning) {
      const startTime = Date.now() - stopwatchState.time;
      intervalRef.current = setInterval(() => {
        dispatchStopwatch({ type: 'TICK', payload: Date.now() - startTime });
      }, 10);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [stopwatchState.isRunning, stopwatchState.time]);

  useEffect(() => {
    let pomodoroInterval: NodeJS.Timeout | null = null;
    if (pomodoroState.isRunning && pomodoroState.time > 0) {
      pomodoroInterval = setInterval(() => {
        setPomodoroState(prev => {
          if (prev.time <= 1000) {
            playSound(800, 500, 'alarm');
            toast({
              title: prev.mode === 'work' ? 'Çalışma süresi bitti' : 'Mola süresi bitti',
              description: prev.mode === 'work' ? 'Mola zamanı' : 'Çalışmaya devam',
            });
            const nextMode = prev.mode === 'work'
              ? (prev.currentCycle >= pomodoroSettings.cycles ? 'longBreak' : 'break')
              : 'work';
            const nextTime = nextMode === 'work'
              ? pomodoroSettings.workTime * 60 * 1000
              : nextMode === 'break'
              ? pomodoroSettings.breakTime * 60 * 1000
              : pomodoroSettings.longBreakTime * 60 * 1000;
            const nextCycle = prev.mode === 'break' || prev.mode === 'longBreak'
              ? prev.currentCycle + 1 : prev.currentCycle;
            return { ...prev, time: nextTime, isRunning: false, mode: nextMode, currentCycle: nextMode === 'longBreak' ? 1 : nextCycle };
          }
          return { ...prev, time: prev.time - 1000 };
        });
      }, 1000);
    }
    return () => { if (pomodoroInterval) clearInterval(pomodoroInterval); };
  }, [pomodoroState.isRunning, pomodoroState.time, pomodoroSettings, toast]);

  useEffect(() => {
    const checkAlarms = () => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      alarms.forEach(alarm => {
        if (alarm.enabled && alarm.time === currentTime) {
          playSound(800, 1000, 'alarm');
          toast({ title: 'Alarm', description: `${alarm.time} alarmı çalıyor` });
          setAlarms(prev => prev.map(a => a.time === alarm.time ? { ...a, enabled: false } : a));
        }
      });
    };
    alarmIntervalRef.current = setInterval(checkAlarms, 1000);
    return () => { if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current); };
  }, [alarms, toast]);

  useEffect(() => {
    if (activeTab === 'alarm' && !newAlarmTime) {
      const now = new Date();
      setNewAlarmTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    }
  }, [activeTab, newAlarmTime]);

  useEffect(() => { localStorage.setItem('timer-sound-enabled', soundEnabled.toString()); }, [soundEnabled]);
  useEffect(() => { localStorage.setItem('timer-do-not-disturb', doNotDisturb.toString()); }, [doNotDisturb]);
  useEffect(() => { localStorage.setItem('timer-alarm-sound', alarmSound); }, [alarmSound]);
  useEffect(() => { localStorage.setItem('timer-alarms', JSON.stringify(alarms)); }, [alarms]);

  useEffect(() => {
    localStorage.setItem('timer-stopwatch-state', JSON.stringify(stopwatchState));
    if (stopwatchState.isRunning) {
      localStorage.setItem('timer-stopwatch-start', (Date.now() - stopwatchState.time).toString());
    } else {
      localStorage.removeItem('timer-stopwatch-start');
    }
  }, [stopwatchState]);

  useEffect(() => {
    localStorage.setItem('timer-pomodoro-state', JSON.stringify(pomodoroState));
    if (pomodoroState.isRunning) {
      localStorage.setItem('timer-pomodoro-start', Date.now().toString());
    } else {
      localStorage.removeItem('timer-pomodoro-start');
    }
  }, [pomodoroState]);

  useEffect(() => {
    if (!pomodoroState.isRunning) {
      setPomodoroState(prev => {
        const newTime = prev.mode === 'work'
          ? pomodoroSettings.workTime * 60 * 1000
          : prev.mode === 'break'
          ? pomodoroSettings.breakTime * 60 * 1000
          : pomodoroSettings.longBreakTime * 60 * 1000;
        return { ...prev, time: newTime };
      });
    }
  }, [pomodoroSettings, pomodoroState.isRunning, pomodoroState.mode]);

  const handleStopwatchStart = () => { dispatchStopwatch({ type: 'START' }); playSound(); };
  const handleStopwatchPause = () => { dispatchStopwatch({ type: 'PAUSE' }); playSound(); };
  const handleStopwatchReset = () => { dispatchStopwatch({ type: 'RESET' }); setGoalAchieved(false); setShowConfetti(false); playSound(); };
  const setTimerGoalHandler = () => {
    const minutes = parseInt(goalInput);
    if (minutes > 0) {
      setTimerGoal(minutes); setGoalAchieved(false);
      toast({ title: 'Hedef belirlendi', description: `${minutes} dakikalık çalışma hedefi ayarlandı.` });
      setGoalInput('');
    }
  };
  const handleStopwatchLap = () => { dispatchStopwatch({ type: 'ADD_LAP', payload: stopwatchState.time }); playSound(600, 100, 'lap'); };
  const handlePomodoroStart = () => { setPomodoroState(prev => ({ ...prev, isRunning: true })); playSound(); };
  const handlePomodoroPause = () => { setPomodoroState(prev => ({ ...prev, isRunning: false })); playSound(); };
  const handlePomodoroReset = () => {
    setPomodoroState({ time: pomodoroSettings.workTime * 60 * 1000, isRunning: false, isBreak: false, currentCycle: 1, mode: 'work' });
    playSound();
  };

  const addAlarm = () => {
    if (newAlarmTime && !alarms.some(a => a.time === newAlarmTime)) {
      const now = new Date();
      const [hours, minutes] = newAlarmTime.split(':').map(Number);
      const alarmDate = new Date();
      alarmDate.setHours(hours, minutes, 0, 0);
      if (alarmDate <= now) {
        toast({ title: 'Geçersiz saat', description: 'Geçmiş bir saat için alarm kuramazsın.', variant: 'destructive' });
        return;
      }
      setAlarms(prev => [...prev, { time: newAlarmTime, sound: alarmSound, enabled: true }]);
      setNewAlarmTime('');
    }
  };
  const removeAlarm = (time: string) => setAlarms(prev => prev.filter(a => a.time !== time));
  const toggleAlarm = (time: string) => setAlarms(prev => prev.map(a => a.time === time ? { ...a, enabled: !a.enabled } : a));

  const pomodoroProgress = pomodoroState.mode === 'work'
    ? ((pomodoroSettings.workTime * 60 * 1000 - pomodoroState.time) / (pomodoroSettings.workTime * 60 * 1000)) * 100
    : pomodoroState.mode === 'break'
    ? ((pomodoroSettings.breakTime * 60 * 1000 - pomodoroState.time) / (pomodoroSettings.breakTime * 60 * 1000)) * 100
    : ((pomodoroSettings.longBreakTime * 60 * 1000 - pomodoroState.time) / (pomodoroSettings.longBreakTime * 60 * 1000)) * 100;

  return (
    <div className="min-h-screen bg-background">
      {showConfetti && (
        <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={200} gravity={0.1} />
      )}
      <Header />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="page-title mb-2">Sayaç</h1>
        <p className="text-sm text-muted-foreground mb-6">Pomodoro, kronometre ve alarm ile çalışma süreni yönet.</p>

        {/* Settings bar */}
        <div className="flex flex-wrap items-center gap-4 mb-6 p-3 bg-card border border-border rounded-lg">
          <div className="flex items-center gap-2">
            <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
            <span className="text-sm font-medium">Ses</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Switch checked={doNotDisturb} onCheckedChange={(checked) => {
              setDoNotDisturb(checked);
              toast({ title: checked ? 'Rahatsız etme modu aktif' : 'Bildirimler açık', description: checked ? 'Bildirimler sessize alındı.' : 'Bildirim sesleri açıldı.', duration: 3000 });
            }} />
            <span className="text-sm font-medium">Rahatsız Etme</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Alarm Sesi:</span>
            <Select value={alarmSound} onValueChange={setAlarmSound}>
              <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="beep">Bip</SelectItem>
                <SelectItem value="chime">Çan</SelectItem>
                <SelectItem value="bell">Zil</SelectItem>
                <SelectItem value="buzzer">Buzzer</SelectItem>
                <SelectItem value="ding">Ding</SelectItem>
                <SelectItem value="gong">Gong</SelectItem>
                <SelectItem value="horn">Horn</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-10 bg-muted rounded-md p-1">
            <TabsTrigger value="stopwatch" className="flex items-center gap-2 text-sm rounded data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <TimerIcon className="h-4 w-4" /> Kronometre
            </TabsTrigger>
            <TabsTrigger value="pomodoro" className="flex items-center gap-2 text-sm rounded data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Target className="h-4 w-4" /> Pomodoro
            </TabsTrigger>
            <TabsTrigger value="alarm" className="flex items-center gap-2 text-sm rounded data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <AlarmClock className="h-4 w-4" /> Alarm
            </TabsTrigger>
          </TabsList>

          {/* ─── Kronometre ─── */}
          <TabsContent value="stopwatch" className="mt-6">
            <Card className="border border-border">
              <CardContent className="pt-6">
                {/* Timer display */}
                <div className="text-center py-8">
                  <div className="text-5xl sm:text-6xl font-mono font-bold tabular-nums text-foreground tracking-tight">
                    {formatTime(stopwatchState.time)}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {stopwatchState.isRunning ? 'Çalışıyor' : 'Durdu'}
                  </div>
                </div>

                {/* Goal progress */}
                {timerGoal > 0 && (
                  <div className="mb-6 p-4 bg-muted/30 rounded-md border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">Hedef: {timerGoal} dk</span>
                      <span className="text-sm font-medium tabular-nums">
                        {((stopwatchState.time / (timerGoal * 60 * 1000)) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${goalAchieved ? 'bg-emerald-500' : 'bg-primary'}`}
                        style={{ width: `${Math.min(100, (stopwatchState.time / (timerGoal * 60 * 1000)) * 100)}%` }}
                      />
                    </div>
                    {goalAchieved && <div className="mt-2 text-center text-sm font-medium text-emerald-600 dark:text-emerald-400">Hedefe ulaştın</div>}
                  </div>
                )}

                {/* Goal input */}
                <div className="mb-6 flex items-center gap-2 justify-center">
                  <Input
                    type="number" value={goalInput} onChange={(e) => setGoalInput(e.target.value)}
                    placeholder="Dakika" className="w-24 text-center" min="1" max="1440"
                  />
                  <Button onClick={setTimerGoalHandler} size="sm">Hedef Ayarla</Button>
                  {timerGoal > 0 && (
                    <Button onClick={() => { setTimerGoal(0); setGoalAchieved(false); setShowConfetti(false); toast({ title: 'Hedef temizlendi' }); }} size="sm" variant="outline">Temizle</Button>
                  )}
                </div>

                {/* Controls */}
                <div className="flex justify-center gap-3 mb-8">
                  {!stopwatchState.isRunning ? (
                    <Button onClick={handleStopwatchStart} className="px-8"><Play className="mr-2 h-4 w-4" /> Başlat</Button>
                  ) : (
                    <Button onClick={handleStopwatchPause} variant="secondary" className="px-8"><Pause className="mr-2 h-4 w-4" /> Duraklat</Button>
                  )}
                  {stopwatchState.isRunning && (
                    <Button onClick={handleStopwatchLap} variant="outline" className="px-6"><Plus className="mr-2 h-4 w-4" /> Tur</Button>
                  )}
                  <Button onClick={handleStopwatchReset} variant="ghost" className="px-6"><RotateCcw className="mr-2 h-4 w-4" /> Sıfırla</Button>
                </div>

                {/* Laps */}
                {stopwatchState.laps.length > 0 && (
                  <div className="border-t border-border pt-4">
                    <h3 className="section-title mb-3 text-base">Tur Kayıtları</h3>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {stopwatchState.laps.slice().reverse().map((lap, index) => (
                        <div key={lap.id} className="flex justify-between items-center py-2.5 px-3 bg-muted/30 rounded-md border border-border">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">{lap.id}</span>
                            <span className="text-sm font-medium">Tur {lap.id}</span>
                          </div>
                          <div className="flex gap-6 text-sm">
                            <div className="text-right">
                              <span className="text-muted-foreground block text-xs">Ara</span>
                              <span className="font-mono tabular-nums font-medium">{formatTime(lap.split)}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-muted-foreground block text-xs">Toplam</span>
                              <span className="font-mono tabular-nums text-muted-foreground">{formatTime(lap.time)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Pomodoro ─── */}
          <TabsContent value="pomodoro" className="mt-6">
            <Card className="border border-border">
              <CardContent className="pt-6">
                {/* Mode badge */}
                <div className="flex justify-center mb-6">
                  <Badge variant={pomodoroState.mode === 'work' ? 'default' : 'secondary'} className="text-sm">
                    {POMODORO_MODE_LABELS[pomodoroState.mode]} · Döngü {pomodoroState.currentCycle}
                  </Badge>
                </div>

                {/* Timer display */}
                <div className="text-center py-8">
                  <div className="text-5xl sm:text-6xl font-mono font-bold tabular-nums text-foreground tracking-tight">
                    {formatTime(pomodoroState.time, false)}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-8 px-4">
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${pomodoroState.mode === 'work' ? 'bg-primary' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, Math.max(0, pomodoroProgress))}%` }}
                    />
                  </div>
                </div>

                {/* Controls */}
                <div className="flex justify-center gap-3 mb-8">
                  {!pomodoroState.isRunning ? (
                    <Button onClick={handlePomodoroStart} className="px-8"><Play className="mr-2 h-4 w-4" /> Başlat</Button>
                  ) : (
                    <Button onClick={handlePomodoroPause} variant="secondary" className="px-8"><Pause className="mr-2 h-4 w-4" /> Duraklat</Button>
                  )}
                  <Button onClick={handlePomodoroReset} variant="ghost" className="px-6"><RotateCcw className="mr-2 h-4 w-4" /> Sıfırla</Button>
                </div>

                {/* Settings */}
                <div className="border-t border-border pt-4">
                  <h3 className="section-title mb-4 text-base">Ayarlar</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Çalışma (dk)</label>
                      <Input type="number" value={pomodoroSettings.workTime}
                        onChange={(e) => setPomodoroSettings(prev => ({ ...prev, workTime: parseInt(e.target.value) || 25 }))}
                        min="1" max="60" className="text-center tabular-nums" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Mola (dk)</label>
                      <Input type="number" value={pomodoroSettings.breakTime}
                        onChange={(e) => setPomodoroSettings(prev => ({ ...prev, breakTime: parseInt(e.target.value) || 5 }))}
                        min="1" max="30" className="text-center tabular-nums" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Uzun Mola (dk)</label>
                      <Input type="number" value={pomodoroSettings.longBreakTime}
                        onChange={(e) => setPomodoroSettings(prev => ({ ...prev, longBreakTime: parseInt(e.target.value) || 15 }))}
                        min="5" max="60" className="text-center tabular-nums" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Döngü</label>
                      <Input type="number" value={pomodoroSettings.cycles}
                        onChange={(e) => setPomodoroSettings(prev => ({ ...prev, cycles: parseInt(e.target.value) || 4 }))}
                        min="1" max="10" className="text-center tabular-nums" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Alarm ─── */}
          <TabsContent value="alarm" className="mt-6">
            <Card className="border border-border">
              <CardContent className="pt-6">
                {/* Add alarm */}
                <div className="mb-6 p-4 bg-muted/30 rounded-md border border-border">
                  <h3 className="section-title mb-3 text-base">Yeni Alarm</h3>
                  <div className="flex gap-3">
                    <Input
                      type="time" value={newAlarmTime} onChange={(e) => setNewAlarmTime(e.target.value)}
                      onClick={() => {
                        if (!newAlarmTime) {
                          const now = new Date();
                          setNewAlarmTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
                        }
                      }}
                      className="text-lg font-mono text-center"
                    />
                    <Button onClick={addAlarm} disabled={!newAlarmTime}><Plus className="mr-2 h-4 w-4" /> Ekle</Button>
                  </div>
                </div>

                {/* Alarm list */}
                {alarms.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="section-title text-base">Alarmlar</h3>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {alarms.map((alarm) => (
                        <div key={alarm.time} className={`flex items-center justify-between p-4 rounded-md border transition-colors ${alarm.enabled ? 'bg-card border-border' : 'bg-muted/30 border-border/50 opacity-60'}`}>
                          <div className="flex items-center gap-4">
                            <div className="text-2xl font-mono font-bold tabular-nums">{alarm.time}</div>
                            <Badge variant="secondary" className="text-xs">{alarm.sound}</Badge>
                          </div>
                          <div className="flex items-center gap-3">
                            <Switch checked={alarm.enabled} onCheckedChange={() => toggleAlarm(alarm.time)} />
                            <span className="text-xs font-medium text-muted-foreground w-10">{alarm.enabled ? 'Aktif' : 'Pasif'}</span>
                            <Button size="icon" variant="ghost" onClick={() => removeAlarm(alarm.time)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {alarms.length === 0 && (
                  <div className="text-center py-12">
                    <Clock className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-muted-foreground mb-1">Henüz alarm yok</p>
                    <p className="text-xs text-muted-foreground">Yukarıdan yeni bir alarm ekleyebilirsin.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <footer className="bg-muted/30 border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-xs text-muted-foreground">
          © 2025-2026 QuantPraxus. Tüm hakları saklıdır.
        </div>
      </footer>
    </div>
  );
}
