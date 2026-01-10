# 🧪 TEST MODE - Authentication Disabled

**Status**: Authentication barriers have been temporarily disabled for testing.

## What Was Changed

### Frontend
- `src/pages/WarRoom.tsx` - Commented out auth redirect
- `src/pages/Landing.tsx` - Direct navigation enabled

### Backend
- `src/convex/sessions.ts` - Auth checks disabled, test user auto-created

## How to Test

1. **Start the app**:
   ```bash
   pnpm dev
   ```

2. **Navigate directly to any page**:
   - `/` - Landing page
   - `/war-room` - Create pitch session (no login required)
   - `/hot-seat/:sessionId` - Live pitch (after creating session)
   - `/report/:sessionId` - View report (after pitch)
   - `/mentorship/:sessionId` - Get coaching (after pitch)

3. **Test the flow**:
   - Go to `/war-room`
   - Enter pitch text or upload PDF
   - Click "Start Hot Seat"
   - System will auto-create a test user

## Auto-Created Test User

When you create a session without being logged in:
- Email: `test@example.com`
- Name: `Test User`
- All your sessions will be associated with this user

## To Re-Enable Authentication

When you're done testing and want to restore authentication:

1. Uncomment auth checks in `/src/pages/WarRoom.tsx`
2. Restore auth checks in `/src/convex/sessions.ts`
3. Or run: `git checkout src/pages/WarRoom.tsx src/convex/sessions.ts`

## Important Notes

⚠️ **This is for testing only!** Do NOT deploy to production with auth disabled.

✅ **Guest login still works** - Users can still click "Continue as Guest" on `/auth`

✅ **All features functional** - AI, database, file uploads all working
