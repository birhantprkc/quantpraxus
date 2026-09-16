import { useState } from "react";
import { Header } from "@/bilesenler/baslik";
import { Calculator, BookOpen, Brain, BarChart2, FlaskConical, TrendingUp } from "lucide-react";
import { Input } from "@/bilesenler/arayuz/input";
import { Label } from "@/bilesenler/arayuz/label";
import { Checkbox } from "@/bilesenler/arayuz/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/bilesenler/arayuz/card";
import { Progress } from "@/bilesenler/arayuz/progress";
import { Separator } from "@/bilesenler/arayuz/separator";
import { Button } from "@/bilesenler/arayuz/button";
import { RotateCcw } from "lucide-react";

interface TYTData {
  Türkçe: { dogru: number; yanlis: number; };
  sosyal: { dogru: number; yanlis: number; };
  matematik: { dogru: number; yanlis: number; };
  fenBilimleri: { dogru: number; yanlis: number; };
}

interface AYTData {
  matematik: { dogru: number; yanlis: number; };
  fizik: { dogru: number; yanlis: number; };
  kimya: { dogru: number; yanlis: number; };
  biyoloji: { dogru: number; yanlis: number; };
}

interface OBPData {
  diplomaNotu: number;
  gecenSeneYerlesti: boolean;
}

const TYT_SUBJECTS: { key: keyof TYTData; label: string; max: number; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'Türkçe', label: 'Türkçe', max: 40, icon: BookOpen },
  { key: 'sosyal', label: 'Sosyal Bilimler', max: 20, icon: Brain },
  { key: 'matematik', label: 'Matematik', max: 40, icon: BarChart2 },
  { key: 'fenBilimleri', label: 'Fen Bilimleri', max: 20, icon: FlaskConical },
];

const AYT_SUBJECTS: { key: keyof AYTData; label: string; max: number; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'matematik', label: 'Matematik', max: 40, icon: BarChart2 },
  { key: 'fizik', label: 'Fizik', max: 14, icon: FlaskConical },
  { key: 'kimya', label: 'Kimya', max: 13, icon: FlaskConical },
  { key: 'biyoloji', label: 'Biyoloji', max: 13, icon: Brain },
];

