'use client';

import { useMemo, useRef, useEffect } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { CosmosTrail } from './types';
import { getStarPosition } from './utils';
import { ACTIVE_BRANDS } from '../../config/brands';

interface StarFieldProps {
  trails: CosmosTrail[];
  minTime: number;
  timeSpan: number;
  onSelect: (trail: CosmosTrail, position: THREE.Vector3) => void;
  isFocused: boolean;
  onLayoutComputed?: (positions: Map<string, THREE.Vector3>) => void;
}

export function StarField({
  trails,
  minTime,
  timeSpan,
  onSelect,
  isFocused,
  onLayoutComputed,
}: StarFieldProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  // Track pointer down position to distinguish tap from drag (for mobile)
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

  // ... (imports remain)

  // Calculate final positions and sizes once, with collision resolution
  const layout = useMemo(() => {
    if (!trails.length) return { positions: [], sizes: [] };

    const positions: THREE.Vector3[] = [];
    const sizes: number[] = [];

    // A. Initial Placement & Gravity
    // Seeded pseudo-random function for deterministic "randomness"
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    trails.forEach((trail, index) => {
      const pos = getStarPosition(trail, minTime, timeSpan);

      // GRAVITY LOGIC: Check for Brand Association
      // If the trail has content related to a brand, pull it towards the brand's constellation
      // Simple heuristic for now: check message/username for brand ID
      let matchingBrand = null;
      for (const brand of ACTIVE_BRANDS) {
        if (
          trail.message?.toLowerCase().includes(brand.id) ||
          trail.userName?.toLowerCase().includes(brand.id) ||
          trail.title?.toLowerCase().includes(brand.id)
        ) {
          matchingBrand = brand;
          break;
        }
      }

      if (matchingBrand) {
        const brandPos = new THREE.Vector3(
          matchingBrand.position[0],
          matchingBrand.position[1],
          matchingBrand.position[2]
        );

        // Strong Pull: Move 85% of the way to the brand
        // We leave 15% of the original 'Time' position to create a trail effect towards the brand
        pos.lerp(brandPos, 0.85);

        // Add deterministic randomness to create a "cloud" or "orbit" around the brand
        // Use seeded random based on index for React purity compliance
        const randomOffset = new THREE.Vector3(
          (seededRandom(index * 3 + 1) - 0.5) * 15,
          (seededRandom(index * 3 + 2) - 0.5) * 15,
          (seededRandom(index * 3 + 3) - 0.5) * 15
        );
        pos.add(randomOffset);
      }

      positions.push(pos);

      // Determine size
      const totalCount = trails.length;
      const densityScale = Math.min(1.5, Math.max(0.3, 800 / totalCount));
      const duration = trail.duration || 1;

      // Paid trails are slightly larger
      const baseSize = 1 + Math.log(duration + 1) * 0.2;
      const paidMultiplier = trail.isPaid ? 1.5 : 1.0;

      const size = baseSize * densityScale * paidMultiplier;
      sizes.push(size);
    });

    // B. Collision Resolution
    const runCollision = trails.length <= 1000;
    const iterations = runCollision ? 8 : 0;
    const padding = 0.5;

    // ... (Collision logic remains the same)
    if (runCollision && iterations > 0) {
      for (let iter = 0; iter < iterations; iter++) {
        let moved = false;
        for (let i = 0; i < positions.length; i++) {
          for (let j = i + 1; j < positions.length; j++) {
            const p1 = positions[i];
            const p2 = positions[j];
            const r1 = sizes[i] * 1.5;
            const r2 = sizes[j] * 1.5;

            const distSq = p1.distanceToSquared(p2);
            const minDist = r1 + r2 + padding;

            if (distSq < minDist * minDist) {
              const dist = Math.sqrt(distSq);
              const overlap = minDist - dist;
              let dx = p1.x - p2.x;
              let dy = p1.y - p2.y;
              let dz = p1.z - p2.z;

              if (dist < 0.01) {
                dy = 0.5;
                dz = 0.5;
              } else {
                dx /= dist;
                dy /= dist;
                dz /= dist;
              }

              const xWeight = 0.1;
              const yzWeight = 1.0;
              const moveX = dx * (overlap * 0.5) * xWeight;
              const moveY = dy * (overlap * 0.5) * yzWeight;
              const moveZ = dz * (overlap * 0.5) * yzWeight;

              p1.x += moveX;
              p1.y += moveY;
              p1.z += moveZ;
              p2.x -= moveX;
              p2.y -= moveY;
              p2.z -= moveZ;
              moved = true;
            }
          }
        }
        if (!moved) break;
      }
    }
    return { positions, sizes };
  }, [trails, minTime, timeSpan]);

  // Notify parent of computed positions
  useEffect(() => {
    if (onLayoutComputed && layout.positions.length > 0) {
      const map = new Map<string, THREE.Vector3>();
      trails.forEach((t, i) => {
        if (layout.positions[i]) {
          map.set(t.id, layout.positions[i].clone());
        }
      });
      onLayoutComputed(map);
    }
  }, [layout, trails, onLayoutComputed]);

  // Initial Layout: Apply Resolved Positions
  useEffect(() => {
    if (!meshRef.current || !layout.positions.length) return;

    trails.forEach((trail, i) => {
      const pos = layout.positions[i];
      const size = layout.sizes[i];

      dummy.position.copy(pos);
      dummy.scale.setScalar(size);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);

      let finalColor;
      const rawColor = trail.color || '#ffffff';
      const isDefaultColor = rawColor === '#ffffff' || rawColor === '#000000';
      const userColor = new THREE.Color(rawColor);

      if (trail.isPaid) {
        // GOLD for Paid/Eternal
        finalColor = new THREE.Color('#FFD700');
        // Add minimal time variation so it doesn't look flat
        const t = (pos.x + 300) / 600;
        const tint = new THREE.Color().setHSL(0.1, 1.0, 0.5 + t * 0.1);
        finalColor.lerp(tint, 0.2);
        // Boost brightness for bloom
        finalColor.multiplyScalar(4.0);
      } else {
        // Standard Time-based Color
        const t = (pos.x + 300) / 600;
        const timeColor = new THREE.Color().setHSL(0.6 - t * 0.5, 1.0, 0.5);

        if (isDefaultColor) {
          finalColor = timeColor;
        } else {
          finalColor = userColor.clone().lerp(timeColor, 0.2);
        }
        finalColor.multiplyScalar(2.0); // Less bloom than gold
      }

      meshRef.current!.setColorAt(i, finalColor);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.instanceColor!.needsUpdate = true;
  }, [trails, layout, dummy]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      if (!isFocused) {
        meshRef.current.rotation.y += delta * 0.05;
      } else {
        const PI2 = Math.PI * 2;
        const current = meshRef.current.rotation.y;
        if (Math.abs(current) > PI2) {
          meshRef.current.rotation.y = current % PI2;
        }
        meshRef.current.rotation.y = THREE.MathUtils.damp(
          meshRef.current.rotation.y,
          0,
          4,
          delta
        );
      }
    }
  });

  // Use pointer events instead of click for mobile compatibility
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();

    // Check if this was a tap (not a drag)
    if (pointerDownPos.current) {
      const dx = Math.abs(e.clientX - pointerDownPos.current.x);
      const dy = Math.abs(e.clientY - pointerDownPos.current.y);
      const isDrag = dx > 10 || dy > 10;

      if (isDrag) {
        pointerDownPos.current = null;
        return;
      }
    }
    pointerDownPos.current = null;

    const instanceId = e.instanceId;
    if (instanceId !== undefined && trails[instanceId]) {
      const trail = trails[instanceId];
      const matrix = new THREE.Matrix4();
      meshRef.current!.getMatrixAt(instanceId, matrix);
      const position = new THREE.Vector3().setFromMatrixPosition(matrix);
      position.applyMatrix4(meshRef.current!.matrixWorld);
      onSelect(trail, position);
    }
  };

  const handlePointerOver = () => {
    document.body.style.cursor = 'pointer';
  };
  const handlePointerOut = () => {
    document.body.style.cursor = 'auto';
  };

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, trails.length]}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      frustumCulled={false}
    >
      <sphereGeometry args={[1.5, 32, 32]} />
      <meshBasicMaterial
        toneMapped={false}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}
