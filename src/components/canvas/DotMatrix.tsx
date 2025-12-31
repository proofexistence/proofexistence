'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BrandTheme } from './themes';

export interface DotMatrixProps {
  cursorPosition: [number, number, number];
  isRecording: boolean;
  theme: BrandTheme;
}

export function DotMatrix({
  cursorPosition,
  // _isRecording,
  theme,
}: DotMatrixProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const hoverRef = useRef<number[]>(
    new Array((theme.matrixDensity || 100) * (theme.matrixDensity || 100)).fill(
      0
    )
  ); // Store "heat" for each dot

  // Re-initialize hover ref if density changes
  useEffect(() => {
    hoverRef.current = new Array(
      theme.matrixDensity * theme.matrixDensity
    ).fill(0);
  }, [theme.matrixDensity]);

  // Initialize the grid positions
  const { positions, dummy } = useMemo(() => {
    const temp = [];
    const dummyObj = new THREE.Object3D();
    const density = theme.matrixDensity;
    const gridSize = theme.matrixGridSize;
    const halfSize = gridSize / 2;
    const step = gridSize / density;

    for (let i = 0; i < density; i++) {
      for (let j = 0; j < density; j++) {
        const x = i * step - halfSize;
        const z = j * step - halfSize;
        const y = -2; // Push it down slightly below the main drawing plane
        temp.push({ x, y, z });
      }
    }
    return { positions: temp, dummy: dummyObj };
  }, [theme.matrixDensity, theme.matrixGridSize]);

  // Initial setup of instances
  useEffect(() => {
    if (!meshRef.current) return;

    const baseColorObj = new THREE.Color(theme.baseColor);

    positions.forEach((pos, i) => {
      dummy.position.set(pos.x, pos.y, pos.z);
      // dummy.position.set(pos.x, -2 + Math.sin(pos.x + pos.z) * 0.5, pos.z); // Wavy terrain?
      dummy.scale.setScalar(0.05); // Small dots
      dummy.updateMatrix();
      meshRef.current?.setMatrixAt(i, dummy.matrix);
      meshRef.current?.setColorAt(i, baseColorObj); // Default color from theme
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.instanceColor!.needsUpdate = true;
  }, [positions, dummy, theme.baseColor]);

  // Animation Loop: Update colors based on interaction
  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const [cx, cy, cz] = cursorPosition;
    const targetColor = new THREE.Color(theme.primaryColor);
    const baseColor = new THREE.Color(theme.baseColor);

    // Decay factor (how fast dots fade back to normal)
    const decay = 2.0 * delta;
    // Rise factor (how fast they light up)
    const rise = 10.0 * delta;

    let needsUpdate = false;
    const radius = theme.interactionRadius;

    positions.forEach((pos, i) => {
      // Calculate distance to cursor (ignore Y for 2D-ish interaction on the floor)
      const dx = pos.x - cx;
      // const dz = pos.z - cz;

      // Calculate real 3D distance
      const dist = Math.sqrt(
        dx * dx + (pos.y - cy) * (pos.y - cy) + (pos.z - cz) * (pos.z - cz)
      );

      // Current heat value (0 to 1)
      let heat = hoverRef.current[i];

      // If cursor is close
      if (dist < radius) {
        heat = Math.min(heat + rise, 1.0);
      } else {
        heat = Math.max(heat - decay, 0.0);
      }

      hoverRef.current[i] = heat;

      // Only update color instance if heat > 0 or it was previously heated
      // For simplicity update all for now.

      const outputColor = baseColor.clone().lerp(targetColor, heat);

      dummy.position.set(pos.x, pos.y, pos.z);
      const scale = 0.05 + heat * 0.08; // Grow when lit
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);

      meshRef.current!.setColorAt(i, outputColor);
      needsUpdate = true;
    });

    if (needsUpdate) {
      meshRef.current.instanceMatrix.needsUpdate = true;
      if (meshRef.current.instanceColor)
        meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, theme.matrixDensity * theme.matrixDensity]}
      position={[0, 0, -2]} // Background plane
    >
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial
        toneMapped={false}
        transparent
        // opacity={0.8}
      />
    </instancedMesh>
  );
}
