'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Space background with stars
interface SpaceBackgroundProps {
  starCount?: number;
  nebulaColor1?: string;
  nebulaColor2?: string;
}

export const SpaceBackground = React.memo(function SpaceBackground({
  starCount = 500,
  nebulaColor1 = '#1a0533',
  nebulaColor2 = '#0a1628',
}: SpaceBackgroundProps) {
  // Generate random star positions
  const stars = useMemo(() => {
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      // Spread stars in a large sphere
      // eslint-disable-next-line react-hooks/purity
      const radius = 30 + Math.random() * 50;
      // eslint-disable-next-line react-hooks/purity
      const theta = Math.random() * Math.PI * 2;
      // eslint-disable-next-line react-hooks/purity
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // Vary star colors (white to light blue/yellow)
      // eslint-disable-next-line react-hooks/purity
      const colorChoice = Math.random();
      if (colorChoice < 0.6) {
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 1;
      } else if (colorChoice < 0.8) {
        colors[i * 3] = 0.8;
        colors[i * 3 + 1] = 0.9;
        colors[i * 3 + 2] = 1;
      } else {
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 0.95;
        colors[i * 3 + 2] = 0.8;
      }

      // eslint-disable-next-line react-hooks/purity
      sizes[i] = 0.02 + Math.random() * 0.08;
    }

    return { positions, colors, sizes };
  }, [starCount]);

  const pointsRef = useRef<THREE.Points>(null);

  // Slow rotation for immersion
  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.005;
      pointsRef.current.rotation.x =
        Math.sin(state.clock.elapsedTime * 0.003) * 0.05;
    }
  });

  return (
    <>
      {/* Starfield */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[stars.positions, 3]}
          />
          <bufferAttribute attach="attributes-color" args={[stars.colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          vertexColors
          transparent
          opacity={0.9}
          sizeAttenuation
        />
      </points>

      {/* Distant nebula glow spheres */}
      <mesh position={[-20, 10, -40]}>
        <sphereGeometry args={[15, 32, 32]} />
        <meshBasicMaterial color={nebulaColor1} transparent opacity={0.15} />
      </mesh>
      <mesh position={[25, -15, -50]}>
        <sphereGeometry args={[20, 32, 32]} />
        <meshBasicMaterial color={nebulaColor2} transparent opacity={0.1} />
      </mesh>
    </>
  );
});
