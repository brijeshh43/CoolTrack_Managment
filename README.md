# CoolTrack — HVAC & Field Service Management

CoolTrack is a modern, offline-first Field Service Management (FSM) platform designed for HVAC companies and field engineering teams. It streamlines preventive maintenance, breakdown service, installation, commissioning, attendance tracking, and customer sign-offs.

## Key Features

- **Field Engineering Workflows**: Step-by-step job execution (PM, Breakdown, Installation, Commissioning).
- **Offline-First Resilience**: Automatic local queueing and sync with IndexedDB when working in basements or offline plant rooms.
- **Client-Side Media Compression**: In-browser photo and selfie compression for fast, lightweight evidence capture.
- **Digital Customer Acceptance**: Touch signature pad with GPS coordinate logging.
- **Instant Service Reports**: Formatted print-ready and PDF-exportable service reports.
- **Attendance & GPS Geo-Logging**: Engineer duty tracking with selfie check-in.
- **Admin Command Center**: Customer records, unit tracking, spare parts inventory, and team oversight.

## Getting Started Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   Create or edit `.env`:
   ```env
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-key
   SUPABASE_URL=your-supabase-url
   SUPABASE_PUBLISHABLE_KEY=your-supabase-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-key
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Seed default admin & engineer accounts:**
   ```bash
   npm run seed:users
   ```

## Built With

- **Framework**: TanStack Start & React 19
- **Routing & SSR**: TanStack Router
- **Database & Storage**: PostgreSQL & Supabase
- **Styling**: Tailwind CSS & Lucide Icons
- **Offline Storage**: IndexedDB
