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
  isLoggingIn: boolean;
  isConnected: boolean;
  user: Web3AuthUser | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const Web3AuthContext = createContext<Web3AuthContextType | null>(null);

export function Web3AuthProvider({ children }: { children: ReactNode }) {
  const [web3auth, setWeb3auth] = useState<Web3Auth | null>(null);
  const [provider, setProvider] = useState<IProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState<Web3AuthUser | null>(null);

  const fetchUserData = useCallback(async (web3authInstance: Web3Auth) => {
    if (!web3authInstance.provider) return;

    try {
      // Get wallet address (with retry for session restore timing)
      let accounts: string[] = [];
      for (let i = 0; i < 5; i++) {
        accounts = (await web3authInstance.provider.request({
          method: 'eth_accounts',
        })) as string[];

        if (accounts && accounts.length > 0) break;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      if (!accounts || accounts.length === 0) return;

      const walletAddress = ethers.getAddress(accounts[0]);

      // Default to wallet address for external wallets
      let userId = walletAddress;
      let email: string | null = null;
      let name: string | null = null;
      let profileImage: string | null = null;

      // Try to get user info (only available for social logins)
      try {
        const userInfo = await web3authInstance.getUserInfo();
        if (userInfo) {
          userId = userInfo.verifierId || userInfo.email || walletAddress;
          email = userInfo.email || null;
          name = userInfo.name || null;
          profileImage = userInfo.profileImage || null;
        }
      } catch {
        // External wallet - no user info available, use defaults
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
      setIsLoggingIn(true);
      const web3authProvider = await web3auth.connect();
      setProvider(web3authProvider);
      await fetchUserData(web3auth);
    } catch (error) {
      console.error('[Web3Auth] Login error:', error);
    } finally {
      setIsLoggingIn(false);
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

  // Note: Web3Auth Modal SDK doesn't expose authenticateUser directly
  // API auth uses wallet address header instead (set in getAuthHeaders)
  const getIdToken = async (): Promise<string | null> => {
    // Token-based auth not available with Modal SDK
    // Use X-Wallet-Address header for API authentication
    return null;
  };

  return (
    <Web3AuthContext.Provider
      value={{
        provider,
        isLoading,
        isLoggingIn,
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
  isLoggingIn: false,
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
