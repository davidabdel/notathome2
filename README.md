# Not At Home

A mobile-first web app for missionaries to track "Not At Home" locations during door-to-door outreach.

## Phase 1: Setup & Authentication

This phase includes the initial setup of the project with Supabase integration and a basic authentication UI.

### Features

- Supabase client setup
- PIN entry UI for congregation login
- Core database tables

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/not-at-home.git
   cd not-at-home
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables:
   ```bash
   cp .env.local.example .env.local
   ```
   Then edit `.env.local` with your Supabase credentials.

4. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Supabase Setup

1. Create a new Supabase project
2. Run the SQL migration in `supabase/migrations/20240510_initial.sql`
3. Copy your Supabase URL and anon key to the `.env.local` file

## Project Structure

- `supabase/config.ts` - Supabase client setup
- `src/components/auth/LoginForm.tsx` - PIN entry UI
- `supabase/migrations/20240510_initial.sql` - Core tables

## Next Steps

Phase 2 will focus on congregation onboarding with request forms and security policies. 