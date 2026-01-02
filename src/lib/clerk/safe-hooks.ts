'use client';

import {
  useClerk as useClerkOriginal,
  useUser as useUserOriginal,
  useAuth as useAuthOriginal,
} from '@clerk/nextjs';

// Default no-op functions for SSR/SSG
const noopSignOut = async () => {};
const noopOpenSignIn = () => {};

/**
 * Safe wrapper for useClerk that returns default values during SSR/SSG
 */
export function useClerkSafe() {
  try {
    const clerk = useClerkOriginal();
    return clerk;
  } catch {
    // Return no-op functions during SSR/SSG when ClerkProvider is not available
    return {
      signOut: noopSignOut,
      openSignIn: noopOpenSignIn,
      openSignUp: noopOpenSignIn,
      openUserProfile: noopOpenSignIn,
    };
  }
}

/**
 * Safe wrapper for useUser that returns default values during SSR/SSG
 */
export function useUserSafe() {
  try {
    const user = useUserOriginal();
    return user;
  } catch {
    // Return default state during SSR/SSG
    return {
      user: null,
      isLoaded: false,
      isSignedIn: false,
    };
  }
}

/**
 * Safe wrapper for useAuth that returns default values during SSR/SSG
 */
export function useAuthSafe() {
  try {
    const auth = useAuthOriginal();
    return auth;
  } catch {
    // Return default state during SSR/SSG
    return {
      isLoaded: false,
      isSignedIn: false,
      userId: null,
      sessionId: null,
      orgId: null,
      orgRole: null,
      orgSlug: null,
      getToken: async () => null,
      signOut: async () => {},
    };
  }
}
