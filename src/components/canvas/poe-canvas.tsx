'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

// Type declaration for window.ethereum (MetaMask/Web3 wallets)
declare global {
  interface Window {
    ethereum?: import('ethers').Eip1193Provider;
  }
}
import { Canvas, useThree, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { LightTrail, CometHead, SpaceBackground } from './light-trail';
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
  type PaymentMethod,
} from './canvas-ui';
import { useTrailRecorder } from '@/hooks/use-trail-recorder';
import {
  useGaslessEligibility,
  useGaslessMint,
} from '@/hooks/use-gasless-eligibility';
import { useSessions } from '@/hooks/use-sessions';
import { useProofSubmission } from '@/hooks/use-proof-submission';
import { TrailPoint, MIN_SESSION_DURATION } from '@/types/session';
import { TRAIL_COLORS } from './light-trail';
import { useWeb3Auth } from '@/lib/web3auth';
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

  return new ethers.JsonRpcProvider(rpcUrl);
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
  frozenChunks,
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
  frozenChunks: TrailPoint[][];
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
      <LightTrail
        points={points}
        frozenChunks={frozenChunks}
        color={trailColor}
      />

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
import {
  WalletDropdown,
  MintConfirmationDialog,
  type MintConfirmationData,
} from '@/components/wallet';
import { isTestnet } from '@/lib/contracts';

