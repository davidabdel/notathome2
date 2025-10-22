# ESLint Fixes for Not At Home Project

This document contains all the fixes needed to resolve the ESLint warnings that are causing build failures in Vercel.

## 1. Fix `@ts-ignore` to `@ts-expect-error` with descriptions

### File: `src/utils/realtimeClient.ts` (Line 49)

```typescript
// BEFORE:
// @ts-ignore: Supabase allows 'postgres_changes' despite type definition limitations
(channel as any).on(

// AFTER:
// @ts-expect-error: Supabase allows 'postgres_changes' despite type definition limitations
(channel as any).on(
```

### File: `src/utils/session.ts` (Line 138)

```typescript
// BEFORE:
// @ts-ignore - Supabase client is imported from utils
const { error: txError } = await supabase.rpc('end_session', {

// AFTER:
// @ts-expect-error - Supabase client is imported from utils but types don't match exactly
const { error: txError } = await supabase.rpc('end_session', {
```

## 2. Fix unused imports and variables

### File: `src/pages/setup-database.tsx`

```typescript
// BEFORE:
import React, { useState, useEffect } from 'react';
// ...
const [error, setError] = useState<string | null>(null);
const [success, setSuccess] = useState<string | null>(null);

// AFTER:
import React, { useState } from 'react';
// ...
const [error, setError] = useState<string | null>(null);
const [success, setSuccess] = useState<string | null>(null);
```

### File: `src/pages/test-connection.tsx`

```typescript
// BEFORE:
import React, { useState, useEffect } from 'react';

// AFTER:
import React, { useState } from 'react';
```

### File: `src/utils/supabaseClient.ts`

```typescript
// BEFORE:
// Define the mock client type
type MockClient = {
  from: () => {
    // ...
  };
  // ...
};

// AFTER:
// Define the mock client type
type _MockClient = {
  from: () => {
    // ...
  };
  // ...
};
```

## 3. Fix React Hook useEffect missing dependency warning

This warning appears in a file not shown in the error list. To fix this pattern:

```typescript
// BEFORE:
useEffect(() => {
  fetchSessionData();
}, []);

// AFTER:
useEffect(() => {
  fetchSessionData();
}, [fetchSessionData]);

// ALTERNATIVE:
// If fetchSessionData is defined inside the component and uses state/props:
useEffect(() => {
  // Define the function inside useEffect to avoid dependency issues
  const fetchData = async () => {
    // Implementation
  };
  
  fetchData();
}, []);
```

## 4. Fix unescaped entities in JSX

### File: `src/pages/setup-database.tsx` (Line 290)

```tsx
// BEFORE:
<p className="note">After running the SQL, come back to this page and click "Refresh Status" to verify that all tables were created successfully.</p>

// AFTER:
<p className="note">After running the SQL, come back to this page and click &quot;Refresh Status&quot; to verify that all tables were created successfully.</p>
```

## 5. Fix HTML anchor to use Next.js Link

### File: `src/pages/test-connection.tsx` (Line 73)

```tsx
// BEFORE:
<div className="back-link">
  <a href="/">← Back to Home</a>
</div>

// AFTER:
import Link from 'next/link';

// In the JSX:
<div className="back-link">
  <Link href="/">← Back to Home</Link>
</div>
```

## 6. Fix unused variable 'data' warning

```typescript
// BEFORE:
const { data, error: verifyError } = await supabase

// AFTER:
const { data: _data, error: verifyError } = await supabase
```

## How to Apply These Changes

1. Open each file mentioned above
2. Find the code sections that need to be changed
3. Replace with the fixed code
4. Save the files
5. Commit and push the changes
6. Redeploy on Vercel

Alternatively, you can update your `.eslintrc.json` to be more permissive for these specific rules if you prefer not to modify the code.
