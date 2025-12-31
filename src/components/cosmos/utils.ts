import * as THREE from 'three';
import { CosmosTrail } from './types';

// Deterministic Star Positioning Logic
export function getStarPosition(
  trail: CosmosTrail,
  minTime: number,
  timeSpan: number
): THREE.Vector3 {
  const time = new Date(trail.createdAt).getTime();
  const t = (time - minTime) / timeSpan;

  // X = Time
  const x = (t - 0.5) * 600;

  // Y/Z = Centroid
  let avgX = 0,
    avgY = 0;
  if (trail.trailData && trail.trailData.length > 0) {
    trail.trailData.forEach((p) => {
      avgX += p.x;
      avgY += p.y;
    });
    avgX /= trail.trailData.length;
    avgY /= trail.trailData.length;
  }

  // Scale & Spiral Logic
  const scaleFactor = 8.0;
  const finalY = avgY * scaleFactor;
  const finalZ = avgX * scaleFactor;

  const waveFrequency = 4;
  const waveAmplitude = 15;

  const yOffset = Math.sin(t * Math.PI * waveFrequency) * waveAmplitude;
  const zOffset = Math.cos(t * Math.PI * (waveFrequency * 0.7)) * waveAmplitude;

  const spiralAngle = t * Math.PI * 12;
  const cos = Math.cos(spiralAngle);
  const sin = Math.sin(spiralAngle);

  const rotatedY = finalY * cos - finalZ * sin;
  const rotatedZ = finalY * sin + finalZ * cos;

  return new THREE.Vector3(x, rotatedY + yOffset, rotatedZ + zOffset);
}
