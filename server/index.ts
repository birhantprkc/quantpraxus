import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import express from "express";
import { registerRoutes } from "./rotalar";
import { log, serveStatic } from "./static";
import { validateEnvironmentVariables } from "./env-validation";
import { storage } from "./depolama";

validateEnvironmentVariables();

const app = express();

if (process.env.NODE_ENV === "production") {
  app.set("env", "production");
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const pathReq = req.path;
  let capturedJsonResponse: any;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (pathReq.startsWith("/api")) {
      // Gereksiz logları filtrele
      const shouldSkipLog = (
        (req.method === 'GET' && res.statusCode === 304) ||
        // Hızlı GET isteklerini atla
        (req.method === 'GET' && duration < 50 && res.statusCode === 200)
      );

      if (shouldSkipLog) {
        return;
      }

      const externalIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      
      // Sadece önemli bilgileri logla
      let logLine = `${req.method} ${pathReq} ${res.statusCode} in ${duration}ms`;
      
      // Hata durumlarında veya yavaş isteklerde detay ekle
      if (res.statusCode >= 400 || duration > 1000) {
        logLine += ` [IP: ${externalIp}]`;
      }

      // Sadece hata durumlarında response bodyyi logla
      if (res.statusCode >= 400 && capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 200) {
        logLine = logLine.slice(0, 199) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: any, res: any, _next: any) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Server error:", err);
    res.status(status).json({ message });
  });

  if (app.get("env") === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  const host = process.env.HOST || "127.0.0.1";

  server.listen(port, host, () => {
    log(`Dersime dönebilirim !!! Site Link : http://${host}:${port}`);
  });

  // Otomatik arşivleme zamanlayıcısı - Her Pazar 23:59'da çalışır
  function scheduleAutoArchive() {
    // Türkiye saati için tarih hesaplama
    const now = new Date();
    const turkeyTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
    
    // Bir sonraki Pazar 23:59'u bul
    const nextSunday = new Date(turkeyTime);
    const currentDay = nextSunday.getDay();
    
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

    setTimeout(() => {
      log("📅 Pazar 23:59 - Haftalık otomatik arşivleme başlatılıyor...");
      storage.autoArchiveOldData()
        .then(() => {
          log("✅ Haftalık otomatik arşivleme tamamlandı");
        })
        .catch((error) => {
          console.error("❌ Haftalık otomatik arşivleme hatası:", error);
        });
      
      // Bir sonraki hafta için tekrar zamanla
      setInterval(() => {
        log("📅 Pazar 23:59 - Haftalık otomatik arşivleme başlatılıyor...");
        storage.autoArchiveOldData()
          .then(() => {
            log("✅ Haftalık otomatik arşivleme tamamlandı");
          })
          .catch((error) => {
            console.error("❌ Haftalık otomatik arşivleme hatası:", error);
          });
      }, 7 * 24 * 60 * 60 * 1000); // 7 gün
    }, msUntilSunday);

    const hoursUntil = Math.round(msUntilSunday / 1000 / 60 / 60);
    const daysUntil = Math.floor(hoursUntil / 24);
    log(` ÖZEL ANALİZ TAKİP SİSTEMİNİZ GAYET GÜZEL ÇALIŞIYOR İYİ DERSLER DİLERİM :) .`);
  }

  scheduleAutoArchive();
})();

