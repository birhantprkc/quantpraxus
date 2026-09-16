import { useMemo } from "react";

const ATATURK_QUOTES = [
  { quote: "Ey Türk gençliği! Birinci vazifen, Türk istiklalini, Türk Cumhuriyetini, ilelebet muhafaza ve müdafaa etmektir.", author: "Mustafa Kemal Atatürk" },
  { quote: "Gençliğe hitap ediyorum. Geleceği yarın değil, bugünden kurmaya başlamalısınız.", author: "Mustafa Kemal Atatürk" },
  { quote: "Hayatta en hakiki mürşit ilimdir, fendir.", author: "Mustafa Kemal Atatürk" },
  { quote: "Başarmak, elbette en büyük zevktir. Fakat benim için, başarmış olmaktan çok başarmak yolunda bulunmak daha zevklidir.", author: "Mustafa Kemal Atatürk" },
  { quote: "Millet için en kıymetli, en kuvvetli varlık gençliktir.", author: "Mustafa Kemal Atatürk" },
  { quote: "Sizler, yani yeni Türkiye'nin genç evlâtları, yorulsanız da beni izleyeceksiniz.", author: "Mustafa Kemal Atatürk" },
  { quote: "Başarısızlıktan yılmamak gerekir. En kötü vaziyetlerde bile ümidi asla kaybetmemelidir.", author: "Mustafa Kemal Atatürk" },
  { quote: "Gençler! Sizler her şeysiniz. Sizler, Türkiye Cumhuriyetini yaşatacak ve yükseltecek sizlersiniz.", author: "Mustafa Kemal Atatürk" },
  { quote: "Bir milletin en önemli sermayesi, gençliktir.", author: "Mustafa Kemal Atatürk" },
  { quote: "Gelecek bugünden hazırlanır.", author: "Mustafa Kemal Atatürk" },
  { quote: "Başarı, küçük çabaların tekrar edilmesi, gün be gün, saat be saat yapılan şeylerdir.", author: "Robert Collier" },
  { quote: "Başarı, hazırlanma fırsatı ile karşılaştığında ortaya çıkar.", author: "Bobby Unser" },
  { quote: "Çalışkan olmak yetenekten daha önemlidir.", author: "Tim Notke" },
  { quote: "Başarısızlık, yeniden başlamanın daha akıllı bir yoludur.", author: "Henry Ford" },
  { quote: "Başarı son nokta değil, başarısızlık ölümcül değil: önemli olan devam etme cesareti.", author: "Winston Churchill" },
  { quote: "Çalışmayan doymaz, çalışkan beklemez.", author: "Türk Atasözü" },
  { quote: "İmkansız, sadece büyük düşünmeyenlerin sözlüğünde vardır.", author: "Napoléon Bonaparte" },
  { quote: "Zor günler güçlü insanlar yaratır.", author: "G. Michael Hopf" },
  { quote: "Azim ve kararlılık her engeli aşar.", author: "Leonardo da Vinci" },
  { quote: "Başarı, başarısızlığa rağmen devam etme yetisidir.", author: "Charles Kettering" },
  { quote: "Zeka önemlidir ama azim daha önemlidir.", author: "Angela Duckworth" },
  { quote: "Başarı merdiveni, eliniz cebinizde çıkılmaz.", author: "Henry Ford" },
  { quote: "Sebat eden mutlaka kazanır.", author: "Türk Atasözü" },
  { quote: "Öğrenmek, en değerli yatırımdır.", author: "Benjamin Franklin" },
  { quote: "Başarı, istikrarlı çalışmanın meyvesidir.", author: "Motivasyon" },
  { quote: "Disiplin, motivasyondan daha güçlüdür.", author: "Motivasyon" },
  { quote: "YKS bir maraton değil, disiplinli bir yürüyüştür.", author: "Motivasyon" },
  { quote: "Bugün çözdüğün her soru, yarınki başarının tuğlasıdır.", author: "Motivasyon" },
  { quote: "Her yanlış konu, bir fırsattır. Tekrar et, öğren, başar.", author: "Motivasyon" },
  { quote: "Başarı bir gecede gelmez, ama her gece çalışarak yaklaşırsın.", author: "Motivasyon" },
];

export function MotivationalQuote() {
  const currentQuote = useMemo(() => {
    return ATATURK_QUOTES[Math.floor(Math.random() * ATATURK_QUOTES.length)];
  }, []);

  return (
    <div className="flex items-center justify-center gap-2 flex-1">
      <span className="text-sm italic text-muted-foreground">
        "{currentQuote.quote}"
      </span>
      <span className="text-xs font-medium text-primary">
        — {currentQuote.author}
      </span>
    </div>
  );
}
