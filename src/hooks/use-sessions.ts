import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWeb3Auth } from '@/lib/web3auth';

import { TrailPoint } from '@/types/session';

interface CreateSessionParams {
  duration: number;
  points: TrailPoint[];
  sectorId: number;
  color: string;
}

interface CreateSessionResponse {
  session: {
    id: string;
    // Add other fields if needed, but ID is what we primarily need
  };
}

export function useSessions() {
  const { getIdToken, user } = useWeb3Auth();
  const queryClient = useQueryClient();

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const token = await getIdToken();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    if (user?.walletAddress) {
      return { 'X-Wallet-Address': user.walletAddress };
    }
    throw new Error('Not authenticated');
  };

  const createSession = useMutation({
    mutationFn: async (params: CreateSessionParams) => {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create session');
      }

      const data: CreateSessionResponse = await response.json();
      return data.session.id;
    },
    onError: (error) => {
      console.error('Failed to create session:', error);
    },
  });

  const deleteSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/sessions?id=${sessionId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to delete session');
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries if we had a list of sessions
      // queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
    onError: (error) => {
      console.error('Failed to delete session:', error);
    },
  });

  return {
    createSession,
    deleteSession,
  };
}
