export interface CanvasElement {
  id: string;
  type: "text" | "shape" | "logo";
  text?: string;
  shapeType?: "rectangle" | "circle" | "triangle" | "line";
  logoIcon?: string;
  x: number; // percentage coordinate (0 to 100)
  y: number; // percentage coordinate (0 to 100)
  width: number; // percentage of canvas width (0 to 100)
  height: number; // percentage of canvas height (0 to 100)
  fontSize?: number; // point size scaled
  fontFamily?: string;
  fontWeight?: "normal" | "medium" | "bold";
  color?: string;
  align?: "left" | "center" | "right";
  zIndex: number;
}

export interface DesignProject {
  id: string;
  name: string;
  productType: "Kartu Nama" | "Sampul Rapor";
  category: string;
  concept: string;
  audience: string;
  backgroundColor: string;
  elements: CanvasElement[];
  slogan: string;
  description: string;
  createdAt: string;
  status: "Draft" | "Final" | "Selesai";
  palette?: {
    primary: string;
    secondary: string;
    accent: string;
    explanation: string;
  };
  typography?: {
    title: string;
    body: string;
    explanation: string;
  };
  layoutType?: "Modern Center" | "Minimalist" | "Corporate" | "Creative";
}
