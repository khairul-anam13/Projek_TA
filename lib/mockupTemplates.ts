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

    // Susunan vertikal berurutan tanpa overlap, dengan jarak antar elemen
    // proporsional (bukan asal tempel): title -> logo -> school -> address
    // semuanya di atas Zona Mika (Y 50-80), subinfo di bawahnya.
    const elements: CanvasElement[] = [
        {
            id: `el_title_${Date.now()}`,
            type: "text",
            text: judulRapor.toUpperCase(),
            x: 10, y: 5, width: 80, height: 10,
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
            x: 42, y: 17, width: 16, height: 11,
            color,
            isLockedX: true,
            zIndex: 2
        },
        {
            id: `el_school_${Date.now()}`,
            type: "text",
            text: namaSekolah.toUpperCase(),
            x: 10, y: 30, width: 80, height: 9,
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
            x: 10, y: 41, width: 80, height: 7,
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
            x: 10, y: 83, width: 80, height: 9,
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
