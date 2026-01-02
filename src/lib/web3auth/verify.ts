import * as jose from 'jose';

// JWKS endpoints for different auth types
const SOCIAL_JWKS_URL = 'https://api-auth.web3auth.io/jwks';
const EXTERNAL_WALLET_JWKS_URL = 'https://authjs.web3auth.io/jwks';

export interface VerifiedWeb3AuthUser {
  walletAddress: string;
  email: string | null;
  name: string | null;
  loginType: 'social' | 'external_wallet';
  verifierId: string | null;
}

// Cache JWKS for performance
let socialJwks: ReturnType<typeof jose.createRemoteJWKSet> | null = null;
let externalJwks: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

function getSocialJwks() {
  if (!socialJwks) {
    socialJwks = jose.createRemoteJWKSet(new URL(SOCIAL_JWKS_URL));
  }
  return socialJwks;
}

function getExternalJwks() {
  if (!externalJwks) {
    externalJwks = jose.createRemoteJWKSet(new URL(EXTERNAL_WALLET_JWKS_URL));
  }
  return externalJwks;
}

interface Web3AuthJwtPayload {
  wallets?: Array<{
    address?: string;
    public_key?: string;
    type?: string;
  }>;
  email?: string;
  name?: string;
  verifier_id?: string;
}

export async function verifyWeb3AuthToken(
  idToken: string
): Promise<VerifiedWeb3AuthUser | null> {
  // Try social login verification first
  try {
    const jwks = getSocialJwks();
    const { payload } = await jose.jwtVerify(idToken, jwks, {
      algorithms: ['ES256'],
    });

    const typedPayload = payload as unknown as Web3AuthJwtPayload;
    const wallets = typedPayload.wallets;

    if (!wallets || wallets.length === 0 || !wallets[0].address) {
      throw new Error('No wallet address in social token');
    }

    return {
      walletAddress: wallets[0].address,
      email: typedPayload.email || null,
      name: typedPayload.name || null,
      loginType: 'social',
      verifierId: typedPayload.verifier_id || null,
    };
  } catch {
    // Try external wallet verification
    try {
      const jwks = getExternalJwks();
      const { payload } = await jose.jwtVerify(idToken, jwks, {
        algorithms: ['ES256'],
      });

      const typedPayload = payload as unknown as Web3AuthJwtPayload;
      const wallets = typedPayload.wallets;

      if (!wallets || wallets.length === 0 || !wallets[0].address) {
        throw new Error('No wallet address in external token');
      }

      return {
        walletAddress: wallets[0].address,
        email: null,
        name: null,
        loginType: 'external_wallet',
        verifierId: null,
      };
    } catch (error) {
      console.error('[Web3Auth] Token verification failed:', error);
      return null;
    }
  }
}
