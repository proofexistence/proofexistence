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
import { web3AuthConfig } from './config';
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
  exportPrivateKey: () => Promise<string | null>;
  isExternalWallet: boolean;
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
          // Use verifierId if available (cast needed as type doesn't always include it)
          const verifierId = (userInfo as { verifierId?: string }).verifierId;
          userId = verifierId || userInfo.email || walletAddress;
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
    // Suppress MetaMask connection errors when extension is not installed
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (
        event.reason?.message?.includes('MetaMask') ||
        event.reason?.message?.includes('Failed to connect')
      ) {
        event.preventDefault();
        console.warn(
          '[Web3Auth] MetaMask not available:',
          event.reason?.message
        );
      }
    };
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    const init = async () => {
      try {
        if (!web3AuthConfig.clientId) {
          console.warn('[Web3Auth] No client ID configured');
          setIsLoading(false);
          return;
        }

        // Detect mobile browser to prevent auto MetaMask deep link on page load
        const isMobile =
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
          );

        console.log('[Web3Auth] Initializing...', {
          isMobile,
          clientId: web3AuthConfig.clientId ? 'present' : 'missing',
          network: web3AuthConfig.web3AuthNetwork,
        });

        const web3authInstance = new Web3Auth({
          clientId: web3AuthConfig.clientId,
          web3AuthNetwork: web3AuthConfig.web3AuthNetwork,
          // chainConfig, // Removed in Web3Auth v10, manage in dashboard or use privateKeyProvider
          uiConfig: {
            // Use redirect mode on mobile to avoid popup blockers
            mode: 'dark',
            uxMode: isMobile ? 'redirect' : 'popup',
          },
          // Disable Wallet Services to avoid 403 Forbidden on Base plan

          walletServicesConfig: {
            whiteLabel: {
              hideNftDisplay: true,
              hideTokenDisplay: true,
              hideTransfers: true,
              hideTopup: true,
              hideSwap: true,
              hideReceive: true,
            },
          },
        });

        web3authInstance.on(ADAPTER_EVENTS.CONNECTED, async () => {
          if (web3authInstance.provider) {
            try {
              setProvider(web3authInstance.provider);
              await fetchUserData(web3authInstance);
            } catch (error) {
              console.warn('[Web3Auth] Connected event error:', error);
              // Clear state on error
              setProvider(null);
              setUser(null);
              setIsConnected(false);
            }
          }
        });

        web3authInstance.on(ADAPTER_EVENTS.DISCONNECTED, () => {
          setIsConnected(false);
          setProvider(null);
          setUser(null);
        });

        // Handle adapter errors (e.g., MetaMask not found)
        web3authInstance.on(ADAPTER_EVENTS.ERRORED, (error) => {
          console.warn('[Web3Auth] Adapter error:', error);
        });

        console.log('[Web3Auth] Calling init()...');
        await web3authInstance.init().catch((initError) => {
          // Catch init errors but don't throw - allow app to continue
          console.warn('[Web3Auth] Init warning:', initError);
        });
        console.log(
          '[Web3Auth] Init complete, status:',
          web3authInstance.status
        );
        setWeb3auth(web3authInstance);

        // Check if already connected (session restore)
        if (web3authInstance.connected && web3authInstance.provider) {
          try {
            setProvider(web3authInstance.provider);
            await fetchUserData(web3authInstance);
          } catch (sessionError) {
            // Session restore failed (e.g., MetaMask not installed anymore)
            console.warn('[Web3Auth] Session restore failed:', sessionError);
            // Clear the invalid session
            try {
              await web3authInstance.logout();
            } catch {
              // Ignore logout errors
            }
            setProvider(null);
            setUser(null);
            setIsConnected(false);
          }
        }
      } catch (error) {
        console.error('[Web3Auth] Init error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();

    return () => {
      window.removeEventListener(
        'unhandledrejection',
        handleUnhandledRejection
      );
    };
  }, [fetchUserData]);

  const login = async () => {
    if (!web3auth) {
      console.error('[Web3Auth] Not initialized');
      return;
    }
    try {
      setIsLoggingIn(true);
      console.log('[Web3Auth] Calling connect(), status:', web3auth.status);
      const web3authProvider = await web3auth.connect();
      console.log('[Web3Auth] Connect complete, provider:', !!web3authProvider);
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

  // Export private key (only available for social login users with MPC wallets)
  const exportPrivateKey = async (): Promise<string | null> => {
    if (!web3auth) {
      console.warn('[Web3Auth] Web3Auth not initialized');
      throw new Error('Wallet not initialized. Please try again.');
    }

    if (!web3auth.connected || !web3auth.provider) {
      console.warn('[Web3Auth] Not connected or no provider');
      throw new Error('Wallet not connected. Please reconnect and try again.');
    }

    try {
      // Check if this is a social login (MPC wallet) - external wallets don't support export
      let userInfo;
      try {
        userInfo = await web3auth.getUserInfo();
      } catch {
        // getUserInfo fails for external wallets
        throw new Error(
          'Private key export is only available for social login users. External wallet users can export keys from their wallet app.'
        );
      }

      if (!userInfo?.email && !userInfo?.name) {
        throw new Error(
          'Private key export is only available for social login users. External wallet users can export keys from their wallet app.'
        );
      }

      console.log('[Web3Auth] Requesting private key export...');

      // Request private key from Web3Auth provider
      // This uses the openlogin adapter's capability to export the key
      const privateKey = (await web3auth.provider.request({
        method: 'eth_private_key',
      })) as string;

      if (!privateKey) {
        throw new Error('Failed to retrieve private key from provider');
      }

      console.log('[Web3Auth] Private key exported successfully');
      return privateKey;
    } catch (error) {
      console.error('[Web3Auth] Private key export failed:', error);
      // Provide user-friendly error messages
      if (error instanceof Error) {
        if (error.message.includes('User closed')) {
          throw new Error('Export cancelled by user');
        }
        if (
          error.message.includes('not supported') ||
          error.message.includes('Method not found')
        ) {
          throw new Error(
            'Private key export is not supported for your login method. Please use the wallet app to export your key.'
          );
        }
      }
      throw error;
    }
  };

  // Detect if user is using an external wallet (MetaMask, etc.)
  const isExternalWallet = !!(user?.walletAddress && !user?.email);

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
        exportPrivateKey,
        isExternalWallet,
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
  exportPrivateKey: async () => null,
  isExternalWallet: false,
};

export function useWeb3Auth() {
  const context = useContext(Web3AuthContext);
  return context || defaultContext;
}
