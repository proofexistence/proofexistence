export interface BrandConfig {
  id: string;
  name: string; // Display name
  logoType: string; // Key in BrandLogoLibrary
  color: string;
  position: [number, number, number]; // [Time, Y, Z]
  scale: number;
  url?: string; // Optional: Link to brand site on click
}

// ACTIVE BRANDS CONFIGURATION
// Add new brands here to make them appear in the universe
export const ACTIVE_BRANDS: BrandConfig[] = [
  {
    id: 'clerk',
    name: 'Clerk',
    logoType: 'clerk',
    color: '#6C47FF',
    position: [280, 0, 0], // Future (Timeline is now -300 to +300)
    scale: 6,
    url: 'https://clerk.com',
  },
  // Example of adding a second brand:
  /*
    {
        id: 'polygon',
        name: 'Polygon',
        logoType: 'polygon_logo', // Would need to add generator to library
        color: '#8247E5',
        position: [120, 0, 0],
        scale: 8
    }
    */
];
