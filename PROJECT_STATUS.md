# EXCLSV SOFTWARE — Etat du projet

**Date de generation :** 20 mars 2026
**Projet :** CRM interne pour agence de management OnlyFans
**Stack :** Next.js 14 (App Router) / TypeScript / Prisma / PostgreSQL / Tailwind CSS + shadcn/ui
**Auth :** NextAuth v5 avec RBAC (5 roles)
**Hosting :** Railway + GitHub CI/CD

---

## Table des matieres

1. [Arborescence](#1-arborescence)
2. [Schema Prisma](#2-schema-prisma)
3. [Routes API](#3-routes-api)
4. [Pages](#4-pages)
5. [Composants](#5-composants)
6. [Etat des features](#6-etat-des-features)
7. [Bugs connus](#7-bugs-connus)
8. [Derniers commits](#8-derniers-commits)

---

## 1. Arborescence

```
src/
├── app/
│   ├── (auth)/
│   │   ├── forgot-password/page.tsx
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (dashboard)/
│   │   ├── admin/
│   │   │   ├── customs/
│   │   │   │   ├── [id]/page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── models/
│   │   │   │   ├── [id]/page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── page.tsx
│   │   │   └── notifications/page.tsx
│   │   ├── chatter-manager/
│   │   │   ├── customs/
│   │   │   │   ├── [id]/page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   └── notifications/page.tsx
│   │   ├── chatter/
│   │   │   ├── customs/
│   │   │   │   ├── [id]/page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   └── notifications/page.tsx
│   │   ├── layout.tsx
│   │   ├── model/
│   │   │   ├── customs/
│   │   │   │   ├── [id]/page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   └── notifications/page.tsx
│   │   └── (root) page n'existe pas — redirect via middleware
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/route.ts
│   │   │   ├── forgot-password/route.ts
│   │   │   └── reset-password/route.ts
│   │   ├── chatters/route.ts
│   │   ├── customs/
│   │   │   ├── [id]/
│   │   │   │   ├── messages/route.ts
│   │   │   │   └── route.ts
│   │   │   ├── route.ts
│   │   │   └── stats/route.ts
│   │   ├── models/
│   │   │   ├── [id]/route.ts
│   │   │   ├── onboarding/route.ts
│   │   │   └── route.ts
│   │   └── notifications/
│   │       ├── [id]/
│   │       │   ├── dismiss/route.ts
│   │       │   └── read/route.ts
│   │       ├── [id]/route.ts
│   │       ├── delete-all/route.ts
│   │       ├── read-all/route.ts
│   │       └── route.ts
│   ├── model/
│   │   └── onboarding/page.tsx
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── auth/
│   │   ├── particle-background.tsx
│   │   └── reset-password-form.tsx
│   ├── customs/
│   │   ├── client-category-badge.tsx
│   │   ├── content-type-display.tsx
│   │   ├── custom-card.tsx
│   │   ├── custom-detail.tsx
│   │   ├── custom-filters.tsx
│   │   ├── custom-form.tsx
│   │   ├── custom-mini-chat.tsx
│   │   └── status-badge.tsx
│   ├── layout/
│   │   ├── mobile-sidebar.tsx
│   │   ├── notification-bell.tsx
│   │   ├── sidebar-nav.tsx
│   │   └── user-menu.tsx
│   ├── models/
│   │   └── model-form.tsx
│   ├── notifications/
│   │   └── notification-center.tsx
│   ├── providers.tsx
│   └── ui/  (shadcn/ui)
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── checkbox.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── popover.tsx
│       ├── progress.tsx
│       ├── select.tsx
│       ├── separator.tsx
│       ├── sheet.tsx
│       ├── table.tsx
│       ├── tabs.tsx
│       ├── textarea.tsx
│       ├── toast.tsx
│       └── toaster.tsx
├── hooks/
│   └── use-toast.ts
├── lib/
│   ├── api-utils.ts
│   ├── auth.config.ts
│   ├── auth.ts
│   ├── prisma.ts
│   ├── resend.ts
│   ├── utils.ts
│   └── validations/
│       ├── custom.ts
│       └── model.ts
├── middleware.ts
└── types/
    ├── custom.types.ts
    └── next-auth.d.ts
```

---

## 2. Schema Prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

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
  SHIFT_A // 12h-20h
  SHIFT_B // 20h-04h
  SHIFT_C // 04h-08h
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String
  role      Role
  avatar    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  modelProfile   ModelProfile?
  chatterProfile ChatterProfile?
  auditLogs      AuditLog[]
}

model ModelProfile {
  id     String @id @default(cuid())
  userId String @unique
  user   User   @relation(fields: [userId], references: [id])

  // Identity
  stageName        String
  dateOfBirth      DateTime?
  location         String?
  timezone         String?
  occupation       String?
  languages        String[]
  photoUrl         String?

  // Physical
  height           String?
  hairColor        String?
  eyeColor         String?
  tattoos          String?
  piercings        String?
  style            String?
  distinctFeatures String?

  // Personality & boundaries
  personalityTraits  String?
  acceptedContent    String[]
  boundaries         String?
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

  // Onboarding
  onboardingCompleted Boolean @default(false)

  // Contract
  contractSignedAt DateTime?
  contractFileUrl  String?
  agencyPercentage Float    @default(50)
  billingFrequency String   @default("bimonthly")

  // Relations
  customs            CustomContent[]
  weeklyTemplates    WeeklyContentTemplate[]
  weeklyTasks        WeeklyContentTask[]
  scripts            Script[]
  scriptContentTasks ScriptContentTask[]
  chatterAssignments ChatterAssignment[]
  invoices           ModelInvoice[]
  onboarding         OnboardingPipeline?
  inflowwData        InflowwDailyData[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model ChatterProfile {
  id     String @id @default(cuid())
  userId String @unique
  user   User   @relation(fields: [userId], references: [id])

  hourlyRate     Float   @default(0)
  commissionRate Float   @default(0)
  driveLink      String?

  assignments ChatterAssignment[]
  shifts      ShiftSchedule[]
  clockIns    ClockRecord[]
  customs     CustomContent[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model ChatterAssignment {
  id         String         @id @default(cuid())
  chatterId  String
  chatter    ChatterProfile @relation(fields: [chatterId], references: [id])
  modelId    String
  model      ModelProfile   @relation(fields: [modelId], references: [id])
  isActive   Boolean        @default(true)
  assignedAt DateTime       @default(now())

  @@unique([chatterId, modelId])
}

model CustomContent {
  id          String         @id @default(cuid())
  modelId     String
  model       ModelProfile   @relation(fields: [modelId], references: [id])
  createdById String
  createdBy   ChatterProfile @relation(fields: [createdById], references: [id])

  description     String
  contentType     ContentType[]
  duration        String?
  outfit          String?
  clientCategory  String
  clientHandle    String?
  totalPrice      Float
  amountCollected Float        @default(0)
  notes           String?
  status          CustomStatus @default(NOT_STARTED)
  driveLink       String?

  messages CustomMessage[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model CustomMessage {
  id        String        @id @default(cuid())
  customId  String
  custom    CustomContent @relation(fields: [customId], references: [id])
  senderId  String
  content   String
  createdAt DateTime      @default(now())
}

model WeeklyContentTemplate {
  id       String       @id @default(cuid())
  modelId  String
  model    ModelProfile @relation(fields: [modelId], references: [id])

  category  String
  platform  String
  quantity  Int
  driveLink String?
  sortOrder Int     @default(0)
  isActive  Boolean @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([modelId, category, platform])
}

model WeeklyContentTask {
  id         String       @id @default(cuid())
  modelId    String
  model      ModelProfile @relation(fields: [modelId], references: [id])
  templateId String?

  weekStart         DateTime
  category          String
  platform          String
  targetQuantity    Int
  completedQuantity Int          @default(0)
  status            CustomStatus @default(NOT_STARTED)
  driveLink         String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Script {
  id      String       @id @default(cuid())
  modelId String
  model   ModelProfile @relation(fields: [modelId], references: [id])

  name            String
  scene           String
  targetAudience  String
  expectedRevenue String?
  status          ScriptStatus @default(DRAFT)
  tags            String[]

  steps        ScriptStep[]
  contentTasks ScriptContentTask[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model ScriptStep {
  id       String @id @default(cuid())
  scriptId String
  script   Script @relation(fields: [scriptId], references: [id], onDelete: Cascade)

  sortOrder    Int
  type         String
  content      String
  price        Float?
  waitDuration String?

  createdAt DateTime @default(now())
}

model ScriptContentTask {
  id       String       @id @default(cuid())
  scriptId String
  script   Script       @relation(fields: [scriptId], references: [id])
  modelId  String
  model    ModelProfile @relation(fields: [modelId], references: [id])

  description String
  contentType ContentType
  duration    String?
  status      CustomStatus @default(NOT_STARTED)
  driveLink   String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model ShiftSchedule {
  id        String         @id @default(cuid())
  chatterId String
  chatter   ChatterProfile @relation(fields: [chatterId], references: [id])

  date    DateTime
  slot    ShiftSlot
  modelId String

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([chatterId, date, slot])
}

model ClockRecord {
  id        String         @id @default(cuid())
  chatterId String
  chatter   ChatterProfile @relation(fields: [chatterId], references: [id])

  shiftDate   DateTime
  shiftSlot   ShiftSlot
  clockIn     DateTime
  clockOut    DateTime?
  hoursWorked Float?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model InflowwDailyData {
  id      String       @id @default(cuid())
  modelId String
  model   ModelProfile @relation(fields: [modelId], references: [id])

  date                   DateTime
  subsGross              Float    @default(0)
  tipsGross              Float    @default(0)
  messagesGross          Float    @default(0)
  postsGross             Float    @default(0)
  streamsGross           Float    @default(0)
  referralsGross         Float    @default(0)
  totalEarningsGross     Float    @default(0)
  contributionPct        Float?
  ofRanking              Int?
  following              Int?
  fansWithRenew          Int?
  renewOnPct             Float?
  newFans                Int?
  activeFans             Int?
  expiredFanChange       Int?
  postsGrossCount        Float?
  messagesGrossCount     Float?
  streamsGrossCount      Float?
  refundGross            Float?
  creatorGross           Float?
  creatorGroupGross      Float?
  avgSpendPerSpender     Float?
  avgSpendPerTransaction Float?
  avgEarningsPerFan      Float?
  avgSubscriptionLength  String?

  createdAt DateTime @default(now())

  @@unique([modelId, date])
}

model ModelInvoice {
  id      String       @id @default(cuid())
  modelId String
  model   ModelProfile @relation(fields: [modelId], references: [id])

  periodStart  DateTime
  periodEnd    DateTime
  grossRevenue Float
  ofFees       Float
  netRevenue   Float
  agencyShare  Float
  amountDue    Float
  status       InvoiceStatus @default(DRAFT)
  pdfUrl       String?

  subsRevenue      Float @default(0)
  tipsRevenue      Float @default(0)
  messagesRevenue  Float @default(0)
  postsRevenue     Float @default(0)
  streamsRevenue   Float @default(0)
  referralsRevenue Float @default(0)

  beneficiaries Json?

  sentAt    DateTime?
  paidAt    DateTime?
  overdueAt DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model OnboardingPipeline {
  id      String       @id @default(cuid())
  modelId String       @unique
  model   ModelProfile @relation(fields: [modelId], references: [id])

  steps       Json
  currentStep Int     @default(0)
  isCompleted Boolean @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model SocialPost {
  id           String    @id @default(cuid())
  modelId      String
  platform     String
  scheduledAt  DateTime
  description  String?
  status       String    @default("planned")
  assignedToId String?
  postedAt     DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  action    String
  entity    String
  entityId  String?
  details   Json?
  createdAt DateTime @default(now())
}

model PasswordResetToken {
  id        String   @id @default(cuid())
  email     String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model Notification {
  id                   String   @id @default(cuid())
  userId               String
  type                 String
  title                String
  message              String
  isRead               Boolean  @default(false)
  dismissedFromPopover Boolean  @default(false)
  link                 String?
  createdAt            DateTime @default(now())
}
```

**Resume des modeles Prisma :**

| Modele | Description |
|---|---|
| `User` | Utilisateur avec role (OWNER, ADMIN, CHATTER_MANAGER, CHATTER, MODEL) |
| `ModelProfile` | Profil complet d'une modele (identite, physique, personnalite, reseaux, contrat) |
| `ChatterProfile` | Profil chatter (taux horaire, commission, lien Drive) |
| `ChatterAssignment` | Assignation chatter ↔ modele |
| `CustomContent` | Commande de contenu personnalise (custom) |
| `CustomMessage` | Messages dans le mini-chat d'un custom |
| `WeeklyContentTemplate` | Template de contenu hebdomadaire par modele/plateforme |
| `WeeklyContentTask` | Tache de contenu generee a partir d'un template |
| `Script` | Script de vente par scene/audience |
| `ScriptStep` | Etape d'un script (message, contenu, attente...) |
| `ScriptContentTask` | Tache de contenu liee a un script |
| `ShiftSchedule` | Planning des shifts chatters (3x8) |
| `ClockRecord` | Pointage chatter (clock-in/out) |
| `InflowwDailyData` | Donnees quotidiennes importees depuis Infloww (revenus, fans, etc.) |
| `ModelInvoice` | Facture modele avec decomposition par source de revenu |
| `OnboardingPipeline` | Pipeline d'onboarding modele |
| `SocialPost` | Publication planifiee sur reseaux sociaux |
| `AuditLog` | Journal d'audit de toutes les mutations |
| `PasswordResetToken` | Token de reinitialisation de mot de passe |
| `Notification` | Notifications utilisateur avec distinction lu/dismiss |

---

## 3. Routes API

### Authentification

| Route | Methode(s) | Description |
|---|---|---|
| `/api/auth/[...nextauth]` | GET, POST | Point d'entree NextAuth (login, session, signout, csrf) |
| `/api/auth/forgot-password` | POST | Envoie un email de reinitialisation de mot de passe via Resend. Genere un token unique valide 1h. Ne revele pas si le compte existe (securite). |
| `/api/auth/reset-password` | POST | Verifie le token de reinitialisation, valide le nouveau mot de passe (min. 6 caracteres), met a jour le hash bcrypt et supprime le token. |

### Modeles

| Route | Methode(s) | Description |
|---|---|---|
| `/api/models` | GET | Liste paginee des modeles avec recherche par nom/localisation. Acces OWNER/ADMIN uniquement. |
| `/api/models` | POST | Creation d'un modele : cree un User (role MODEL) + un ModelProfile complet. Validation Zod. Hash bcrypt du mot de passe. Audit log. |
| `/api/models/[id]` | GET | Detail complet d'un profil modele avec chatters assignes et compteurs (customs, factures, scripts). |
| `/api/models/[id]` | PATCH | Modification partielle de tous les champs du profil modele (identite, physique, personnalite, reseaux, contrat). Audit log. |
| `/api/models/[id]` | DELETE | Suppression en cascade : assignments → profil → user. Audit log. |
| `/api/models/onboarding` | GET | Recupere le profil modele de l'utilisateur connecte pour le formulaire d'onboarding. |
| `/api/models/onboarding` | PATCH | Sauvegarde etape par etape de l'onboarding modele (identity, physical, personality, socials, complete). Met onboardingCompleted=true a la fin. |

### Chatters

| Route | Methode(s) | Description |
|---|---|---|
| `/api/chatters` | GET | Liste de tous les profils chatters avec infos utilisateur. Acces OWNER/ADMIN. Utilise pour le select dans le formulaire de creation de custom. |

### Customs (contenus personnalises)

| Route | Methode(s) | Description |
|---|---|---|
| `/api/customs` | GET | Liste des customs avec filtres (statut, modele, type de contenu, categorie client, recherche). Isolation des donnees par role : CHATTER ne voit que ses modeles assignes, MODEL ne voit que ses propres customs. Pagination. |
| `/api/customs` | POST | Creation d'un custom content. Validation Zod. Si CHATTER : auto-attribution du createdById + verification de l'assignation au modele + auto-fill du driveLink. Audit log. |
| `/api/customs/[id]` | GET | Detail d'un custom avec messages enrichis (nom + role de chaque expediteur). Verification d'acces par role. |
| `/api/customs/[id]` | PATCH | Modification d'un custom. MODEL ne peut changer que le statut. CHATTER doit etre assigne au modele. Validation Zod partielle. Audit log. |
| `/api/customs/[id]` | DELETE | Suppression d'un custom et de ses messages. OWNER/ADMIN uniquement. Audit log. |
| `/api/customs/[id]/messages` | POST | Ajout d'un message dans le mini-chat d'un custom. Verification d'acces. Audit log. |
| `/api/customs/stats` | GET | KPIs admin : customs cette semaine, revenus du mois, temps moyen de production, taux de completion, montant restant a collecter. OWNER/ADMIN uniquement. |

### Notifications

| Route | Methode(s) | Description |
|---|---|---|
| `/api/notifications` | GET | Liste des notifications de l'utilisateur connecte. 3 modes : `source=popover` (5 dernieres non lues/non dismissees), `source=center` (30 derniers jours pagine), defaut (legacy pagine). Compteur d'unread inclus. |
| `/api/notifications/[id]` | DELETE | Suppression d'une notification. Verification de propriete. |
| `/api/notifications/[id]/read` | PATCH | Marquer une notification comme lue. |
| `/api/notifications/[id]/dismiss` | PATCH | Masquer une notification du volet deroulant (popover) sans la supprimer. |
| `/api/notifications/read-all` | PATCH | Marquer toutes les notifications de l'utilisateur comme lues. |
| `/api/notifications/delete-all` | DELETE | Supprimer toutes les notifications de l'utilisateur. |

---

## 4. Pages

### Pages publiques (auth)

| URL | Description |
|---|---|
| `/` | Page racine — redirection automatique via middleware vers `/login` ou le dashboard du role |
| `/login` | Page de connexion avec branding EXCLSV (fond particules, theme dark/magenta). Formulaire email/mot de passe. |
| `/forgot-password` | Formulaire de demande de reinitialisation de mot de passe. Envoie un email via Resend. |
| `/reset-password` | Formulaire de saisie du nouveau mot de passe (avec token en query param). |

### Pages admin (OWNER, ADMIN)

| URL | Description |
|---|---|
| `/admin/dashboard` | Tableau de bord admin. Affiche 4 cards KPI statiques (modeles actifs, customs en cours, revenus, chatters en ligne). **Les donnees sont en dur a 0 — non connecte a l'API.** |
| `/admin/models` | Liste des modeles en tableau avec photo, nom de scene, localisation, langues, nombre de chatters, date d'ajout. Recherche en temps reel. Bouton d'ajout. |
| `/admin/models/new` | Formulaire complet de creation d'un modele (identite, physique, personnalite, reseaux sociaux, contrat). |
| `/admin/models/[id]` | Fiche detaillee d'un modele avec onglets (identite, physique, personnalite, reseaux, contrat, chatters). Compteurs customs/scripts/factures. Dialog d'edition. Suppression. |
| `/admin/customs` | Vue d'ensemble des customs avec 5 KPI dynamiques, filtres avances (recherche, statut, modele, type de contenu, categorie client), tri et groupement par chatter ou modele. Creation via dialog. |
| `/admin/customs/[id]` | Detail d'un custom avec changement de statut, edition du lien Drive, mini-chat, edition via dialog, suppression. Permissions completes. |
| `/admin/notifications` | Centre de notifications complet (historique 30 jours, filtres, lecture/suppression en masse). |

### Pages chatter-manager (CHATTER_MANAGER)

| URL | Description |
|---|---|
| `/chatter-manager/dashboard` | Tableau de bord manager. **Placeholder — affiche uniquement un message de bienvenue.** |
| `/chatter-manager/customs` | Liste des customs en lecture seule avec filtres. Pas de creation. |
| `/chatter-manager/customs/[id]` | Detail d'un custom en lecture seule avec mini-chat (peut envoyer des messages). |
| `/chatter-manager/notifications` | Centre de notifications. |

### Pages chatter (CHATTER)

| URL | Description |
|---|---|
| `/chatter/dashboard` | Tableau de bord chatter. **Placeholder — affiche uniquement un message de bienvenue.** |
| `/chatter/customs` | Liste des customs (filtres par modeles assignes). Creation de custom via dialog (chatter auto-attribue). |
| `/chatter/customs/[id]` | Detail d'un custom avec changement de statut, edition du lien Drive, mini-chat, edition via dialog. |
| `/chatter/notifications` | Centre de notifications. |

### Pages modele (MODEL)

| URL | Description |
|---|---|
| `/model/dashboard` | Espace modele. **Placeholder — affiche uniquement un message de bienvenue.** |
| `/model/customs` | Liste des customs de la modele avec stats hebdomadaires (non commence/en cours/termine), filtres par statut et tri. |
| `/model/customs/[id]` | Detail d'un custom en lecture. La modele peut uniquement changer le statut et envoyer des messages. |
| `/model/notifications` | Centre de notifications. |
| `/model/onboarding` | Wizard d'onboarding en 5 etapes : Identite, Physique, Personnalite, Reseaux sociaux, Confirmation. Sauvegarde etape par etape. Barre de progression. Resume final avant validation. |

---

## 5. Composants

### `components/auth/`

| Fichier | Description |
|---|---|
| `particle-background.tsx` | Arriere-plan anime avec particules pour les pages d'authentification. Effet visuel premium dark/magenta. |
| `reset-password-form.tsx` | Formulaire de reinitialisation de mot de passe (client component) avec gestion du token via `useSearchParams`. |

### `components/customs/`

| Fichier | Description |
|---|---|
| `client-category-badge.tsx` | Badge colore selon la categorie client (whale, spender, regular, new). |
| `content-type-display.tsx` | Affichage visuel des types de contenu (PHOTO, VIDEO, AUDIO, COMBO). |
| `custom-card.tsx` | Carte resumee d'un custom pour les listes : modele, prix, statut, categorie client, nombre de messages, date. Optionnellement masque le nom du modele. |
| `custom-detail.tsx` | Vue detaillee d'un custom : informations completes, changement de statut, edition du lien Drive, mini-chat integre. Permissions configurables via props. |
| `custom-filters.tsx` | Barre de filtres pour les listes de customs : recherche textuelle, filtre par statut, par modele, par type de contenu, par categorie client. |
| `custom-form.tsx` | Formulaire de creation/edition d'un custom. React Hook Form + Zod. Champs : modele, chatter, description, type de contenu, duree, tenue, categorie client, handle client, prix, montant collecte, notes, lien Drive. |
| `custom-mini-chat.tsx` | Mini-chat integre dans le detail d'un custom. Affiche les messages avec expediteur et role. Envoi de messages en temps reel (sans WebSocket pour l'instant — refresh manuel). |
| `status-badge.tsx` | Badge de statut avec code couleur : NOT_STARTED (rouge), IN_PROGRESS (ambre), COMPLETED (vert). |

### `components/layout/`

| Fichier | Description |
|---|---|
| `mobile-sidebar.tsx` | Sidebar responsive pour mobile avec menu hamburger (Sheet). |
| `notification-bell.tsx` | Cloche de notifications dans la topbar avec badge de compteur non-lus. Popover avec 5 dernieres notifications. Actions : marquer comme lu, dismiss, lien vers le centre de notifications. |
| `sidebar-nav.tsx` | Navigation laterale avec items configures par role. Utilise les icones Lucide. Highlight de l'item actif. |
| `user-menu.tsx` | Menu utilisateur en bas de sidebar (dropdown) : nom, email, role, bouton de deconnexion. |

### `components/models/`

| Fichier | Description |
|---|---|
| `model-form.tsx` | Formulaire complet de creation/edition d'un profil modele. Multi-sections (identite, physique, personnalite, reseaux, contrat). React Hook Form + Zod. Mode edition avec valeurs par defaut. |

### `components/notifications/`

| Fichier | Description |
|---|---|
| `notification-center.tsx` | Page complete de centre de notifications. Historique 30 jours, filtrage non-lus, icones par type, actions (lire, supprimer), lecture/suppression en masse. Theme couleur par type. |

### `components/ui/` (shadcn/ui)

18 composants UI de base : avatar, badge, button, card, checkbox, dialog, dropdown-menu, input, label, popover, progress, select, separator, sheet, table, tabs, textarea, toast/toaster.

### Autres

| Fichier | Description |
|---|---|
| `components/providers.tsx` | Provider global (SessionProvider de NextAuth). |
| `hooks/use-toast.ts` | Hook personnalise pour le systeme de toast/notifications UI. |

---

## 6. Etat des features

### Phase 1 — Fondations

| Feature | Statut | Details |
|---|---|---|
| Setup projet (Next.js, Prisma, PostgreSQL) | **Fonctionnel** | Scaffold complet, Prisma configure avec PostgreSQL, Tailwind + shadcn/ui |
| Systeme d'auth avec 5 roles | **Fonctionnel** | NextAuth v5 avec credentials provider. Login, session, deconnexion. 5 roles (OWNER, ADMIN, CHATTER_MANAGER, CHATTER, MODEL). |
| Middleware RBAC | **Fonctionnel** | Protection des routes par role dans `middleware.ts`. Redirection automatique vers le dashboard du role. Verification cote API aussi (`requireRole`). |
| CRUD profils modeles | **Fonctionnel** | Creation complete avec tous les champs (identite, physique, personnalite, reseaux sociaux, contrat). Edition via dialog. Suppression en cascade. Liste avec recherche et pagination. |
| Layouts par role | **Fonctionnel** | Sidebar avec navigation differente par role. Layout dashboard avec topbar (notification bell, user menu). Support mobile (sidebar responsive). |
| Mot de passe oublie / reinitialisation | **Fonctionnel** | Envoi d'email via Resend avec token unique. Page de reinitialisation. Email HTML avec branding EXCLSV. |
| Onboarding modele | **Fonctionnel** | Wizard multi-etapes (5 etapes). Sauvegarde progressive. Resume de confirmation. Redirection post-onboarding. |

### Phase 2 — Production de contenu

| Feature | Statut | Details |
|---|---|---|
| Custom Content (creation, statut, mini-chat) | **Fonctionnel** | CRUD complet avec validation Zod. Isolation des donnees par role. Mini-chat integre. KPIs admin (stats API). Filtres avances. Groupement par chatter/modele. |
| Notifications | **Fonctionnel** | Systeme complet : popover (cloche) + centre de notifications. Distinction read/dismiss. Lecture/suppression en masse. Historique 30 jours. |
| Weekly Content Templates + auto-generation | **Non commence** | Les modeles Prisma existent (`WeeklyContentTemplate`, `WeeklyContentTask`) mais aucune API ni page n'est implementee. |
| Script Builder | **Non commence** | Les modeles Prisma existent (`Script`, `ScriptStep`, `ScriptContentTask`) mais aucune API ni page n'est implementee. |
| Model PWA (contenu dashboard, push notifications) | **Non commence** | Aucune configuration PWA. Le dashboard modele est un placeholder. Pas de push notifications. |
| Socket.io pour notifications realtime | **Non commence** | Aucun serveur Socket.io. Les notifications ne sont pas en temps reel (polling implicite au chargement de page). |

### Phase 3 — Planning & Finance

| Feature | Statut | Details |
|---|---|---|
| Shift planning (rotation 3x8) | **Non commence** | Le modele Prisma `ShiftSchedule` existe. Aucune API ni page. |
| Clock-in/out | **Non commence** | Le modele Prisma `ClockRecord` existe. Aucune API ni page. |
| Import CSV (donnees Infloww) | **Non commence** | Le modele Prisma `InflowwDailyData` existe avec un schema complet. Aucune API ni page. La lib `csv-parser.ts` mentionnee dans CLAUDE.md n'existe pas. |
| Factures modeles (generation PDF) | **Non commence** | Le modele Prisma `ModelInvoice` existe avec decomposition par revenu. Aucune API ni page. La lib `pdf-generator.ts` n'existe pas. |
| Payroll chatters | **Non commence** | Aucune implementation. |
| Vue d'ensemble finance | **Non commence** | Aucune page finance. |

### Phase 4 — Analytics & Polish

| Feature | Statut | Details |
|---|---|---|
| Dashboard analytics global + par modele | **Non commence** | Le dashboard admin affiche des valeurs statiques a 0. Aucun graphique ni connexion aux donnees. |
| KPIs internes (rentabilite, productivite) | **En cours / partiel** | L'API `/api/customs/stats` fournit des KPIs customs (semaine, mois, completion, temps moyen). Mais pas de KPIs globaux. |
| Pipeline d'onboarding | **En cours / partiel** | L'onboarding modele (wizard) est fonctionnel. Mais le modele `OnboardingPipeline` (pipeline admin avec etapes JSON) n'a pas d'interface de gestion. |
| Calendrier social media | **Non commence** | Le modele Prisma `SocialPost` existe. Aucune API ni page. |
| Viewer audit logs | **Non commence** | Le modele `AuditLog` est alimente par les mutations (CREATE_CUSTOM, UPDATE_CUSTOM, etc.) mais il n'y a aucune page pour les consulter. |
| Optimisation performance | **Non commence** | Pas de Redis, pas de caching, pas de pagination cote serveur optimisee. |

### Resume synthetique

| Categorie | Fonctionnel | En cours/partiel | Non commence |
|---|---|---|---|
| Phase 1 | 7/7 | 0 | 0 |
| Phase 2 | 2/5 | 0 | 3 |
| Phase 3 | 0/6 | 0 | 6 |
| Phase 4 | 0/6 | 2 | 4 |
| **Total** | **9** | **2** | **13** |

---

## 7. Bugs connus et problemes identifies

1. **Dashboard admin non connecte aux donnees** — La page `/admin/dashboard` affiche des valeurs statiques (0 modeles, 0 customs, $0 revenus, 0 chatters). Les KPIs ne sont pas lies a l'API. Il faudrait faire des appels a `/api/models`, `/api/customs/stats`, etc.

2. **Dashboards placeholder** — Les pages `/chatter-manager/dashboard`, `/chatter/dashboard` et `/model/dashboard` n'affichent qu'un message de bienvenue sans donnees.

3. **Notifications non creees automatiquement** — L'API de notifications permet de lire/gerer les notifications, mais aucun endpoint ne cree automatiquement des notifications lors d'evenements (creation de custom, changement de statut, etc.). Les notifications doivent etre creees manuellement ou par un service externe non encore implemente.

4. **Mini-chat sans temps reel** — Le mini-chat des customs fonctionne par refresh complet du custom apres envoi d'un message. Pas de polling ni de WebSocket. Les nouveaux messages des autres utilisateurs n'apparaissent pas sans recharger la page.

5. **TypeScript ignore au build** — Le fichier de config ignore les erreurs TypeScript au build (`ignoreBuildErrors`), ce qui peut masquer des problemes en production.

6. **ESLint ignore au build** — De meme, ESLint est ignore au build (`ignoreDuringBuilds`).

7. **Page onboarding hors layout dashboard** — La page `/model/onboarding` est placee dans `src/app/model/onboarding/` (pas dans le groupe `(dashboard)`) ce qui signifie qu'elle n'a pas de sidebar, ce qui est voulu. Mais le middleware ne bloque pas les modeles ayant deja complete l'onboarding d'y acceder (l'API gere la redirection cote client seulement).

8. **Pas de gestion des chatters (CRUD)** — Il n'existe aucune page pour creer/gerer les profils chatters. L'API `/api/chatters` ne permet que le listing. Les comptes chatters doivent etre crees manuellement en base ou via le seed.

9. **Pas d'upload de fichiers** — Aucun systeme d'upload (photo de profil, contrat, contenu). Tous les fichiers sont references par URL externe (Drive, etc.).

10. **Absence de Redis** — Mentionne dans CLAUDE.md comme technologie prevue, mais aucun fichier `redis.ts` n'existe dans le code source.

---

## 8. Derniers commits

```
5624ef2 feat: notification center - color themes, filters, read-only history
aada22b feat: improve notification system - dismiss vs read
6f9f5fe fix: seed updates passwords on upsert + add Luna account
f3b27f0 fix: run prisma generate before build
45858cd feat: model onboarding wizard with multi-step form
b3898b3 feat: add Leo admin + Lelio model accounts
a667a2c chore: add password reset script
a549088 feat: redesign login page with premium dark/magenta EXCLSV branding
3a711c9 fix: wrap useSearchParams in Suspense
1680a85 fix: lazy init Resend to fix build
52c3167 feat: forgot/reset password system with Resend email
6d6fc85 chore: add EXCLSV agency logo
a549088 feat: redesign login page with premium dark/magenta EXCLSV branding
facaaf5 fix: typescript errors + ignore ts on build
8713409 fix: eslint errors + ignore eslint on build
2ab952f feat: custom content module, notifications system, and chatter drive links
d695c1c feat: auth system, RBAC middleware, dashboard layouts, and models CRUD
0ac5c25 feat: initial project scaffold
b9b3009 feat: initial commit
18f2ac2 ai md
```

**Chronologie des developpements :**
- Scaffold initial → Auth + RBAC + Layouts + Models CRUD → Customs + Notifications → Login redesign → Reset password → Onboarding wizard → Notification center avance

---

## Annexe — Technologies et dependances cles

| Technologie | Usage | Statut |
|---|---|---|
| Next.js 14 (App Router) | Framework web | Utilise |
| TypeScript (strict mode) | Langage | Utilise (mais ignore au build) |
| Prisma ORM | Acces base de donnees | Utilise |
| PostgreSQL | Base de donnees | Utilise (via Railway) |
| Tailwind CSS | Styles | Utilise |
| shadcn/ui | Composants UI | Utilise (18 composants) |
| NextAuth v5 (Auth.js) | Authentification | Utilise |
| Zod | Validation des inputs | Utilise (customs + models) |
| React Hook Form | Formulaires | Utilise |
| date-fns | Manipulation de dates | Utilise |
| Lucide React | Icones | Utilise |
| Resend | Envoi d'emails | Utilise (reset password) |
| bcryptjs | Hash mot de passe | Utilise |
| Socket.io | Temps reel | **Non implemente** |
| Redis | Cache | **Non implemente** |
| Papaparse | Import CSV | **Non implemente** |
| @react-pdf/renderer | Generation PDF | **Non implemente** |
| next-pwa | PWA mobile | **Non implemente** |
