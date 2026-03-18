# EXCLSV Agency CRM

## Critical Context (Read First)

This is an internal CRM platform for an OnlyFans management agency. It centralizes model management, content production, chatter planning, finance, and analytics. It complements Infloww (which handles chatting/vault/script execution) — we NEVER duplicate Infloww features.

- **Language**: TypeScript (strict mode)
- **Framework**: Next.js 14 (App Router)
- **UI**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: Auth.js (NextAuth v5) with role-based access
- **Realtime**: Socket.io (separate service)
- **Cache**: Redis
- **CSV parsing**: Papaparse
- **PDF generation**: @react-pdf/renderer
- **PWA**: next-pwa (for model mobile experience)
- **Hosting**: Railway + GitHub CI/CD

## Architecture

### App Router Structure
```
src/
├── app/
│   ├── (auth)/                    # Public: login, register
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/               # Protected: all authenticated routes
│   │   ├── layout.tsx             # Sidebar + topbar, role-based nav
│   │   ├── page.tsx               # Redirect based on role
│   │   ├── admin/                 # Owner + Admin views
│   │   │   ├── dashboard/         # Global analytics
│   │   │   ├── models/            # Model profiles CRUD
│   │   │   ├── customs/           # All customs overview
│   │   │   ├── scripts/           # Script Builder
│   │   │   ├── planning/          # Chatter planning
│   │   │   ├── finance/           # Invoices, payroll, CSV import
│   │   │   ├── content/           # Weekly content templates
│   │   │   ├── social/            # Social media calendar
│   │   │   ├── onboarding/        # Model onboarding pipeline
│   │   │   └── settings/          # Users, roles, audit logs
│   │   ├── chatter-manager/       # Chatter Manager views
│   │   │   ├── dashboard/
│   │   │   ├── customs/
│   │   │   └── planning/
│   │   ├── chatter/               # Chatter views
│   │   │   ├── dashboard/
│   │   │   ├── customs/
│   │   │   └── planning/
│   │   └── model/                 # Model views (PWA optimized)
│   │       ├── dashboard/
│   │       ├── customs/
│   │       ├── content/
│   │       └── invoices/
│   └── api/                       # API routes
│       ├── auth/[...nextauth]/
│       ├── customs/
│       ├── models/
│       ├── scripts/
│       ├── planning/
│       ├── finance/
│       ├── analytics/
│       └── upload/
├── components/
│   ├── ui/                        # shadcn/ui components
│   ├── layout/                    # Sidebar, Topbar, RoleGuard
│   ├── customs/                   # Custom content components
│   ├── scripts/                   # Script builder components
│   ├── planning/                  # Shift planning components
│   ├── finance/                   # Invoice, payroll components
│   ├── analytics/                 # Charts, KPI cards
│   └── shared/                    # StatusBadge, DataTable, etc.
├── lib/
│   ├── prisma.ts                  # Prisma client singleton
│   ├── auth.ts                    # Auth.js config
│   ├── redis.ts                   # Redis client
│   ├── socket.ts                  # Socket.io client
│   ├── csv-parser.ts              # Infloww CSV import logic
│   ├── pdf-generator.ts           # Invoice & payroll PDF
│   └── utils.ts                   # Shared utilities
├── hooks/                         # Custom React hooks
├── types/                         # TypeScript type definitions
└── middleware.ts                   # RBAC route protection
```

### Roles (5 distinct roles, NEVER mix access)
1. **OWNER** — Full access to everything. Can manage users and critical settings.
2. **ADMIN** — Same as Owner except user management and critical config.
3. **CHATTER_MANAGER** — Planning, customs, chatter performance. NO access to model profiles or finance.
4. **CHATTER** — Only sees assigned models. Creates customs, does clock-in/out, sees own planning.
5. **MODEL** — PWA mobile. Sees own customs, own weekly content, own stats, own invoices. NOTHING about other models.

### Middleware RBAC Pattern
```typescript
// middleware.ts protects routes by role
// /admin/* → OWNER, ADMIN only
// /chatter-manager/* → OWNER, ADMIN, CHATTER_MANAGER
// /chatter/* → OWNER, ADMIN, CHATTER_MANAGER, CHATTER
// /model/* → MODEL only (+ OWNER, ADMIN for impersonation)
```

### Data Isolation Rules
- A CHATTER only sees models they are assigned to (filter by `chatterAssignments`)
- A MODEL only sees their own data (filter by `session.user.modelId`)
- CHATTER_MANAGER sees all chatters but NOT model profiles or finance
- Enforce at API level, not just UI level

