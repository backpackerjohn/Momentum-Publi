# Security Specification for Momentum AI

## Data Invariants
1. Application data must always belong to a specific user.
2. Users can only read and write their own data.
3. Document IDs must be valid strings to prevent resource poisoning.
4. User profiles are immutable once created, except for potential future updates (currently minimal).

## The "Dirty Dozen" Payloads

1. **Identity Theft (Write)**: Attempting to write to another user's `appData`.
   - Path: `/users/victim_uid/appData/brainDumpItems`
   - Payload: `{ "data": [] }` (as `attacker_uid`)
   - Outcome: `PERMISSION_DENIED`

2. **Identity Theft (Read)**: Attempting to read another user's `appData`.
   - Path: `/users/victim_uid/appData/brainDumpItems`
   - Outcome: `PERMISSION_DENIED`

3. **Shadow Field Injection**: Adding unexpected fields to `appData`.
   - Path: `/users/my_uid/appData/brainDumpItems`
   - Payload: `{ "data": [], "isAdmin": true }`
   - Outcome: `PERMISSION_DENIED` (via `affectedKeys().hasOnly(['data'])`)

4. **Resource Poisoning (ID)**: Using a massive string as a document ID.
   - Path: `/users/my_uid/appData/A`.repeat(2000)
   - Outcome: `PERMISSION_DENIED` (via `isValidId()`)

5. **Value Poisoning (Type)**: Writing a string where an object is expected for `data`.
   - Path: `/users/my_uid/appData/settings`
   - Payload: `{ "data": "evil_string" }`
   - Outcome: `PERMISSION_DENIED` (via `isValidAppData()`)

6. **Unauthenticated Write**: Writing while not signed in.
   - Path: `/users/some_uid/appData/tasks`
   - Outcome: `PERMISSION_DENIED`

7. **Email Spoofing**: Attempting to access data using an unverified email (if email checks were active).
   - Outcome: `PERMISSION_DENIED`

8. **Orphaned Write**: Writing `appData` for a user that hasn't been created in the root collection (if required).
   - Outcome: `PERMISSION_DENIED` (via `exists()`)

9. **Terminal State Lockdown Bypass**: (Not applicable yet as there are no terminal states defined).

10. **Admin Check Spoof**: Trying to set `isAdmin` in a user profile.
    - Outcome: `PERMISSION_DENIED`

11. **Massive Payload Denial of Wallet**: Sending a very large JSON blob.
    - Result: Partially handled by Firestore limits, but schema checks help.

12. **Recursive Path Attack**: Trying to access `users/uid/appData/doc/secret/data`.
    - Outcome: `PERMISSION_DENIED` (via default-deny and explicit path matching)

## Test Runner (Mock Tests)
- `test('should deny access to other users data')`
- `test('should enforce schema on appData')`
- `test('should validate document IDs')`
