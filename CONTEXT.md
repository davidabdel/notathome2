# Not At Home - Context Document

## Purpose
A mobile-first web app for missionaries to track "Not At Home" locations during door-to-door outreach.  
**Key workflows**:
1. Group Overseers start sessions and share access codes.
2. Volunteers add geotagged/manual addresses in real time.
3. Admins approve new congregations and manage maps.

## Key Features
- **Session Codes**: 6-digit codes for instant map sharing.
- **Geotagging**: Auto-capture coordinates or manual entry.
- **Congregation Access Control**: 
  - PIN-protected congregation access.
  - Admins manage maps/PINs post-approval.
- **Admin Dashboard**: Approve/reject congregation requests.
- **Native Sharing**: Export data via device share dialogs.

## Tech Stack
- **Frontend**: React (TypeScript) + Material-UI (mobile-optimized).
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage).
- **Security**:
  - Row-Level Security (RLS) for database isolation.
  - PINs hashed with `pgcrypto`.
- **Deployment**: Vercel + GitHub Actions.

## User Roles
1. **Group Overseer**:
   - Starts/ends sessions.
   - Shares session codes and final data.
2. **Volunteer**:
   - Joins sessions via code.
   - Records "Not At Home" addresses.
3. **Congregation Admin**:
   - Manages congregation maps/PINs (post-approval).
4. **Super Admin**:
   - Approves/rejects congregation requests.

## Data Flow
```mermaid
graph TD
  A[Volunteer: Join Session] --> B{Valid Code?}
  B -->|Yes| C[Live Map: Add/Edit Addresses]
  B -->|No| D[Error: Invalid Code]
  C --> E[Supabase Realtime Sync]
  E --> F[All Volunteers See Updates]
  F --> G[Overseer Ends Session]
  G --> H[Export Data via Native Share]
Security
PINs: Hashed (never stored raw).

Data Isolation: Congregations only see their maps.

RLS Policies:

sql
Copy
-- Example: Volunteers can only read their congregation's data
CREATE POLICY volunteer_access ON congregation_maps
  FOR SELECT USING (
    congregation_id IN (
      SELECT congregation_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );
Architecture Files
ARCHITECTURE.md: Step-by-step build guide for Cursor.

supabase/SCHEMA_AND_RLS.sql: Database schema + RLS policies.

src/lib/protected/: Critical logic (geotagging, session codes).

Copy

---

**How to use**:  
1. Save as `context.md` in your project root.  
2. Share with collaborators/QA testers for app context.  

This document ensures everyone understands the app’s scope and constraints. Let me know if you’d like to expand any section! 📄