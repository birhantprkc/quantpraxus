// QuantPraxus QuantPraxus




const { app, BrowserWindow, ipcMain, Tray, Menu, dialog, shell, screen } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const activityLogger = require('./activity-logger.cjs');

let mainWindow = null;
let logsWindow = null;
let activitiesWindow = null;
let tray = null;
let serverProcess = null;
const PORT = 5000;
let serverLogs = [];
let lastClickTime = 0;
const DOUBLE_CLICK_THRESHOLD = 300;

// .env dosyasını yükle - Electron için
function loadEnvFile() {
  const envVars = {};
  
  try {
    // .env dosyasının olası konumları
    const possiblePaths = [
      path.join(process.cwd(), '.env'), 
      path.join(__dirname, '..', '.env'),  
      path.join(__dirname, '.env'), 
      path.join(app.getPath('userData'), '.env'),
    ];
    
    // Production modda resources path'i de ekle
    if (app.isPackaged && process.resourcesPath) {
      possiblePaths.unshift(path.join(process.resourcesPath, '.env'));
      possiblePaths.unshift(path.join(process.resourcesPath, 'app.asar.unpacked', '.env'));
    }
    
    let envContent = null;
    let envPath = null;
    
    // İlk bulunan .env dosyasını oku
    for (const envFile of possiblePaths) {
      if (fs.existsSync(envFile)) {
        envContent = fs.readFileSync(envFile, 'utf-8');
        envPath = envFile;
        console.log('.env dosyası yüklendi:', envPath);
        break;
      }
    }
    
    if (envContent) {
      // .env dosyasını parse et
      const lines = envContent.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Boş satırları ve yorumları atla
        if (!trimmedLine || trimmedLine.startsWith('#')) {
          continue;
        }
        
        // KEY=VALUE formatını parse et
        const match = trimmedLine.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();
          
          // Tırnak işaretlerini kaldır
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          
          envVars[key] = value;
        }
      }
      
      console.log('✅ .env dosyası başarıyla yüklendi. Bulunan değişkenler:',   ject.keys(envVars));
      
      // Email yapılandırmasını kontrol et
      if (envVars.EMAIL_USER || envVars.GMAIL_USER) {
        console.log('✅ Email yapılandırması bulundu');
      } else {
        console.warn('⚠️  Email yapılandırması eksik! EMAIL_USER veya GMAIL_USER bulunamadı.');
      }
    } else {
      console.warn('⚠️  .env dosyası bulunamadı. Aranan konumlar:', possiblePaths);
    }
  } catch (err) {
    console.error('❌ .env dosyası yüklenirken hata:', err.message);
  }
  
  return envVars;
}

// 2 kere açılmayı önle
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // İkinci instance açılmaya çalışıldığında mevcut pencereyi göster
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Hata önleme: Dizinlerin varlığını kontrol et ve oluştur
function ensureDirectoryExists(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (err) {
    console.error('Dizin oluşturma hatası:', err);
  }
}

// Hata önleme: Dosya varlığını kontrol et
function ensureFileExists(filePath, defaultContent = '') {
  try {
    if (!fs.existsSync(filePath)) {
      const dir = path.dirname(filePath);
      ensureDirectoryExists(dir);
      fs.writeFileSync(filePath, defaultContent, 'utf-8');
    }
  } catch (err) {
    console.error('Dosya oluşturma hatası:', err);
  }
}

// Hata önleme: Node environment kontrolü
function validateNodeEnvironment() {
  try {
    const nodeVersion = process.version;
    console.log('Node.js sürümü:', nodeVersion);
    
    // Gerekli dizinleri oluştur
    const dataDir = path.join(app.getPath('userData'), 'data');
    ensureDirectoryExists(dataDir);
    
    return true;
  } catch (err) {
    console.error('Node environment hatası:', err);
    return false;
  }
}

// Server'ın hazır olup olmadığını kontrol et
function checkServerReady(maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    const http = require('http');
    let attempts = 0;

    const checkPort = () => {
      attempts++;
      
      const req = http.get(`http://localhost:${PORT}`, (res) => {
        if (res.statusCode === 200 || res.statusCode === 304) {
          console.log(`Server hazır! (${attempts}. deneme)`);
          resolve(true);
        } else {
          if (attempts < maxAttempts) {
            setTimeout(checkPort, 500);
          } else {
            reject(new Error('Server başlatılamadı - zaman aşımı'));
          }
        }
      });

      req.on('error', () => {
        if (attempts < maxAttempts) {
          setTimeout(checkPort, 500);
        } else {
          reject(new Error('Server başlatılamadı - zaman aşımı'));
        }
      });

      req.end();
    };

    checkPort();
  });
}

