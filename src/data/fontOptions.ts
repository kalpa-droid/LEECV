export interface FontOption {
  id: string;
  name: string;
  value: string;
}

export const fontOptions: FontOption[] = [
  { id: "outfit", name: "Outfit (Modern UI)", value: "'Outfit', sans-serif" },
  { id: "inter", name: "Inter (Limpio Universal)", value: "'Inter', sans-serif" },
  { id: "montserrat", name: "Montserrat (Ejecutivo Impacto)", value: "'Montserrat', sans-serif" },
  { id: "playfair", name: "Playfair Display (Editorial Elegante)", value: "'Playfair Display', Georgia, serif" },
  { id: "georgia", name: "Georgia (Académico Distinguido)", value: "'Georgia', 'Times New Roman', serif" },
  { id: "roboto", name: "Roboto (Técnico Neutro)", value: "'Roboto', sans-serif" },
  { id: "arial", name: "Arial (Clásico Tradicional)", value: "Arial, Helvetica, sans-serif" }
];
