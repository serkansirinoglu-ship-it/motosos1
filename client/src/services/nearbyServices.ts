export interface NearbyServiceLink {
  key: string;
  label: string;
  searchUrl: string;
  directionsUrl: string;
}

const NEARBY_SERVICE_QUERIES = [
  { key: "usta", label: "Motosiklet Ustaları", query: "motosiklet usta tamirci" },
  { key: "cekici", label: "Oto & Moto Çekiciler", query: "çekici oto kurtarma" },
  { key: "lastikci", label: "7/24 Lastikçiler", query: "lastikçi oto lastik" },
  { key: "benzinlik", label: "Benzin İstasyonları", query: "benzinlik akaryakıt" },
] as const;

/** Build nearby-service links only for finite, geographically valid coordinates. */
export function buildNearbyServiceLinks(latitude: number, longitude: number): NearbyServiceLink[] {
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return [];
  }

  return NEARBY_SERVICE_QUERIES.map((item) => ({
    key: item.key,
    label: item.label,
    searchUrl: `https://www.google.com/maps/search/${encodeURIComponent(item.query)}/@${latitude},${longitude},14z`,
    directionsUrl: `https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${encodeURIComponent(item.query)}`,
  }));
}