function startServer() {
  return new Promise((resolve, reject) => {
    const isPackaged = app.isPackaged;
    
    try {
      // .env dosyasını yükle
      const envVars = loadEnvFile();
      
      if (isPackaged) {
        const serverPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'index.cjs');
        
        const fallbackPath = path.join(process.resourcesPath, 'dist', 'index.cjs');

        const dataDir = path.join(app.getPath('userData'), 'data');
        ensureDirectoryExists(dataDir);
        
        const finalServerPath = fs.existsSync(serverPath) ? serverPath : fallbackPath;
        
        if (!fs.existsSync(finalServerPath)) {
          const error = new Error(`Server dosyası bulunamadı: ${finalServerPath}\nDenenen yol: ${serverPath}`);
          console.error(error);
          serverLogs.push(`[HATA] ${error.message}`);
          reject(error);
          return;
        }
        
        serverProcess = spawn('node', [finalServerPath], {
          env: { 
            ...process.env,
            ...envVars, 
            PORT: PORT.toString(), 
            NODE_ENV: 'production',
            DATA_DIR: dataDir,
            RESOURCES_PATH: process.resourcesPath 
          },
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true 
        });
      } else {
        serverProcess = spawn('npm', ['run', 'dev'], {
          shell: true,
          stdio: 'pipe',
          env: { 
            ...process.env,
            ...envVars, 
            PORT: PORT.toString(), 
            NODE_ENV: 'development' 
          }
        });
      }

      serverProcess.stdout?.on('data', (data) => {
        const log = data.toString();
        const timestamp = new Date().toLocaleTimeString('tr-TR');
        serverLogs.push(`[${timestamp}] ${log}`);
        if (serverLogs.length > 500) serverLogs.shift()
        
        parseServerLogForActivity(log);
        
        // Logs window açıksa güncelle (throttled)
        if (logsWindow && !logsWindow.isDestroyed()) {
          logsWindow.webContents.send('log-update', serverLogs.join('\n'));
        }
      });

      serverProcess.stderr?.on('data', (data) => {
        const log = data.toString();
        const timestamp = new Date().toLocaleTimeString('tr-TR');
        serverLogs.push(`[${timestamp}] [ERROR] ${log}`);
        if (serverLogs.length > 500) serverLogs.shift();
        
        // Logs window açıksa güncelle (throttled)
        if (logsWindow && !logsWindow.isDestroyed()) {
          logsWindow.webContents.send('log-update', serverLogs.join('\n'));
        }
      });

      serverProcess.on('error', (err) => {
        const errorMsg = `Server başlatma hatası: ${err.message}`;
        console.error(errorMsg);
        serverLogs.push(`[${new Date().toLocaleTimeString('tr-TR')}] [HATA] ${errorMsg}`);
        reject(err);
      });
      
      serverProcess.on('exit', (code, signal) => {
        if (code !== 0 && code !== null) {
          const errorMsg = `Server beklenmedik şekilde kapandı (exit code: ${code})`;
          console.error(errorMsg);
          serverLogs.push(`[${new Date().toLocaleTimeString('tr-TR')}] [HATA] ${errorMsg}`);
        }
      });

      // Server'ın gerçekten hazır olmasını bekle
      console.log('⏳ Server başlatılıyor, hazır olması bekleniyor...');
      checkServerReady()
        .then(() => {
          console.log('✅ Server hazır!');
          resolve();
        })
        .catch((err) => {
          console.error('❌ Server hazır olamadı:', err);
          reject(err);
        });
    } catch (err) {
      console.error('Server başlatma hatası:', err);
      serverLogs.push(`[${new Date().toLocaleTimeString('tr-TR')}] [HATA] ${err.message}`);
      reject(err);
    }
  });
}

