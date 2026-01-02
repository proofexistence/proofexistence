'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

// Type declaration for window.ethereum (MetaMask/Web3 wallets)
declare global {
  interface Window {
    ethereum?: import('ethers').providers.ExternalProvider;
  }
}
import { Canvas, useThree, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { LightTrail, CometHead, SpaceBackground } from './light-trail';
import { DotMatrix } from './DotMatrix';
import { CaptureScene } from './canvas-capture-scene';
import { ParticleSystem } from './particles';
import {
  TimerDisplay,
  ColorPicker,
  ActionButtons,
  Instructions,
  ExitControls,
  BackgroundOverlay,
  ClearConfirmModal,
  SubmissionModal,
} from './canvas-ui';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTrailRecorder } from '@/hooks/use-trail-recorder';
import { useGravity } from '@/hooks/use-gravity';
import { TrailPoint, MIN_SESSION_DURATION } from '@/types/session';
import { TRAIL_COLORS } from './light-trail';
import { useUser, useAuth, useClerk } from '@clerk/nextjs';
import { ethers } from 'ethers';
import {
  PROOF_OF_EXISTENCE_ADDRESS,
  PROOF_OF_EXISTENCE_ABI,
  TIME26_ADDRESS,
  TIME26_ABI,
  BLOCK_EXPLORER,
} from '@/lib/contracts';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useProfile } from '@/hooks/use-profile';

// Helper for RPC provider with fallbacks
const getPublicProvider = () => {
  const isTestnet =
    process.env.NEXT_PUBLIC_IS_TESTNET === 'true' ||
    (process.env.NODE_ENV === 'development' &&
      process.env.NEXT_PUBLIC_IS_TESTNET !== 'false');

  // Use env var if set, otherwise use reliable public RPCs
  const rpcUrl =
    process.env.NEXT_PUBLIC_RPC_URL ||
    (isTestnet
      ? 'https://polygon-amoy-bor-rpc.publicnode.com'
      : 'https://polygon-bor-rpc.publicnode.com');

  return new ethers.providers.JsonRpcProvider(rpcUrl);
};

// Raycaster plane for mouse tracking
const TrackingPlane = ({
  onMove,
  onPointerDown,
  onPointerUp,
  isRecording,
}: {
  onMove: (x: number, y: number, z: number) => void;
  onPointerDown: () => void;
  onPointerUp: () => void;
  isRecording: boolean;
}) => {
  // Handle Mouse Down (Start)
  const handleDown = (event: ThreeEvent<PointerEvent>) => {
    if (event.button === 0) {
      // Left mouse button
      event.stopPropagation();
      // Capture pointer to ensure we get the 'up' event even if cursor drifts off
      (event.target as HTMLElement).setPointerCapture(event.pointerId);
      onPointerDown();
    }
  };

  // Handle Mouse Up (Stop)
  const handleUp = (event: ThreeEvent<PointerEvent>) => {
    if (event.button === 0) {
      event.stopPropagation();
      (event.target as HTMLElement).releasePointerCapture(event.pointerId);
      onPointerUp();
    }
  };

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (isRecording) {
      event.stopPropagation();
      const { point } = event;
      onMove(point.x, point.y, point.z);
    }
  };

  return (
    <mesh
      visible={true}
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerMove={handlePointerMove}
      onClick={(e) => {
        e.stopPropagation();
        // Prevent nextjs-toploader from catching this as a navigation event
        if (e.nativeEvent) {
          e.nativeEvent.stopImmediatePropagation();
          e.nativeEvent.stopPropagation();
        }
      }}
    >
      <planeGeometry args={[10000, 10000]} />
      <meshBasicMaterial side={THREE.DoubleSide} transparent opacity={0.0} />
    </mesh>
  );
};

