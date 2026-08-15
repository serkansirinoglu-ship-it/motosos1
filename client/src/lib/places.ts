export const citiesCenters: Record<string, {lat:number,lng:number}> = {
  "İzmir": { lat: 38.423734, lng: 27.142826 },
  "İstanbul": { lat: 41.008238, lng: 28.978359 },
  "Ankara": { lat: 39.92077, lng: 32.85411 },
  "Antalya": { lat: 36.896891, lng: 30.713323 },
  "Bursa": { lat: 40.195, lng: 29.060 },
  "Muğla": { lat: 37.2153, lng: 28.3636 }
};

export type Place = {
  id: string;
  type: 'usta'|'cekici'|'benzinlik'|'lastikci';
  name: string;
  city: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
};

// Gerçek işletme verisi Firestore'dan (businesses koleksiyonu) gelecektir.
// Demo/sahte işletme verisi production'da gösterilmez.
// FRONTEND_PLACES, geliştirme sırasında doldurulabilir; production'da boş kalmalıdır.
const PLACES: Place[] = [];

function haversineDistance(a:{lat:number,lng:number}, b:{lat:number,lng:number}){
  const R = 6371; // km
  const toRad = (deg:number) => deg * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDlat = Math.sin(dLat/2);
  const sinDlon = Math.sin(dLon/2);
  const c = 2 * Math.asin(Math.sqrt(sinDlat*sinDlat + Math.cos(lat1)*Math.cos(lat2)*sinDlon*sinDlon));
  return R * c;
}

export function getPlacesByType(type: Place['type'], options?: {city?:string; position?:{lat:number,lng:number}; limit?:number}){
  const { city, position, limit = 10 } = options || {};
	let list = PLACES.filter(p => p.type === type);
  // helper to normalize city names (remove diacritics, lowercase)
  function norm(s: string){
	try{
	  return s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
	} catch(e){
	  return s.replace(/[^\w]/g,'').toLowerCase();
	}
  }

  // Determine effective city: if explicit city given use it; if not and position given, infer nearest city; if neither, try timezone-based inference; finally fallback to Izmir
  let effectiveCity = city;
  if (!effectiveCity && position) {
	// find nearest city center
	let min = Infinity; let nearest: string | null = null;
	for (const [c, center] of Object.entries(citiesCenters)) {
	  const d = haversineDistance(position, center);
	  if (d < min) { min = d; nearest = c; }
	}
	effectiveCity = nearest || undefined;
  }

  if (!effectiveCity && typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
	const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
	const tzMap: Record<string,string> = {
	  'Istanbul': 'İstanbul',
	  'Europe/Istanbul': 'İstanbul',
	  'Europe/Moscow': 'Ankara',
	  'Europe/Rome': 'İzmir'
	};
	for (const key of Object.keys(tzMap)) {
	  if (tz.includes(key.split('/').pop() || '')) { effectiveCity = tzMap[key]; break; }
	}
  }
  if (!effectiveCity) effectiveCity = 'İzmir';

  if (effectiveCity) {
	// match cities ignoring diacritics/case
	const normTarget = norm(effectiveCity);
	const byCity = list.filter(p => norm(p.city) === normTarget);
	if (byCity.length) list = byCity;
  }

  const origin = position || (effectiveCity && citiesCenters[effectiveCity]) || { lat: 38.423734, lng: 27.142826 };
  const withDist = list.map(p => ({...p, distanceKm: haversineDistance(origin, {lat:p.lat,lng:p.lng})}));
  withDist.sort((a,b)=>a.distanceKm - b.distanceKm);
  return withDist.slice(0, limit);
}

export function makeMapSearchUrl(lat:number,lng:number,query?:string){
  if (query) return `https://www.google.com/maps/search/${encodeURIComponent(query)}/@${lat},${lng},14z`;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function makeDirectionsUrl(origin:{lat:number,lng:number}, destination:{lat:number,lng:number}|string){
  const originStr = `${origin.lat},${origin.lng}`;
  const destStr = typeof destination === 'string' ? encodeURIComponent(destination) : `${destination.lat},${destination.lng}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destStr}`;
}

export const AVAILABLE_CITIES = Object.keys(citiesCenters);

export default { getPlacesByType, makeMapSearchUrl, makeDirectionsUrl, AVAILABLE_CITIES };