function parseServerLogForActivity(log) {
  try {
    const lines = log.split('\n');
    
    for (const line of lines) {
      const activityPattern = /\[ACTIVITY\]\s+(.+?)(?:\s+\|\s+(.+))?$/;
      const match = line.match(activityPattern);
      
      if (match) {
        const [, action, description] = match;
        activityLogger.log(action, description || '');
      }
    }
  } catch (error) {
    // Sessizce hatayı yakala
  }
}

function restartServer() {
  if (serverProcess) {
    serverLogs.push(`[${new Date().toLocaleTimeString('tr-TR')}] Server yeniden başlatılıyor...`);
    serverProcess.kill();
    serverProcess = null;
  }
  
  setTimeout(() => {
    startServer().then(() => {
      serverLogs.push(`[${new Date().toLocaleTimeString('tr-TR')}] Server başarıyla yeniden başlatıldı`);
      if (logsWindow && !logsWindow.isDestroyed()) {
        logsWindow.webContents.send('log-update', serverLogs.join('\n'));
      }
    }).catch(err => {
      serverLogs.push(`[${new Date().toLocaleTimeString('tr-TR')}] [HATA] Server yeniden başlatılamadı: ${err.message}`);
    });
  }, 1000);
}

function restartApp() {
  app.relaunch();
  app.quit();
}

// Tüm verileri temizle ve sıfırdan başla
async function clearAllData() {
  try {
    // Boş veri yapısı
    const emptyData = {
      gorevler: [],
      ruhHalleri: [],
      hedefler: [],
      soruGunlukleri: [],
      sinavSonuclari: [],
      sinavKonuNetleri: [],
      calismaSaatleri: []
    };
    
    // 1. userData dizinindeki kayitlar.json'u temizle (packaged mod için)
    const userDataDir = path.join(app.getPath('userData'), 'data');
    const userDataKayitlarPath = path.join(userDataDir, 'kayitlar.json');
    
    if (fs.existsSync(userDataKayitlarPath)) {
      fs.unlinkSync(userDataKayitlarPath);
      console.log('✅ userData/kayitlar.json silindi');
    }
    
    ensureDirectoryExists(userDataDir);
    fs.writeFileSync(userDataKayitlarPath, JSON.stringify(emptyData, null, 2), 'utf-8');
    console.log('✅ userData/kayitlar.json sıfırlandı');
    
    // 2. Proje dizinindeki data/kayitlar.json'u temizle (development mod için)
    const projectDataDir = path.join(process.cwd(), 'data');
    const projectKayitlarPath = path.join(projectDataDir, 'kayitlar.json');
    const projectBackupPath = path.join(projectDataDir, 'kayitlar.json.backup');
    
    if (fs.existsSync(projectKayitlarPath)) {
      fs.unlinkSync(projectKayitlarPath);
      console.log('✅ project/data/kayitlar.json silindi');
    }
    
    if (fs.existsSync(projectBackupPath)) {
      fs.unlinkSync(projectBackupPath);
      console.log('✅ project/data/kayitlar.json.backup silindi');
    }
    
    if (fs.existsSync(projectDataDir)) {
      fs.writeFileSync(projectKayitlarPath, JSON.stringify(emptyData, null, 2), 'utf-8');
      console.log('✅ project/data/kayitlar.json sıfırlandı');
    }
    
    // 3. LocalStorage, SessionStorage, IndexedDB ve tüm cache'leri temizle
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        // JavaScript ile tüm storage'ları temizle
        await mainWindow.webContents.executeJavaScript(`
          (async () => {
            // LocalStorage temizle
            localStorage.clear();
            
            // SessionStorage temizle
            sessionStorage.clear();
            
            // IndexedDB temizle
            if (window.indexedDB) {
              const databases = await window.indexedDB.databases();
              for (const db of databases) {
                if (db.name) {
                  window.indexedDB.deleteDatabase(db.name);
                }
              }
            }
            
            // Service Workers'ı temizle
            if ('serviceWorker' in navigator) {
              const registrations = await navigator.serviceWorker.getRegistrations();
              for (const registration of registrations) {
                await registration.unregister();
              }
            }
            
            // Cache Storage temizle
            if ('caches' in window) {
              const cacheNames = await caches.keys();
              for (const cacheName of cacheNames) {
                await caches.delete(cacheName);
              }
            }
            
            console.log('✅ Tüm tarayıcı verileri temizlendi');
            return true;
          })();
        `);
        console.log('✅ localStorage, sessionStorage, IndexedDB ve cache temizlendi');
        
        // Electron storage session'ı da temizle
        await mainWindow.webContents.session.clearStorageData({
          storages: ['localstorage', 'websql', 'indexdb', 'serviceworkers', 'cachestorage']
        });
        console.log('✅ Electron session storage temizlendi');
        
        // Cache'leri de temizle
        await mainWindow.webContents.session.clearCache();
        console.log('✅ Electron cache temizlendi');
        
      } catch (err) {
        console.error('❌ Tarayıcı verileri temizleme hatası:', err);
        // Hata olsa bile devam et
      }
    }
    
    console.log('✅✅✅ TÜM VERİLER BAŞARIYLA TEMİZLENDİ VE SIFIRDAN BAŞLATILDI ✅✅✅');
    console.log('📊 Veriler: 0 görev, 0 sınav, 0 soru günlüğü, 0 çalışma saati');
    console.log('💾 LocalStorage, SessionStorage, IndexedDB ve tüm cache\'ler temizlendi');
  } catch (err) {
    console.error('❌ Veri temizleme hatası:', err);
    throw err;
  }
}

