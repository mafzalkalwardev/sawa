export type LatLng = { lat: number; lng: number };

export function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function minutesAtPeak(km: number) {
  const speedKmh = 25;
  return Math.max(1, Math.round((km / speedKmh) * 60));
}

export function nearestStop<T extends LatLng & { id: string }>(
  point: LatLng,
  stops: T[],
  walkRadiusM: number,
) {
  let best: { stop: T; meters: number } | null = null;
  for (const stop of stops) {
    const meters = haversineKm(point, stop) * 1000;
    if (!best || meters < best.meters) best = { stop, meters };
  }
  if (!best || best.meters > walkRadiusM) return null;
  return best;
}
