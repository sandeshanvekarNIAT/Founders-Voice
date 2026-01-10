import { OAuth2Provider } from "@convex-dev/auth/providers/OAuth";

// Google OAuth2 provider configuration
export const Google = OAuth2Provider<{
  issuer?: string;
}>({
  id: "google",
  authorization: {
    url: "https://accounts.google.com/o/oauth2/v2/auth",
    params: {
      scope: "openid email profile",
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
    },
  },
  token: {
    url: "https://oauth2.googleapis.com/token",
    conform: async (response) => {
      if (response.ok) {
        const body = await response.json();
        if (typeof body.access_token === "string") {
          return new Response(
            JSON.stringify({
              access_token: body.access_token,
              token_type: "Bearer",
              expires_in: body.expires_in,
              refresh_token: body.refresh_token,
              scope: body.scope,
              id_token: body.id_token,
            }),
            { headers: { "Content-Type": "application/json" } }
          );
        }
      }
      return response;
    },
  },
  userinfo: {
    url: "https://www.googleapis.com/oauth2/v3/userinfo",
    request: async ({ tokens, provider }) => {
      return await fetch(provider.userinfo!.url!, {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });
    },
  },
  profile(profile) {
    return {
      id: profile.sub,
      name: profile.name,
      email: profile.email,
      emailVerified: profile.email_verified,
      image: profile.picture,
    };
  },
});
