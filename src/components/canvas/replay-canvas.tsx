'use client';

import React, { useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { type TrailPoint } from '@/types/session';
import { SpaceBackground, splitIntoStrokes } from './light-trail';
import { ParticleSystem } from './particles';

export interface ReplayCanvasRef {
  toDataURL: () => string;
  resetView: () => void;
}

interface ReplayCanvasProps {
  trailData: TrailPoint[];
  isSpinning?: boolean;
  color?: string;
  onBeforeScreenshot?: () => void;
}

// Helper to access GL context via ref
interface CanvasCaptureRef {
  toDataURL: () => string;
}

const CanvasCapture = forwardRef<CanvasCaptureRef, unknown>((_, ref) => {
  const { gl } = useThree();

  useImperativeHandle(ref, () => ({
    toDataURL: () => {
      // Do NOT manually render; the EffectComposer loop handles the render.
      // gl.render(scene, camera);

      return gl.domElement.toDataURL('image/jpeg', 0.9);
    },
  }));

  return null;
});
CanvasCapture.displayName = 'CanvasCapture';

// Process points: filter duplicates and smooth
function processPoints(points: TrailPoint[], size: number): TrailPoint[] {
  if (points.length < 2) return [];
  const uniquePoints: TrailPoint[] = [points[0]];
  let lastPoint = points[0];

  const minDistance = size * 0.5;

  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    const dist = Math.sqrt(
      Math.pow(p.x - lastPoint.x, 2) +
        Math.pow(p.y - lastPoint.y, 2) +
        Math.pow(p.z - lastPoint.z, 2)
    );
    if (dist > minDistance) {
      uniquePoints.push(p);
      lastPoint = p;
    }
  }
  return uniquePoints;
}

// Single stroke renderer for replay
function StrokeRenderer({
  points,
  size,
  color,
}: {
  points: TrailPoint[];
  size: number;
  color: string;
}) {
  const processedPoints = useMemo(
    () => processPoints(points, size),
    [points, size]
  );

  const curve = useMemo(() => {
    if (processedPoints.length < 2) return null;
    const vectors = processedPoints.map(
      (p) => new THREE.Vector3(p.x, p.y, p.z)
    );
    return new THREE.CatmullRomCurve3(vectors);
  }, [processedPoints]);

  const geometry = useMemo(() => {
    if (!curve) return null;
    const tubularSegments = Math.min(processedPoints.length * 8, 2000);
    return new THREE.TubeGeometry(curve, tubularSegments, size, 8, false);
  }, [curve, processedPoints.length, size]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color="#000000"
        emissive={new THREE.Color(color).multiplyScalar(8)}
        emissiveIntensity={0.5}
        toneMapped={false}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}

// Main renderer using TubeGeometry (supports multi-stroke)
function TrailRenderer({
  points,
  size = 0.2,
  isSpinning = true,
  color = '#A855F7',
}: {
  points: TrailPoint[];
  size?: number;
  isSpinning?: boolean;
  color?: string;
}) {
  const groupRef = useRef<THREE.Group>(null);

  // Split points into strokes (supports multi-stroke sessions)
  const strokes = useMemo(() => splitIntoStrokes(points), [points]);

  useFrame((state, delta) => {
    if (groupRef.current && isSpinning) {
      groupRef.current.rotation.y += delta * 0.2;
    }
  });

  if (strokes.length === 0) return null;

  return (
    <group ref={groupRef}>
      {strokes.map((strokePoints, index) => (
        <StrokeRenderer
          key={index}
          points={strokePoints}
          size={size}
          color={color}
        />
      ))}
    </group>
  );
}

// Update SceneContent props to accept controlsRef
function SceneContent({
  trailData,
  isSpinning,
  color,
  controlsRef,
}: {
  trailData: TrailPoint[];
  isSpinning: boolean;
  color?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controlsRef?: React.MutableRefObject<any>;
}) {
  // Determine bounds to center camera
  const bounds = useMemo(() => {
    if (trailData.length === 0) return { center: [0, 0, 0], radius: 10 };

    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;

    trailData.forEach((p) => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      minZ = Math.min(minZ, p.z);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
      maxZ = Math.max(maxZ, p.z);
    });

    const center = [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2];
    const radius = Math.max(maxX - minX, maxY - minY, maxZ - minZ);

    return { center, radius };
  }, [trailData]);

  // Dynamic radius based on scale
  const tubeRadius = useMemo(() => {
    // Maintain consistent thickness relative to scene size
    // Adjusted ratio to 0.0006 for comfort
    const ratio = 0.0006;
    // Clamp minimum size to prevent invisibility on tiny scales
    return Math.max(0.003, bounds.radius * ratio);
  }, [bounds.radius]);

  return (
    <>
      <group
        position={
          [-bounds.center[0], -bounds.center[1], -bounds.center[2]] as [
            number,
            number,
            number,
          ]
        }
      >
        <TrailRenderer
          points={trailData}
          size={tubeRadius}
          isSpinning={isSpinning}
          color={color}
        />
      </group>

      <ambientLight intensity={0.5} />
      <PerspectiveCamera
        makeDefault
        position={[0, 0, Math.max(20, bounds.radius * 2)]}
      />
      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        autoRotate={isSpinning}
        autoRotateSpeed={2.0}
      />
    </>
  );
}

export const ReplayCanvas = forwardRef<ReplayCanvasRef, ReplayCanvasProps>(
  ({ trailData, isSpinning = true, color = '#A855F7' }, ref) => {
    // Internal ref to bridge the CanvasCapture
    const captureRef = useRef<CanvasCaptureRef>(null);
    const controlsRef = useRef<{ reset: () => void } | null>(null);

    // Forward the capture method to the parent ref
    useImperativeHandle(ref, () => ({
      toDataURL: () => {
        if (captureRef.current) {
          return captureRef.current.toDataURL();
        }
        return '';
      },
      resetView: () => {
        if (controlsRef.current) {
          controlsRef.current.reset();
        }
      },
    }));

    return (
      <div className="w-full h-full relative bg-transparent">
        <Canvas
          gl={{
            toneMapping: THREE.NoToneMapping,
            preserveDrawingBuffer: true,
            alpha: true,
          }}
        >
          <color attach="background" args={['#050508']} />
          <fog attach="fog" args={['#050508', 20, 80]} />
          <SpaceBackground starCount={800} />
          <ParticleSystem count={150} color={color} area={[30, 30, 30]} />
          <CanvasCapture ref={captureRef} />
          <SceneContent
            trailData={trailData}
            isSpinning={isSpinning}
            color={color}
            controlsRef={controlsRef}
          />
          <EffectComposer enableNormalPass={false}>
            <Bloom luminanceThreshold={0.4} mipmapBlur intensity={0.5} />
          </EffectComposer>
        </Canvas>
      </div>
    );
  }
);
ReplayCanvas.displayName = 'ReplayCanvas';