function createActivitiesWindow() {
  // Eğer activities window zaten açıksa, focus et
  if (activitiesWindow && !activitiesWindow.isDestroyed()) {
    activitiesWindow.focus();
    return;
  }
  
  activitiesWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'Aktiviteler - QuantPraxus',
    autoHideMenuBar: true,
    backgroundColor: '#1a1a1a',
    icon: path.join(__dirname, 'icons', 'app-icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  
  const activitiesHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Aktiviteler - QuantPraxus</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      color: #e0e0e0;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      padding: 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    }
    
    .header h1 {
      font-size: 24px;
      font-weight: 600;
      color: white;
      margin-bottom: 8px;
    }
    
    .header p {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.8);
    }
    
    .toolbar {
      display: flex;
      gap: 10px;
      padding: 15px;
      background: #2d2d2d;
      border-bottom: 1px solid #404040;
    }
    
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .btn-primary {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
    }
    
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }
    
    .btn-danger {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
    }
    
    .btn-danger:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
    }
    
    .activities-container {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }
    
    .activity-item {
      background: #2d2d2d;
      border-left: 4px solid #10b981;
      padding: 15px;
      margin-bottom: 10px;
      border-radius: 6px;
      transition: all 0.3s ease;
    }
    
    .activity-item:hover {
      background: #353535;
      transform: translateX(5px);
    }
    
    .activity-item.empty {
      border-left: 4px solid #6366f1;
      text-align: center;
      color: #808080;
    }
    
    .footer {
      padding: 12px 20px;
      background: #2d2d2d;
      border-top: 1px solid #404040;
      text-align: center;
      font-size: 12px;
      color: #808080;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Aktiviteler</h1>
    <p>Yapılan İşlemler - QuantPraxus YKS Analiz Sistemi</p>
  </div>
  
  <div class="toolbar">
    <button class="btn btn-primary" onclick="refreshActivities()">
      🔄 Yenile
    </button>
    <button class="btn btn-danger" onclick="clearAllActivities()" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
      🗑️ Tüm Aktiviteleri Sil
    </button>
    <button class="btn btn-danger" onclick="closeWindow()">
      ❌ Kapat
    </button>
  </div>
  
  <div class="activities-container" id="activities"></div>
  
  <div class="footer">
    © 2025-2026 QuantPraxus - Tüm Hakları Saklıdır
  </div>
  
  <script>
    const { ipcRenderer } = require('electron');
    
    function updateActivities(activities) {
      const activitiesElement = document.getElementById('activities');
      
      if (!activities || activities.length === 0) {
        activitiesElement.innerHTML = '<div class="activity-item empty">Henüz aktivite kaydı bulunmuyor.</div>';
        return;
      }
      
      activitiesElement.innerHTML = activities
        .reverse()
        .map(activity => \`<div class="activity-item">\${activity}</div>\`)
        .join('');
    }
    
    function refreshActivities() {
      ipcRenderer.send('get-activities');
    }
    
    function clearAllActivities() {
      if (confirm('Tüm aktiviteleri silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
        ipcRenderer.send('clear-activities');
      }
    }
    
    function closeWindow() {
      window.close();
    }
    
    // İlk yükleme
    ipcRenderer.send('get-activities');
    
    // Aktivite güncellemelerini dinle
    ipcRenderer.on('activities-update', (event, activities) => {
      updateActivities(activities);
    });
    
    // Her 3 saniyede bir otomatik yenile
    setInterval(() => {
      ipcRenderer.send('get-activities');
    }, 3000);
  </script>
</body>
</html>
  `;
  
  activitiesWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(activitiesHtml)}`);
  
  activitiesWindow.on('closed', () => {
    activitiesWindow = null;
  });
}

function createLogsWindow() {
  // Eğer logs window zaten açıksa, focus et
  if (logsWindow && !logsWindow.isDestroyed()) {
    logsWindow.focus();
    return;
  }
  
  logsWindow = new BrowserWindow({
    width: 900,
    height: 600,
    title: 'Server Logları - QuantPraxus',
    autoHideMenuBar: true,
    backgroundColor: '#1a1a1a',
    icon: path.join(__dirname, 'icons', 'app-icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  
  // HTML içeriği oluştur
  const logsHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Server Logları - QuantPraxus</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      color: #e0e0e0;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    
    .header {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      padding: 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    }
    
    .header h1 {
      font-size: 24px;
      font-weight: 600;
      color: white;
      margin-bottom: 8px;
    }
    
    .header p {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.8);
    }
    
    .toolbar {
      display: flex;
      gap: 10px;
      padding: 15px;
      background: #2d2d2d;
      border-bottom: 1px solid #404040;
    }
    
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .btn-primary {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
    }
    
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    }
    
    .btn-danger {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
    }
    
    .btn-danger:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
    }
    
    .btn-success {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
    }
    
    .btn-success:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }
    
    .btn-warning {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
    }
    
    .btn-warning:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
    }
    
    .logs-container {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      background: #1a1a1a;
    }
    
    .logs-content {
      background: #0a0a0a;
      border: 1px solid #404040;
      border-radius: 8px;
      padding: 15px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-wrap: break-word;
      color: #a0a0a0;
    }
    
    .logs-content::-webkit-scrollbar {
      width: 10px;
    }
    
    .logs-content::-webkit-scrollbar-track {
      background: #1a1a1a;
    }
    
    .logs-content::-webkit-scrollbar-thumb {
      background: #6366f1;
      border-radius: 5px;
    }
    
    .logs-content::-webkit-scrollbar-thumb:hover {
      background: #8b5cf6;
    }
    
    .footer {
      padding: 12px 20px;
      background: #2d2d2d;
      border-top: 1px solid #404040;
      text-align: center;
      font-size: 12px;
      color: #808080;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🖥️ Server Logları</h1>
    <p>QuantPraxus - YKS Analiz Takip Sistemi</p>
  </div>
  
  <div class="toolbar">
    <button class="btn btn-primary" onclick="refreshLogs()">
      🔄 Yenile
    </button>
    <button class="btn btn-success" onclick="restartServer()">
      🔁 Serveri Yeniden Başlat
    </button>
    <button class="btn btn-warning" onclick="restartApp()">
      ♻️ Uygulamayı Yeniden Başlat
    </button>
    <button class="btn btn-danger" onclick="closeWindow()">
      ❌ Kapat
    </button>
  </div>
  
  <div class="logs-container">
    <div class="logs-content" id="logs"></div>
  </div>
  
  <div class="footer">
    © 2025 QuantPraxus - Tüm Hakları Saklıdır
  </div>
  
  <script>
    const { ipcRenderer } = require('electron');
    
    function updateLogs(logsText) {
      const logsElement = document.getElementById('logs');
      logsElement.textContent = logsText || 'Henüz log kaydı bulunmuyor.';
      logsElement.scrollTop = logsElement.scrollHeight;
    }
    
    function refreshLogs() {
      ipcRenderer.send('refresh-logs');
    }
    
    function restartServer() {
      if (confirm('Serveri yeniden başlatmak istediğinizden emin misiniz?')) {
        ipcRenderer.send('restart-server');
      }
    }
    
    function restartApp() {
      if (confirm('Uygulamayı yeniden başlatmak istediğinizden emin misiniz?')) {
        ipcRenderer.send('restart-app');
      }
    }
    
    function closeWindow() {
      window.close();
    }
    
    // İlk yükleme
    ipcRenderer.send('get-logs');
    
    // Log güncellemelerini dinle
    ipcRenderer.on('log-update', (event, logs) => {
      updateLogs(logs);
    });
    
    // Her 5 saniyede bir otomatik yenile
    setInterval(() => {
      ipcRenderer.send('get-logs');
    }, 5000);
  </script>
</body>
</html>
  `;
  
  logsWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(logsHtml)}`);
  
  logsWindow.on('closed', () => {
    logsWindow = null;
  });
}

// IPC event handlers for logs window
ipcMain.on('get-logs', (event) => {
  event.reply('log-update', serverLogs.join('\n'));
});

ipcMain.on('refresh-logs', (event) => {
  event.reply('log-update', serverLogs.join('\n'));
});

ipcMain.on('restart-server', () => {
  restartServer();
});

ipcMain.on('restart-app', () => {
  restartApp();
});

// etkinlik penceresi için IPC event handlers
ipcMain.on('get-activities', (event) => {
  event.reply('activities-update', activityLogger.getAll());
});

ipcMain.on('refresh-activities', (event) => {
  event.reply('activities-update', activityLogger.getAll());
});

ipcMain.on('clear-activities', (event) => {
  activityLogger.clear();
  event.reply('activities-update', activityLogger.getAll());
});

function createTray() {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'electron', 'icons', 'tray-icon.ico')
    : path.join(__dirname, 'icons', 'tray-icon.ico');
  
  // tepsi ikonu için uygun yolu belirle
  const finalIconPath = fs.existsSync(iconPath) 
    ? iconPath 
    : app.isPackaged
      ? path.join(process.resourcesPath, 'app.asar.unpacked', 'electron', 'icons', 'app-icon.ico')
      : path.join(__dirname, 'icons', 'app-icon.ico');

  tray = new Tray(finalIconPath);
  
  // Tek/Çift tık yönetimi
  tray.on('click', () => {
    const currentTime = Date.now();
    const timeDiff = currentTime - lastClickTime;
    
    if (timeDiff < DOUBLE_CLICK_THRESHOLD) {
      // Çift tık - mevcut pencereyi focus et
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        if (!mainWindow.isVisible()) mainWindow.show();
        mainWindow.focus();
      }
    } else {
      // Tek tık - pencereyi göster/gizle
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    }
    
    lastClickTime = currentTime;
  });

  // Sağ tık menü - kullanıcının istediği yapı
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'QuantPraxus',
      enabled: false,
      click: () => {} // Tıklanamaz
    },
    { type: 'separator' },
    {
      label: 'Aktiviteleri Göster',
      click: () => {
        createActivitiesWindow();
      }
    },
    {
      label: 'Logları Göster',
      click: () => {
        createLogsWindow();
      }
    },
    { type: 'separator' },
    {
      label: 'Serveri Yeniden Başlat',
      click: () => {
        restartServer();
      }
    },
    {
      label: 'Uygulamayı Yeniden Başlat',
      click: () => {
        restartApp();
      }
    },
    { type: 'separator' },
    {
      label: 'Tüm Verileri Temizle',
      click: async () => {
        const result = await dialog.showMessageBox({
          type: 'warning',
          title: 'Tüm Verileri Temizle',
          message: 'Tüm verileri silmek istediğinizden emin misiniz?',
          detail: 'Bu işlem geri alınamaz! Tüm denemeleriniz, soru kayıtlarınız, görevleriniz ve arşivlenmiş verileriniz silinecektir.',
          buttons: ['İptal', 'Evet, Tümünü Sil'],
          defaultId: 0,
          cancelId: 0,
          noLink: true
        });
        
        if (result.response === 1) {
          try {
            await clearAllData();
            
            // Uygulamayı yeniden başlat
            restartApp();
          } catch (err) {
            dialog.showErrorBox('Hata', `Veriler temizlenirken hata oluştu: ${err.message}`);
          }
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Çıkış',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('QuantPraxus - YKS Analiz Sistemi');
}

async function createWindow() {
  // Ekran çözünürlüğünü al
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  
  console.log(`🖥️  Ekran çözünürlüğü: ${screenWidth}x${screenHeight}`);
  
  mainWindow = new BrowserWindow({
    width: screenWidth,
    height: screenHeight,
    frame: false, // Frame kapalı - custom title bar kullanılacak
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0a',
    show: false, // Başlangıçta gizli
    fullscreen: false, // Otomatik tam ekran kapalı
    icon: path.join(__dirname, 'icons', 'app-icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  // F11 ile fullscreen toggle
  mainWindow.on('enter-full-screen', () => {
    mainWindow.webContents.send('fullscreen-changed', true);
  });
  
  mainWindow.on('leave-full-screen', () => {
    mainWindow.webContents.send('fullscreen-changed', false);
  });

  // Önce loading sayfasını göster
  const loadingPath = path.join(__dirname, 'loading.html');
  await mainWindow.loadFile(loadingPath);
  
  // Tam ekran olarak başlat
  mainWindow.maximize();
  mainWindow.show();

  // TAM 5 SANİYE BEKLE (loading ekranı için)
  console.log('⏳ Loading ekranı gösteriliyor - 5 saniye bekleniyor...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Server'ın hazır olmasını bekle
  try {
    await checkServerReady();
    console.log('✅ Server hazır, ana sayfa yükleniyor...');
    // Server hazır, ana sayfayı yükle
    await mainWindow.loadURL(`http://localhost:${PORT}`);
  } catch (err) {
    console.error('Server başlatma hatası:', err);
    
    // Loading ekranında hata mesajını göster (JSON.stringify ile güvenli kaçırma)
    try {
      const safeMessage = JSON.stringify(err.message);
      await mainWindow.webContents.executeJavaScript(`
        if (typeof window.showError === 'function') {
          window.showError(${safeMessage});
        }
      `);
    } catch (execErr) {
      console.error('Loading ekranına hata gönderilemedi:', execErr);
    }
    
    // Ek olarak dialog da göster
    dialog.showErrorBox(
      'Server Hatası',
      `Server başlatılamadı: ${err.message}\n\nLütfen uygulamayı yeniden başlatın.`
    );
  }

  // Kapatma, tray vb. kısımlar aynı kalacak ↓
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();

      if (!app.trayNotificationShown) {
        tray.displayBalloon({
          title: 'QuantPraxus',
          content: 'Uygulama sistem tepsisinde çalışmaya devam ediyor. Tamamen kapatmak için sağ tık > Çıkış.',
          icon: path.join(__dirname, 'icons', 'app-icon.ico')
        });
        app.trayNotificationShown = true;
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // F11 tuşu ile tam ekran toggle
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      event.preventDefault();
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
  });
}


ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('window-go-back', () => {
  if (mainWindow && mainWindow.webContents.canGoBack()) {
    mainWindow.webContents.goBack();
  }
});