// Main scene content
function Scene({
  isRecording,
  points,
  cursorPosition,
  trailColor,
  onMove,
  onPointerDown,
  onPointerUp,
  shouldResetCamera,
  onCameraReset,
  zoomLevel,
  theme,
}: {
  isRecording: boolean;
  points: TrailPoint[];
  cursorPosition: [number, number, number];
  trailColor: string;
  onMove: (x: number, y: number, z: number) => void;
  onPointerDown: () => void;
  onPointerUp: () => void;
  shouldResetCamera: boolean;
  onCameraReset: () => void;
  zoomLevel: number;
  theme: BrandTheme;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null); // OrbitControls type is hard to import sometimes, keeping any for now but could use OrbitControlsImpl
  const isInteractingRef = useRef(false);
  const { camera } = useThree();

  // Smoothly interpolate camera position for zoom
  useFrame(() => {
    // Only apply custom zoom force if not manually interacting
    if (controlsRef.current && zoomLevel !== 0 && !isInteractingRef.current) {
      // Target distance based on zoom level (inverted: higher zoom = closer)
      const targetDist = 12 - zoomLevel * 5; // Base 12, zoom range +/-
      const currentDist = camera.position.length();

      if (Math.abs(currentDist - targetDist) > 0.1) {
        // Smooth lerp
        const smoothSpeed = 0.05;
        const dir = camera.position.clone().normalize();
        const newPos = dir.multiplyScalar(
          THREE.MathUtils.lerp(currentDist, targetDist, smoothSpeed)
        );
        camera.position.copy(newPos);
      }
    }
  });

  // Reset camera when shouldResetCamera is true
  useEffect(() => {
    if (shouldResetCamera && controlsRef.current) {
      camera.position.set(0, 0, 12);
      camera.lookAt(0, 0, 0);
      controlsRef.current.reset();
      onCameraReset();
    }
  }, [shouldResetCamera, camera, onCameraReset]);

  return (
    <>
      {/* Minimal ambient light */}
      <ambientLight intensity={0.2} />

      {/* Space background with stars */}
      <SpaceBackground starCount={800} />

      {/* The Main Art: Dot Matrix */}
      <DotMatrix
        cursorPosition={cursorPosition}
        isRecording={true} // Always reactive for fun interaction
        theme={theme}
      />

      {/* Ambient Floating Particles */}
      <ParticleSystem
        count={150}
        color={theme.particleColor}
        area={[30, 30, 30]}
      />

      {/* Invisible plane for mouse tracking */}
      <TrackingPlane
        onMove={onMove}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        isRecording={isRecording}
      />

      {/* The comet light trail */}
      <LightTrail points={points} color={trailColor} />

      {/* Comet head at cursor */}
      <CometHead
        position={cursorPosition}
        color={trailColor}
        isActive={isRecording}
      />

      {/* Camera controls - scroll to zoom only */}
      <OrbitControls
        ref={controlsRef}
        enabled={true} // Always enabled to allow scrolling while drawing
        enableRotate={false}
        enableZoom={false} // Disable zoom for consistent experience
        enablePan={false}
        minDistance={2}
        maxDistance={60}
        autoRotate={false}
        zoomSpeed={1.2}
        onStart={() => {
          isInteractingRef.current = true;
        }}
        onEnd={() => {
          isInteractingRef.current = false;
        }}
      />
    </>
  );
}

// Helper to capture canvas screenshot (Square Crop)
const CanvasCapture = ({
  captureRef,
}: {
  captureRef: React.MutableRefObject<{ capture: () => string } | null>;
}) => {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    captureRef.current = {
      capture: () => {
        // 1. Render explicitly - REMOVED to avoid fighting R3F loop
        // gl.render(scene, camera);

        // 2. Get the raw canvas
        const canvas = gl.domElement;

        // 3. Calculate square crop (centered)
        const size = Math.min(canvas.width, canvas.height);
        const x = (canvas.width - size) / 2;
        const y = (canvas.height - size) / 2;

        // 4. Create temporary canvas for cropping
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = size;
        tempCanvas.height = size;
        const ctx = tempCanvas.getContext('2d');

        if (ctx) {
          // Fill black background first (to match scene)
          ctx.fillStyle = '#050508';
          ctx.fillRect(0, 0, size, size);

          // Draw centered crop
          ctx.drawImage(canvas, x, y, size, size, 0, 0, size, size);
        }

        // 5. Return cropped image (JPEG 90% quality for smaller files)
        const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.9);
        return dataUrl;
      },
    };
  }, [gl, scene, camera, captureRef]);

  return null;
};

// ... imports
import { BRANDS, BrandTheme } from './themes';
import { AvatarDropdown } from './avatar-dropdown';
import { isTestnet } from '@/lib/contracts';

// Helper to switch network
async function switchNetwork(provider: ethers.providers.Web3Provider) {
  const targetChainIdHex = isTestnet ? '0x13882' : '0x89'; // 80002 (Amoy) : 137 (Mainnet)
  const targetChainIdDec = isTestnet ? 80002 : 137;

  try {
    const network = await provider.getNetwork();
    if (network.chainId === targetChainIdDec) {
      return; // Already on correct network
    }

    await provider.send('wallet_switchEthereumChain', [
      { chainId: targetChainIdHex },
    ]);
  } catch (switchError: unknown) {
    const err = switchError as {
      code?: number;
      data?: { originalError?: { code?: number } };
    };
    // This error code 4902 indicates that the chain has not been added to MetaMask.
    if (err.code === 4902 || err.data?.originalError?.code === 4902) {
      if (isTestnet) {
        await provider.send('wallet_addEthereumChain', [
          {
            chainId: '0x13882',
            chainName: 'Polygon Amoy Testnet',
            nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
            rpcUrls: ['https://rpc-amoy.polygon.technology/'],
            blockExplorerUrls: ['https://amoy.polygonscan.com/'],
          },
        ]);
      } else {
        await provider.send('wallet_addEthereumChain', [
          {
            chainId: '0x89',
            chainName: 'Polygon Mainnet',
            nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
            rpcUrls: ['https://polygon-rpc.com/'],
            blockExplorerUrls: ['https://polygonscan.com/'],
          },
        ]);
      }
    } else {
      console.error('Failed to switch network:', err);
      // If the error is the "Unexpected error" from some wallets when already on the network
      // (though our check above should catch it), we might want to suppress it if we can verify we are on the right network.
      // But for now, let's throw so the UI handles it, unless it's that specific error.
      throw switchError;
    }
  }
}

