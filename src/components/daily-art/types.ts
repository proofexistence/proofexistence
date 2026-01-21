export interface TrailPoint {
  x: number;
  y: number;
  z?: number;
  t?: number;
}

export interface DailyArtSession {
  id: string;
  trailData: TrailPoint[];
  color: string;
  duration: number;
  createdAt: string; // ISO string
  userName?: string;
  title?: string;
}

/**
 * Daily Art Theme - defines the visual style for a day
 */
export interface DailyTheme {
  name: string;
  petalColors: readonly string[];
  centerColors: readonly string[];
  background: string;
}

/**
 * Collection of themes for variety across days
 */
export const DAILY_THEMES: readonly DailyTheme[] = [
  // 1. Murakami Pop - Vibrant pop art colors
  {
    name: 'Murakami Pop',
    petalColors: [
      '#FFFFFF', '#FFFFFF', '#FF0000', '#FF6B00', '#FFDD00',
      '#FF69B4', '#00BFFF', '#8B5CF6', '#00CED1', '#FFB6C1',
    ],
    centerColors: ['#FFD700', '#FFA500', '#FF8C00', '#FFB347', '#FFCC00'],
    background: '#FDF6E9',
  },
  // 2. Morandi - Muted, dusty elegant tones
  {
    name: 'Morandi',
    petalColors: [
      '#D4C4B5', '#B5A999', '#C9B8A8', '#A8998A', '#E8DED3',
      '#C4B7A6', '#BFB0A0', '#D1C4B5', '#AFA193', '#E0D5C9',
    ],
    centerColors: ['#8B7355', '#9C8B7A', '#A69485', '#B5A494', '#C4B3A3'],
    background: '#F5F0EB',
  },
  // 3. Cool Ocean - Blue and teal tones
  {
    name: 'Cool Ocean',
    petalColors: [
      '#E0F4FF', '#B8E4F9', '#87CEEB', '#5CACEE', '#4A90C9',
      '#3D7EAA', '#66CDAA', '#48D1CC', '#40E0D0', '#AFEEEE',
    ],
    centerColors: ['#4682B4', '#5F9EA0', '#6B8E8E', '#708090', '#778899'],
    background: '#F0F8FF',
  },
  // 4. Warm Sunset - Orange, coral, pink tones
  {
    name: 'Warm Sunset',
    petalColors: [
      '#FFE4C4', '#FFDAB9', '#FFC4A3', '#FFB088', '#FF9966',
      '#FF7F50', '#FF6B6B', '#FF8C94', '#FFB3BA', '#FFCCCB',
    ],
    centerColors: ['#FF6347', '#FF4500', '#FF7256', '#E9967A', '#F4A460'],
    background: '#FFF8F0',
  },
  // 5. Spring Garden - Fresh greens and soft pinks
  {
    name: 'Spring Garden',
    petalColors: [
      '#FFFFFF', '#FFE4E9', '#FFB7C5', '#98FB98', '#90EE90',
      '#7CCD7C', '#8FBC8F', '#F0FFF0', '#E6FFE6', '#FFF0F5',
    ],
    centerColors: ['#FFD700', '#ADFF2F', '#9ACD32', '#6B8E23', '#808000'],
    background: '#F5FFF5',
  },
  // 6. Autumn Harvest - Earth tones, warm browns
  {
    name: 'Autumn Harvest',
    petalColors: [
      '#DEB887', '#D2B48C', '#BC8F8F', '#CD853F', '#D2691E',
      '#A0522D', '#8B4513', '#B8860B', '#DAA520', '#F4A460',
    ],
    centerColors: ['#8B4513', '#A0522D', '#6B4423', '#704214', '#5C4033'],
    background: '#FDF5E6',
  },
  // 7. Cotton Candy - Soft pastels
  {
    name: 'Cotton Candy',
    petalColors: [
      '#FFE4EC', '#E4E4FF', '#E4FFFF', '#FFFFE4', '#FFE4FF',
      '#F0E6FA', '#E6FAF0', '#FAE6F0', '#E6F0FA', '#FAF0E6',
    ],
    centerColors: ['#FFB6C1', '#DDA0DD', '#B0E0E6', '#F0E68C', '#E6E6FA'],
    background: '#FFFAF5',
  },
  // 8. Nordic Minimalist - Muted blues and grays
  {
    name: 'Nordic',
    petalColors: [
      '#FFFFFF', '#F5F5F5', '#E8E8E8', '#D3D3D3', '#C0C0C0',
      '#B0C4DE', '#A9C4D9', '#94B8C8', '#778899', '#708090',
    ],
    centerColors: ['#696969', '#808080', '#5F6A6A', '#4A5568', '#2D3748'],
    background: '#F7FAFC',
  },
  // 9. Tropical Paradise - Vibrant tropical colors
  {
    name: 'Tropical',
    petalColors: [
      '#00CED1', '#20B2AA', '#48D1CC', '#40E0D0', '#7FFFD4',
      '#FF6B6B', '#FF7F50', '#FF69B4', '#FFD700', '#ADFF2F',
    ],
    centerColors: ['#FF4500', '#FF6347', '#FF7F50', '#FFD700', '#FFA500'],
    background: '#F0FFFF',
  },
  // 10. Lavender Dreams - Purple and violet tones
  {
    name: 'Lavender Dreams',
    petalColors: [
      '#E6E6FA', '#D8BFD8', '#DDA0DD', '#DA70D6', '#BA55D3',
      '#9370DB', '#8A2BE2', '#9400D3', '#EE82EE', '#FF00FF',
    ],
    centerColors: ['#9932CC', '#8B008B', '#800080', '#4B0082', '#663399'],
    background: '#FAF5FF',
  },
  // 11. Vintage Rose - Dusty pinks and mauves
  {
    name: 'Vintage Rose',
    petalColors: [
      '#F5E1DA', '#EACDC2', '#DFB9AA', '#D4A592', '#C9917A',
      '#E8C4C4', '#D4A5A5', '#C08686', '#AC6767', '#E0B0B0',
    ],
    centerColors: ['#BC8F8F', '#CD5C5C', '#8B4513', '#A0522D', '#B87070'],
    background: '#FFF5F5',
  },
  // 12. Mint Fresh - Cool mint and sage
  {
    name: 'Mint Fresh',
    petalColors: [
      '#F5FFFA', '#E0FFF0', '#C1FFC1', '#98FB98', '#90EE90',
      '#7CCD7C', '#66CDAA', '#3CB371', '#2E8B57', '#8FBC8F',
    ],
    centerColors: ['#3CB371', '#2E8B57', '#228B22', '#006400', '#008000'],
    background: '#F0FFF0',
  },
] as const;

// Legacy exports for backward compatibility
export const CANDY_PALETTES = DAILY_THEMES.map(t => t.petalColors);
export const CENTER_COLORS = DAILY_THEMES.map(t => t.centerColors);
export const BACKGROUNDS = DAILY_THEMES.map(t => t.background);
