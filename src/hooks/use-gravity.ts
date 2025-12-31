'use client';

import { useMemo } from 'react';

interface GravityTarget {
  x: number;
  y: number;
  strength: number; // 0 to 1
  radius: number;
}

// Example Logo Shape: "NIKE Swoosh" approximation (simple curve)
// In a real app, this would be a series of points from an SVG path
const LOGO_POINTS: GravityTarget[] = [
  { x: -2, y: -1, strength: 0.8, radius: 1.5 },
  { x: 0, y: -1.5, strength: 0.8, radius: 1.5 },
  { x: 2, y: -1, strength: 0.8, radius: 1.5 },
  { x: 4, y: 1, strength: 0.8, radius: 1.5 },
];

export function useGravity() {
  const targets = useMemo(() => LOGO_POINTS, []);

  const applyGravity = (x: number, y: number, z: number) => {
    // Only apply gravity if we are "close enough" to the target shape
    // Find closest target point
    let closestDist = Infinity;
    let closestTarget: GravityTarget | null = null;

    for (const target of targets) {
      const dx = x - target.x;
      const dy = y - target.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < closestDist) {
        closestDist = dist;
        closestTarget = target;
      }
    }

    if (closestTarget && closestDist < closestTarget.radius) {
      // Calculate pull vector towards target
      // The closer (but not TOO close) the stronger the pull?
      // Simple lerp for now:

      const t = closestTarget as GravityTarget;
      const strength = t.strength * (1 - closestDist / t.radius); // Stronger at center

      // Apply pull
      const newX = x + (t.x - x) * strength * 0.1; // 0.1 damping factor
      const newY = y + (t.y - y) * strength * 0.1;

      return [newX, newY, z] as [number, number, number];
    }

    return [x, y, z] as [number, number, number];
  };

  return { applyGravity };
}
