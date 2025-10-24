# Admin and Congregation Auth/Routing: Fix Plan

This document describes a non-destructive set of changes to make authentication and post-login routing smooth for both congregation admins and members, and to give the super admin a clean way to assign congregation admins. It focuses on correcting why newly approved congregation admins land in the member area after login/magic link.

# Findings

- **Two distinct “admin” concepts exist**
  - **Global admin (super admin)**: `user_roles.role = 'admin'` grants access to `/admin/*` (system-wide management).
  - **Congregation admin**: `user_roles.role = 'congregation_admin'` grants access to `/congregation` (their congregation’s dashboard: maps, etc.).
- **Current home routing prefers super admin only**
  - `src/pages/index.tsx` redirects to `/admin` only if email is `david@uconnect.com.au` or if `user_roles.role = 'admin'`. Otherwise it sends users to `/role-selection` which is designed for Overseer/Publisher member flows.
- **Congregation admins get misrouted**
  - After magic link/reset/login, users with only `congregation_admin` are sent to `/role-selection`, then to `/dashboard` or `/join-session` (member area), not `/congregation`.
- **Role checks already exist**
  - `/admin/*` checks for `role = 'admin'`.
  - `/congregation` checks for `role IN ('congregation_admin','admin')`.
- **No unified post-auth callback**
  - Redirect URLs vary; some signups use `emailRedirectTo: /congregation`. There is no single `/auth/callback` page that consistently decides the destination based on roles.

# Goals

- **Always land users on the correct area after any auth event**: magic link, password reset, regular login.
- **Congregation creator becomes congregation admin immediately** after approval.
- **Super admin can add/remove congregation admins** via the existing admin UI.
- **Zero regression** to existing member flows (role-selection, dashboard, join-session) and super admin area.

# Non-destructive Changes (Step-by-step)

- **[Add] Unified auth callback**
  - Create `src/pages/auth/callback.tsx` that:
    - Reads session via `supabase.auth.getSession()`.
    - Queries `user_roles` for the user.
    - Routes in this priority:
      1. If `role = 'admin'` → `/admin`.
      2. Else if `role = 'congregation_admin'` → `/congregation`.
      3. Else if `localStorage.userRole === 'group_overseer'` → `/dashboard`.
      4. Else → `/role-selection`.
    - Shows a small loading spinner and retries the `user_roles` lookup briefly if `PGRST116` (no rows yet) happens right after login.

- **[Update] Redirect URLs**
  - Supabase Auth settings → Redirect URLs: include the production and local URLs for `/auth/callback`.
  - Email templates (confirmation, magic link, password reset) should point to `/auth/callback`.
  - In code where `emailRedirectTo` is specified (e.g., `src/pages/congregation/admin-signup.tsx`), change to `${window.location.origin}/auth/callback`.

- **[Adjust] Home and login success routing**
  - `src/pages/index.tsx`:
    - If a session exists, do not send all non-admins to `/role-selection` by default.
    - Instead, push authenticated users to `/auth/callback` to centralize decision-making.
  - `src/components/auth/LoginForm.tsx`:
    - After a successful session set or password sign-in, redirect to `/auth/callback` (not directly to `/role-selection`).

- **[Ensure] Congregation creator gets congregation_admin role**
  - On congregation approval, insert into `user_roles`:
    - `user_id = creator_user_id`
    - `congregation_id = new_congregation_id`
    - `role = 'congregation_admin'`
  - If an approval API already exists, add this insert there. If not, use `pages/api/admin/congregations/[id]/admins.ts` as the place to manage role assignments.

- **[Keep] Super admin workflow**
  - Use existing pages under `/admin/congregations/[id]/admins.tsx` to add/remove admins for a congregation.
  - Consider adding a small helper on `/admin/congregations/[id]/admins.tsx` that can invite by email and auto-assign `congregation_admin` (if not already present) once the user confirms.

# Minimal Code Touch Points

- **New**: `src/pages/auth/callback.tsx`
- **Edit**: `src/pages/index.tsx` → post-auth redirect to `/auth/callback` for logged-in users.
- **Edit**: `src/components/auth/LoginForm.tsx` → redirect to `/auth/callback` after login.
- **Edit**: `src/pages/congregation/admin-signup.tsx` → `emailRedirectTo` to `/auth/callback`.
- **Optional**: API handler on congregation approval to assign creator role.

# Pseudocode: auth/callback.tsx

```tsx
// pages/auth/callback.tsx
export default function AuthCallback() {
  // useEffect(() => {
  //   const run = async () => {
  //     const { data: { session } } = await supabase.auth.getSession();
  //     if (!session) { router.replace('/'); return; }
  //     const userId = session.user.id;
  //     // Try a couple of times to allow role propagation
  //     for (let i = 0; i < 3; i++) {
  //       const { data, error } = await supabase
  //         .from('user_roles')
  //         .select('role')
  //         .eq('user_id', userId);
  //       if (!error && data) {
  //         const roles = data.map(r => r.role);
  //         if (roles.includes('admin')) { router.replace('/admin'); return; }
  //         if (roles.includes('congregation_admin')) { router.replace('/congregation'); return; }
  //         break;
  //       }
  //       await new Promise(r => setTimeout(r, 700));
  //     }
  //     const selectedRole = localStorage.getItem('userRole');
  //     if (selectedRole === 'group_overseer') { router.replace('/dashboard'); return; }
  //     router.replace('/role-selection');
  //   };
  //   run();
  // }, []);
  // return <LoadingSpinner/>;
}
```

# Supabase Configuration

- **Auth → Redirect URLs**
  - Add both production and local URLs for `/auth/callback`.
  - Example: `https://app.example.com/auth/callback`, `http://localhost:3000/auth/callback`.
- **Emails**
  - Update confirmation, magic link, and reset password templates to use the same callback URL.
- **Security**
  - Ensure RLS policies on `user_roles` allow users to read their own roles.
  - Ensure `congregations` can be read by congregation admins for their congregation.

# Edge Cases and UX Polishing

- **Role propagation delay**
  - Implement retry logic on callback page if `user_roles` returns `PGRST116` immediately after signup/approval.
- **Missing roles**
  - If the user has no roles yet, land them on `/role-selection` as today.
- **Super admin implied congregation access**
  - Super admin has `admin` role which routes to `/admin`. If they also need to open a congregation dashboard, they can navigate manually; optional enhancement is a selector in `/admin` to “Enter congregation as admin.”

# Rollout Plan

- **Phase 1 (safe, additive)**
  - Add `/auth/callback` page.
  - Update redirect URLs in Supabase and email templates.
  - Update `admin-signup.tsx` `emailRedirectTo`.
- **Phase 2 (small edits)**
  - Change the post-login redirects in `index.tsx` and `LoginForm.tsx` to point at `/auth/callback`.
- **Phase 3 (workflow enforcement)**
  - Ensure congregation approval code assigns the creator `congregation_admin` immediately.
  - Validate `/admin/congregations/[id]/admins.tsx` meets super admin needs to manage admins.

# Acceptance Criteria

- A newly created/approved congregation’s creator clicks email link or uses magic link and lands on `/congregation` with maps access.
- Global super admin logs in and lands on `/admin`.
- Regular members continue to land in role selection → member flows.
- Super admin can add an email to a congregation as `congregation_admin`, and that person’s magic link takes them to `/congregation` after confirmation.

# Notes

- This plan is additive and avoids destructive refactors. Existing member flows and the super admin area remain unchanged; we only centralize routing after authentication and ensure role assignment at approval time.
