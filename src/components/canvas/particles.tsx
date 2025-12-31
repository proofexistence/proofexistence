'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticleSystemProps {
  count?: number;
  color?: string;
  area?: [number, number, number];
  minSize?: number;
  maxSize?: number;
}
interface Particle {
  time: number;
  factor: number;
  speed: number;
  x: number;
  y: number;
  z: number;
  size: number;
  mx: number;
  my: number;
}
export function ParticleSystem({
  count = 100,
  color = '#ffffff',
  area = [20, 20, 20],
  minSize = 0.02,
  maxSize = 0.1,
}: ParticleSystemProps) {
  // InstancedMesh for high performance with many particles
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Initial particle data
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const time = Math.random() * 100;
      const factor = Math.random() * 100 + 50; // Speed factor
      const speed = 0.01 + Math.random() / 200;
      const x = (Math.random() - 0.5) * area[0];
      const y = (Math.random() - 0.5) * area[1];
      const z = (Math.random() - 0.5) * area[2];
      const size = minSize + Math.random() * (maxSize - minSize);

      temp.push({ time, factor, speed, x, y, z, size, mx: 0, my: 0 });
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setParticles(temp);
  }, [count, area, minSize, maxSize]);

  // Dummy object for calculating matrices
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!meshRef.current) return;

    particles.forEach((particle, i) => {
      let { time } = particle;
      const { factor, speed, x, y, z, size } = particle;

      // Update particle time for movement
      time = particle.time += speed / 2;

      // Movement pattern: gentle floating
      // Mix of sine waves on different axes
      const s = Math.cos(time);
      dummy.position.set(
        x + Math.cos((time / 10) * factor) + (Math.sin(time * 1) * factor) / 10,
        y + Math.sin((time / 10) * factor) + (Math.cos(time * 2) * factor) / 10,
        z + Math.cos((time / 10) * factor) + (Math.sin(time * 3) * factor) / 10
      );

      // Pulse size slightly
      const scale = size + Math.sin(time * 5) * (size * 0.2);
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.set(s * 5, s * 5, s * 5);
      dummy.updateMatrix();

      meshRef.current?.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <dodecahedronGeometry args={[0.2, 0]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
}
