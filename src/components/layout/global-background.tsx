'use client';

import { useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { SpaceBackground } from '@/components/canvas/space-background';

function CameraRig() {
  useFrame((state) => {
    // Simple auto-rotation
    const t = state.clock.elapsedTime * 0.05;
    state.camera.position.x = Math.sin(t) * 20;
    state.camera.position.z = Math.cos(t) * 20;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

export function GlobalBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Defer rendering to unblock main thread during hydration
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (!mounted) return <div className="fixed inset-0 z-[-1] bg-black" />;

  return (
    <div className="fixed inset-0 z-[-1] bg-black animate-in fade-in duration-1000">
      <Canvas camera={{ position: [0, 0, 20], fov: 60 }}>
        <SpaceBackground starCount={500} />
        <ambientLight intensity={0.5} />
        <CameraRig />
      </Canvas>
    </div>
  );
}
