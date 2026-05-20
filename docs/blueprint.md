# **App Name**: PulseLog

## Core Features:

- Multi-Tenant Auth Portal: Secure authentication for staff and admins with automatic organization partitioning using Firestore security rules.
- Single-Action Clock-In: Mobile-first, time-sensitive arrival tracking that automatically identifies and flags late arrivals based on institutional protocols.
- Shift Departure Workflow: Integrated handover drawer requiring mood-rating tracking and mandatory textual departure notes before shift completion.
- Handover Intelligence Tool: A generative AI feature that summarizes daily handover notes into actionable high-level reports for admin staff, highlighting operational bottlenecks or recurring issues.
- Live Institutional Dashboard: A desktop-optimized real-time monitor using Firestore snapshots to show live staff presence, arrival statuses, and mood distributions.
- Historical Shift Analytics: Searchable and paginated log of all attendance records with departmental filtering and one-click CSV export.
- Multi-Tier Access Controls: Strict role-based views ensuring sensitive department-wide data is accessible only to 'admin' roles while keeping staff data isolated.

## Style Guidelines:

- Primary Color: Professional Deep Blue (#2955B2), reflecting reliability and precision in a medical context.
- Background Color: Ultra-light Ice Grey (#F3F5F9), ensuring a clean, clinical, and high-contrast user interface.
- Accent Color: Modern Soft Indigo (#7366E3) for interactive elements and highlighted statuses.
- Headline Font: 'Inter' (sans-serif) for an objective, machined, and precise technical feel. Body Font: 'PT Sans' (humanist sans-serif) to provide warmth and readability in clinical settings.
- Lucide-react icons using thin line weights (2px) to maintain a modern, uncluttered look consistent with healthcare software.
- Responsive card-based system utilizing deep-stacked shadow patterns for the Admin view and full-bleed drawer patterns for staff mobile interaction.
- Smooth real-time entry transitions and status indicator pulses for staff checking out or flagging high stress levels.