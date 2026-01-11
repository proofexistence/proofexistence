import { useMutation } from '@tanstack/react-query';
import { useWeb3Auth } from '@/lib/web3auth';

interface UploadPreviewParams {
  sessionId: string;
  imageBlob: Blob;
}

interface StandardSubmissionParams {
  sessionId: string;
  message: string;
  title: string;
  description: string;
  color: string;
}

interface InstantSubmissionParams {
  sessionId: string;
  imageData: string; // base64
  message: string;
  title: string;
  description: string;
  color: string;
  username: string;
  existingArweaveTxId?: string;
}

interface InstantSubmissionResponse {
  arweaveTxId: string;
  sessionData: {
    id?: string;
    user?: {
      username?: string;
      name?: string;
    };
  };
}

interface MintParams {
  sessionId: string;
  arweaveTxId: string;
  duration: number;
  paymentMethod: string;
  username: string;
  message: string;
}

export function useProofSubmission() {
  const { getIdToken, user } = useWeb3Auth();

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

  const uploadPreview = useMutation({
    mutationFn: async ({ sessionId, imageBlob }: UploadPreviewParams) => {
      const formData = new FormData();
      // Create a File object from the Blob to match existing logic
      const file = new File([imageBlob], 'preview.jpg', {
        type: 'image/jpeg',
      });
      formData.append('file', file);
      formData.append('sessionId', sessionId);

      // Note: fetch automatically sets Content-Type to multipart/form-data with boundary when body is FormData
      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload preview');
      }
    },
  });

  const submitStandard = useMutation({
    mutationFn: async (params: StandardSubmissionParams) => {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/session/submit-standard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Standard submission failed');
      }

      return await response.json();
    },
  });

  const submitInstant = useMutation({
    mutationFn: async (
      params: InstantSubmissionParams
    ): Promise<InstantSubmissionResponse> => {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/session/submit-instant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(
          err.details || err.error || 'Instant submission failed'
        );
      }

      return await response.json();
    },
  });

  const mintProof = useMutation({
    mutationFn: async (params: MintParams) => {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Minting failed');
      }

      return await response.json();
    },
  });

  return {
    uploadPreview,
    submitStandard,
    submitInstant,
    mintProof,
  };
}
