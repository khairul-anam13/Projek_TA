import { CanvasElement } from "./types";

export function getMockupTemplate(mockupType: string, dynamicData: Record<string, string>): CanvasElement[] {
  const {
      judulRapor = "RAPOR PESERTA DIDIK",
      namaSekolah = "NAMA SEKOLAH",
      alamatSekolah = "Alamat Sekolah",
      subInformasi = "Keterangan Tambahan",
  } = dynamicData;

  const color = "#D4AF37"; // Emas default
  const fontFamily = "Times New Roman";
  
  let logo = "shield"; // Default garuda
  if (mockupType === "Rapor MAN") {
    logo = "building"; // Kemenag
  }

  const elements: CanvasElement[] = [
      {
          id: `el_title_${Date.now()}`,
          type: "text",
          text: judulRapor.toUpperCase(),
          x: 10, y: 15, width: 80, height: 10,
          fontSize: 43,
          fontWeight: "bold",
          align: "center",
          isLockedX: true,
          fontFamily,
          color,
          zIndex: 1
      },
      {
          id: `el_logo_${Date.now()}`,
          type: "logo",
          logoIcon: logo,
          x: 40, y: 22, width: 20, height: 20,
          color,
          isLockedX: true,
          zIndex: 2
      },
      {
          id: `el_school_${Date.now()}`,
          type: "text",
          text: namaSekolah.toUpperCase(),
          x: 10, y: 36, width: 80, height: 10,
          fontSize: 33,
          fontWeight: "bold",
          align: "center",
          isLockedX: true,
          fontFamily,
          color,
          zIndex: 3
      },
      {
          id: `el_address_${Date.now()}`,
          type: "text",
          text: alamatSekolah,
          x: 10, y: 44, width: 80, height: 8,
          fontSize: 23,
          fontWeight: "normal",
          align: "center",
          isLockedX: true,
          fontFamily,
          color,
          zIndex: 4
      },
      {
          id: `el_subinfo_${Date.now()}`,
          type: "text",
          text: subInformasi,
          x: 10, y: 85, width: 80, height: 8,
          fontSize: 13,
          fontWeight: "normal",
          align: "center",
          isLockedX: true,
          fontFamily,
          color,
          zIndex: 5
      }
  ];

  return elements;
}
