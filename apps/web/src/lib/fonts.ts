// Dynamic Google Fonts loader for BioLink pages
const loadedFonts = new Set<string>();

export const BIOLINK_FONTS = [
  'Inter',
  'Poppins',
  'Roboto',
  'Playfair Display',
  'Space Grotesk',
  'DM Sans',
  'Montserrat',
  'Outfit',
  'Sora',
  'Libre Baskerville',
  'JetBrains Mono',
  'Caveat',
] as const;

export type BioLinkFont = (typeof BIOLINK_FONTS)[number];

export function loadFont(fontName: string): void {
  if (loadedFonts.has(fontName)) return;
  loadedFonts.add(fontName);

  const encoded = fontName.replace(/\s+/g, '+');
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@300;400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

export function loadAllFonts(): void {
  BIOLINK_FONTS.forEach(loadFont);
}
