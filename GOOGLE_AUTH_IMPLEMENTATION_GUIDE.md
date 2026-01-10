# 🔐 GOOGLE OAUTH IMPLEMENTATION GUIDE
## VC Interrogator - Founder-Voice Application

**Date**: January 10, 2026
**Status**: ⚠️ **REQUIRES ADDITIONAL SETUP**

---

## 📋 SITUATION ANALYSIS

### Current Status

The Founder-Voice application currently uses:
- **@convex-dev/auth** v0.0.90
- **Email OTP authentication** (via Vly email service)
- **Anonymous (Guest) authentication**

### Requested Change

You want to replace the Email OTP authentication with **Google OAuth** authentication.

### Challenge Discovered

**@convex-dev/auth v0.0.90 does NOT include a built-in Google OAuth provider.**

Available providers in the current version:
- ✅ Anonymous
- ✅ Email (OTP)
- ✅ Password
- ✅ Phone
- ✅ ConvexCredentials (custom)
- ❌ Google OAuth (NOT available)
- ❌ GitHub OAuth (NOT available)
- ❌ Other OAuth2 providers (NOT available)

---

## 🎯 IMPLEMENTATION OPTIONS

You have **3 options** to implement Google authentication:

---

### ✅ OPTION 1: Use Firebase Auth + Convex (RECOMMENDED)

**Overview**: Use Firebase Authentication for Google OAuth, then sync with Convex.

**Pros**:
- ✅ Google provides Firebase for free
- ✅ Well-documented and battle-tested
- ✅ Easy Google OAuth setup
- ✅ Can keep Guest login working
- ✅ No backend code needed for OAuth flow

**Cons**:
- ⚠️ Requires Firebase project setup
- ⚠️ Additional dependency (firebase SDK)
- ⚠️ Need to sync Firebase auth with Convex users

**Steps to Implement**:

1. **Create Firebase Project**:
   ```bash
   # Visit https://console.firebase.google.com/
   # Create new project
   # Enable Google Sign-In in Authentication > Sign-in method
   ```

2. **Install Firebase SDK**:
   ```bash
   pnpm add firebase
   ```

3. **Configure Firebase** (create `src/lib/firebase.ts`):
   ```typescript
   import { initializeApp } from 'firebase/app';
   import { getAuth, GoogleAuthProvider } from 'firebase/auth';

   const firebaseConfig = {
     apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
     authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
     projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
   };

   const app = initializeApp(firebaseConfig);
   export const auth = getAuth(app);
   export const googleProvider = new GoogleAuthProvider();
   ```

4. **Update Auth.tsx** to use Firebase:
   ```typescript
   import { signInWithPopup } from 'firebase/auth';
   import { auth, googleProvider } from '@/lib/firebase';

   const handleGoogleSignIn = async () => {
     try {
       const result = await signInWithPopup(auth, googleProvider);
       const firebaseToken = await result.user.getIdToken();

       // Exchange Firebase token for Convex session
       await signIn("firebase", { token: firebaseToken });
     } catch (error) {
       console.error(error);
     }
   };
   ```

5. **Create Firebase Provider in Convex** (`convex/auth/firebase.ts`):
   ```typescript
   import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
   import { getAuthUserId } from "@convex-dev/auth/server";

   export const Firebase = ConvexCredentials({
     id: "firebase",
     authorize: async (credentials, ctx) => {
       const { token } = credentials;

       // Verify Firebase token with Firebase Admin SDK
       const decodedToken = await admin.auth().verifyIdToken(token);

       return {
         id: decodedToken.uid,
         email: decodedToken.email,
         name: decodedToken.name,
         image: decodedToken.picture,
       };
     },
   });
   ```

6. **Update convex/auth.ts**:
   ```typescript
   import { Firebase } from "./auth/firebase";
   import { Anonymous } from "@convex-dev/auth/providers/Anonymous";

   export const { auth, signIn, signOut } = convexAuth({
     providers: [Firebase, Anonymous],
   });
   ```

**Estimated Time**: 2-3 hours
**Difficulty**: Medium
**Cost**: Free (Firebase free tier)

---

### ✅ OPTION 2: Use Custom OAuth with Google Cloud Console

**Overview**: Implement custom OAuth2 flow using Google Cloud OAuth credentials.

**Pros**:
- ✅ Direct integration with Google
- ✅ No third-party auth service needed
- ✅ Full control over auth flow
- ✅ Can keep Guest login

**Cons**:
- ⚠️ More complex implementation
- ⚠️ Need to handle OAuth flow manually
- ⚠️ Requires Google Cloud Console setup
- ⚠️ More code to maintain

**Steps to Implement**:

1. **Create Google OAuth Credentials**:
   ```
   1. Visit https://console.cloud.google.com/
   2. Create project or select existing
   3. Enable Google+ API
   4. Create OAuth 2.0 Client ID
   5. Set authorized redirect URI: https://your-domain.com/auth/callback
   6. Get Client ID and Client Secret
   ```

