import { useMemo } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import { BrandLogoLibrary } from './brand-logos';

interface BrandConstellationProps {
  position: [number, number, number];
  scale?: number;
  color?: string;
  brandName: string;
  logoType: string;
}

// Logic to generate the Brand Constellation
export function BrandConstellation({
  position = [50, 0, 0],
  scale = 5,
  color = '#6C47FF',
  brandName = 'Brand',
  logoType,
}: BrandConstellationProps) {
  // Generate the geometry from the library
  const { points, lines } = useMemo(() => {
    const generator = BrandLogoLibrary[logoType];
    if (!generator) {
      console.warn(
        `[BrandConstellation] No generator found for type: ${logoType}`
      );
      // Return empty or fallback
      return { points: [], lines: [] };
    }
    return generator();
  }, [logoType]);

  const lineGeometry = useMemo(() => {
    if (!points.length) return null;
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    geo.setIndex(lines);
    return geo;
  }, [points, lines]);

  if (!points.length) return null; // Don't render if invalid

  return (
    <group position={position}>
      {/* Render Points (The "Stars" of the constellation) */}
      {points.map((pt: THREE.Vector3, i: number) => (
        <mesh key={i} position={[pt.x, pt.y * scale, pt.z * scale]}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      ))}

      {/* Render Lines (The "Constellation Lines") */}
      {lineGeometry && (
        <lineSegments scale={[1, scale, scale]}>
          <bufferGeometry attach="geometry" {...lineGeometry} />
          <lineBasicMaterial
            attach="material"
            color={color}
            transparent
            opacity={0.3}
          />
        </lineSegments>
      )}

      {/* Brand Label */}
      <Text
        position={[0, -1 * scale, 0]} // Just below it
        rotation={[0, -Math.PI / 2, 0]} // Face the camera
        fontSize={3}
        color={color}
        anchorX="center"
        anchorY="top"
      >
        {brandName}
      </Text>
    </group>
  );
}
