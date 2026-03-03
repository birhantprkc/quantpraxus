## 3️⃣ DEVELOPMENT.md
# Geliştirici Kılavuzu

Bu doküman, projeye katkıda bulunmak isteyen geliştiriciler için teknik detayları içerir.

## 📋 İçindekiler

- [Geliştirme Ortamı Kurulumu](#geliştirme-ortamı-kurulumu)
- [Proje Mimarisi](#proje-mimarisi)
- [Code Style ve Best Practices](#code-style-ve-best-practices)
- [Testing Stratejisi](#testing-stratejisi)
- [Build ve Deploy](#build-ve-deploy)
- [Troubleshooting](#troubleshooting)

## 🛠️ Geliştirme Ortamı Kurulumu

### Gereksinimler

```bash
Node.js >= 20.19.0
PostgreSQL >= 14.0
Git
VS Code (önerilen)
```

### Önerilen VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-playwright.playwright",
    "vitest.explorer"
  ]
}
```

### İlk Kurulum

1. **Repository'yi klonlayın:**
```bash
git clone https://github.com/beratcode03/quantpraxus.git
cd quantpraxus
```

2. **Dependencies:**
```bash
npm install
# veya
yarn install
```

3. **Environment Setup:**

`.env` dosyası oluşturun:
```env
# Database
DATABASE_URL=postgresql://localhost:5432/yks_db

# Server
NODE_ENV=development
PORT=3000

# Email (opsiyonel, test için)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

4. **💡 Not: Bu projenin veri mimarisi aslında PostgreSQL için tasarlandı (zaten bağımlılıklarda Drizzle ORM ve Neon DB'yi görebilirsiniz). Ancak şu an öğrenme sürecinde olduğum için, geliştirme aşamasında verileri daha hızlı yönetebilmek adına JSON tabanlı ilerlemeyi tercih ettim. Eğer bu konularda tecrübeliyseniz, projenin PostgreSQL tarafına ne kadar kolay adapte edilebileceğini zaten fark edeceksinizdir. Kendimi bu alanda geliştirmeye devam ediyorum,bana bu konuda tavsiye vermekten çekinmeyin.**

**Database Setup:**
```bash
# PostgreSQL'i başlatın
sudo service postgresql start

# Database oluşturun
createdb yks_db

# Schema'yı push edin
npm run db:push
```

5. **Development Server:**
```bash
# Terminal 1: Backend + Frontend (web)
npm run dev

# Terminal 2: Electron (desktop)
npm run electron:dev
```

## 🏗️ Proje Mimarisi

### Folder Structure

```
├── client/              # Electron + React frontend
│   ├── src/
│   │   ├── sayfalar/   # Pages (anasayfa, panel, net-hesaplayıcı)
│   │   ├── bilesenler/ # Reusable UI components
│   │   │   ├── arayuz/ # Base UI components (button, dialog, card...)
│   │   │   └── *.tsx   # Feature-specific components
│   │   ├── kutuphane/  # Utilities (API client, helpers)
│   │   ├── hooks/      # Custom React hooks
│   │   ├── stiller/    # Global styles
│   │   └── types/      # TypeScript types
│   └── public/         # Static assets
│
├── server/             # Express backend
│   ├── index.ts       # Server entry + middleware setup
│   ├── rotalar.ts     # API routes (all endpoints)
│   ├── depolama.ts    # Database storage layer (abstraction)
│   ├── db.ts          # DB connection + Drizzle setup
│   └── vite.ts        # Vite middleware for dev
│
├── electron/           # Electron main process
│   ├── main.cjs       # Main process
│   ├── preload.cjs    # Preload script (context bridge)
│   └── activity-logger.cjs
│
├── shared/             # Shared code (frontend + backend)
│   ├── sema.ts        # Zod schemas + TypeScript types
│   └── utils/         # Shared utilities

```

### Data Flow

```
User Action (UI)
    ↓
React Component
    ↓
TanStack Query (useQuery/useMutation)
    ↓
API Request (kutuphane/sorguIstemcisi.ts)
    ↓
Express Route (server/rotalar.ts)
    ↓
Storage Layer (server/depolama.ts)
    ↓
Drizzle ORM
    ↓
JSON Database
```

### Key Design Patterns

**1. Repository Pattern (Storage Layer)**
```typescript
// server/depolama.ts
export const storage = {
  getTasks: async () => {...},
  createTask: async (data) => {...},
  updateTask: async (id, data) => {...},
}
```
Database işlemleri storage layer'da soyutlanmış. Bu sayede DB değişikliği kolay.

**2. Schema-First Design (Zod)**
```typescript
// shared/sema.ts
export const insertTaskSchema = z.object({
  title: z.string().min(1),
  dueDate: z.string().optional(),
  // ...
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = InsertTask & { id: string; createdAt: Date };
```

Tek bir schema hem runtime validation hem type generation için kullanılır.

**3. API Client Abstraction**
```typescript
// client/src/kutuphane/sorguIstemcisi.ts
export async function apiRequest<T>(
  endpoint: string, 
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`/api${endpoint}`, options);
  if (!response.ok) throw new Error('API Error');
  return response.json();
}
```

Tüm API çağrıları bu fonksiyon üzerinden yapılır. Error handling merkezi.

## 📝 Code Style ve Best Practices

### TypeScript

✅ **DOs:**
```typescript
// ✅ Always use explicit types for function returns
async function getTasks(): Promise<Task[]> {
  return storage.getTasks();
}

