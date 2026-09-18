# Katkıda Bulunma Kılavuzu

Öncelikle bu projeye katkıda bulunmayı düşündüğünüz için teşekkür ederiz! 🎉

Bu doküman, projeye nasıl katkıda bulunabileceğinizi açıklar.

## 🌟 Katkı Türleri

Farklı şekillerde katkıda bulunabilirsiniz:

- 🐛 **Bug raporları:** Hata bulduğunuzda rapor edin
- 💡 **Özellik önerileri:** Yeni fikirlerinizi paylaşın
- 📝 **Dokümantasyon:** README, code comments, wiki güncellemeleri
- 🎨 **UI/UX iyileştirmeleri:** Daha iyi kullanıcı deneyimi için öneriler
- 🧪 **Test yazma:** Test coverage artırma
- 🔧 **Kod katkısı:** Bug fix veya yeni özellik geliştirme

## 🐛 Bug Raporu

Bir hata bulduğunuzda, lütfen şu bilgileri içeren bir [GitHub Issue](https://github.com/beratcode03/quantpraxus/issues) açın:

**Başlık:** Kısa ve açıklayıcı
```
❌ "Uygulama çalışmıyor"
✅ "Net hesaplayıcıda TYT Türkçe 40'tan fazla soru girişinde hata"
```

**İçerik şablonu:**
```markdown
## Bug Açıklaması
Net hesaplayıcıda TYT Türkçe için 40'tan fazla soru girildiğinde uygulama hata veriyor.

## Adımlar (Reproduce)
1. Net Hesaplayıcı sayfasına git
2. TYT Türkçe -> Doğru: 45 gir
3. Hesapla butonuna tıkla
4. Console'da hata görünüyor

## Beklenen Davranış
Uygulama "Maksimum 40 soru girilebilir" uyarısı göstermeli.

## Gerçekte Olan
Console'da "Uncaught TypeError" hatası.

## Screenshots
[Ekran görüntüsü ekleyin]

## Ortam Bilgisi
- **İşletim Sistemi:** Windows 11
- **Tarayıcı:** Chrome 120
- **Uygulama versiyonu:** 0.0.3 (Electron Desktop veya Web)

## Ek Bilgi
Console log:
```
TypeError: Cannot read property 'max' of undefined
  at calculateNet (utils.ts:45)
```
```

## 💡 Özellik Önerisi

Yeni bir özellik önerisi için [GitHub Discussions](https://github.com/beratcode03/quantpraxus/discussions) veya Issue kullanabilirsiniz:

**Şablon:**
```markdown
## Özellik Açıklaması
Kullanıcılar net grafiklerini PDF olarak dışa aktarabilsin.

## Motivasyon
Öğrenciler gelişimlerini veli ve öğretmenleriyle paylaşmak istiyor.

## Önerilen Çözüm
Dashboard'da "PDF İndir" butonu eklenebilir. html2canvas + jspdf kullanılarak grafikleri PDF'e dönüştürülebilir.

## Alternatifler
- PNG olarak dışa aktarma
- Email ile gönderme

## Ek Bilgi
Bu özellik için `jspdf` ve `html2canvas` kütüphaneleri mevcut.
```

## 🔧 Kod Katkısı ##

# NOT: Veritabanı Katkıları Hakkında Şu anki sürümde prototipleme hızı için JSON tabanlı bir depolama (server/depolama.ts) kullanılmaktadır. Eğer PostgreSQL geçişine katkı sağlamak isterseniz, lütfen öncelikle bir Discussion açarak mimariyi benimle tartışın

### 1. Fork & Clone ###

```bash
# Fork butonuna tıklayın (GitHub'da)
# Sonra kendi fork'unuzu klonlayın:
git clone https://github.com/beratcode03/quantpraxus.git
cd quantpraxus
```

### 2. Branch Oluşturun

```bash
# Feature branch
git checkout -b feature/pdf-export

# Bug fix branch
git checkout -b fix/net-calculator-validation
```

**Branch isimlendirme:**
- `feature/` - Yeni özellikler
- `fix/` - Bug düzeltmeleri
- `docs/` - Dokümantasyon
- `refactor/` - Kod refactoring
- `test/` - Test ekleme

### 3. Geliştirme Ortamını Kurun

```bash
npm install
npm run db:push
npm run dev
```

Detaylı kurulum için [DEVELOPMENT.md](DEVELOPMENT.md) dosyasına bakın.

### 4. Değişikliklerinizi Yapın

#### Code Style

- **TypeScript:** Strict mode kullanın
- **React:** Functional components + hooks
- **Naming:** Anlamlı isimler kullanın
- **Comments:** Sadece gerekli yerlerde, "ne" değil "neden" açıklayın

**Örnek:**
```typescript
// ❌ Kötü
function calc(a: number, b: number) {
  return a - b / 4; // Calculate
}

// ✅ İyi
function calculateNetScore(correctAnswers: number, wrongAnswers: number): number {
  // YKS'de her 4 yanlış 1 doğruyu götürdüğü için bu formül kullanılır
  return correctAnswers - (wrongAnswers / 4);
}
```

#### Testing

Yeni özellikler için test yazın:

```bash
# Unit test
npm run test

# E2E test
npx playwright test
```

**Test coverage:** Yeni kodun en az %80'i test edilmeli.

### 5. Commit

[Conventional Commits](https://www.conventionalcommits.org/) formatı kullanın:

```bash
# Özellik ekleme
git commit -m "feat: add PDF export to dashboard"

# Bug düzeltme
git commit -m "fix: validate max question count in net calculator"

# Dokümantasyon
git commit -m "docs: update installation instructions"

# Refactoring
git commit -m "refactor: extract calculateNetScore to utils"

# Test
git commit -m "test: add unit tests for calculateNetScore"
```

**Commit mesajı kuralları:**
- İlk satır 50 karakter maksimum
- İngilizce veya Türkçe olabilir
- Present tense kullanın ("add" not "added")
- Başlangıçta büyük harf yok ("Add" değil "add")

**İyi commit mesajları:**
```bash
✅ feat: add dark mode toggle to settings
✅ fix: resolve timezone issue in dashboard dates
✅ docs: add troubleshooting section to README
✅ refactor: split 7000-line component into smaller modules
✅ test: add E2E tests for exam result submission
```

### 6. Push & Pull Request

```bash
git push origin feature/pdf-export
```

GitHub'da "Create Pull Request" butonuna tıklayın.

**PR Şablonu:**
```markdown
## Açıklama
Dashboard'a PDF export özelliği eklendi.

## Değişiklikler
- `jspdf` ve `html2canvas` dependency eklendi
- Dashboard'a "PDF İndir" butonu eklendi
- PDF export fonksiyonu oluşturuldu (`utils/pdf-export.ts`)
- Unit testler eklendi

## Test Edildi
- [x] Local'de test edildi
- [x] Unit testler yazıldı ve geçti
- [x] E2E testler yazıldı
- [x] Farklı tarayıcılarda test edildi (Chrome, Firefox, Edge)

## Screenshots
[PDF export butonu ekran görüntüsü]
[Oluşturulan PDF örneği]

## Checklist
- [x] Kod TypeScript strict mode'da hatasız
- [x] Yeni özellik için testler yazıldı
- [x] README güncellendi (gerekiyorsa)
- [x] CHANGELOG güncellendi
- [x] Commit mesajları conventional format'a uygun
```

### 7. Code Review

- PR açıldıktan sonra, maintainer'lar review yapacak
- Değişiklik isterlerse, aynı branch'e commit atın
- Otomatik olarak PR güncellenecek

**Review sürecinde:**
- Sabırlı olun 🙏
- Geri bildirimlere açık olun
- Sorular sorun, tartışın
- Gerekirse refactor yapın

## 📝 Dokümantasyon Katkısı

Kod yazmadan da katkıda bulunabilirsiniz:

- README'de eksiklikleri tamamlayın
- DEVELOPMENT.md'ye yeni bölümler ekleyin
- Code comments ekleyin/iyileştirin
- Wiki sayfaları oluşturun
- Tutorial videoları/yazıları paylaşın

## 🎨 UI/UX Katkısı

Tasarım önerileri için:
1. Figma/Sketch dosyası oluşturun
2. Screenshots + açıklama ekleyin
3. GitHub Issue veya Discussion açın

## 🧪 Test Yazma

Daha fazla test her zaman iyidir:

```bash
# Test eksik alanları görün
npm run test:coverage
```

Coverage %80'in altında olan dosyaları bulup test yazabilirsiniz.

## ❓ Sorularınız mı Var?

- **Genel sorular:** [GitHub Discussions](https://github.com/beratcode03/quantpraxus/discussions)
- **Bug raporu:** [GitHub Issues](https://github.com/beratcode03/quantpraxus/issues)
- **Özel konular:** Email ile iletişime geçin (GitHub profilimde)

## 🙏 Teşekkürler!

Katkılarınız bu projeyi daha iyi hale getiriyor. Her türlü katkı, küçük de olsa, çok değerlidir.

**Mutlu kodlamalar!** 🚀

---

*Son güncelleme: 1 Mart 2026*