## Database Schema (Prisma)

Key models and relationships:

```prisma
enum Role {
  OWNER
  ADMIN
  CHATTER_MANAGER
  CHATTER
  MODEL
}

enum CustomStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
}

enum InvoiceStatus {
  DRAFT
  SENT
  PAID
  OVERDUE
}

enum ScriptStatus {
  DRAFT
  VALIDATED
}

enum ContentType {
  PHOTO
  VIDEO
  AUDIO
  COMBO
}

enum ShiftSlot {
  SHIFT_A  // 12h-20h
  SHIFT_B  // 20h-04h
  SHIFT_C  // 04h-08h
}

model User {
  id              String    @id @default(cuid())
  email           String    @unique
  name            String
  password        String    // hashed
  role            Role
  avatar          String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Role-specific relations
  modelProfile    ModelProfile?
  chatterProfile  ChatterProfile?
  
  // Audit
  auditLogs       AuditLog[]
}

model ModelProfile {
  id              String    @id @default(cuid())
  userId          String    @unique
  user            User      @relation(fields: [userId], references: [id])
  
  // Identity
  stageName       String
  dateOfBirth     DateTime?
  location        String?
  timezone        String?
  occupation      String?
  languages       String[]
  photoUrl        String?
  
  // Physical
  height          String?
  hairColor       String?
  eyeColor        String?
  tattoos         String?
  piercings       String?
  style           String?
  distinctFeatures String?
  
  // Personality & boundaries
  personalityTraits  String?
  acceptedContent    String[]    // categories
  boundaries         String?     // strict limits
  sexualizationLevel String?
  personalityNotes   String?
  
  // Social accounts
  onlyfansUrl     String?
  instagramUrl    String?
  instagramHandle String?
  tiktokUrl       String?
  tiktokHandle    String?
  twitterUrl      String?
  twitterHandle   String?
  redditUrl       String?
  redditHandle    String?
  threadsUrl      String?
  threadsHandle   String?
  otherSocials    Json?
  
  // Contract
  contractSignedAt  DateTime?
  contractFileUrl   String?
  agencyPercentage  Float       @default(50)
  billingFrequency  String      @default("bimonthly") // 1st and 15th
  
  // Relations
  customs           CustomContent[]
  weeklyTemplates   WeeklyContentTemplate[]
  weeklyTasks       WeeklyContentTask[]
  scripts           Script[]
  scriptContentTasks ScriptContentTask[]
  chatterAssignments ChatterAssignment[]
  invoices          ModelInvoice[]
  onboarding        OnboardingPipeline?
  inflowwData       InflowwDailyData[]
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model ChatterProfile {
  id              String    @id @default(cuid())
  userId          String    @unique
  user            User      @relation(fields: [userId], references: [id])
  
  hourlyRate      Float     @default(0)
  commissionRate  Float     @default(0)  // % on net revenue during shifts
  
  assignments     ChatterAssignment[]
  shifts          ShiftSchedule[]
  clockIns        ClockRecord[]
  customs         CustomContent[]    // customs created by this chatter
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model ChatterAssignment {
  id              String         @id @default(cuid())
  chatterId       String
  chatter         ChatterProfile @relation(fields: [chatterId], references: [id])
  modelId         String
  model           ModelProfile   @relation(fields: [modelId], references: [id])
  isActive        Boolean        @default(true)
  assignedAt      DateTime       @default(now())
  
  @@unique([chatterId, modelId])
}

model CustomContent {
  id              String        @id @default(cuid())
  modelId         String
  model           ModelProfile  @relation(fields: [modelId], references: [id])
  createdById     String
  createdBy       ChatterProfile @relation(fields: [createdById], references: [id])
  
  description     String        // detailed description, REQUIRED
  contentType     ContentType[]
  duration        String?       // if video/audio
  outfit          String?
  clientCategory  String        // whale / spender / regular / new
  totalPrice      Float
  amountCollected Float         @default(0)  // typically 50% upfront
  notes           String?
  status          CustomStatus  @default(NOT_STARTED)
  driveLink       String?       // where model uploads the content
  
  messages        CustomMessage[]
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

model CustomMessage {
  id              String        @id @default(cuid())
  customId        String
  custom          CustomContent @relation(fields: [customId], references: [id])
  senderId        String        // User id
  content         String
  createdAt       DateTime      @default(now())
}

model WeeklyContentTemplate {
  id              String        @id @default(cuid())
  modelId         String
  model           ModelProfile  @relation(fields: [modelId], references: [id])
  
  category        String        // "Lingerie Pictures", "Feed Content", "Reels", etc.
  platform        String        // "OnlyFans", "Instagram", "TikTok"
  quantity        Int           // number per week
  driveLink       String?       // default Drive folder
  sortOrder       Int           @default(0)
  isActive        Boolean       @default(true)
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  @@unique([modelId, category, platform])
}

model WeeklyContentTask {
  id              String        @id @default(cuid())
  modelId         String
  model           ModelProfile  @relation(fields: [modelId], references: [id])
  templateId      String?
  
  weekStart       DateTime      // Monday of the week
  category        String
  platform        String
  targetQuantity  Int
  completedQuantity Int         @default(0)
  status          CustomStatus  @default(NOT_STARTED)
  driveLink       String?
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

model Script {
  id              String        @id @default(cuid())
  modelId         String
  model           ModelProfile  @relation(fields: [modelId], references: [id])
  
  name            String        // "Scène douche — Spender"
  scene           String        // douche, cuisine, chambre...
  targetAudience  String        // spender, regular, new, whale
  expectedRevenue String?       // "$200-400"
  status          ScriptStatus  @default(DRAFT)
  tags            String[]
  
  steps           ScriptStep[]
  contentTasks    ScriptContentTask[]
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

model ScriptStep {
  id              String        @id @default(cuid())
  scriptId        String
  script          Script        @relation(fields: [scriptId], references: [id], onDelete: Cascade)
  
  sortOrder       Int
  type            String        // "message", "free_content", "paid_content", "vocal", "wait", "internal_note"
  content         String        // the message text or content description
  price           Float?        // for paid_content
  waitDuration    String?       // for wait type: "5min", "10min"
  
  createdAt       DateTime      @default(now())
}

model ScriptContentTask {
  id              String        @id @default(cuid())
  scriptId        String
  script          Script        @relation(fields: [scriptId], references: [id])
  modelId         String
  model           ModelProfile  @relation(fields: [modelId], references: [id])
  
  description     String
  contentType     ContentType
  duration        String?
  status          CustomStatus  @default(NOT_STARTED)
  driveLink       String?
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

model ShiftSchedule {
  id              String         @id @default(cuid())
  chatterId       String
  chatter         ChatterProfile @relation(fields: [chatterId], references: [id])
  
  date            DateTime
  slot            ShiftSlot
  modelId         String         // which model this shift covers
  
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  
  @@unique([chatterId, date, slot])
}

model ClockRecord {
  id              String         @id @default(cuid())
  chatterId       String
  chatter         ChatterProfile @relation(fields: [chatterId], references: [id])
  
  shiftDate       DateTime
  shiftSlot       ShiftSlot
  clockIn         DateTime
  clockOut        DateTime?
  hoursWorked     Float?         // calculated on clock out
  
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
}

model InflowwDailyData {
  id              String        @id @default(cuid())
  modelId         String
  model           ModelProfile  @relation(fields: [modelId], references: [id])
  
  date            DateTime
  subsGross       Float         @default(0)
  tipsGross       Float         @default(0)
  messagesGross   Float         @default(0)
  postsGross      Float         @default(0)
  streamsGross    Float         @default(0)
  referralsGross  Float         @default(0)
  totalEarningsGross Float      @default(0)
  contributionPct Float?
  ofRanking       Int?
  following       Int?
  fansWithRenew   Int?
  renewOnPct      Float?
  newFans         Int?
  activeFans      Int?
  expiredFanChange Int?
  postsGrossCount Float?
  messagesGrossCount Float?
  streamsGrossCount Float?
  refundGross     Float?
  creatorGross    Float?
  creatorGroupGross Float?
  avgSpendPerSpender Float?
  avgSpendPerTransaction Float?
  avgEarningsPerFan Float?
  avgSubscriptionLength String?
  
  createdAt       DateTime      @default(now())
  
  @@unique([modelId, date])
}

model ModelInvoice {
  id              String        @id @default(cuid())
  modelId         String
  model           ModelProfile  @relation(fields: [modelId], references: [id])
  
  periodStart     DateTime
  periodEnd       DateTime
  grossRevenue    Float
  ofFees          Float         // 20%
  netRevenue      Float
  agencyShare     Float         // 50% of net
  amountDue       Float
  status          InvoiceStatus @default(DRAFT)
  pdfUrl          String?
  
  // Breakdown by category
  subsRevenue     Float         @default(0)
  tipsRevenue     Float         @default(0)
  messagesRevenue Float         @default(0)
  postsRevenue    Float         @default(0)
  streamsRevenue  Float         @default(0)
  referralsRevenue Float        @default(0)
  
  // Beneficiaries split
  beneficiaries   Json?         // [{name, amount}]
  
  sentAt          DateTime?
  paidAt          DateTime?
  overdueAt       DateTime?     // auto set 3 days after sent
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

model OnboardingPipeline {
  id              String        @id @default(cuid())
  modelId         String        @unique
  model           ModelProfile  @relation(fields: [modelId], references: [id])
  
  steps           Json          // [{name, status, completedAt, assignee}]
  currentStep     Int           @default(0)
  isCompleted     Boolean       @default(false)
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

model SocialPost {
  id              String        @id @default(cuid())
  modelId         String
  platform        String        // instagram, tiktok, twitter, reddit, threads
  scheduledAt     DateTime
  description     String?
  status          String        @default("planned") // planned, posted, late
  assignedToId    String?       // admin user id
  postedAt        DateTime?
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

model AuditLog {
  id              String        @id @default(cuid())
  userId          String
  user            User          @relation(fields: [userId], references: [id])
  action          String        // "CREATE_CUSTOM", "UPDATE_STATUS", etc.
  entity          String        // "CustomContent", "ModelInvoice", etc.
  entityId        String?
  details         Json?
  createdAt       DateTime      @default(now())
}

model Notification {
  id              String        @id @default(cuid())
  userId          String        // recipient
  type            String        // "NEW_CUSTOM", "INVOICE_READY", etc.
  title           String
  message         String
  isRead          Boolean       @default(false)
  link            String?       // URL to navigate to
  createdAt       DateTime      @default(now())
}
```

