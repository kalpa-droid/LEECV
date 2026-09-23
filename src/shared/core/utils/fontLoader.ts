/**
 * Utility to load Google Fonts dynamically on demand.
 */
export function loadGoogleFont(family: string) {
  if (!family || family.trim() === '') return;
  
  // Extract font name from family string, e.g., "'Playfair Display', serif" -> "Playfair Display"
  const match = family.match(/['"]?([^'",]+)['"]?/);
  if (!match) return;
  const fontName = match[1].trim();
  
  // Don't load if it's already Inter or a system font
  if (['Inter', 'sans-serif', 'serif', 'monospace', 'system-ui', 'Arial', 'Helvetica', 'Times New Roman'].includes(fontName)) {
    return;
  }

  const id = `font-${fontName.toLowerCase().replace(/\s+/g, '-')}`;
  if (document.getElementById(id)) return;

  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600;1,700&display=swap`;
  
  document.head.appendChild(link);
}
