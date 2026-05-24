# VitaInes 💚

**Your Personal Blood Pressure & Health Monitoring Companion**

A warm, minimal, and extremely intuitive mobile app designed for elderly users to track blood pressure, manage medications, and receive AI-powered health insights.

---

## Features

- **Blood Pressure Tracking** — Large, simple number inputs with one-tap save
- **Smart Reminders** — Configurable daily reminder windows (morning, afternoon, evening)
- **Medication Manager** — Full CRUD with 30+ pre-loaded BP medications
- **Historical Trends** — Interactive charts with day/week/month/custom filters
- **AI Health Insights** — Rule-based + optional OpenAI-powered recommendations
- **Bilingual** — Full English/Spanish support with instant language toggle
- **Push Notifications** — BP reminders, medication alerts, high-reading warnings
- **Onboarding Wizard** — 3-step guided setup for new users
- **Auto Data Retention** — Readings older than 2 years are automatically deleted

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React Native (Expo) |
| Backend | Firebase (Auth, Firestore, Cloud Functions, FCM) |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Notifications | Expo Notifications + Firebase Cloud Messaging |
| AI Engine | Rule-based (built-in) + OpenAI GPT-4o-mini (optional) |
| Charts | react-native-chart-kit |
| Navigation | React Navigation v6 |

## Firebase Schema

```
users/{userId}
  ├── uid: string
  ├── email: string
  ├── displayName: string
  ├── language: "en" | "es"
  ├── onboardingComplete: boolean
  ├── measurementsPerDay: 1 | 2 | 3
  ├── reminderWindows: Array<{key, start, end}>
  ├── doctorName: string
  ├── doctorPhone: string
  ├── fcmToken: string
  └── createdAt: timestamp

readings/{readingId}
  ├── userId: string
  ├── systolic: number (60–250)
  ├── diastolic: number (40–150)
  ├── pulse: number | null
  ├── notes: string
  ├── clientTimestamp: timestamp
  ├── expiresAt: timestamp (clientTimestamp + 2 years)
  └── timestamp: serverTimestamp

medications/{medId}
  ├── userId: string
  ├── name: string
  ├── category: string
  ├── dosage: string
  ├── frequency: 0 | 1 | 2 | 3 | 4
  ├── doctorNotes: string
  ├── active: boolean
  ├── reminderTimes: string[]
  └── createdAt: timestamp

ai_recommendations/{recId}
  ├── userId: string
  ├── readingId: string
  ├── readingStatus: "normal" | "elevated" | "high" | "crisis"
  ├── processed: boolean
  └── createdAt: timestamp
```

## Quick Start

### 1. Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g @expo/cli`
- Firebase project (free tier works)

### 2. Clone & Install
```bash
git clone https://github.com/andygarciasoto/vitaines.git
cd vitaines
npm install
```

### 3. Configure Firebase
1. Go to [Firebase Console](https://console.firebase.google.com) and create a project
2. Enable: **Authentication** (Email/Password), **Firestore**, **Cloud Messaging**
3. Copy your web app config
4. Create `.env` from `.env.example` and fill in your values:
```bash
cp .env.example .env
# Edit .env with your Firebase config
```

### 4. Deploy Firebase Rules & Functions
```bash
cd firebase
npm install -g firebase-tools
firebase login
firebase use --add  # Select your project
firebase deploy --only firestore:rules,firestore:indexes
cd functions && npm install && cd ..
firebase deploy --only functions
```

### 5. Run the App
```bash
# Start Expo dev server
npm start

# Run on iOS Simulator
npm run ios

# Run on Android Emulator
npm run android
```

## Project Structure

```
src/
├── components/
│   └── common/          # Reusable UI components
│       ├── Button.js
│       ├── Card.js
│       ├── Header.js
│       ├── NumberInput.js
│       ├── BPStatusBadge.js
│       └── LanguageToggle.js
├── constants/
│   ├── theme.js          # Colors, fonts, spacing, BP thresholds
│   └── medications.js    # 30+ BP medication database
├── localization/
│   ├── en.js             # English translations
│   ├── es.js             # Spanish translations
│   └── index.js
├── navigation/
│   └── AppNavigator.js   # React Navigation setup
├── screens/
│   ├── auth/             # SignIn, SignUp
│   ├── onboarding/       # 3-step setup wizard
│   ├── home/             # Dashboard
│   ├── readings/         # Add/log blood pressure
│   ├── history/          # Charts & historical data
│   ├── medications/      # Medication management
│   ├── insights/         # AI recommendations
│   └── profile/          # Settings & profile
├── services/
│   ├── firebase/         # Auth, Readings, Medications, Profile
│   ├── ai/               # Recommendation engine
│   └── notifications/    # Push notification management
└── store/
    └── AppContext.js     # Global state management

firebase/
├── firestore.rules       # Security rules
├── firestore.indexes.json
├── firebase.json
└── functions/
    └── src/index.ts      # Cloud Functions
```

## Blood Pressure Classification

| Status | Systolic | Diastolic | Color |
|--------|----------|-----------|-------|
| Normal | < 120 | < 80 | 🟢 Green |
| Elevated | 120–129 | < 80 | 🟡 Yellow |
| High | 130–179 | 80–119 | 🔴 Red |
| Crisis | ≥ 180 | ≥ 120 | 🚨 Dark Red |

## AI Recommendation Engine

The built-in rule-based engine analyzes:
- Latest reading status (normal/elevated/high/crisis)
- Trend direction (increasing/decreasing/stable)
- Consecutive high readings (triggers doctor visit warning after 3+ days)
- Spike detection (sudden rise vs. previous reading)
- Time-of-day contextual tips (morning nutrition, afternoon hydration, evening sleep)

To enable OpenAI-powered recommendations, add `EXPO_PUBLIC_OPENAI_API_KEY` to your `.env`.

## Security

- All Firestore rules enforce per-user data isolation
- Users can only read/write their own data
- Sensitive fields validated server-side in Firestore rules
- Cloud Functions handle all privileged operations
- Auto-deletion of data older than 2 years (HIPAA-conscious)

## License

MIT © VitaInes
