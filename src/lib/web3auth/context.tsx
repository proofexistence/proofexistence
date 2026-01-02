'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { Web3Auth } from '@web3auth/modal';
import { ADAPTER_EVENTS, type IProvider } from '@web3auth/base';
import { web3AuthConfig, chainConfig } from './config';
import { ethers } from 'ethers';

export interface Web3AuthUser {
  // From ID token
  userId: string; // Like clerkId - unique identifier
  walletAddress: string;
  email: string | null;
  name: string | null;
  profileImage: string | null;
}

interface Web3AuthContextType {
  provider: IProvider | null;
  isLoading: boolean;
  isConnected: boolean;
  user: Web3AuthUser | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const Web3AuthContext = createContext<Web3AuthContextType | null>(null);

// Decode JWT payload (without verification - server will verify)
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

export function Web3AuthProvider({ children }: { children: ReactNode }) {
  const [web3auth, setWeb3auth] = useState<Web3Auth | null>(null);
  const [provider, setProvider] = useState<IProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState<Web3AuthUser | null>(null);

  const fetchUserData = useCallback(async (web3authInstance: Web3Auth) => {
    if (!web3authInstance.provider) return;

    try {
      // Get wallet address
      const accounts = (await web3authInstance.provider.request({
        method: 'eth_accounts',
      })) as string[];

      if (!accounts || accounts.length === 0) {
        console.error('[Web3Auth] No accounts found');
        return;
      }

      const walletAddress = ethers.getAddress(accounts[0]); // Checksum

      // Get ID token with all user info
      let userId = walletAddress; // Default to wallet address
      let email: string | null = null;
      let name: string | null = null;
      let profileImage: string | null = null;

      try {
        const authMethod = (
          web3authInstance as unknown as {
            authenticateUser: () => Promise<{ idToken: string }>;
          }
        ).authenticateUser;

        if (authMethod) {
          const { idToken } = await authMethod.call(web3authInstance);
          const payload = decodeJwtPayload(idToken);

          if (payload) {
            // Use userId from token (like clerkId)
            userId =
              (payload.userId as string) ||
              (payload.sub as string) ||
              walletAddress;
            email = (payload.email as string) || null;
            name = (payload.name as string) || null;
            profileImage = (payload.profileImage as string) || null;

            console.log('[Web3Auth] User info from token:', {
              userId,
              email,
              name,
            });
          }
        }
      } catch {
        // External wallet - use wallet address as userId
        console.log('[Web3Auth] No ID token, using wallet as userId');
      }

      setUser({ userId, walletAddress, email, name, profileImage });
      setIsConnected(true);
    } catch (error) {
      console.error('[Web3Auth] Error fetching user data:', error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        if (!web3AuthConfig.clientId) {
          console.warn('[Web3Auth] No client ID configured');
          setIsLoading(false);
          return;
        }

        const web3authInstance = new Web3Auth({
          clientId: web3AuthConfig.clientId,
          web3AuthNetwork: web3AuthConfig.web3AuthNetwork,
          // @ts-expect-error - chainConfig exists in IWeb3AuthCoreOptions but not in modal's Web3AuthOptions
          chainConfig,
          uiConfig: {
            appName: 'Proof of Existence',
            mode: 'dark',
            loginMethodsOrder: ['google', 'twitter', 'email_passwordless'],
          },
        });

        web3authInstance.on(ADAPTER_EVENTS.CONNECTED, async () => {
          if (web3authInstance.provider) {
            setProvider(web3authInstance.provider);
            await fetchUserData(web3authInstance);
          }
        });

        web3authInstance.on(ADAPTER_EVENTS.DISCONNECTED, () => {
          setIsConnected(false);
          setProvider(null);
          setUser(null);
        });

        await web3authInstance.init();
        setWeb3auth(web3authInstance);

        // Check if already connected (session restore)
        if (web3authInstance.connected && web3authInstance.provider) {
          setProvider(web3authInstance.provider);
          await fetchUserData(web3authInstance);
        }
      } catch (error) {
        console.error('[Web3Auth] Init error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [fetchUserData]);

  const login = async () => {
    if (!web3auth) {
      console.error('[Web3Auth] Not initialized');
      return;
    }
    try {
      const web3authProvider = await web3auth.connect();
      setProvider(web3authProvider);
      await fetchUserData(web3auth);
    } catch (error) {
      console.error('[Web3Auth] Login error:', error);
    }
  };

  const logout = async () => {
    if (!web3auth) return;
    try {
      await web3auth.logout();
      setProvider(null);
      setUser(null);
      setIsConnected(false);
    } catch (error) {
      console.error('[Web3Auth] Logout error:', error);
    }
  };

  const getIdToken = async (): Promise<string | null> => {
    if (!web3auth || !web3auth.connected) return null;
    try {
      const authMethod = (
        web3auth as unknown as {
          authenticateUser: () => Promise<{ idToken: string }>;
        }
      ).authenticateUser;

      if (authMethod) {
        const { idToken } = await authMethod.call(web3auth);
        return idToken;
      }
    } catch (error) {
      console.error('[Web3Auth] Error getting ID token:', error);
    }
    return null;
  };

  return (
    <Web3AuthContext.Provider
      value={{
        provider,
        isLoading,
        isConnected,
        user,
        login,
        logout,
        getIdToken,
      }}
    >
      {children}
    </Web3AuthContext.Provider>
  );
}

// Default context for SSR/SSG
const defaultContext: Web3AuthContextType = {
  provider: null,
  isLoading: true,
  isConnected: false,
  user: null,
  login: async () => {},
  logout: async () => {},
  getIdToken: async () => null,
};

export function useWeb3Auth() {
  const context = useContext(Web3AuthContext);
  return context || defaultContext;
}
