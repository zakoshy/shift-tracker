
# 🚀 PulseLog | Workforce Operational Intelligence

**PulseLog** is a professional workforce operations platform designed to automate attendance, synthesize operational handovers, and monitor morale using Google's Gemini AI. 

> *"Transforming institutional presence into actionable intelligence."*

---

## 💎 Core Value Propositions

### 🛡️ Institutional Integrity & Compliance
- **🎯 Geofencing Protocol**: GPS-verified check-ins ensure personnel are physically on-site. Remote check-ins are automatically flagged by the anti-fraud engine.
- **📜 Encrypted Audit Trail**: Every clock-in/out is timestamped and immutable, creating a high-fidelity record for compliance and payroll.

### 📱 Hybrid Inclusion Protocol (Smartphone Optional)
- **🔓 Total Workforce Digitalization**: While optimized for BYOD (Bring Your Own Device) QR clock-in, supervisors can manually override logs for staff without smartphones via the **Digital Security Ledger**. 
- **⚖️ No Worker Left Behind**: Ensures 100% digital coverage of your workforce regardless of their personal technology, replacing messy paper sign-in books with a unified data stream.

### 🧠 AI-Driven Operational Synthesis
- **⚡ Genkit & Gemini Integration**: The system automatically processes shift notes to identify critical themes, urgent clinical/operational issues, and staff well-being trends.
- **📊 Executive Reports**: Admins receive high-level summaries of entire shifts, saving hours of manual review.

### 📈 Overtime & Reward Intelligence
- **💰 Reward Protocols**: Automatically tracks and flags overtime minutes.
- **🔥 Burnout Prevention**: Integrated sentiment (mood) scoring helps management identify departmental fatigue before it leads to turnover.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router & Server Actions)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [ShadCN UI](https://ui.shadcn.com/)
- **Backend**: [Firebase](https://firebase.google.com/) (Firestore NoSQL, Authentication, Security Rules)
- **AI/LLM**: [Google Genkit](https://firebase.google.com/docs/genkit) & [Gemini 2.5 Flash](https://deepmind.google/technologies/gemini/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 💻 Local Setup & Development

To deploy PulseLog on your local environment:

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/your-repo/pulselog.git
    cd pulselog
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**:
    Create a `.env.local` file with your credentials:
    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY=your_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
    GOOGLE_GENAI_API_KEY=your_gemini_api_key
    ```

4.  **Start Dev Server**:
    ```bash
    npm run dev
    ```

---

## 🤝 For Investors & Collaborators

PulseLog is built with a **multi-tenant architecture** in mind, designed to scale from small clinics to massive logistics hubs. Our focus on **Digital Inclusion** solves a major pain point in blue-collar and clinical industries where personal device usage is inconsistent.

Join us in building the future of workforce intelligence.

---
*Prepared by zack*
