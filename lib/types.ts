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

/**
 * Daftar jenis produk yang tersedia di aplikasi.
 * Tambahkan produk baru di sini untuk muncul di halaman dashboard.
 */
export type ProductType = "Sampul Rapor";

export interface ProductCatalogItem {
  type: ProductType;
  label: string;
  description: string;
  dimension: string;
  icon: string; // emoji atau kode ikon
  available: boolean;
}

/** Katalog produk yang ditampilkan di dashboard. Tambahkan entri baru di sini. */
export const PRODUCT_CATALOG: ProductCatalogItem[] = [
  {
    type: "Sampul Rapor",
    label: "Sampul Rapor",
    description: "Sampul buku laporan / rapor sekolah dengan desain elegan dan profesional.",
    dimension: "A4 (210 × 297 mm)",
    icon: "📄",
    available: true,
  },
  // Tambahkan produk lain di sini di masa mendatang, misal:
  // { type: "Sertifikat", label: "Sertifikat", ..., available: false }
];

export interface DesignProject {
  id: string;
  name: string;
  productType: ProductType;
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