export default function NetCalculator() {
  const [tytData, setTytData] = useState<TYTData>({
    Türkçe: { dogru: 0, yanlis: 0 },
    sosyal: { dogru: 0, yanlis: 0 },
    matematik: { dogru: 0, yanlis: 0 },
    fenBilimleri: { dogru: 0, yanlis: 0 }
  });

  const [aytData, setAytData] = useState<AYTData>({
    matematik: { dogru: 0, yanlis: 0 },
    fizik: { dogru: 0, yanlis: 0 },
    kimya: { dogru: 0, yanlis: 0 },
    biyoloji: { dogru: 0, yanlis: 0 }
  });

  const [obpData, setObpData] = useState<OBPData>({
    diplomaNotu: 85,
    gecenSeneYerlesti: false
  });

  const calculateNet = (dogru: number, yanlis: number): number => Math.max(0, dogru - (yanlis / 4));

  const calculateTYTNet = (): number =>
    Object.values(tytData).reduce((total, subject) => total + calculateNet(subject.dogru, subject.yanlis), 0);

  const calculateAYTNet = (): number =>
    Object.values(aytData).reduce((total, subject) => total + calculateNet(subject.dogru, subject.yanlis), 0);

  const calculateOBP = (): number => {
    let obp = (obpData.diplomaNotu / 100) * 500;
    if (obpData.gecenSeneYerlesti) obp = obp / 2;
    return Math.min(500, Math.max(0, obp));
  };

  const resetAllData = () => {
    setTytData({ Türkçe: { dogru: 0, yanlis: 0 }, sosyal: { dogru: 0, yanlis: 0 }, matematik: { dogru: 0, yanlis: 0 }, fenBilimleri: { dogru: 0, yanlis: 0 } });
    setAytData({ matematik: { dogru: 0, yanlis: 0 }, fizik: { dogru: 0, yanlis: 0 }, kimya: { dogru: 0, yanlis: 0 }, biyoloji: { dogru: 0, yanlis: 0 } });
    setObpData({ diplomaNotu: 85, gecenSeneYerlesti: false });
  };

  const tytNet = calculateTYTNet();
  const aytNet = calculateAYTNet();
  const obp = calculateOBP();

  const handleNumberInput = (value: string): number => {
    const parsed = parseInt(value);
    if (isNaN(parsed) || parsed < 0) return 0;
    return parsed;
  };

  const renderSubjectRow = (
    subject: { key: string; label: string; max: number; icon: React.ComponentType<{ className?: string }> },
    data: { dogru: number; yanlis: number },
    section: 'tyt' | 'ayt',
    accentClass: string
  ) => {
    const Icon = subject.icon;
    const net = calculateNet(data.dogru, data.yanlis);
    return (
      <div key={subject.key} className="p-4 bg-muted/20 rounded-md border border-border">
        <Label className="text-sm font-medium flex items-center gap-2 mb-3">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {subject.label}
          <span className="text-xs text-muted-foreground ml-auto">Max {subject.max}</span>
        </Label>
        <div className="grid grid-cols-3 gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Doğru</label>
            <Input
              type="number"
              placeholder="0"
              value={data.dogru || ''}
              onChange={(e) => {
                const newValue = handleNumberInput(e.target.value);
                const maxQuestions = subject.max;
                const validatedValue = Math.min(newValue, maxQuestions - data.yanlis);
                if (section === 'tyt') {
                  setTytData(prev => ({ ...prev, [subject.key]: { ...prev[subject.key as keyof TYTData], dogru: validatedValue } }));
                } else {
                  setAytData(prev => ({ ...prev, [subject.key]: { ...prev[subject.key as keyof AYTData], dogru: validatedValue } }));
                }
              }}
              className="h-11 text-center text-lg font-semibold tabular-nums"
              min="0"
              data-testid={`${section}-${subject.key}-dogru`}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Yanlış</label>
            <Input
              type="number"
              placeholder="0"
              value={data.yanlis || ''}
              onChange={(e) => {
                const newValue = handleNumberInput(e.target.value);
                const maxQuestions = subject.max;
                const validatedValue = Math.min(newValue, maxQuestions - data.dogru);
                if (section === 'tyt') {
                  setTytData(prev => ({ ...prev, [subject.key]: { ...prev[subject.key as keyof TYTData], yanlis: validatedValue } }));
                } else {
                  setAytData(prev => ({ ...prev, [subject.key]: { ...prev[subject.key as keyof AYTData], yanlis: validatedValue } }));
                }
              }}
              className="h-11 text-center text-lg font-semibold tabular-nums"
              min="0"
              data-testid={`${section}-${subject.key}-yanlis`}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Net</label>
            <div className={`h-11 flex items-center justify-center text-lg font-bold tabular-nums rounded-md border border-border ${accentClass}`}>
              {net.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="page-title flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" />
            Net Hesaplayıcı
          </h1>
          <p className="text-sm text-muted-foreground mt-1">TYT, AYT netlerini ve OBP puanını hesapla.</p>
        </div>

        {/* OBP */}
        <Card className="mb-6 border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              Ortaöğretim Başarı Puanı (OBP)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="diploma-notu" className="text-sm">Diploma Notu</Label>
                  <Input
                    id="diploma-notu" type="number" min="0" max="100"
                    value={obpData.diplomaNotu}
                    onChange={(e) => setObpData(prev => ({ ...prev, diplomaNotu: parseFloat(e.target.value) || 0 }))}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="gecen-sene"
                    checked={obpData.gecenSeneYerlesti}
                    onCheckedChange={(checked) => setObpData(prev => ({ ...prev, gecenSeneYerlesti: checked as boolean }))}
                  />
                  <Label htmlFor="gecen-sene" className="text-sm">
                    Geçen sene bir bölüme yerleştim (OBP yarıya düşer)
                  </Label>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold tabular-nums text-primary">{obp.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Hesaplanan OBP</div>
                  <Progress value={(obp / 500) * 100} className="mt-2 w-32 h-1.5" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TYT + AYT grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* TYT */}
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-5 w-5 text-muted-foreground" />
                TYT
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {TYT_SUBJECTS.map(s => renderSubjectRow(s, tytData[s.key], 'tyt', 'bg-primary/5 text-primary'))}
              <Separator />
              <div className="flex justify-between items-center pt-1">
                <span className="font-semibold text-sm">Toplam TYT Net</span>
                <span className="text-lg font-bold tabular-nums text-primary">{tytNet.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* AYT */}
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                AYT (Sayısal)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {AYT_SUBJECTS.map(s => renderSubjectRow(s, aytData[s.key], 'ayt', 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-400'))}
              <Separator />
              <div className="flex justify-between items-center pt-1">
                <span className="font-semibold text-sm">Toplam AYT Net</span>
                <span className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{aytNet.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch">
          <div className="stat-block flex-1">
            <div className="stat-value text-primary">{tytNet.toFixed(2)}</div>
            <div className="stat-label">TYT Net · / 120</div>
            <Progress value={(tytNet / 120) * 100} className="h-1.5 mt-2" />
          </div>
          <div className="stat-block flex-1">
            <div className="stat-value text-emerald-600 dark:text-emerald-400">{aytNet.toFixed(2)}</div>
            <div className="stat-label">AYT Net · / 80</div>
            <Progress value={(aytNet / 80) * 100} className="h-1.5 mt-2" />
          </div>
          <div className="stat-block flex-1">
            <div className="stat-value text-primary">{obp.toFixed(2)}</div>
            <div className="stat-label">OBP · / 500</div>
            <Progress value={(obp / 500) * 100} className="h-1.5 mt-2" />
          </div>
          <div className="flex items-center">
            <Button variant="outline" onClick={resetAllData} className="w-full sm:w-auto">
              <RotateCcw className="mr-2 h-4 w-4" /> Sıfırla
            </Button>
          </div>
        </div>
      </main>

      <footer className="bg-muted/30 border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-xs text-muted-foreground">
          © 2025-2026 QuantPraxus. Tüm hakları saklıdır.
        </div>
      </footer>
    </div>
  );
}