ipcMain.on('window-go-forward', () => {
  if (mainWindow && mainWindow.webContents.canGoForward()) {
    mainWindow.webContents.goForward();
  }
});

ipcMain.on('window-reload', () => {
  if (mainWindow) {
    mainWindow.webContents.reload();
  }
});

ipcMain.on('window-toggle-fullscreen', () => {
  if (mainWindow) {
    const willBeFullscreen = !mainWindow.isFullScreen();
    mainWindow.setFullScreen(willBeFullscreen);
    // Fullscreen durumunu renderer'a bildir
    mainWindow.webContents.send('fullscreen-changed', willBeFullscreen);
  }
});

app.whenReady().then(async () => {
  // Node environment kontrolü
  if (!validateNodeEnvironment()) {
    dialog.showErrorBox(
      'Başlatma Hatası',
      'Node.js environment başlatılamadı. Lütfen uygulamayı yeniden başlatın.'
    );
    app.quit();
    return;
  }
  
  try {
    await startServer();
    createTray();
    await createWindow();
  } catch (err) {
    dialog.showErrorBox(
      'Server Başlatma Hatası',
      `Server başlatılamadı: ${err.message}\n\nLütfen uygulamayı yeniden başlatın.`
    );
  }

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on('window-all-closed', (e) => {
  // Tray var olduğu sürece uygulamayı kapatma, ama çıkış işlemi sırasında izin ver
  if (!app.isQuiting) {
    e.preventDefault();
  }
});

app.on('before-quit', () => {
  app.isQuiting = true;
});

app.on('quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});


// QuantPraxus QuantPraxus
