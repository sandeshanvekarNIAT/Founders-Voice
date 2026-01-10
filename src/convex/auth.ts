// Google OAuth authentication with Convex Auth

import { convexAuth } from "@convex-dev/auth/server";
import { Google } from "./auth/google";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google, Anonymous],
});