// Helper to switch network
async function switchNetwork(provider: ethers.BrowserProvider) {
  const targetChainIdHex = isTestnet ? '0x13882' : '0x89'; // 80002 (Amoy) : 137 (Mainnet)
  const targetChainIdDec = BigInt(isTestnet ? 80002 : 137); // bigint for ethers v6 comparison

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
    startStroke,
    endStroke,
    finishSession,
    resetSession,
    recordPoint,
    isValidDuration,
    getState,
    getDrawingState,
    getAllPoints,
  } = useTrailRecorder();

  const [isRecording, setIsRecording] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isPaused, setIsPaused] = useState(false); // Multi-stroke: paused between strokes
  const [duration, setDuration] = useState(0);
  const [points, setPoints] = useState<TrailPoint[]>([]); // Active chunk
  const [frozenChunks, setFrozenChunks] = useState<TrailPoint[][]>([]); // Frozen chunks
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
  const { profile, updateProfile } = useProfile();
  const { createSession, deleteSession } = useSessions();
  const { uploadPreview, submitStandard, submitInstant, mintProof } =
    useProofSubmission();

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

  // Gasless minting eligibility - only fetch when submission modal is open
  const { data: gaslessEligibility, isLoading: gaslessLoading } =
    useGaslessEligibility(duration >= 10 ? duration : 10, {
      enabled: showSubmissionModal,
    });
  const { mint: gaslessMint } = useGaslessMint();

  // Mint confirmation for non-Web3 users
  const [showMintConfirmation, setShowMintConfirmation] = useState(false);
  const [mintConfirmationData, setMintConfirmationData] =
    useState<MintConfirmationData | null>(null);
  const mintConfirmResolveRef = useRef<((confirmed: boolean) => void) | null>(
    null
  );
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
    shareSessionId?: string; // For share button
    isError?: boolean;
  }>({
    isOpen: false,
    title: '',
    description: '',
  });

  // Share menu state for success dialog
  const [showSuccessShareMenu, setShowSuccessShareMenu] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update UI state from recorder (throttled to reduce re-renders)
  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      const state = getState();
      setDuration(state.duration);
      setPoints([...state.points]); // Active chunk only
      // Only update frozen chunks if they changed (avoid unnecessary re-renders)
      setFrozenChunks((prev) => {
        if (prev.length !== state.frozenChunks.length) {
          return [...state.frozenChunks];
        }
        return prev;
      });
      setIsValid(isValidDuration());
    }, 100); // Reduced from 50ms to 100ms for better performance

    return () => clearInterval(interval);
  }, [isRecording, getState, isValidDuration]);

  // Clear existing trail (user then clicks to start new one)
  const clearTrail = useCallback(() => {
    resetSession(); // Reset the recorder state
    setIsReady(false);
    setIsPaused(false);
    setIsRecording(false);
    setPoints([]);
    setFrozenChunks([]); // Clear frozen chunks too
    setDuration(0);
    setIsValid(false);
    setShowClearConfirm(false);
    setShouldResetCamera(true); // Trigger camera reset
    setZoomLevel(0); // Reset zoom
    completedSessionRef.current = null;
    screenshotRef.current = null;
    setCurrentSessionId(null);
    setExistingArweaveTxId(null);
  }, [resetSession]);

  // Callback when camera reset is complete
  const handleCameraReset = useCallback(() => {
    setShouldResetCamera(false);
  }, []);

  // Drag-to-Draw Handlers (Multi-stroke support)
  const handlePointerDown = useCallback(() => {
    // If session is done/ready, do nothing - user must clear first
    if (isReady) return;

    const drawingState = getDrawingState();

    if (drawingState === 'idle') {
      // First stroke - start fresh session
      startStroke();
      setIsRecording(true);
      setIsPaused(false);
      setPoints([]);
      setDuration(0);
      setIsValid(false);
      completedSessionRef.current = null;
      setCurrentSessionId(null);
      setExistingArweaveTxId(null);
    } else if (drawingState === 'paused') {
      // Resume drawing - continue from pause
      startStroke();
      setIsRecording(true);
      setIsPaused(false);
    }
    // If already 'drawing' or 'done', do nothing
  }, [isReady, getDrawingState, startStroke]);

  const handlePointerUp = useCallback(() => {
    if (!isRecording) return;

    // End current stroke (pause, don't finish session)
    const session = endStroke();
    setIsRecording(false);
    setIsPaused(true);

    // Update UI with current state
    setDuration(session.duration);
    setPoints([...session.points]);
    setIsValid(
      session.duration >= MIN_SESSION_DURATION &&
        session.points.filter((p) => p.t !== -1).length >= 5
    );
  }, [isRecording, endStroke]);

  // Handler for "Done" button - finishes the session
  const handleFinishDrawing = useCallback(() => {
    const drawingState = getDrawingState();
    if (drawingState !== 'paused') return;

    const session = finishSession();
    setIsPaused(false);

    // Get all points (frozen + active) for validation and submission
    const allPoints = getAllPoints();
    const actualPoints = allPoints.filter((p) => p.t !== -1);
    if (session.duration >= MIN_SESSION_DURATION && actualPoints.length >= 5) {
      setIsReady(true);
      completedSessionRef.current = {
        duration: session.duration,
        points: allPoints, // Use all points including frozen chunks
        sectorId: session.sectorId,
        color: trailColor,
      };
    } else {
      // Session invalid - show message but keep trail for user to see
      // They can continue drawing or clear
      setIsPaused(true); // Go back to paused state
    }
  }, [getDrawingState, finishSession, getAllPoints, trailColor]);

  // Capture Mode handling
  const [captureMode, setCaptureMode] = useState(false);

  const { isConnected, user: web3User, login, getIdToken } = useWeb3Auth();
  const authenticated = isConnected;

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
      login();
      setIsSubmitting(false);
      return;
    }

    // 2. Trigger Capture Mode (Session creation moved to confirmation step)
    setCaptureMode(true);
    // Effect will pick this up, render CaptureScene, capture, then open modal
  }, [authenticated, login]);

  // Auth headers helper removed - handled by hooks

  // Helper function to create session
  const handleCreateSession = useCallback(async () => {
    const session = completedSessionRef.current;
    if (!session) throw new Error('No session data found');

    const sessionId = await createSession.mutateAsync({
      duration: session.duration,
      points: session.points,
      sectorId: session.sectorId,
      color: trailColor,
    });
    return sessionId;
  }, [trailColor, createSession]);

  // Helper function to delete session
  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      try {
        await deleteSession.mutateAsync(sessionId);
        setCurrentSessionId(null);
      } catch (e) {
        console.error('Failed to cleanup session:', e);
      }
    },
    [deleteSession]
  );

  // Request mint confirmation for non-Web3 users
  const requestMintConfirmation = useCallback(
    (data: MintConfirmationData): Promise<boolean> => {
      return new Promise((resolve) => {
        mintConfirmResolveRef.current = resolve;
        setMintConfirmationData(data);
        setShowMintConfirmation(true);
      });
    },
    []
  );

  const handleMintConfirmationClose = useCallback((open: boolean) => {
    if (!open && mintConfirmResolveRef.current) {
      mintConfirmResolveRef.current(false);
      mintConfirmResolveRef.current = null;
    }
    setShowMintConfirmation(open);
  }, []);

  const handleMintConfirm = useCallback(() => {
    if (mintConfirmResolveRef.current) {
      mintConfirmResolveRef.current(true);
      mintConfirmResolveRef.current = null;
    }
    setShowMintConfirmation(false);
  }, []);

  // Handle Modal Selection
  const handleProofSelection = useCallback(
    async (
      type: 'STANDARD' | 'INSTANT',
      data: {
        message: string;
        username: string;
        title: string;
        description: string;
        paymentMethod?: PaymentMethod;
      }
    ) => {
      // NOTE: We now create the session HERE, instead of before opening the modal.
      setIsSubmitting(true);
      setLoadingStatus('Processing...');

      let sessionId = currentSessionId;

      try {
        // 1. Validate Session Duration
        const currentSession = completedSessionRef.current;
        if (!currentSession || currentSession.duration < MIN_SESSION_DURATION) {
          throw new Error(
            `Session too short. Minimum ${MIN_SESSION_DURATION}s required.`
          );
        }

        // 2. Create or Reuse Session
        if (!sessionId) {
          sessionId = await handleCreateSession();
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

              await uploadPreview.mutateAsync({
                sessionId: sessionId!,
                imageBlob: blob,
              });
            } catch (uploadErr) {
              console.warn('Preview upload failed (non-critical):', uploadErr);
            }
          }

          setLoadingStatus('Submitting proof...');
          setLoadingStatus('Submitting proof...');
          await submitStandard.mutateAsync({
            sessionId: sessionId,
            message: data.message,
            title: data.title,
            description: data.description,
            color: trailColor,
          });

          // Close submission modal explicitly before success dialog
          setShowSubmissionModal(false);
          setShowSuccessShareMenu(false);
          setDialogState({
            isOpen: true,
            title: 'Proof Submitted!',
            description:
              'Proof Submitted! It will be included in the daily snapshot.',
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
              setIsSubmitting(true); // Prevent further actions during navigation
              setDialogState((prev) => ({ ...prev, isOpen: false }));
              router.push(`/proof/${sessionId}`);
            },
            shareSessionId: sessionId || undefined,
          });
        } else {
          // INSTANT
          const imageData = screenshotRef.current || screenshotData;
          const dataRes = await submitInstant.mutateAsync({
            sessionId: sessionId,
            imageData: imageData!,
            message: data.message,
            title: data.title,
            description: data.description,
            color: trailColor,
            username: data.username,
            existingArweaveTxId: existingArweaveTxId || undefined,
          });

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

          // --- GASLESS MINTING (TIME26_GASLESS) ---
          if (data.paymentMethod === 'TIME26_GASLESS') {
            setLoadingStatus('Minting with TIME26 (gasless)...');

            try {
              const gaslessRes = await gaslessMint({
                sessionId: sessionId!,
                metadataURI: dataRes.arweaveTxId,
                displayName,
                message: data.message || '',
                duration: Math.floor(session.duration),
              });

              if (!gaslessRes.success) {
                throw new Error('Gasless mint failed');
              }

              txHash = gaslessRes.txHash;
              setLoadingStatus('Transaction Confirmed!');
            } catch (gaslessError) {
              console.error('Gasless mint error:', gaslessError);
              throw new Error(
                gaslessError instanceof Error
                  ? gaslessError.message
                  : 'Gasless minting failed'
              );
            }
          } else {
            // --- REGULAR MINTING (NATIVE or TIME26 with wallet) ---

            // Check if user has an external wallet (MetaMask, etc.)
            const hasWeb3Wallet = !!window.ethereum;

            if (hasWeb3Wallet) {
              // CLIENT-SIDE MINTING (MetaMask)
              // Minting via External Wallet (Client-Side)...
              setLoadingStatus('Please confirm transaction in your wallet...');

              if (!window.ethereum)
                throw new Error(
                  'No crypto wallet found. Please install MetaMask.'
                );
              const provider = new ethers.BrowserProvider(
                window.ethereum as ethers.Eip1193Provider
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
              const signer = await provider.getSigner();

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

                if (nativeBalance < cost) {
                  throw new Error('Insufficient MATIC balance for minting');
                }

                // Fetch gas fees with timeout and fallback
                setLoadingStatus('Estimating gas fees...');
                const overrides: {
                  value?: bigint;
                  gasPrice?: bigint;
                  maxFeePerGas?: bigint;
                  maxPriorityFeePerGas?: bigint;
                  gasLimit?: bigint;
                } = { value: cost };

                try {
                  // Use a timeout to prevent hanging
                  const feeDataPromise = provider.getFeeData();
                  const timeoutPromise = new Promise<ethers.FeeData>(
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
                    overrides.gasPrice =
                      (feeData.gasPrice * BigInt(120)) / BigInt(100);
                  } else if (feeData.maxFeePerGas) {
                    // EIP-1559 Support
                    overrides.maxFeePerGas =
                      (feeData.maxFeePerGas * BigInt(120)) / BigInt(100);
                    overrides.maxPriorityFeePerGas =
                      feeData.maxPriorityFeePerGas
                        ? (feeData.maxPriorityFeePerGas * BigInt(120)) /
                          BigInt(100)
                        : undefined;
                  }
                } catch (feeError) {
                  console.warn(
                    'Gas estimation failed or timed out, using wallet defaults:',
                    feeError
                  );
                  // We proceed without overrides, letting MetaMask estimate
                }

                let gasLimit = BigInt(300000); // Default fallback
                try {
                  const estimatedGas =
                    await poeContract.mintEternalNative.estimateGas(
                      Math.floor(session.duration),
                      dataRes.arweaveTxId,
                      displayName,
                      data.message || '',
                      { ...overrides }
                    );
                  gasLimit = (estimatedGas * BigInt(120)) / BigInt(100); // Add 20% buffer
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
                  ethers.MaxUint256
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
              // console.log('Client-side Mint Confirmed', txHash);
            } else {
              // SERVER-SIDE MINTING (Openfort embedded wallet)
              // Show confirmation dialog for non-Web3 users
              setLoadingStatus('Preparing transaction details...');

              // Fetch costs for confirmation dialog
              const RPC_URL =
                process.env.NEXT_PUBLIC_RPC_URL ||
                'https://rpc-amoy.polygon.technology';
              const confirmProvider = new ethers.JsonRpcProvider(RPC_URL);
              const confirmPoeContract = new ethers.Contract(
                PROOF_OF_EXISTENCE_ADDRESS,
                PROOF_OF_EXISTENCE_ABI,
                confirmProvider
              );
              const confirmNativeCost =
                await confirmPoeContract.calculateCostNative(
                  Math.floor(session.duration)
                );
              const confirmTime26Cost =
                await confirmPoeContract.calculateCostTime26(
                  Math.floor(session.duration)
                );

              // Request user confirmation
              const confirmed = await requestMintConfirmation({
                duration: session.duration,
                paymentMethod: (data.paymentMethod || 'NATIVE') as
                  | 'NATIVE'
                  | 'TIME26',
                nativeCost: confirmNativeCost,
                time26Cost: confirmTime26Cost,
              });

              if (!confirmed) {
                // User cancelled - stop the minting process
                setIsSubmitting(false);
                setLoadingStatus(undefined);
                return;
              }

              // Proceed with minting
              setLoadingStatus(
                'Minting via embedded wallet (no approval needed)...'
              );

              // Call API endpoint
              // Call API endpoint
              const mintData = await mintProof.mutateAsync({
                sessionId: sessionId,
                arweaveTxId: dataRes.arweaveTxId,
                duration: session.duration,
                paymentMethod: data.paymentMethod || 'NATIVE',
                username: displayName,
                message: data.message,
              });

              txHash = mintData.txHash;

              setLoadingStatus('Transaction Submitted!');
              // console.log('Mint Transaction Confirmed', txHash);
            }
          } // End of else (REGULAR MINTING)

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
          setShowSuccessShareMenu(false);
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
              setShowSubmissionModal(false);
              setIsSubmitting(true); // Prevent further actions during navigation
              setDialogState((prev) => ({ ...prev, isOpen: false }));
              router.push(`/proof/${sessionId}`);
            },
            shareSessionId: sessionId || undefined,
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
          await handleDeleteSession(sessionId);
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
      handleCreateSession,
      currentSessionId,
      existingArweaveTxId,
      handleDeleteSession,
      setLoadingStatus,
      requestMintConfirmation,
      gaslessMint,
      uploadPreview,
      submitStandard,
      submitInstant,
      mintProof,
      deleteSession,
    ]
  );

  // Note: useGravity hook removed - magnetic pull was affecting user drawings
  // The DotMatrix visual effect (dots lighting up on hover) is preserved

  const handleMove = useCallback(
    (x: number, y: number, z: number) => {
      // Direct position without magnetic pull - preserves user intent
      recordPoint(x, y, z);
      setCursorPosition([x, y, z]);
    },
    [recordPoint]
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
        const address = web3User?.walletAddress;
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
        setTime26Balance(ethers.formatEther(bal));

        // Fetch costs
        const duration = completedSessionRef.current?.duration || 10;
        const costNative = await poeContract.calculateCostNative(
          Math.floor(duration)
        );
        const costTime26 = await poeContract.calculateCostTime26(
          Math.floor(duration)
        );

        setNativeCost(
          `${parseFloat(ethers.formatEther(costNative)).toFixed(4)} POL`
        );

        const usdValue = (
          parseFloat(ethers.formatEther(costNative)) * 0.5
        ).toFixed(2);
        setNativeCostUsd(`~$${usdValue}`);

        setTime26Cost(
          `${parseFloat(ethers.formatEther(costTime26)).toFixed(0)} TIME`
        );
      } catch (err) {
        console.error('Failed to fetch contract data:', err);
      }
    };

    fetchContractData();
  }, [showSubmissionModal, web3User?.walletAddress]);

  if (!mounted) return null;

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none">
      <Canvas
        camera={{ position: [0, 0, 12], fov: 60 }}
        gl={{
          preserveDrawingBuffer: true, // Required for screenshot capture
          antialias: false,
          alpha: true,
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
            points={completedSessionRef.current?.points || []}
            color={completedSessionRef.current?.color || trailColor}
          />
        ) : (
          <Scene
            isRecording={isRecording}
            points={points}
            frozenChunks={frozenChunks}
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

      <div className="absolute inset-0 pointer-events-none">
        <BackgroundOverlay />

        <ExitControls onExit={() => router.push('/')} />

        <TimerDisplay
          duration={duration}
          isRecording={isRecording}
          isValid={isValid}
          isPaused={isPaused}
          onClear={() => setShowClearConfirm(true)}
          onFinish={handleFinishDrawing}
        />

        <div className="absolute top-6 right-4 md:top-8 md:right-6 flex flex-col md:flex-row gap-3 items-end md:items-center z-40 pointer-events-none">
          {isReady && !isRecording && !isSubmitting && !dialogState.isOpen && (
            <div className="md:hidden w-full flex gap-2 justify-end">
              <ActionButtons
                onClear={() => setShowClearConfirm(true)}
                onSubmit={handleComplete}
              />
            </div>
          )}
          {isReady && !isRecording && !isSubmitting && !dialogState.isOpen && (
            <div className="hidden md:block">
              <ActionButtons
                onClear={() => setShowClearConfirm(true)}
                onSubmit={handleComplete}
              />
            </div>
          )}
          <div className="order-last md:order-none">
            <ColorPicker
              trailColor={trailColor}
              onColorChange={handleColorChange}
            />
          </div>
          <WalletDropdown />
        </div>

        <Instructions
          isRecording={isRecording}
          isReady={isReady}
          isPaused={isPaused}
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
          profileName={profile?.name || undefined}
          profileUsername={profile?.username || undefined}
          loadingMessage={loadingStatus}
          time26Balance={parseFloat(time26Balance).toFixed(1)}
          nativeCost={nativeCost}
          nativeCostUsd={nativeCostUsd}
          time26Cost={time26Cost}
          gaslessEligible={gaslessEligibility?.eligible ?? false}
          gaslessTotalCost={gaslessEligibility?.totalCostFormatted ?? '0'}
          gaslessLoading={gaslessLoading}
          unclaimedBalance={
            profile?.time26Balance
              ? parseFloat(ethers.formatEther(profile.time26Balance)).toFixed(1)
              : '0'
          }
          onSetAsDisplayName={async (name: string) => {
            await updateProfile({ name });
          }}
        />

        <ClearConfirmModal
          isOpen={showClearConfirm}
          onConfirm={clearTrail}
          onCancel={() => setShowClearConfirm(false)}
        />

        {/* Custom Result Dialog */}
        {dialogState.isOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-auto animate-in fade-in duration-200">
            <div
              className={`bg-black/40 backdrop-blur-sm absolute inset-0 ${dialogState.shareSessionId ? 'cursor-default' : 'cursor-pointer'}`}
              onClick={() => {
                // Don't allow backdrop click to close success dialogs
                // Users must use action buttons to prevent accidental re-submission
                if (dialogState.shareSessionId) return;
                setDialogState((prev) => ({ ...prev, isOpen: false }));
                setShowSuccessShareMenu(false);
              }}
            />
            <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-lg shadow-black/30 z-10 max-w-sm w-full mx-4 animate-in fade-in zoom-in-95 duration-300 relative pointer-events-auto">
              {/* Share Button - Top Right */}
              {dialogState.shareSessionId && (
                <div className="absolute top-4 right-4 z-10">
                  <button
                    onClick={() =>
                      setShowSuccessShareMenu(!showSuccessShareMenu)
                    }
                    className="w-8 h-8 flex items-center justify-center rounded-lg
                      bg-white/10 border border-white/20 text-white/70 hover:bg-white/20 hover:text-white
                      backdrop-blur-md transition-all active:scale-95"
                    title="Share"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                  </button>
                  {showSuccessShareMenu && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 animate-in zoom-in-95 fade-in duration-200">
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/proof/${dialogState.shareSessionId}`;
                          navigator.clipboard.writeText(url);
                          setShowSuccessShareMenu(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-3"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                        Copy Link
                      </button>
                      <div className="h-px bg-white/10" />
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/proof/${dialogState.shareSessionId}`;
                          const text =
                            'Check out my proof of existence on POE 2026';
                          window.open(
                            `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
                            '_blank'
                          );
                          setShowSuccessShareMenu(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-3"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        Post on X
                      </button>
                      <div className="h-px bg-white/10" />
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/proof/${dialogState.shareSessionId}`;
                          const text =
                            'Check out my proof of existence on POE 2026';
                          window.open(
                            `https://www.threads.net/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
                            '_blank'
                          );
                          setShowSuccessShareMenu(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-3"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.5 12.068V12c.012-3.574.89-6.466 2.628-8.605C5.9 1.302 8.55.12 12.021.12c3.417 0 6.03 1.181 7.789 3.516 1.63 2.166 2.475 5.053 2.524 8.595l.001.024c-.049 3.542-.894 6.429-2.524 8.595-1.76 2.335-4.373 3.516-7.79 3.516l-.835-.366z" />
                        </svg>
                        Post on Threads
                      </button>
                      <div className="h-px bg-white/10" />
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/proof/${dialogState.shareSessionId}`;
                          navigator.clipboard.writeText(url);
                          window.open('https://instagram.com', '_blank');
                          setShowSuccessShareMenu(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-3"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                        </svg>
                        Post on Instagram
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Header */}
              <div className="pr-10">
                <h3
                  className={`text-lg font-medium mb-2 ${dialogState.isError ? 'text-red-400' : 'text-white'}`}
                >
                  {dialogState.title}
                </h3>
                <p className="text-white/50 text-sm mb-5">
                  {dialogState.description}
                </p>
              </div>

              {/* Footer */}
              <div className="flex gap-3 justify-end mt-2">
                {dialogState.cancelLabel && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      dialogState.onCancel?.();
                    }}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer
                      bg-white/10 border border-white/20 text-white/80
                      hover:bg-white/20 hover:text-white
                      transition-all active:scale-95"
                  >
                    {dialogState.cancelLabel}
                  </button>
                )}
                {dialogState.actionLabel && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      dialogState.onAction?.();
                    }}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer
                      bg-cyan-500/20 border border-cyan-400/30 text-cyan-300
                      hover:bg-cyan-500/30 hover:border-cyan-400/50
                      transition-all shadow-lg shadow-cyan-500/10 active:scale-95"
                  >
                    {dialogState.actionLabel}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mint Confirmation Dialog for non-Web3 users */}
        <MintConfirmationDialog
          open={showMintConfirmation}
          onOpenChange={handleMintConfirmationClose}
          data={mintConfirmationData}
          onConfirm={handleMintConfirm}
          isProcessing={isSubmitting && showMintConfirmation}
        />
      </div>
    </div>
  );
}
