## Phase 1: Setup & Authentication
### Files to Create:
- `supabase/config.ts` (Supabase client setup)
- `src/components/auth/LoginForm.tsx` (PIN entry UI)
- `supabase/migrations/20240510_initial.sql` (Core tables)

### Code:
```sql
-- Initial SQL (Run First)
CREATE TABLE congregations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  pin_code VARCHAR(6) NOT NULL,
  status TEXT DEFAULT 'pending'
);
typescript
Copy
// supabase/config.ts
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
);
Cursor Command After Phase 1:
"Initialize Supabase client and render login form with PIN input. Do NOT add session logic yet."

Phase 2: Congregation Onboarding
Files to Modify:
src/pages/request-congregation.tsx (Submission form)

supabase/migrations/20240511_rls.sql (Security policies)

Code:
sql
Copy
-- RLS Policies
ALTER TABLE congregations ENABLE ROW LEVEL SECURITY;
CREATE POLICY congregation_admins ON congregations
  FOR SELECT USING (auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'congregation_admin'
  ));
typescript
Copy
// src/pages/request-congregation.tsx
const submitRequest = async (data: CongregationRequest) => {
  await supabase.from('congregation_requests').insert(data);
};
Cursor Command After Phase 2:
"Add congregation request form with fields: name, pin_code, contact_email. Connect to Supabase requests table."

Phase 3: Session Management
Files to Create:
src/utils/session.ts (Code generation)

src/components/SessionCodeDisplay.tsx (Share UI)

Code:
typescript
Copy
// session.ts (Core Logic - Protected)
export const generateSessionCode = () => {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
};
Cursor Command After Phase 3:
"Implement session code generation and sharing via native share API. Keep geotagging disabled."

Phase 4: Real-Time Geotagging
Files to Modify:
src/hooks/useGeotagging.ts (Location capture)

supabase/realtime-setup.ts (Websockets)

Protected Code:
typescript
Copy
// useGeotagging.ts (Locked)
const captureLocation = () => {
  navigator.geolocation.getCurrentPosition((pos) => {
    setCoordinates({ 
      lat: pos.coords.latitude, 
      lng: pos.coords.longitude 
    });
  });
};
Cursor Command After Phase 4:
"Add real-time block updates using Supabase Realtime. Preserve coordinate formatting in useGeotagging.ts."

Phase 5: Admin Dashboard
Files to Create:
src/pages/admin/requests.tsx (Approval UI)

src/pages/admin/congregations.tsx (Management)

Code:
typescript
Copy
// requests.tsx (Protected Workflow)
const approveRequest = async (requestId: string) => {
  await supabase.rpc('approve_congregation', { request_id: requestId });
};
Cursor Command After Phase 5:
"Build admin dashboard with tabs for requests/congregations. Do NOT modify RLS policies."

Phase 6: Final Testing
Commands to Run:
bash
Copy
# In Terminal
supabase start
npm run test:critical
Protected Files (Never Modify Directly)
supabase/migrations/*.sql

src/utils/session.ts

src/hooks/useGeotagging.ts

Copy

---

### How to Use with Cursor:
1. **Start with Phase 1**: Open `ARCHITECTURE.md` and run the Phase 1 command
2. **Commit Working Code**: After each phase completes
3. **Progress Sequentially**: Cursor will reference previous phases’ code
