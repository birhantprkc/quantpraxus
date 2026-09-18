// Ortam değişkenlerini yükler.
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import express from "express";
import { registerRoutes } from "./rotalar";
import { log, serveStatic } from "./static";
import { validateEnvironmentVariables } from "./env-validation";
import { storage } from "./depolama";

// Gerekli ortam değişkenlerini kontrol eder.
validateEnvironmentVariables();

const app = express();

if (process.env.NODE_ENV === "production") {
  app.set("env", "production");
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// API istekleri için performans ve hata odaklı loglama yapar.
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
      // Gereksiz ve hızlı istekleri loglamaz.
      const shouldSkipLog =
        (req.method === "GET" && res.statusCode === 304) ||
        (req.method === "GET" && duration < 50 && res.statusCode === 200);

      if (shouldSkipLog) {
        return;
      }

      const externalIp =
        req.headers["x-forwarded-for"] ||
        req.socket.remoteAddress ||
        "unknown";

      let logLine = `${req.method} ${pathReq} ${res.statusCode} in ${duration}ms`;

      // Hata veya yavaş isteklerde IP logla
      if (res.statusCode >= 400 || duration > 1000) {
        logLine += ` [IP: ${externalIp}]`;
      }

      // Sadece hatalı yanıtlar!!!
      if (res.statusCode >= 400 && capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      // Log max 200 karakter
      if (logLine.length > 200) {
        logLine = logLine.slice(0, 199) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // API routes save ve başlat
  const server = await registerRoutes(app);

  // main sunucu bug loglar
  app.use((err: any, _req: any, res: any, _next: any) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Server error:", err);
    res.status(status).json({ message });
  });

  // Geliştirmede Vite, productionda statik dosyalar
  if (app.get("env") === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  const host = process.env.HOST || "127.0.0.1";

  // host config
  server.listen(port, host, () => {
    log(`Dersime dönebilirim !!! Site Link : http://${host}:${port}`);
  });

  // Haftalık otomatik arşivleme zamanlayıcısını oluştur
  function scheduleAutoArchive() {
    // Türkiye saatine göre hesapla
    const now = new Date();
    const turkeyTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
    );

    // Bir sonraki Pazar 23:59 zamanını hesapla
    const nextSunday = new Date(turkeyTime);
    const currentDay = nextSunday.getDay();

    let daysUntilSunday: number;

    if (currentDay === 0) {
      const targetTime = new Date(turkeyTime);
      targetTime.setHours(23, 59, 0, 0);

      daysUntilSunday = turkeyTime < targetTime ? 0 : 7;
    } else {
      daysUntilSunday = 7 - currentDay;
    }

    nextSunday.setDate(nextSunday.getDate() + daysUntilSunday);
    nextSunday.setHours(23, 59, 0, 0);

    const msUntilSunday =
      nextSunday.getTime() - turkeyTime.getTime();

    // İlk arşivleme zamanını planla
    setTimeout(() => {
      log("📅 Pazar 23:59 - Haftalık otomatik arşivleme başlatılıyor...");

      storage
        .autoArchiveOldData()
        .then(() => {
          log("✅ Haftalık otomatik arşivleme tamamlandı");
        })
        .catch((error) => {
          console.error("❌ Haftalık otomatik arşivleme hatası:", error);
        });

      // Sonraki arşivlemeleri haftalık olarak tekrarla
      setInterval(() => {
        log("📅 Pazar 23:59 - Haftalık otomatik arşivleme başlatılıyor...");

        storage
          .autoArchiveOldData()
          .then(() => {
            log("✅ Haftalık otomatik arşivleme tamamlandı");
          })
          .catch((error) => {
            console.error("❌ Haftalık otomatik arşivleme hatası:", error);
          });
      }, 7 * 24 * 60 * 60 * 1000);
    }, msUntilSunday);

    // Bir sonraki arşivlemeye kalan süreyi logla
    const hoursUntil = Math.round(msUntilSunday / 1000 / 60 / 60);
    const daysUntil = Math.floor(hoursUntil / 24);

    log(
      ` ÖZEL ANALİZ TAKİP SİSTEMİNİZ GAYET GÜZEL ÇALIŞIYOR İYİ DERSLER DİLERİM :) .`
    );
  }

  // Otomatik arşivleme zamanlayıcısını başlat
  scheduleAutoArchive();
})();