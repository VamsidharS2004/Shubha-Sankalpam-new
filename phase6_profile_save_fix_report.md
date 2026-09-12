# Phase 6: Profile Save Fix Report

## 1. Root Cause
The `devotees` table in the Supabase schema specifies `name TEXT NOT NULL`. During the initial account creation phase (after OTP verification), `userModel.findOrCreate()` attempted to upsert the devotee row with `name: null` if no name was provided. This violated the database constraint, causing the Supabase upsert to fail silently and fall back to saving the user only in the local `backend/users.json` cache. When the frontend later attempted to update the profile via `userModel.updateDevotee()`, the SQL query failed to find any matching rows in Supabase, resulting in a silent failure that appeared successful to the end user.

## 2. File Modified
- `backend/models/userModel.js`

## 3. Exact Change
In `userModel.js`, the `findOrCreate` method was modified to provide a default string (`"Devotee"`) instead of `null` when the `defaults.name` parameter is missing or empty. This satisfies the `NOT NULL` constraint at the database layer for both the local JSON fallback branch and the primary Supabase upsert logic.

```diff
- name: clean(defaults.name, 100) || null,
+ name: clean(defaults.name, 100) || "Devotee",
```
*(This change was made in two places: line 113 for the local fallback and line 134 for the Supabase upsert).*

## 4. Backup Created
- `backend/models/userModel.js.phase6.bak`

## 5. Syntax Result
- **Passed**: Executed `node -c backend/models/userModel.js` with 0 syntax errors.

## 6. Test Account Used
- **Phone**: `919999999904`
- **Identity**: Vamsidhar (TestGotra)

## 7. Before/After Behavior
- **Before**: `findOrCreate` failed database constraint, no row was created in Supabase, and subsequent profile updates did not persist.
- **After**: `findOrCreate` successfully creates a Supabase row with the name `"Devotee"`. Subsequent profile updates correctly overwrite `"Devotee"` with the user-provided profile values.

## 8. Supabase Verification
Ran a direct node simulation script calling `findOrCreate()` and `updateDevotee()` natively:
- Initial creation returned:
  `{ id: '0b9fa1b3-2af1-46dd-b866-c24b764e0f48', phone: '919999999904', name: 'Devotee', ... }`
- Profile update returned:
  `{ id: '0b9fa1b3-2af1-46dd-b866-c24b764e0f48', phone: '919999999904', name: 'Vamsidhar', gotra: 'TestGotra', ... }`
The user is now successfully and persistently tracked in the remote database.

## 9. Local JSON Fallback Verification
Inspected `backend/users.json`. The new test user (`919999999904`) is **NOT** present in the file. The backend correctly maintained the database connection and did not silently fall back to local disk storage for this user.

## 10. Existing Data Safety
- No existing records were modified.
- No schema migrations or SQL operations were performed.
- All structural changes were strictly limited to the `userModel.js` fallback default.

FINAL STATUS:

PROFILE SAVE FIX IMPLEMENTED AND VERIFIED
