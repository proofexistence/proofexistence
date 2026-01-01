import * as THREE from 'three';

// Type for the Geometry Data
export interface BrandLogoGeometry {
  points: THREE.Vector3[];
  lines: number[];
}

// Registry of generators
export const BrandLogoLibrary: Record<string, () => BrandLogoGeometry> = {
  privy: generatePrivyLogo,
  clerk: generateClerkLogo,
  // Add future brands here: 'nike': generateNikeLogo, etc.
};

// --- LOGO GENERATORS ---

function generatePrivyLogo(): BrandLogoGeometry {
  const p: THREE.Vector3[] = [];
  const lineIndices: number[] = [];

  // Helper to add point
  const addPoint = (x: number, y: number, z: number) => {
    p.push(new THREE.Vector3(x, y, z));
    return p.length - 1;
  };

  // 1. THE DOT (Sphere)
  // Create a simplified geosphere via rings
  const radius = 0.6;
  const segments = 8;
  const rings = 5;

  // Center point
  addPoint(0, 0.2, 0); // Center

  // Vertical rings to form sphere wireframe
  for (let r = 0; r < rings; r++) {
    const theta = (r / rings) * Math.PI; // 0 to PI
    const y = Math.cos(theta) * radius + 0.2;
    const ringRadius = Math.sin(theta) * radius;

    const ringStartIdx = p.length;
    for (let s = 0; s < segments; s++) {
      const phi = (s / segments) * Math.PI * 2;
      const x = Math.sin(phi) * ringRadius;
      const z = Math.cos(phi) * ringRadius;
      addPoint(x, y, z);

      // Connect Ring Neighbors
      if (s > 0) lineIndices.push(p.length - 1, p.length - 2);
    }
    // Close Ring
    lineIndices.push(p.length - 1, ringStartIdx);

    // Vertical connections (to previous ring)
    if (r > 0) {
      for (let s = 0; s < segments; s++) {
        lineIndices.push(ringStartIdx + s, ringStartIdx + s - segments);
      }
    }
  }

  // 2. THE SHADOW (Oval below)
  const shadowY = -0.7;
  const shadowRadX = 0.4;
  const shadowRadZ = 0.4;
  const shadowSegments = 12;

  const shadowStartIdx = p.length;
  for (let s = 0; s < shadowSegments; s++) {
    const phi = (s / shadowSegments) * Math.PI * 2;
    const x = Math.sin(phi) * shadowRadX;
    const z = Math.cos(phi) * shadowRadZ;
    addPoint(x, shadowY, z);

    if (s > 0) lineIndices.push(p.length - 1, p.length - 2);
  }
  lineIndices.push(p.length - 1, shadowStartIdx);

  // Fill shadow lines
  lineIndices.push(shadowStartIdx, shadowStartIdx + shadowSegments / 2);
  lineIndices.push(
    shadowStartIdx + shadowSegments / 4,
    shadowStartIdx + shadowSegments * 0.75
  );

  return { points: p, lines: lineIndices };
}

function generateClerkLogo(): BrandLogoGeometry {
  const p: THREE.Vector3[] = [];
  const lineIndices: number[] = [];

  const addPoint = (x: number, y: number, z: number) => {
    p.push(new THREE.Vector3(x, y, z));
    return p.length - 1;
  };

  // 1. THE DOT (Center sphere)
  const dotRadius = 0.25;
  const dotStartIdx = p.length;
  // Simple octahedron/sphere approximation for the dot
  addPoint(0, dotRadius, 0); // Top
  addPoint(0, -dotRadius, 0); // Bottom
  addPoint(dotRadius, 0, 0);
  addPoint(-dotRadius, 0, 0);
  addPoint(0, 0, dotRadius);
  addPoint(0, 0, -dotRadius);

  // Connect dot lines (simple cross/star shape)
  const d = dotStartIdx;
  lineIndices.push(d, d + 2, d, d + 3, d, d + 4, d, d + 5);
  lineIndices.push(d + 1, d + 2, d + 1, d + 3, d + 1, d + 4, d + 1, d + 5);
  lineIndices.push(d + 2, d + 4, d + 2, d + 5, d + 3, d + 4, d + 3, d + 5);

  // 2. THE C SHAPE (Partial Torus)
  // Opening on the right (positive X)
  const majorRadius = 0.6; // Distance from center of tube to center of torus
  const minorRadius = 0.15; // Radius of the tube
  const startAngle = Math.PI * 0.25; // 45 degrees
  const endAngle = Math.PI * 1.75; // 315 degrees (leaves 90 deg gap on right)
  const tubeSegments = 16; // Lengthwise segments
  const crossSegments = 6; // Cross-section segments

  for (let i = 0; i <= tubeSegments; i++) {
    const u = i / tubeSegments;
    const theta = startAngle + (endAngle - startAngle) * u; // Angle along major circle

    // Create ring at this position
    const ringStartIdx = p.length;
    for (let j = 0; j < crossSegments; j++) {
      const v = j / crossSegments;
      const phi = v * Math.PI * 2; // Angle around tube cross-section

      // Position on the surface of the tube
      // We need to rotate the cross-section ring to align with the major circle radius
      // Flat ring in X-Y plane would be: x = cos(phi)*r, y = sin(phi)*r
      // But we are in 3D.
      // Let's assume tube wraps around the Z axis? No, logo is usually flat in XY plane.
      // So torus is in XY plane. Tube cross section is in plane perpendicular to the major circle tanget.
      // Or simpler: Z corresponds to "thickness".

      const cosTheta = Math.cos(theta);
      const sinTheta = Math.sin(theta);

      const cosPhi = Math.cos(phi);
      const sinPhi = Math.sin(phi);

      // Torus parametric equation (Z is up/thickness)
      // x = (R + r*cos(phi)) * cos(theta)
      // y = (R + r*cos(phi)) * sin(theta)
      // z = r * sin(phi)
      // Adjusted for our orientation where Z is thickness/depth and XY is the face.

      const x = (majorRadius + minorRadius * cosPhi) * cosTheta;
      const y = (majorRadius + minorRadius * cosPhi) * sinTheta;
      const z = minorRadius * sinPhi;

      addPoint(x, y, z);
    }

    // Connect to previous ring
    if (i > 0) {
      const prevRingStart = ringStartIdx - crossSegments;
      for (let j = 0; j < crossSegments; j++) {
        const curr = ringStartIdx + j;

        const prev = prevRingStart + j;

        // Longitudinal lines
        lineIndices.push(curr, prev);

        // Cross-sectional lines (optional, adds density)
        // lineIndices.push(curr, next);
      }
    }
  }

  return { points: p, lines: lineIndices };
}