## Commands

```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # TypeScript check
npx prisma migrate dev    # Run migrations
npx prisma generate       # Regenerate Prisma client
npx prisma studio         # Visual database browser
```

## Conventions & Rules

### Code Style
- All components are functional with hooks
- Use `"use client"` only when necessary (prefer Server Components)
- API routes return `{ success: boolean, data?: any, error?: string }`
- Use Zod for all input validation (API + forms)
- Use React Hook Form + Zod for forms
- Date handling with date-fns (UTC everywhere, display in user timezone)
- All money amounts stored as Float in dollars

### UI Conventions
- Use shadcn/ui components as base (Button, Card, Badge, Dialog, DataTable, etc.)
- Status badges: NOT_STARTED = red, IN_PROGRESS = orange/amber, COMPLETED = green
- Responsive design: desktop-first for admin/chatter, mobile-first for model PWA
- Dark mode support via next-themes
- Toast notifications with sonner
- Loading states with skeleton components
- French language for all UI text (labels, buttons, messages)

### Security
- ALWAYS check role in API routes, not just middleware
- ALWAYS filter data by user's scope (chatter sees only assigned models)
- NEVER expose model data to other models
- NEVER store OF passwords
- Log every write action to AuditLog

### File Naming
- Components: PascalCase (CustomCard.tsx)
- Utilities/hooks: camelCase (useCustoms.ts)
- API routes: kebab-case folders (api/customs/route.ts)
- Types: PascalCase with .types.ts extension

