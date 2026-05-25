
# PulseLog | Workforce Operational Intelligence

PulseLog is a professional workforce operations platform designed to automate attendance, synthesize operational handovers, and monitor morale using Google's Gemini AI.

## Core Features

- **General Purpose Architecture**: Optimized for any organization (retail, logistics, clinical, office).
- **Inclusion Protocol (Smartphone Optional)**: While optimized for BYOD QR clock-in, supervisors can manually override logs for staff without smartphones, ensuring 100% workforce digital inclusion.
- **BYOD Clock-In Protocol**: Staff scan institutional QR codes on their own devices.
- **Geofencing**: GPS-verified check-ins ensure personnel are physically on-site.
- **AI Operational Synthesis**: Powered by Genkit and Gemini, the system automatically processes shift notes to identify critical themes and issues.
- **Overtime Reward System**: Automatically tracks and flags overtime for staff reward protocols.
- **Morale Monitoring**: Integrated sentiment scoring helps administrators identify departmental fatigue and prevent burnout.

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS & ShadCN UI
- **Backend**: Firebase (Firestore & Auth)
- **AI/LLM**: Google Genkit & Gemini 2.5 Flash

## Local Setup

1. Install Dependencies: `npm install`
2. Configure `.env.local` with your Firebase and Google GenAI credentials.
3. Start Dev Server: `npm run dev`

---
*Prepared by zack*