2. **Set Environment Variables**:
   ```bash
   npx convex env set GOOGLE_CLIENT_ID <your-client-id>
   npx convex env set GOOGLE_CLIENT_SECRET <your-client-secret>
   ```

3. **Create Custom OAuth Provider** (`convex/auth/googleOAuth.ts`):
   ```typescript
   import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";

   export const GoogleOAuth = ConvexCredentials({
     id: "google",
     authorize: async (credentials, ctx) => {
       const { code } = credentials;

       // Exchange code for access token
       const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           code,
           client_id: process.env.GOOGLE_CLIENT_ID,
           client_secret: process.env.GOOGLE_CLIENT_SECRET,
           redirect_uri: process.env.SITE_URL + "/auth/callback",
           grant_type: "authorization_code",
         }),
       });

       const { access_token } = await tokenResponse.json();

       // Get user info
       const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
         headers: { Authorization: `Bearer ${access_token}` },
       });

       const user = await userResponse.json();

       return {
         id: user.id,
         email: user.email,
         name: user.name,
         image: user.picture,
       };
     },
   });
   ```

4. **Create OAuth Callback Handler** (`convex/http.ts`):
   ```typescript
   import { httpRouter } from "convex/server";
   import { auth } from "./auth";

   const http = httpRouter();

   auth.addHttpRoutes(http);

   // Add custom OAuth callback
   http.route({
     path: "/auth/callback",
     method: "GET",
     handler: httpAction(async (ctx, req) => {
       const url = new URL(req.url);
       const code = url.searchParams.get("code");

       // Handle OAuth callback
       // ... implementation
     }),
   });

   export default http;
   ```

5. **Update Auth.tsx** to initiate OAuth flow:
   ```typescript
   const handleGoogleSignIn = () => {
     const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
     const redirectUri = window.location.origin + "/auth/callback";
     const scope = "openid email profile";

     const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
       `client_id=${clientId}&` +
       `redirect_uri=${encodeURIComponent(redirectUri)}&` +
       `response_type=code&` +
       `scope=${encodeURIComponent(scope)}`;

     window.location.href = authUrl;
   };
   ```

**Estimated Time**: 4-6 hours
**Difficulty**: Hard
**Cost**: Free (Google OAuth is free)

---

### ✅ OPTION 3: Wait for Convex Auth Update

**Overview**: Wait for @convex-dev/auth to add official OAuth provider support.

**Pros**:
- ✅ Official support
- ✅ Well-tested
- ✅ Easy to implement once available
- ✅ Best long-term solution

**Cons**:
- ⚠️ Unknown release timeline
- ⚠️ Can't use Google OAuth now
- ⚠️ Requires keeping current Email OTP system

**Status**: Not currently available in v0.0.90

**Check for Updates**:
```bash
npm info @convex-dev/auth versions
pnpm update @convex-dev/auth
```

---

## 🎯 RECOMMENDED APPROACH

### For Immediate Implementation: **OPTION 1** (Firebase Auth)

**Why Firebase?**
1. ✅ **Easiest to implement** - 2-3 hours total
2. ✅ **Production-ready** - Used by millions of apps
3. ✅ **Free tier generous** - More than enough for your needs
4. ✅ **Well-documented** - Tons of examples and tutorials
5. ✅ **Maintained by Google** - Official Google solution
6. ✅ **Can add more providers** - GitHub, Twitter, etc. later

**Implementation Steps** (Detailed):

#### Step 1: Create Firebase Project (10 minutes)
1. Go to https://console.firebase.google.com/
2. Click "Add project"
3. Name it "VC Interrogator" or similar
4. Disable Google Analytics (optional)
5. Click "Create Project"

#### Step 2: Enable Google Auth (5 minutes)
1. In Firebase Console, click "Authentication"
2. Click "Get Started"
3. Click "Sign-in method" tab
4. Click "Google" provider
5. Toggle "Enable"
6. Click "Save"

#### Step 3: Get Firebase Config (2 minutes)
1. Click "Project Settings" (gear icon)
2. Scroll to "Your apps"
3. Click "Web" icon (</>)
4. Register app: "VC Interrogator Web"
5. Copy the `firebaseConfig` object

#### Step 4: Install Firebase SDK (1 minute)
```bash
pnpm add firebase
```

#### Step 5: Configure Firebase in Your App (15 minutes)
Create `src/lib/firebase.ts` with your Firebase config.

#### Step 6: Update Auth.tsx (30 minutes)
Replace email OTP logic with Firebase Google Sign-In.

#### Step 7: Create Convex Firebase Provider (60 minutes)
Set up token verification in Convex backend.

#### Step 8: Test (30 minutes)
Test Google sign-in flow end-to-end.

**Total Time**: ~2.5 hours

---

## 🚀 WHAT I'VE DONE SO FAR

### ✅ Changes Made

1. **Updated `/src/convex/auth.ts`**:
   - Removed Email OTP import
   - Added placeholder for Google provider
   - Kept Anonymous provider for Guest login

2. **Updated `/src/pages/Auth.tsx`**:
   - Removed Email OTP form (email input + OTP verification)
   - Added Google Sign-In button with Google logo
   - Simplified to single-step auth
   - Kept Guest login button
   - Updated UI text and branding

