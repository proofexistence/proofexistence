'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { Text } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { BrandConstellation } from './brand-constellation';
import { ACTIVE_BRANDS } from '@/config/brands';
import { CosmosSearch } from './cosmos-search';
import { TechInfoOverlay } from './tech-info-overlay';
import { useWeb3Auth } from '@/lib/web3auth';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { StarField } from './star-field';
import { CosmosTrail } from './types';
import { getStarPosition } from './utils';

// Helper to track 3D position to 2D screen coordinates
function ScreenPositionTracker({
  targetPosition,
  onUpdate,
}: {
  targetPosition: THREE.Vector3 | null;
  onUpdate: (pos: { x: number; y: number } | null) => void;
}) {
  const { camera, size } = useThree();
  const tempV = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (!targetPosition) {
      onUpdate(null);
      return;
    }

    // Clone position to avoid mutating original if it's a ref
    tempV.copy(targetPosition);

    // Project to NDC (-1 to +1)
    tempV.project(camera);

    // Convert to Screen Coords
    const x = (tempV.x * 0.5 + 0.5) * size.width;
    const y = (-(tempV.y * 0.5) + 0.5) * size.height;

    onUpdate({ x, y });
  });

  return null;
}

export function CosmosCanvas({
  trails,
  highlightId,
}: {
  trails: CosmosTrail[];
  highlightId?: string;
}) {
  const [selectedTrail, setSelectedTrail] = useState<CosmosTrail | null>(null);
  const [screenPos, setScreenPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [targetPos, setTargetPos] = useState<THREE.Vector3 | null>(null);
  const [starPositions, setStarPositions] = useState<
    Map<string, THREE.Vector3>
  >(new Map());
  const [mounted, setMounted] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Compute Timeline props at this level so we can use them for search positioning too
  const { minTime, maxTime } = useMemo(() => {
    if (!trails.length) return { minTime: 0, maxTime: 0 };
    const times = trails.map((t) => new Date(t.createdAt).getTime());
    return {
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
    };
  }, [trails]);
  const timeSpan = maxTime - minTime || 1;

  // Function to select a star and calculate its position if unknown
  const selectStar = useCallback(
    (trail: CosmosTrail, knownPosition?: THREE.Vector3) => {
      setSelectedTrail(trail);

      if (knownPosition) {
        setTargetPos(knownPosition);
      } else {
        // First try to check our computed map
        if (starPositions.has(trail.id)) {
          setTargetPos(starPositions.get(trail.id)!);
        } else {
          // Fallback to theoretical (might be offset if collision happened)
          const basePos = getStarPosition(trail, minTime, timeSpan);
          setTargetPos(basePos);
        }
      }
    },
    [starPositions, minTime, timeSpan]
  );

  useEffect(() => {
    if (highlightId && trails.length > 0) {
      const found = trails.find((t) => t.id === highlightId);
      if (found) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        selectStar(found);
      }
    }
  }, [highlightId, trails, starPositions, selectStar]); // re-run if map updates

  const validTrails = useMemo(() => {
    if (!trails) return [];
    return trails.filter(
      (t) => Array.isArray(t.trailData) && t.trailData.length > 1 // Filter out single-point trails which are invisible
    );
  }, [trails]);

  if (!mounted) return <div className="w-full h-full bg-black" />;

  return (
    <div className="w-full h-full bg-black relative">
      <Canvas camera={{ position: [0, 20, 100], fov: 50 }}>
        <color attach="background" args={['#000000']} />

        <ScreenPositionTracker
          targetPosition={targetPos}
          onUpdate={setScreenPos}
        />

        <Stars
          radius={150}
          depth={50}
          count={7000}
          factor={4}
          saturation={0}
          fade
          speed={0.5}
        />
        <ambientLight intensity={0.2} />
        <pointLight position={[0, 0, 0]} intensity={2} color="purple" />

        {/* Pass computed time props down */}
        <StarField
          trails={validTrails}
          minTime={minTime}
          timeSpan={timeSpan}
          onSelect={selectStar}
          isFocused={!!selectedTrail}
          onLayoutComputed={setStarPositions}
        />

        <TimeMarkers minTime={minTime} maxTime={maxTime} />
        <ReferenceGrid />

        {ACTIVE_BRANDS.map((brand) => (
          <BrandConstellation
            key={brand.id}
            brandName={brand.name}
            logoType={brand.logoType}
            position={brand.position}
            color={brand.color}
            scale={brand.scale}
          />
        ))}

        {selectedTrail && (
          <group>
            {targetPos && (
              <group position={targetPos}>
                {/* Render the Trail */}
                <StaticTrail
                  points={selectedTrail.trailData}
                  color={selectedTrail.color || '#ffffff'}
                  offsetZ={0}
                  scale={2}
                />
              </group>
            )}
          </group>
        )}

        <EffectComposer>
          <Bloom
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            height={300}
            intensity={1.0}
          />
        </EffectComposer>

        <OrbitControls
          autoRotate={!selectedTrail}
          autoRotateSpeed={0.5}
          enableZoom={true}
          maxDistance={800}
          minDistance={10}
          target={targetPos || new THREE.Vector3(0, 0, 0)}
        />
      </Canvas>

      {/* UI Overlay */}
      {/* Mobile: Search at navbar level (between logo and hamburger) */}
      <div className="md:hidden fixed top-3 left-0 right-0 z-[55] px-14 pointer-events-none">
        <div className="flex items-center justify-center">
          <div className="pointer-events-auto">
            <CosmosSearch
              trails={validTrails}
              onSelect={(t) => {
                selectStar(t);
                setIsSearchActive(false);
              }}
              externalActive={isSearchActive}
              onToggle={setIsSearchActive}
            />
          </div>
        </div>
      </div>

      {/* Desktop: Search centered below navbar */}
      <div className="hidden md:block fixed top-20 left-0 right-0 z-40 px-6 pointer-events-none">
        <div className="flex items-center justify-center max-w-screen-lg mx-auto">
          <div className="pointer-events-auto">
            <CosmosSearch
              trails={validTrails}
              onSelect={(t) => {
                selectStar(t);
                setIsSearchActive(false);
              }}
              externalActive={isSearchActive}
              onToggle={setIsSearchActive}
            />
          </div>
        </div>
      </div>

      {/* Mobile: Find My Star below navbar, left aligned */}
      <div className="md:hidden fixed top-16 left-0 right-0 z-40 px-4 pointer-events-none">
        <div className="flex items-center justify-start">
          <div className="pointer-events-auto">
            <FindMeButton trails={validTrails} onFocus={selectStar} compact />
          </div>
        </div>
      </div>

      {/* Title Bottom Center */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-center w-full px-4">
        <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-[linear-gradient(to_right,#0CC9F2,#4877DA,#7E44DB)] tracking-tighter">
          Proof Existence
        </h1>
        <p className="text-white/50 text-[10px] md:text-xs mt-2 uppercase tracking-widest pl-1">
          {validTrails.length} Traces of Infinity
        </p>
        {validTrails.length > 0 && (
          <p className="text-blue-400/80 text-[10px] font-mono mt-1 pl-1">
            TIMELINE:{' '}
            {new Date(
              validTrails[validTrails.length - 1].createdAt
            ).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}{' '}
            —{' '}
            {new Date(validTrails[0].createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        )}
      </div>

      {/* Desktop Find Me Button - Bottom Right */}
      <div className="absolute bottom-8 right-8 z-20 hidden md:flex flex-col gap-2">
        <FindMeButton trails={validTrails} onFocus={selectStar} />
      </div>

      <TechInfoOverlay
        trail={selectedTrail}
        screenPos={screenPos}
        onClose={() => {
          setSelectedTrail(null);
          setTargetPos(null);
        }}
      />
    </div>
  );
}

// Updated to accept props directly primarily
function TimeMarkers({
  minTime,
  maxTime,
}: {
  minTime: number;
  maxTime: number;
}) {
  const markers = useMemo(() => {
    if (!minTime || !maxTime) return [];
    const count = 5;
    const result = [];
    const timeSpan = maxTime - minTime || 1;

    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const time = minTime + t * timeSpan;
      const x = (t - 0.5) * 600;
      result.push({
        x,
        label: new Date(time).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      });
    }
    return result;
  }, [minTime, maxTime]);

  return (
    <group position={[0, -25, 0]}>
      {markers.map((m, i) => (
        <group key={i} position={[m.x, 0, 0]}>
          <mesh position={[0, 10, 0]}>
            <boxGeometry args={[0.2, 20, 0.2]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.1} />
          </mesh>
          <Text
            position={[0, -2, 0]}
            fontSize={3}
            color="#ffffff"
            anchorX="center"
            anchorY="top"
            fillOpacity={0.5}
          >
            {m.label}
          </Text>
        </group>
      ))}
    </group>
  );
}

function ReferenceGrid() {
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 800, 8]} />
        <meshBasicMaterial color="#4c1d95" transparent opacity={0.4} />
      </mesh>
      <Text
        position={[310, 0, 0]}
        fontSize={4}
        color="#a855f7"
        anchorX="left"
        fillOpacity={0.6}
      >
        TIME FLOW →
      </Text>
    </group>
  );
}

function FindMeButton({
  trails,
  onFocus,
  compact = false,
}: {
  trails: CosmosTrail[];
  onFocus: (t: CosmosTrail) => void;
  compact?: boolean;
}) {
  const { user, isConnected } = useWeb3Auth();
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!isConnected || !user) return null;

  const walletAddress = user.walletAddress;

  if (!walletAddress) return null;

  // Filter all stars belonging to this user
  const myTrails = trails.filter(
    (t) =>
      t.walletAddress &&
      t.walletAddress.toLowerCase() === walletAddress.toLowerCase()
  );

  if (myTrails.length === 0) {
    if (compact) return null; // Hide on mobile if no trails
    return (
      <div className="px-4 py-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full text-white/30 text-xs text-center">
        No stars yet
      </div>
    );
  }

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % myTrails.length;
    setCurrentIndex(nextIndex);
    onFocus(myTrails[nextIndex]);
  };

  const handlePrev = () => {
    const prevIndex = (currentIndex - 1 + myTrails.length) % myTrails.length;
    setCurrentIndex(prevIndex);
    onFocus(myTrails[prevIndex]);
  };

  // If there are multiple stars, show navigation controls
  if (myTrails.length > 1) {
    return (
      <div
        className={`flex items-center bg-black/40 backdrop-blur-xl rounded-full border border-white/10 shadow-lg shadow-black/30 ${
          compact ? 'gap-0 p-0.5' : 'gap-1 p-1'
        }`}
      >
        <button
          onClick={handlePrev}
          className={`${compact ? 'p-2' : 'p-2.5 md:p-2'} hover:bg-white/10 rounded-full transition-colors group touch-manipulation`}
          aria-label="Previous Star"
        >
          <ChevronLeft
            className={`${compact ? 'w-4 h-4' : 'w-5 h-5 md:w-4 md:h-4'} text-cyan-400 group-hover:text-cyan-300`}
          />
        </button>

        <button
          onClick={() => onFocus(myTrails[currentIndex])}
          className={`${
            compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
          } bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:brightness-110 text-white font-semibold rounded-full transition-all flex items-center gap-2 touch-manipulation`}
        >
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          <span>
            {compact
              ? `${currentIndex + 1}/${myTrails.length}`
              : `Star ${currentIndex + 1}/${myTrails.length}`}
          </span>
        </button>

        <button
          onClick={handleNext}
          className={`${compact ? 'p-2' : 'p-2.5 md:p-2'} hover:bg-white/10 rounded-full transition-colors group touch-manipulation`}
          aria-label="Next Star"
        >
          <ChevronRight
            className={`${compact ? 'w-4 h-4' : 'w-5 h-5 md:w-4 md:h-4'} text-cyan-400 group-hover:text-cyan-300`}
          />
        </button>
      </div>
    );
  }

  // Single star fallback
  return (
    <button
      onClick={() => onFocus(myTrails[0])}
      className={`${
        compact ? 'px-4 py-2.5 text-sm' : 'px-5 py-2.5 text-sm'
      } bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:brightness-110 text-white rounded-full font-semibold shadow-lg shadow-purple-900/30 transition-all active:scale-95 flex items-center gap-2 touch-manipulation`}
    >
      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
      <span>{compact ? 'My Star' : 'Find My Star'}</span>
    </button>
  );
}

function StaticTrail({
  points,
  color,
  offsetZ,
  scale = 1,
}: {
  points: { x: number; y: number; z?: number }[];
  color: string;
  offsetZ: number;
  scale?: number;
}) {
  const lineGeometry = useMemo(() => {
    if (!points || !Array.isArray(points) || points.length < 2) return null;

    // Calculate Centroid to center the trail at (0,0) locally
    let avgX = 0,
      avgY = 0;
    points.forEach((p) => {
      avgX += p.x;
      avgY += p.y;
    });
    avgX /= points.length;
    avgY /= points.length;

    const vectorPoints = points.map(
      (p) =>
        new THREE.Vector3(
          (p.x - avgX) * scale, // Center and scale
          (p.y - avgY) * scale,
          (p.z || 0) * scale + offsetZ
        )
    );
    return new THREE.BufferGeometry().setFromPoints(vectorPoints);
  }, [points, offsetZ, scale]);

  if (!lineGeometry) return null;
  return (
    <line>
      <bufferGeometry {...lineGeometry} />
      <lineBasicMaterial color={color} transparent opacity={1} linewidth={2} />
    </line>
  );
}
