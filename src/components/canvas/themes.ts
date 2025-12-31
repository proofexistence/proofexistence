export interface BrandTheme {
  id: string; // unique identifier
  name: string;
  primaryColor: string; // The color of the active/hovered dots
  baseColor: string; // The resting color of the dots
  backgroundColor: string; // Background color for the scene (fog/clear color)
  matrixDensity: number; // Dots per row/col
  matrixGridSize: number; // Total size of the grid
  interactionRadius: number; // How far the mouse affects dots
  particleColor: string; // Formatting of ambient particles
  overlayLogo?: string; // Optional URL for a logo overlay
}

export const BRANDS: BrandTheme[] = [
  {
    id: 'default',
    name: 'Default (Proof of Existence)',
    primaryColor: '#7C3AED', // Violet
    baseColor: '#1a1a2e', // Dark Blue-Black
    backgroundColor: '#050508', // Deep Space
    matrixDensity: 80,
    matrixGridSize: 60,
    interactionRadius: 1.5,
    particleColor: '#7C3AED',
  },
  {
    id: 'cyber',
    name: 'Cyberpunk',
    primaryColor: '#00ff9d', // Neon Green
    baseColor: '#003311', // Dark Green
    backgroundColor: '#000802', // Almost Black Green
    matrixDensity: 60, // Sparser
    matrixGridSize: 60,
    interactionRadius: 2.0,
    particleColor: '#00ff9d',
  },
  /*  {
         id: 'ocean',
         name: 'Abyss',
         primaryColor: '#00b4d8', // Cyan/Blue
         baseColor: '#03045e', // Dark Blue
         backgroundColor: '#000010', // Deep Blue
         matrixDensity: 100, // Denser fluid
         matrixGridSize: 60,
         interactionRadius: 2.5,
         particleColor: '#90e0ef',
     }, */
  /* {
        id: 'fire',
        name: 'Inferno',
        primaryColor: '#ff4d00', // Bright Orange/Red
        baseColor: '#2a0a00', // Dark Red/Brown
        backgroundColor: '#0a0200', // Dark Red/Black
        matrixDensity: 50,
        matrixGridSize: 60,
        interactionRadius: 1.2,
        particleColor: '#ffaa00',
    }, */
  {
    id: 'arweave',
    name: 'Arweave',
    primaryColor: '#FFFFFF', // White
    baseColor: '#333333', // Dark Grey
    backgroundColor: '#000000', // Black
    matrixDensity: 80,
    matrixGridSize: 60,
    interactionRadius: 1.8,
    particleColor: '#FFFFFF',
    overlayLogo: '/brands/arweave.png',
  },
];