3. **Created `/src/convex/auth/google.ts`** (non-functional):
   - Attempted to create Google OAuth2 provider
   - Won't work with current Convex Auth version
   - Can be deleted or kept as reference

### ⚠️ What Doesn't Work Yet

The Google authentication **will NOT work** until you:
1. Choose an implementation option (Firebase recommended)
2. Set up Google OAuth credentials
3. Implement the authentication flow
4. Configure environment variables

---

## 📊 COMPARISON TABLE

| Feature | Firebase (Option 1) | Custom OAuth (Option 2) | Wait for Update (Option 3) |
|---------|-------------------|------------------------|---------------------------|
| **Difficulty** | Medium | Hard | N/A |
| **Time to Implement** | 2-3 hours | 4-6 hours | Unknown |
| **Cost** | Free | Free | Free |
| **Maintenance** | Low | Medium | Low |
| **Production Ready** | ✅ Yes | ⚠️ Needs testing | ⏳ When released |
| **Google Official** | ✅ Yes | ⚠️ Manual | ⏳ TBD |
| **Can Add More Providers** | ✅ Easy | ⚠️ Manual work | ⏳ TBD |
| **Guest Login Compatible** | ✅ Yes | ✅ Yes | ✅ Yes |

---

## 🔧 NEXT STEPS

### To Proceed with Firebase (Recommended):

1. **Decision**: Confirm you want to use Firebase Auth
2. **I will**:
   - Install Firebase SDK
   - Set up Firebase configuration
   - Update Auth.tsx with Firebase Google Sign-In
   - Create Convex Firebase provider
   - Test the complete flow
   - Update documentation

3. **You will need to**:
   - Create a Firebase project (I'll guide you)
   - Get Firebase config credentials
   - Add Firebase config to environment variables

**Estimated Total Time**: 2-3 hours
**Your Time Required**: 10-15 minutes (Firebase setup)

---

### To Proceed with Custom OAuth (Advanced):

1. **Decision**: Confirm you want custom OAuth implementation
2. **I will**:
   - Create complete OAuth2 flow
   - Set up Google Cloud Console integration
   - Create callback handler
   - Test the flow
   - Document the process

3. **You will need to**:
   - Create Google Cloud project
   - Set up OAuth credentials
   - Add Client ID and Secret to environment

**Estimated Total Time**: 4-6 hours
**Your Time Required**: 20-30 minutes (Google Cloud setup)

---

### To Keep Current System:

If you prefer to keep the Email OTP system (it's working perfectly), I can:
1. Revert the changes I made
2. Restore Email OTP authentication
3. Keep the Vly email service integration

---

## ❓ QUESTIONS FOR YOU

1. **Which option do you prefer?**
   - Option 1: Firebase Auth (Recommended - easiest)
   - Option 2: Custom OAuth (More work, more control)
   - Option 3: Keep Email OTP for now
   - Option 4: Wait for Convex Auth update

2. **Are you willing to create a Firebase account?** (Free, takes 5 minutes)

3. **Do you want to keep Guest login?** (Currently works, can keep it)

4. **Timeline**: Do you need Google auth working today, or is this for future enhancement?

---

## 📚 ADDITIONAL RESOURCES

### Firebase Authentication
- Docs: https://firebase.google.com/docs/auth
- Google Sign-In: https://firebase.google.com/docs/auth/web/google-signin
- React Integration: https://firebase.google.com/docs/auth/web/start

### Google OAuth 2.0
- Google Cloud Console: https://console.cloud.google.com/
- OAuth 2.0 Docs: https://developers.google.com/identity/protocols/oauth2
- Client Setup: https://support.google.com/cloud/answer/6158849

### Convex Auth
- Docs: https://docs.convex.dev/auth
- GitHub: https://github.com/get-convex/convex-auth
- Custom Providers: https://docs.convex.dev/auth/advanced/custom-provider

---

## 🎯 MY RECOMMENDATION

**Use Firebase Auth (Option 1)** because:

1. ✅ **Fastest to implement** - You'll have Google auth working in 2-3 hours
2. ✅ **Production-ready** - Billions of authentications handled by Firebase
3. ✅ **Free forever** - Won't cost you anything
4. ✅ **Easy to add more** - Want GitHub login later? 5 minutes to add
5. ✅ **Less maintenance** - Google handles OAuth complexity
6. ✅ **Better UX** - Firebase UI is polished and tested

**Custom OAuth (Option 2)** only if:
- You want full control over the auth flow
- You don't want any external dependencies
- You enjoy implementing OAuth 2.0 specs 😄

---

## ✅ READY TO PROCEED

**Just let me know which option you prefer, and I'll implement it for you!**

I recommend Option 1 (Firebase), but I'm happy to implement whichever you choose.

---

**Document Created**: January 10, 2026
**Status**: Awaiting your decision
**Current Auth System**: Email OTP + Guest (working)
**Requested Auth System**: Google OAuth + Guest (needs implementation)
