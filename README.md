# PulseLog | Healthcare Operational Intelligence

PulseLog is a professional healthcare operations platform designed to automate staff attendance, synthesize clinical handovers, and monitor workforce wellness using Google's Gemini AI.

## Core Features

- **BYOD Clock-In Protocol**: Staff use their own devices to scan institutional QR codes, eliminating the need for expensive hardware.
- **Institutional Geofencing**: GPS-verified check-ins ensure personnel are physically on-site, preventing remote clock-in fraud.
- **AI Handover Synthesis**: Powered by Genkit and Gemini, the system automatically processes shift notes to identify critical patient issues and operational themes.
- **Wellness Monitoring**: Integrated mood scoring helps administrators identify departmental fatigue and prevent burnout.
- **Multi-Tenant Architecture**: Secure data isolation for each healthcare organization.
- **Live Presence Grid**: Real-time administrative oversight of on-site personnel.

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS & ShadCN UI
- **Backend/Database**: Firebase (Firestore & Authentication)
- **AI/LLM**: Google Genkit & Gemini 2.5 Flash
- **Icons**: Lucide React

## Local Setup Instructions

To run PulseLog on your own machine, follow these steps:

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd pulselog
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Firebase
- Create a new project in the [Firebase Console](https://console.firebase.google.com/).
- Enable **Authentication** (Email/Password provider).
- Enable **Cloud Firestore**.
- Register a Web App and copy your Firebase configuration.

### 4. Configure Environment Variables
Create a `.env.local` file in the root directory and add your credentials:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# For Genkit AI Features
GOOGLE_GENAI_API_KEY=your_google_ai_studio_key
```

### 5. Run the Application
Start the development server:
```bash
npm run dev
```

### 6. Run Genkit (Optional for AI Development)
To explore or modify the AI flows:
```bash
npm run genkit:dev
```

## Deployment
PulseLog is optimized for deployment on **Firebase App Hosting** or **Vercel**. Ensure all environment variables are correctly configured in your production environment.

---
*Prepared by zack*
