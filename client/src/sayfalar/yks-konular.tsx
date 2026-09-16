import { useState } from "react";
import { Header } from "@/bilesenler/baslik";
import { tytTopics, aytTopics, type SubjectTopics } from "@/data/yks-konular";
import { BookOpen, Award, AlertCircle } from "lucide-react";

const importantTopicsMap: { [key: string]: string[] } = {
  "TYT Türkçe": ["Paragraf"],
  "TYT Matematik": ["Problemler"],
  "TYT Geometri": ["Açılar ve Üçgenler"],
  "TYT Fizik": ["Kuvvet ve Hareket"],
  "TYT Kimya": ["Periyodik Tablo", "Kimyasal Türler Arası Etkileşimler"],
  "TYT Biyoloji": ["Hücre ve Organelleri"],
  "AYT Matematik": ["Limit", "Türev", "İntegral", "Trigonometri"],
  "AYT Geometri": ["Doğruda ve Üçgende Açı", "Özel Üçgenler", "Noktanın Analitiği", "Doğrunun Analitiği"],
  "AYT Fizik": ["İndüksiyon, Alternatif Akım ve Transformatörler", "Atom Fiziğine Giriş ve Radyoaktivite", "Modern Fizik", "Modern Fiziğin Teknolojideki Uygulamaları"],
  "AYT Kimya": ["Kimya ve Elektrik", "Organik Kimya"],
  "AYT Biyoloji": ["Sinir Sistemi", "Endokrin Sistem", "Duyu Organları", "Destek ve Hareket Sistemi", "Sindirim Sistemi", "Dolaşım Sistemi", "Solunum Sistemi", "Üriner Sistem"],
};

export default function YKSKonular() {
  const [selectedSubject, setSelectedSubject] = useState<SubjectTopics | null>(tytTopics[0]);

  const getYears = (topics: SubjectTopics) => {
    if (topics.topics.length === 0) return [];
    return Object.keys(topics.topics[0].years).sort((a, b) => parseInt(b) - parseInt(a));
  };

  const getTotalByYear = (topics: SubjectTopics) => {
    const years = getYears(topics);
    const totals: { [year: string]: number } = {};
    years.forEach(year => {
      let total = 0;
      topics.topics.forEach(topic => {
        const value = topic.years[year];
        if (value !== "−" && value !== "" && value !== null && value !== undefined) {
          total += typeof value === 'number' ? value : parseInt(value as string) || 0;
        }
      });
      totals[year] = total;
    });
    return totals;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="page-title flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            YKS Konu Dağılımı
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Yıllara göre hangi konudan kaç soru çıktığını gör.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full lg:w-72 flex-shrink-0">
            <div className="bg-card border border-border rounded-lg p-4 lg:sticky lg:top-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">TYT</h2>
              <div className="space-y-1 mb-4">
                {tytTopics.map((subject) => (
                  <button
                    key={subject.name}
                    onClick={() => setSelectedSubject(subject)}
                    className={`group w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                      selectedSubject?.name === subject.name
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-secondary text-foreground'
                    }`}
                  >
                    <span className="text-base">{subject.icon}</span>
                    <span>{subject.name.replace('TYT ', '')}</span>
                  </button>
                ))}
              </div>

              <div className="h-px bg-border my-3" />

              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">AYT</h2>
              <div className="space-y-1">
                {aytTopics.map((subject) => (
                  <button
                    key={subject.name}
                    onClick={() => setSelectedSubject(subject)}
                    className={`group w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                      selectedSubject?.name === subject.name
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-secondary text-foreground'
                    }`}
                  >
                    <span className="text-base">{subject.icon}</span>
                    <span>{subject.name.replace('AYT ', '')}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {selectedSubject && (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border flex items-center gap-3">
                  <span className="text-2xl">{selectedSubject.icon}</span>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{selectedSubject.name}</h2>
                    <p className="text-xs text-muted-foreground">Yıllara göre soru dağılımı</p>
                  </div>
                </div>

                {/* Important topics */}
                {importantTopicsMap[selectedSubject.name] && importantTopicsMap[selectedSubject.name].length > 0 && (
                  <div className="mx-6 mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-md">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-sm font-semibold text-amber-900 dark:text-amber-200">Önemli Konular: </span>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {importantTopicsMap[selectedSubject.name].map((topic, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 rounded border border-amber-300 dark:border-amber-700/50">
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left font-semibold text-xs text-muted-foreground uppercase tracking-wide sticky left-0 bg-card z-10">
                          Konu
                        </th>
                        {getYears(selectedSubject).map((year, idx) => (
                          <th key={year} className={`px-3 py-3 text-center font-semibold text-xs min-w-[80px] ${idx === 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                            {year}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSubject.topics.map((topic, index) => (
                        <tr key={index} className={`border-b border-border/50 ${index % 2 === 0 ? 'bg-muted/20' : ''} hover:bg-muted/40 transition-colors`}>
                          <td className="px-4 py-2.5 font-medium text-foreground sticky left-0 bg-inherit z-10">
                            {topic.topic}
                          </td>
                          {getYears(selectedSubject).map((year, idx) => (
                            <td key={year} className="px-3 py-2.5 text-center">
                              {topic.years[year] === "−" || !topic.years[year] ? (
                                <span className="text-muted-foreground/30">−</span>
                              ) : (
                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold tabular-nums ${
                                  idx === 0
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-foreground bg-muted/50'
                                }`}>
                                  {topic.years[year]}
                                </span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {/* Total row */}
                      <tr className="border-t-2 border-border bg-muted/30">
                        <td className="px-4 py-3 font-bold text-sm sticky left-0 bg-inherit z-10 flex items-center gap-2">
                          <Award className="h-4 w-4 text-primary" />
                          Toplam
                        </td>
                        {getYears(selectedSubject).map((year, idx) => (
                          <td key={year} className="px-3 py-3 text-center">
                            <span className={`inline-flex items-center justify-center min-w-[36px] h-8 px-2 rounded text-sm font-bold tabular-nums ${
                              idx === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                            }`}>
                              {getTotalByYear(selectedSubject)[year]}
                            </span>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Footer note */}
                <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground text-center">
                  "−" işareti o yıl konudan soru çıkmadığını gösterir.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="bg-muted/30 border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-xs text-muted-foreground">
          © 2025-2026 QuantPraxus. Tüm hakları saklıdır.
        </div>
      </footer>
    </div>
  );
}
