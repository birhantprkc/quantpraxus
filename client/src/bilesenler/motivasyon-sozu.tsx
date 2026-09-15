import { useMemo } from "react";

const QUOTES = [
  { quote: "Ey Türk gençliği! Birinci vazifen, Türk istiklalini, Türk Cumhuriyetini, ilelebet muhafaza ve müdafaa etmektir.", author: "Atatürk" },
  { quote: "Hayatta en hakiki mürşit ilimdir, fendir.", author: "Atatürk" },
  { quote: "Sizler, yeni Türkiye'nin genç evlâtları, yorulsanız da beni izleyeceksiniz. Dinlenmemek üzere yürümeye karar verenler asla yorulmazlar.", author: "Atatürk" },
  { quote: "Başarmak, elbette en büyük zevktir. Fakat başarmak yolunda bulunmak daha zevklidir.", author: "Atatürk" },
  { quote: "Millet için en kıymetli, en kuvvetli varlık gençliktir.", author: "Atatürk" },
  { quote: "Gençler! Sizler her şeysiniz. Sizler, Türkiye Cumhuriyetini yaşatacak ve yükseltecek sizlersiniz.", author: "Atatürk" },
  { quote: "Başarısızlıktan yılmamak gerekir. En kötü vaziyetlerde bile ümidi asla kaybetmemelidir.", author: "Atatürk" },
  { quote: "Gelecek bugünden hazırlanır.", author: "Atatürk" },
  { quote: "Öğretmenler! Yeni nesil sizin eseriniz olacaktır.", author: "Atatürk" },
  { quote: "İlim ve fenle alakası olmayan düşünceler, karanlıktan başka bir şey değildir.", author: "Atatürk" },
  { quote: "Bilim ve fen nerede ise oradan alacağız ve her millet ferdinin kafasına koyacağız.", author: "Atatürk" },
  { quote: "Müşterek bir görev için birleşmiş kişilerin yüksek sezgileri, her türlü yeniliklere uygundur.", author: "Atatürk" },
  { quote: "Yeniden ve bütünüyle Turk milli kimliğine bağlı kalmak en büyük mutluluktur.", author: "Atatürk" },
  { quote: "Çalışmadan, öğrenmeden, yorulmadan rahat yaşamanın yollarını alışkanlık haline getiren milletler önce haysiyetlerini, sonra hürriyetlerini ve daha sonra istikballerini kaybederler.", author: "Atatürk" },
  { quote: "Hayatta en hakiki mürşit ilimdir, fendir. İlim ve fennin dışında mürşit aramak gaflettir, cehalettir, delalettir.", author: "Atatürk" },
  { quote: "Egemenlik kayıtsız şartsız milletindir.", author: "Atatürk" },
  { quote: "Yurtta sulh, cihanda sulh.", author: "Atatürk" },
  { quote: "Ne mutlu Türküm diyene!", author: "Atatürk" },
  { quote: "Sanatsız kalan bir milletin hayat damarlarından biri kopmuş demektir.", author: "Atatürk" },
  { quote: "Düşünce özgürlüğü, insanlığın en kutsal haklarındandır.", author: "Atatürk" },
  { quote: "Bir millet, irfan ordusuna sahip olmadıkça muharebe meydanlarında ne kadar parlak zaferler elde ederse etsin, o zaferlerin yaşayacak neticeler vermesi ancak irfan ordusuyla kaimdir.", author: "Atatürk" },
  { quote: "Öğretmenler! Yeni nesil sizin eseriniz olacaktır. Eserin değeri sanatkarın değerine göre olur.", author: "Atatürk" },
  { quote: "Dünyada her şey için, medeniyet için, hayat için, başarı için en gerçek yol gösterici ilimdir, fendir.", author: "Atatürk" },
  { quote: "Çalışmayan doymaz, çalışkan beklemez.", author: "Türk Atasözü" },
  { quote: "Azim dağları yerinden oynatır.", author: "Türk Atasözü" },
  { quote: "Sebat eden mutlaka kazanır.", author: "Türk Atasözü" },
  { quote: "Çalışanın elini bereketli kılar Tanrı.", author: "Türk Atasözü" },
  { quote: "Damlaya damlaya göl olur.", author: "Türk Atasözü" },
  { quote: "Sabrın sonu selamettir.", author: "Türk Atasözü" },
  { quote: "Vakit nakittir.", author: "Türk Atasözü" },
  { quote: "Bir elin nesi var, iki elin sesi var.", author: "Türk Atasözü" },
  { quote: "Ağaç yaşken eğilir.", author: "Türk Atasözü" },
  { quote: "İlim çınardır, gölgesi geniş.", author: "Türk Atasözü" },
  { quote: "Bilgi güçtür.", author: "Francis Bacon" },
  { quote: "Eğitim zihniyeti değiştirebilen tek silahtır.", author: "Nelson Mandela" },
  { quote: "Öğrenmek için asla geç değildir.", author: "Seneca" },
  { quote: "Geleceği bugünden kurmaya başlamalısınız.", author: "Atatürk" },
  { quote: "Her adım sizi hedefinize biraz daha yaklaştırır.", author: "Türk Atasözü" },
  { quote: "Sabırla taş delinir.", author: "Türk Atasözü" },
  { quote: "Az toprak çok bereket getirir, az bilgi çok kapı açar.", author: "Türk Atasözü" },
  { quote: "Çalışma azmi, başarının garantisidir.", author: "Türk Atasözü" },
  { quote: "Bugün ekilen tohum, yarın hasat edilir.", author: "Türk Atasözü" },
  { quote: "Sebat eden, galip gelir.", author: "Türk Atasözü" },
  { quote: "Çalışma saatleriniz az olabilir, ama veriminiz yüksek olsun.", author: "Türk Atasözü" },
  { quote: "Yorgunluk geçicidir, başarı kalıcıdır.", author: "Türk Atasözü" },
  { quote: "Her yanlış konu, bir fırsat demektir. Tekrar et, öğren, başar.", author: "Türk Atasözü" },
  { quote: "Sınav stresi değil, hazırlık eksikliği korkutur. Çalışın, rahat olun.", author: "Türk Atasözü" },
  { quote: "Disiplin, motivasyondan daha güçlüdür.", author: "Türk Atasözü" },
  { quote: "Başarı bir gecede gelmez, ama her gece çalışarak yaklaşırsınız.", author: "Türk Atasözü" },
  { quote: "YKS bir maraton değil, disiplinli bir yürüyüştür. Her gün bir adım daha atın.", author: "Türk Atasözü" },
  { quote: "Bugün çözdüğünüz her soru, yarınki başarınızın tuğlasıdır.", author: "Türk Atasözü" },
  { quote: "Ders çalışmak yorucu olabilir, ama başarısızlık daha yorucudur.", author: "Türk Atasözü" },
  { quote: "Hedeflediğiniz üniversite, bugünkü çalışmanızın karşılığıdır.", author: "Türk Atasözü" },
  { quote: "Her deneme, başarının anahtarıdır.", author: "Türk Atasözü" },
  { quote: "Matematik zor değil, sadece pratik ister. Çözdükçe kolaylaşır.", author: "Türk Atasözü" },
  { quote: "Sınav günü panik yapmak için değil, hazırlığınızı göstermek içindir.", author: "Türk Atasözü" },
  { quote: "Gençliğin en güzel yatırımı, kendine yapılan eğitim yatırımıdır.", author: "Atatürk" },
  { quote: "YKS'de başarı tesadüf değil, planın ürünüdür.", author: "Türk Atasözü" },
  { quote: "Her soru çözümü, zihninizi bir adım daha güçlendirir.", author: "Türk Atasözü" },
  { quote: "Başarısız deneme olmaz, sadece öğrenme fırsatları vardır.", author: "Türk Atasözü" },
  { quote: "Hedefiniz net, çalışmanız düzenli olsun. Başarı kendiliğinden gelir.", author: "Türk Atasözü" },
  { quote: "Bugün vazgeçerseniz, yarın pişman olursunuz. Devam edin.", author: "Türk Atasözü" },
  { quote: "Her gün biraz daha ilerleyin, gerisi kendiliğinden gelir.", author: "Türk Atasözü" },
  { quote: "Azim ile başarılmayacak hiçbir şey yoktur.", author: "Türk Atasözü" },
  { quote: "Her gün yeni bir sayfa, yeni bir şans.", author: "Türk Atasözü" },
  { quote: "Çalışmanın meyvesi tatlıdır.", author: "Türk Atasözü" },
  { quote: "Hedefine ulaşmak isteyenin durması yasak.", author: "Türk Atasözü" },
  { quote: "Çaba eden hiçbir zaman pişman olmaz.", author: "Türk Atasözü" },
  { quote: "Her adım sizi zirveye biraz daha yaklaştırır.", author: "Türk Atasözü" },
  { quote: "Başarıya giden yolda durmak yoktur.", author: "Türk Atasözü" },
  { quote: "Zorluklar büyütür, kolaylıklar küçültür.", author: "Türk Atasözü" },
  { quote: "Çalışan el dolu olur, tembel el boş kalır.", author: "Türk Atasözü" },
  { quote: "Her başarılı insanın arkasında, büyük bir çaba vardır.", author: "Türk Atasözü" },
  { quote: "Bugünün yorgunluğu, yarının başarısıdır.", author: "Türk Atasözü" },
  { quote: "Her problem, içinde çözümünü barındırır.", author: "Türk Atasözü" },
  { quote: "Başarı, hazırlık ile fırsatın buluşmasıdır.", author: "Seneca" },
  { quote: "Bugünkü çabanız, gelecekteki gururunuzdur.", author: "Türk Atasözü" },
  { quote: "Hedeflerinizi büyük tutun, çabalarınızı büyütün.", author: "Türk Atasözü" },
  { quote: "Başarı, tutarlı çabanın sonucudur.", author: "Türk Atasözü" },
  { quote: "Başarı, kesin kararlılığın ürünüdür.", author: "Türk Atasözü" },
  { quote: "Öğrenmek, en değerli yatırımdır.", author: "Atatürk" },
  { quote: "Kendine inan, dünya da sana inanacak.", author: "Türk Atasözü" },
  { quote: "Cesaret eksikliği, başarının en büyük düşmanıdır.", author: "Türk Atasözü" },
  { quote: "Her zorluk, sizi daha güçlü yapar.", author: "Türk Atasözü" },
  { quote: "Her düşen tekrar kalkar, her kaybeden tekrar kazanır.", author: "Türk Atasözü" },
  { quote: "Çalışkan insan kaderini değiştirebilir.", author: "Türk Atasözü" },
  { quote: "Çaba gösterenin yolu açılır.", author: "Türk Atasözü" },
  { quote: "Başarı planla gelir, şansla değil.", author: "Türk Atasözü" },
  { quote: "Bugün atılan her adım, geleceğin temelini atar.", author: "Türk Atasözü" },
  { quote: "Vazgeçmeyin, çünkü büyük şeyler zaman alır.", author: "Türk Atasözü" },
  { quote: "Her yeni bilgi, seni daha güçlü yapar.", author: "Türk Atasözü" },
  { quote: "Bugünkü fedakarlığınız, yarınki mutluluğunuzdur.", author: "Türk Atasözü" },
];

export function MotivationalQuote() {
  const currentQuote = useMemo(() => {
    return QUOTES[Math.floor(Math.random() * QUOTES.length)];
  }, []);

  return (
    <div className="flex items-center justify-center gap-3 flex-1 min-w-0">
      <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/40 font-medium shrink-0 hidden sm:inline">
        Günün Sözü
      </span>
      <span className="hidden sm:block w-px h-3 bg-border/40 shrink-0" />
      <span className="text-sm text-muted-foreground italic truncate">
        &ldquo;{currentQuote.quote}&rdquo;
      </span>
      <span className="text-xs font-medium text-primary/70 whitespace-nowrap shrink-0">
        — {currentQuote.author}
      </span>
    </div>
  );
}