### What NOT to Do
- DON'T modify /generated folder (Prisma auto-generated)
- DON'T commit .env files
- DON'T duplicate Infloww features (no fan chat, no vault, no fan profiles)
- DON'T use `any` type — always proper typing
- DON'T put business logic in components — use lib/ or server actions
- DON'T skip audit logging on mutations

## Development Phases

### Phase 1 — Foundations (current)
- [x] Project setup (Next.js, Prisma, PostgreSQL)
- [ ] Auth system with 5 roles
- [ ] RBAC middleware
- [ ] Model profiles CRUD
- [ ] Base layouts per role

### Phase 2 — Content Production
- [ ] Custom Content (create, status, mini-chat, notifications)
- [ ] Weekly Content Templates + auto-generation
- [ ] Script Builder (create, draft/validated, content task generation)
- [ ] Model PWA (content dashboard, push notifications)
- [ ] Socket.io for realtime notifications

### Phase 3 — Planning & Finance
- [ ] Shift planning (3x8 rotation, assignment per model)
- [ ] Clock-in/out system
- [ ] CSV import (Infloww data)
- [ ] Model invoices (PDF generation)
- [ ] Chatter payroll
- [ ] Finance overview

### Phase 4 — Analytics & Polish
- [ ] Global + per-model analytics dashboard
- [ ] Internal KPIs (profitability, productivity)
- [ ] Onboarding pipeline
- [ ] Social media calendar with reminders
- [ ] Audit logs viewer
- [ ] Performance optimization
