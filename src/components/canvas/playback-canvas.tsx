'use client';

import React, { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { type TrailPoint } from '@/types/session';
import { SpaceBackground, splitIntoStrokes, CometHead } from './light-trail';
import {
  useTrailPlayback,
  UseTrailPlaybackReturn,
} from '@/hooks/use-trail-playback';
import {
  useVideoExport,
  downloadVideoBlob,
  getVideoExtension,
} from '@/hooks/use-video-export';
import { PlaybackControls } from './playback-controls';

export interface WatermarkInfo {
  title?: string; // e.g., "My Proof Title"
  username?: string; // e.g., "@username"
  siteUrl?: string; // e.g., "proofexistence.com"
}

interface PlaybackCanvasProps {
  trailData: TrailPoint[];
  color?: string;
  onExitPlayback?: () => void;
  watermark?: WatermarkInfo;
}

// Process points: filter duplicates for smoother rendering
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

// Single stroke renderer for playback
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
  const geometryRef = useRef<THREE.TubeGeometry | null>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);

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

  // Memoize emissive color
  const emissiveColor = useMemo(
    () => new THREE.Color(color).multiplyScalar(8),
    [color]
  );

  // Dispose old geometry when it changes
  useEffect(() => {
    if (geometryRef.current && geometryRef.current !== geometry) {
      geometryRef.current.dispose();
    }
    geometryRef.current = geometry;
  }, [geometry]);

  // Cleanup on unmount
  useEffect(() => {
    const geo = geometryRef.current;
    const mat = materialRef.current;
    return () => {
      if (geo) geo.dispose();
      if (mat) mat.dispose();
    };
  }, []);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        ref={materialRef}
        color="#000000"
        emissive={emissiveColor}
        emissiveIntensity={0.5}
        toneMapped={false}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}

// Trail renderer that renders only visible points
function PlaybackTrailRenderer({
  visiblePoints,
  size = 0.2,
  color = '#A855F7',
}: {
  visiblePoints: TrailPoint[];
  size?: number;
  color?: string;
}) {
  const groupRef = useRef<THREE.Group>(null);

  // Split visible points into strokes
  const strokes = useMemo(
    () => splitIntoStrokes(visiblePoints),
    [visiblePoints]
  );

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

// Time updater component - updates playback time each frame
function TimeUpdater({ playback }: { playback: UseTrailPlaybackReturn }) {
  useFrame((_, delta) => {
    // delta is in seconds, convert to ms
    playback.updateTime(delta * 1000);
  });

  return null;
}

// Scene content with playback support
function PlaybackSceneContent({
  trailData,
  color,
  playback,
}: {
  trailData: TrailPoint[];
  color?: string;
  playback: UseTrailPlaybackReturn;
}) {
  const { viewport } = useThree();

  // Calculate bounds from ALL points (not just visible) for consistent framing
  const bounds = useMemo(() => {
    const actualPoints = trailData.filter((p) => p.t !== -1);
    if (actualPoints.length === 0) return { center: [0, 0, 0], radius: 10 };

    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;

    actualPoints.forEach((p) => {
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

  // Dynamic tube radius based on scale
  const tubeRadius = useMemo(() => {
    const ratio = 0.0006;
    return Math.max(0.003, bounds.radius * ratio);
  }, [bounds.radius]);

  // Camera Z position
  const cameraZ = useMemo(() => {
    const fov = 60;
    const padding = 1.2;
    const aspect = viewport.aspect;
    const zoomFactor = aspect < 1 ? 1 / aspect : 1;

    const dist =
      (bounds.radius * 0.6 * padding * zoomFactor) /
      Math.tan((fov * Math.PI) / 360);

    return Math.max(10, dist);
  }, [bounds.radius, viewport.aspect]);

  return (
    <>
      <TimeUpdater playback={playback} />

      <group
        position={
          [-bounds.center[0], -bounds.center[1], -bounds.center[2]] as [
            number,
            number,
            number,
          ]
        }
      >
        <PlaybackTrailRenderer
          visiblePoints={playback.visiblePoints}
          size={tubeRadius}
          color={color}
        />

        {/* CometHead at current drawing position */}
        {playback.cometPosition && playback.currentTime < playback.duration && (
          <CometHead
            position={playback.cometPosition}
            color={color}
            isActive={true}
          />
        )}
      </group>

      <ambientLight intensity={0.5} />
      <PerspectiveCamera
        makeDefault
        position={[0, 0, cameraZ]}
        fov={60}
        near={0.1}
        far={cameraZ * 10}
      />
    </>
  );
}

export function PlaybackCanvas({
  trailData,
  color = '#A855F7',
  onExitPlayback,
  watermark,
}: PlaybackCanvasProps) {
  const playback = useTrailPlayback(trailData);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const videoExport = useVideoExport();
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);

  // Auto-play on mount
  useEffect(() => {
    // Small delay to ensure everything is rendered
    const timer = setTimeout(() => {
      playback.play();
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle video export
  const handleExportVideo = useCallback(async () => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const canvas = container.querySelector('canvas');
    if (!canvas) return;

    // Pause current playback
    playback.pause();
    setDownloadMessage(null);

    try {
      const blob = await videoExport.exportVideo(
        canvas,
        playback.duration,
        (speed) => {
          playback.setSpeed(speed);
          playback.play();
        },
        () => playback.pause(),
        () => playback.seek(0),
        {
          playbackSpeed: 2, // Export at 2x speed for faster processing
          watermark: watermark,
        }
      );

      if (blob) {
        const timestamp = new Date().toISOString().slice(0, 10);
        const extension = getVideoExtension(blob);
        const result = await downloadVideoBlob(
          blob,
          `proof-replay-${timestamp}.${extension}`
        );

        switch (result) {
          case 'shared':
            setDownloadMessage('Video shared!');
            break;
          case 'downloaded':
            setDownloadMessage('Video saved!');
            break;
          case 'opened':
            setDownloadMessage('Long press video to save to Photos');
            break;
          case 'cancelled':
            // User cancelled, no message needed
            break;
        }

        if (result !== 'cancelled') {
          setTimeout(() => setDownloadMessage(null), 4000);
        }
      }
    } finally {
      // Reset to normal speed and beginning
      playback.setSpeed(1);
      playback.seek(0);
    }
  }, [playback, videoExport, watermark]);

  return (
    <div
      ref={canvasContainerRef}
      className="w-full h-full relative bg-transparent"
    >
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

        <PlaybackSceneContent
          trailData={trailData}
          color={color}
          playback={playback}
        />

        <EffectComposer enableNormalPass={false}>
          <Bloom luminanceThreshold={0.4} mipmapBlur intensity={0.5} />
        </EffectComposer>
      </Canvas>

      {/* Playback Controls Overlay */}
      <PlaybackControls
        playback={playback}
        onExit={onExitPlayback}
        onExportVideo={handleExportVideo}
        isExporting={videoExport.isExporting}
        exportProgress={videoExport.progress}
        exportStatus={videoExport.status}
      />

      {/* Download Success Toast */}
      {downloadMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="px-4 py-2 bg-green-500/90 text-white text-sm font-medium rounded-full shadow-lg backdrop-blur-sm">
            {downloadMessage}
          </div>
        </div>
      )}
    </div>
  );
}