// ... existing code ...

export function POECanvas() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Theme State
  // Default to first brand to ensure consistent server/client hydration
  const [currentTheme, setCurrentTheme] = useState<BrandTheme>(BRANDS[0]);

  // Sync theme with URL or Randomize on mount
  useEffect(() => {
    const brandParam = searchParams.get('brand');

    if (brandParam) {
      // If URL has specific brand, use it
      const found = BRANDS.find((b) => b.id === brandParam);
      if (found) {
        setCurrentTheme((prev) => (prev.id !== found.id ? found : prev));
      }
    } else {
      // If NO brand in URL, pick a random one (client-side only)
      // We only do this if we are currently on the default (0) and haven't set one yet?
      // Or simply always randomize if no param?
      // User asked "can the brands be random when brand is not selected"
      const randomBrand = BRANDS[Math.floor(Math.random() * BRANDS.length)];
      setCurrentTheme(randomBrand);
    }
  }, [searchParams]);

  // Helper to cycle themes for testing (Ctrl+B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'b') {
        const index = BRANDS.findIndex((b) => b.id === currentTheme.id);
        const nextIndex = (index + 1) % BRANDS.length;
        setCurrentTheme(BRANDS[nextIndex]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTheme]);

  // ... existing hooks ...

  const {
    startRecording,
    stopRecording,
    recordPoint,
    isValidDuration,
    getState,
  } = useTrailRecorder();

  const [isRecording, setIsRecording] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [points, setPoints] = useState<TrailPoint[]>([]);
  const [cursorPosition, setCursorPosition] = useState<
    [number, number, number]
  >([0, 0, 0]);
  const [isValid, setIsValid] = useState(false);
  const [trailColor, setTrailColor] = useState(TRAIL_COLORS[0].value);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [shouldResetCamera, setShouldResetCamera] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(0); // 0 = default, range approx -1 to 1
  const [mounted, setMounted] = useState(false);

  // Auth & Submission State
  const { data: profile } = useProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [existingArweaveTxId, setExistingArweaveTxId] = useState<string | null>(
    null
  ); // Track successful uploads
  const [screenshotData, setScreenshotData] = useState<string | null>(null); // Store base64 image
  const [loadingStatus, setLoadingStatus] = useState<string | undefined>(
    undefined
  );
  const [time26Balance, setTime26Balance] = useState<string>('0');
  const [time26Cost, setTime26Cost] = useState<string>('... TIME');
  const [nativeCost, setNativeCost] = useState<string>('... POL');
  const [nativeCostUsd, setNativeCostUsd] = useState<string>('');
  const screenshotRef = useRef<string | null>(null); // Ref to access latest data
  const captureRef = useRef<{ capture: () => string } | null>(null);
  const completedSessionRef = useRef<{
    duration: number;
    points: TrailPoint[];
    sectorId: number;
    color?: string;
  } | null>(null);

  // Dialog State
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    title: string;
    description: React.ReactNode;
    actionLabel?: string;
    onAction?: () => void;
    cancelLabel?: string;
    onCancel?: () => void;
    isError?: boolean;
  }>({
    isOpen: false,
    title: '',
    description: '',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update UI state from recorder
  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      const state = getState();
      setDuration(state.duration);
      setPoints([...state.points]);
      setIsValid(isValidDuration());
    }, 50);

    return () => clearInterval(interval);
  }, [isRecording, getState, isValidDuration]);

  // Clear existing trail (user then clicks to start new one)
  const clearTrail = useCallback(() => {
    setIsReady(false);
    setPoints([]);
    setDuration(0);
    setIsValid(false);
    setShowClearConfirm(false);
    setShouldResetCamera(true); // Trigger camera reset
    setZoomLevel(0); // Reset zoom
    completedSessionRef.current = null;
    screenshotRef.current = null;
    setCurrentSessionId(null);
    setExistingArweaveTxId(null);
  }, []);

  // Callback when camera reset is complete
  const handleCameraReset = useCallback(() => {
    setShouldResetCamera(false);
  }, []);

  // Drag-to-Draw Handlers
  const handlePointerDown = useCallback(() => {
    // If there's an existing trail, do nothing - user must clear first
    if (points.length > 0 && isReady) return;

    // Start recording
    startRecording();
    setIsRecording(true);
    setIsReady(false);
    setPoints([]);
    setDuration(0);
    setIsValid(false);
    completedSessionRef.current = null;
    setCurrentSessionId(null);
    setExistingArweaveTxId(null);
  }, [points.length, isReady, startRecording]);

  const handlePointerUp = useCallback(() => {
    if (!isRecording) return;

    // Stop recording
    const session = stopRecording();
    setIsRecording(false);

    // Verify minimum duration AND minimum point count to avoid ghost stars
    if (
      session.duration >= MIN_SESSION_DURATION &&
      session.points.length >= 5
    ) {
      setIsReady(true);
      // Save session for submission
      completedSessionRef.current = {
        duration: session.duration,
        points: session.points,
        sectorId: session.sectorId,
        color: trailColor,
      };
    } else {
      // Session too short or too few points, discard
      if (
        session.points.length < 5 &&
        session.duration >= MIN_SESSION_DURATION
      ) {
        // Discarding session: too few points
      }
      setPoints([]);
      setDuration(0);
      completedSessionRef.current = null;
    }
  }, [isRecording, stopRecording, trailColor]);

  // Capture Mode handling
  const [captureMode, setCaptureMode] = useState(false);

  const { user, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const { openSignIn } = useClerk();
  const authenticated = isSignedIn; // Mapping for existing logic

  // Trigger capture when mode is active
  useEffect(() => {
    // Removed dependency on currentSessionId - we capture before creating session now
    if (captureMode && captureRef.current) {
      // Wait for render to stabilize (increased to 250ms)
      const timer = setTimeout(() => {
        try {
          const base64Image = captureRef.current?.capture();
          if (base64Image && base64Image.length > 1000) {
            // Check for valid data size
            setScreenshotData(base64Image);
            screenshotRef.current = base64Image;
            // Now show modal
            setShowSubmissionModal(true);
          } else {
            console.error(
              'Capture result too small/empty:',
              base64Image?.slice(0, 50)
            );
            // Retry? Or just show modal
            setShowSubmissionModal(true);
          }
        } catch (e) {
          console.error('Capture failed:', e);
          // Show modal anyway
          setShowSubmissionModal(true);
        } finally {
          setCaptureMode(false);
          setIsSubmitting(false);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [captureMode, points]);

  // Handle complete button (for submitting proof)
  const handleComplete = useCallback(async () => {
    // Use the saved session data
    const session = completedSessionRef.current;
    if (!session) {
      setDialogState({
        isOpen: true,
        title: 'No Session Found',
        description: 'No recorded session found to submit.',
        actionLabel: 'OK',
        onAction: () => setDialogState((prev) => ({ ...prev, isOpen: false })),
        isError: true,
      });
      return;
    }

    setIsReady(true);
    setIsSubmitting(true);

    // 1. Check Auth
    if (!authenticated) {
      openSignIn();
      setIsSubmitting(false);
      return;
    }

    // 2. Trigger Capture Mode (Session creation moved to confirmation step)
    setCaptureMode(true);
    // Effect will pick this up, render CaptureScene, capture, then open modal
  }, [authenticated, openSignIn]);

  // Helper function to create session
  const createSession = useCallback(
    async (token: string) => {
      const session = completedSessionRef.current;
      if (!session) throw new Error('No session data found');

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          duration: session.duration,
          points: session.points,
          sectorId: session.sectorId,
          color: trailColor, // Use current state (allows changing color after recording)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create session');
      }
      const data = await response.json();
      return data.session.id; // Return the new session ID
    },
    [trailColor]
  );

  // Helper function to delete session
  const deleteSession = useCallback(
    async (sessionId: string, token: string) => {
      try {
        await fetch(`/api/sessions?id=${sessionId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        setCurrentSessionId(null);
      } catch (e) {
        console.error('Failed to cleanup session:', e);
      }
    },
    []
  );

  // Handle Modal Selection
  const handleProofSelection = useCallback(
    async (
      type: 'STANDARD' | 'INSTANT',
      data: {
        message: string;
        username: string;
        title: string;
        description: string;
        paymentMethod?: 'NATIVE' | 'TIME26';
      }
    ) => {
      // NOTE: We now create the session HERE, instead of before opening the modal.
      setIsSubmitting(true);
      setLoadingStatus('Processing...');

      let sessionId = currentSessionId;

      try {
        const token = await getToken();
        if (!token) throw new Error('Authentication check failed');

        // 1. Validate Session Duration
        const currentSession = completedSessionRef.current;
        if (!currentSession || currentSession.duration < MIN_SESSION_DURATION) {
          throw new Error(
            `Session too short. Minimum ${MIN_SESSION_DURATION}s required.`
          );
        }

        // 2. Create or Reuse Session
        if (!sessionId) {
          sessionId = await createSession(token);
          setCurrentSessionId(sessionId); // Store for idempotency
        }

        if (type === 'STANDARD') {
          // Upload preview image to R2 first
          const imageData = screenshotRef.current || screenshotData;
          if (imageData) {
            try {
              setLoadingStatus('Uploading preview...');
              const base64Data = imageData.split(',')[1];
              const binaryData = atob(base64Data);
              const bytes = new Uint8Array(binaryData.length);
              for (let i = 0; i < binaryData.length; i++) {
                bytes[i] = binaryData.charCodeAt(i);
              }
              const blob = new Blob([bytes], { type: 'image/jpeg' });
              const file = new File([blob], 'preview.jpg', {
                type: 'image/jpeg',
              });

              const formData = new FormData();
              formData.append('file', file);
              formData.append('sessionId', sessionId!);

              await fetch('/api/storage/upload', {
                method: 'POST',
                body: formData,
              });
            } catch (uploadErr) {
              console.warn('Preview upload failed (non-critical):', uploadErr);
            }
          }

          setLoadingStatus('Submitting proof...');
          const response = await fetch('/api/session/submit-standard', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              sessionId: sessionId,
              message: data.message,
              title: data.title,
              description: data.description,
              color: trailColor,
            }),
          });

          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Standard submission failed');
          }

          // Close submission modal explicitly before success dialog
          setShowSubmissionModal(false);
          setDialogState({
            isOpen: true,
            title: 'Proof Submitted!',
            description:
              'Proof Submitted! It will be included in the daily snapshot. Would you like to create another or view your proof?',
            actionLabel: 'Create Another',
            onAction: () => {
              setShowSubmissionModal(false); // Force close
              setDialogState((prev) => ({ ...prev, isOpen: false }));
              setTimeout(() => {
                clearTrail();
              }, 100);
            },
            cancelLabel: 'View Proof',
            onCancel: () => {
              setShowSubmissionModal(false);
              router.push(`/proof/${sessionId}`);
            },
          });
        } else {
          // INSTANT
          const imageData = screenshotRef.current || screenshotData;
          const response = await fetch('/api/session/submit-instant', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              sessionId: sessionId,
              imageData: imageData, // Send the screenshot
              message: data.message,
              title: data.title,
              description: data.description,
              color: trailColor,
              username: data.username,
              existingArweaveTxId: existingArweaveTxId || undefined,
            }),
          });

          if (!response.ok) {
            const err = await response.json();
            console.error('Instant submission failed details:', err);
            throw new Error(
              err.details || err.error || 'Instant submission failed'
            );
          }

          const dataRes = await response.json();
          setExistingArweaveTxId(dataRes.arweaveTxId); // Save for retry optimization

          // --- SMART CONTRACT INTEGRATION ---
          setLoadingStatus('Working on NFT...');
          // Small delay to ensure user sees the status change
          await new Promise((resolve) => setTimeout(resolve, 800));

          let txHash = '';

          // Use user-input data first
          const displayName =
            data.username ||
            dataRes.sessionData?.user?.username ||
            dataRes.sessionData?.user?.name ||
            'Anonymous';
          const session = completedSessionRef.current; // Need duration
          if (!session) throw new Error('Session missing');

          // Check if user has a web3 wallet connected via Clerk (MetaMask, OKX, etc.)
          const hasWeb3Wallet =
            user?.web3Wallets && user.web3Wallets.length > 0;

          if (hasWeb3Wallet) {
            // CLIENT-SIDE MINTING (MetaMask)
            console.log('Minting via External Wallet (Client-Side)...', {
              hasEthereum: !!window.ethereum,
            });
            setLoadingStatus('Please confirm transaction in your wallet...');

            if (!window.ethereum)
              throw new Error(
                'No crypto wallet found. Please install MetaMask.'
              );
            const provider = new ethers.providers.Web3Provider(
              window.ethereum as ethers.providers.ExternalProvider
            );

            // Force Network Switch
            try {
              await switchNetwork(provider);
            } catch (e) {
              console.error('Network switch failed', e);
              // We continue, but it might fail if on wrong network.
              // Better to throw?
              // If valid switchNetwork error, likely user rejected.
              throw new Error(
                'Please switch to the correct network (Polygon) to continue.'
              );
            }

            await provider.send('eth_requestAccounts', []);
            const signer = provider.getSigner();

            const poeContract = new ethers.Contract(
              PROOF_OF_EXISTENCE_ADDRESS,
              PROOF_OF_EXISTENCE_ABI,
              signer
            );

            if ((data.paymentMethod || 'NATIVE') === 'NATIVE') {
              const nativeBalance = await provider.getBalance(
                await signer.getAddress()
              );
              const cost = await poeContract.calculateCostNative(
                Math.floor(session.duration)
              );

              if (nativeBalance.lt(cost)) {
                throw new Error('Insufficient MATIC balance for minting');
              }

              // Fetch gas fees with timeout and fallback
              setLoadingStatus('Estimating gas fees...');
              const overrides: ethers.PayableOverrides = { value: cost };

              try {
                // Use a timeout to prevent hanging
                const feeDataPromise = provider.getFeeData();
                const timeoutPromise = new Promise<ethers.providers.FeeData>(
                  (_, reject) =>
                    setTimeout(
                      () => reject(new Error('Gas estimation timeout')),
                      5000
                    )
                );

                const feeData = await Promise.race([
                  feeDataPromise,
                  timeoutPromise,
                ]);

                // Use gasPrice with 20% buffer for Polygon reliability
                if (feeData.gasPrice) {
                  overrides.gasPrice = feeData.gasPrice.mul(120).div(100);
                } else if (feeData.maxFeePerGas) {
                  // EIP-1559 Support
                  overrides.maxFeePerGas = feeData.maxFeePerGas
                    .mul(120)
                    .div(100);
                  overrides.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas
                    ?.mul(120)
                    .div(100);
                }
              } catch (feeError) {
                console.warn(
                  'Gas estimation failed or timed out, using wallet defaults:',
                  feeError
                );
                // We proceed without overrides, letting MetaMask estimate
              }

              let gasLimit = ethers.BigNumber.from(300000); // Default fallback
              try {
                const estimatedGas =
                  await poeContract.estimateGas.mintEternalNative(
                    Math.floor(session.duration),
                    dataRes.arweaveTxId,
                    displayName,
                    data.message || '',
                    { ...overrides }
                  );
                gasLimit = estimatedGas.mul(120).div(100); // Add 20% buffer
              } catch {
                // Use default gasLimit if estimation fails
              }

              overrides.gasLimit = gasLimit;

              const tx = await poeContract.mintEternalNative(
                Math.floor(session.duration),
                dataRes.arweaveTxId,
                displayName,
                data.message || '',
                overrides
              );
              setLoadingStatus(
                'Transaction Submitted! Waiting for confirmation...'
              );
              await tx.wait();
              txHash = tx.hash;
            } else {
              // TIME26 payment
              const time26Contract = new ethers.Contract(
                TIME26_ADDRESS,
                TIME26_ABI,
                signer
              );

              setLoadingStatus('Approving TIME26 (1/2)...');
              const approveTx = await time26Contract.approve(
                PROOF_OF_EXISTENCE_ADDRESS,
                ethers.constants.MaxUint256
              );
              await approveTx.wait();

              setLoadingStatus('Minting Proof (2/2)...');
              const tx = await poeContract.mintEternalTime26(
                Math.floor(session.duration),
                dataRes.arweaveTxId,
                displayName,
                data.message || ''
              );
              await tx.wait();
              txHash = tx.hash;
            }

            setLoadingStatus('Transaction Confirmed!');
            console.log('Client-side Mint Confirmed', txHash);
          } else {
            // SERVER-SIDE MINTING (Openfort embedded wallet)
            // No wallet popup needed - transaction is signed automatically
            setLoadingStatus(
              'Minting via embedded wallet (no approval needed)...'
            );

            // Call API endpoint
            const mintRes = await fetch('/api/mint', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                sessionId: sessionId,
                arweaveTxId: dataRes.arweaveTxId,
                duration: session.duration,
                paymentMethod: data.paymentMethod || 'NATIVE',
                username: displayName,
                message: data.message,
              }),
            });

            if (!mintRes.ok) {
              const errData = await mintRes.json();
              throw new Error(errData.error || 'Minting API failed');
            }

            const mintData = await mintRes.json();
            txHash = mintData.txHash;

            setLoadingStatus('Transaction Submitted!');
            console.log('Mint Transaction Confirmed', txHash);
          }

          // PERSIST TX HASH TO DB
          setLoadingStatus('Saving Proof to Database...');
          try {
            await fetch('/api/session/finalize-mint', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: dataRes.sessionData?.id || sessionId, // Ensure we have ID
                txHash: txHash,
              }),
            });
          } catch (saveErr) {
            console.error('Failed to save txHash to DB:', saveErr);
          }

          // Show Success Dialog
          setShowSubmissionModal(false); // Close submission modal FIRST
          setDialogState({
            isOpen: true,
            title: 'Perpetual Proof Minted!',
            description: (
              <span className="flex flex-col gap-2">
                <span>
                  Success! Your existence is permanently etched onto the
                  blockchain.
                </span>
                <span className="text-xs bg-black/30 p-3 rounded-lg font-mono block break-all space-y-2">
                  <a
                    href={`https://viewblock.io/arweave/tx/${dataRes.arweaveTxId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 block hover:text-purple-300 transition-colors flex items-center gap-2"
                  >
                    <span>📦 Stored on Arweave</span>
                    <span className="opacity-50 text-[10px]">↗</span>
                  </a>
                  {txHash && (
                    <a
                      href={`${BLOCK_EXPLORER}/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 block hover:text-green-300 transition-colors flex items-center gap-2"
                    >
                      <span>🔗 Minted on Polygon</span>
                      <span className="opacity-50 text-[10px]">↗</span>
                    </a>
                  )}
                </span>
                <span className="text-sm mt-2">
                  Would you like to create another or view your proof?
                </span>
              </span>
            ),
            actionLabel: 'Create Another',
            onAction: () => {
              // Dialog state closed via setDialogState updates
              setShowSubmissionModal(false); // FORCE CLOSE SUBMISSION MODAL
              setDialogState((prev) => ({ ...prev, isOpen: false }));
              // Small timeout to allow dialog to close before clearing (smoother UX)
              setTimeout(() => {
                clearTrail();
              }, 100);
            },
            cancelLabel: 'View Proof',
            onCancel: () => {
              router.push(`/proof/${sessionId}`);
            },
          });
        }
      } catch (err: unknown) {
        console.error('Submission error:', err);
        const rawMessage = err instanceof Error ? err.message : 'Unknown error';

        // Clean up error message for user display
        let errorMessage = rawMessage;
        if (rawMessage.includes('user rejected transaction')) {
          errorMessage = 'User rejected transaction';
        } else if (rawMessage.includes('STORAGE_UNAVAILABLE')) {
          errorMessage =
            'Storage service temporarily unavailable. Please try again later.';
        } else if (
          rawMessage.includes('intrinsic gas too low') ||
          rawMessage.includes('gas')
        ) {
          errorMessage = 'Network congestion detected. Please try again.';
        } else if (rawMessage.includes('Internal JSON-RPC error')) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const errorObj = err as any;
          const reason =
            errorObj?.error?.message ||
            errorObj?.reason ||
            errorObj?.data?.message;
          errorMessage = reason || 'Blockchain Transaction Failed';
        } else if (rawMessage.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for transaction';
        }

        // Cleanup failed session
        if (sessionId) {
          await deleteSession(sessionId, (await getToken()) || '');
        }

        setDialogState({
          isOpen: true,
          title: 'Submission Failed',
          description: errorMessage || 'An error occurred during submission.',
          actionLabel: 'Close',
          onAction: () => {
            setDialogState((prev) => ({ ...prev, isOpen: false }));
          },
          cancelLabel: undefined,
          onCancel: undefined,
          isError: true,
        });
      } finally {
        setIsSubmitting(false);
        setLoadingStatus(undefined);
      }
    },
    [
      getToken,
      clearTrail,
      router,
      screenshotData,
      trailColor,
      createSession,
      currentSessionId,
      existingArweaveTxId,
      deleteSession,
      setLoadingStatus,
      user?.web3Wallets,
    ]
  );

  const { applyGravity } = useGravity();

  const handleMove = useCallback(
    (x: number, y: number, z: number) => {
      // Apply gravity field logic (magnetic pull)
      const [gx, gy, gz] = applyGravity(x, y, z);

      recordPoint(gx, gy, gz);
      setCursorPosition([gx, gy, gz]);
    },
    [recordPoint, applyGravity]
  );

  const handleColorChange = useCallback((color: string) => {
    setTrailColor(color);
  }, []);

  // Zoom Handlers

  // Fetch Contract Data Effect
  useEffect(() => {
    const fetchContractData = async () => {
      if (!showSubmissionModal) return;

      try {
        const address = (
          user?.publicMetadata as { walletAddress?: string } | undefined
        )?.walletAddress;
        if (!address) return;

        let provider;
        try {
          provider = getPublicProvider();
          await provider.getNetwork();
        } catch (rpcError) {
          console.warn('RPC connection failed, skipping cost fetch:', rpcError);
          return;
        }

        // Verify contract exists
        const code = await provider.getCode(TIME26_ADDRESS);
        if (code === '0x') {
          console.error(`No contract at ${TIME26_ADDRESS}`);
          return;
        }

        // Contracts (ReadOnly)
        const time26Contract = new ethers.Contract(
          TIME26_ADDRESS,
          TIME26_ABI,
          provider
        );
        const poeContract = new ethers.Contract(
          PROOF_OF_EXISTENCE_ADDRESS,
          PROOF_OF_EXISTENCE_ABI,
          provider
        );

        // Fetch TIME26 balance
        const bal = await time26Contract.balanceOf(address);
        setTime26Balance(ethers.utils.formatEther(bal));

        // Fetch costs
        const duration = completedSessionRef.current?.duration || 10;
        const costNative = await poeContract.calculateCostNative(
          Math.floor(duration)
        );
        const costTime26 = await poeContract.calculateCostTime26(
          Math.floor(duration)
        );

        setNativeCost(
          `${parseFloat(ethers.utils.formatEther(costNative)).toFixed(4)} POL`
        );

        const usdValue = (
          parseFloat(ethers.utils.formatEther(costNative)) * 0.5
        ).toFixed(2);
        setNativeCostUsd(`~$${usdValue}`);

        setTime26Cost(
          `${parseFloat(ethers.utils.formatEther(costTime26)).toFixed(0)} TIME`
        );
      } catch (err) {
        console.error('Failed to fetch contract data:', err);
      }
    };

    fetchContractData();
  }, [showSubmissionModal, user?.publicMetadata]);

  if (!mounted) return null;

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none">
      <Canvas
        camera={{ position: [0, 0, 12], fov: 60 }}
        gl={{
          preserveDrawingBuffer: true, // Required for screenshot capture
          antialias: false,
          alpha: false,
          stencil: false,
          depth: true,
          toneMapping: THREE.NoToneMapping,
        }}
        dpr={[1, 2]} // Handle high DPI screens
      >
        <color attach="background" args={[currentTheme.backgroundColor]} />
        <fog attach="fog" args={[currentTheme.backgroundColor, 20, 80]} />
        {captureMode ? (
          <CaptureScene
            points={
              points.length > 0
                ? points
                : completedSessionRef.current?.points || []
            }
            color={
              points.length > 0
                ? trailColor
                : completedSessionRef.current?.color || trailColor
            }
          />
        ) : (
          <Scene
            isRecording={isRecording}
            points={points}
            cursorPosition={cursorPosition}
            trailColor={trailColor}
            onMove={handleMove}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            shouldResetCamera={shouldResetCamera}
            onCameraReset={handleCameraReset}
            zoomLevel={zoomLevel}
            theme={currentTheme}
          />
        )}
        <EffectComposer enableNormalPass={false}>
          <Bloom luminanceThreshold={0.4} mipmapBlur intensity={0.5} />
        </EffectComposer>
        <CanvasCapture captureRef={captureRef} />
      </Canvas>

      {/* UI Overlay */}

      {/* Logo Overlay - Center Watermark */}
      {currentTheme.overlayLogo && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 opacity-30 mix-blend-screen">
          <div className="relative w-1/2 h-1/2 max-w-[500px] max-h-[200px]">
            <Image
              src={currentTheme.overlayLogo}
              alt={`${currentTheme.name} Logo`}
              fill
              className="object-contain"
            />
          </div>
        </div>
      )}

      <div className="absolute top-4 left-4 z-50 text-xs text-white/30 font-mono pointer-events-none">
        Theme: {currentTheme.name}
      </div>

      <div className="absolute inset-0 pointer-events-none">
        <BackgroundOverlay />

        <ExitControls onExit={() => router.push('/')} />

        <TimerDisplay
          duration={duration}
          isRecording={isRecording}
          isValid={isValid}
        />

        <div className="absolute top-6 right-4 md:top-8 md:right-6 flex flex-col md:flex-row gap-3 items-end md:items-center z-40 pointer-events-none">
          {isReady && !isRecording && (
            <div className="hidden md:block">
              <ActionButtons
                onClear={() => setShowClearConfirm(true)}
                onSubmit={handleComplete}
              />
            </div>
          )}
          <ColorPicker
            trailColor={trailColor}
            onColorChange={handleColorChange}
          />
          <AvatarDropdown />
        </div>

        <Instructions
          isRecording={isRecording}
          isReady={isReady}
          onClear={() => setShowClearConfirm(true)}
          onSubmit={handleComplete}
          themeName={currentTheme.name}
        />

        <SubmissionModal
          isOpen={showSubmissionModal}
          onClose={() => setShowSubmissionModal(false)}
          onSelectStandard={(data) => handleProofSelection('STANDARD', data)}
          onSelectInstant={(data) => handleProofSelection('INSTANT', data)}
          isSubmitting={isSubmitting}
          profileName={profile?.user?.name || undefined}
          profileUsername={profile?.user?.username || undefined}
          loadingMessage={loadingStatus}
          time26Balance={parseFloat(time26Balance).toFixed(1)}
          nativeCost={nativeCost}
          nativeCostUsd={nativeCostUsd}
          time26Cost={time26Cost}
          onSetAsDisplayName={async (name: string) => {
            const token = await getToken();
            if (!token) throw new Error('Not authenticated');
            const res = await fetch('/api/user/update', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ name }),
            });
            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || 'Failed to update display name');
            }
          }}
        />

        <ClearConfirmModal
          isOpen={showClearConfirm}
          onConfirm={clearTrail}
          onCancel={() => setShowClearConfirm(false)}
        />

        <AlertDialog
          open={dialogState.isOpen}
          onOpenChange={(open) => {
            if (!open) setDialogState((prev) => ({ ...prev, isOpen: false }));
          }}
        >
          <AlertDialogContent className="bg-black/90 border-white/10 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle
                className={dialogState.isError ? 'text-red-500' : 'text-white'}
              >
                {dialogState.title}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-white/70">
                {dialogState.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              {dialogState.cancelLabel && (
                <AlertDialogCancel
                  className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white"
                  onClick={dialogState.onCancel}
                >
                  {dialogState.cancelLabel}
                </AlertDialogCancel>
              )}
              {dialogState.actionLabel && (
                <AlertDialogAction
                  className="bg-[linear-gradient(to_bottom_right,#0CC9F2,#4877DA,#7E44DB)] hover:brightness-110 text-white border-0"
                  onClick={dialogState.onAction}
                >
                  {dialogState.actionLabel}
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
