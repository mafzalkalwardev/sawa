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

function localKm(origin: LatLng, point: LatLng) {
  return {
    x: (point.lng - origin.lng) * 111 * Math.cos((origin.lat * Math.PI) / 180),
    y: (point.lat - origin.lat) * 111,
  };
}

export function distanceToPathKm(point: LatLng, path: LatLng[]) {
  if (path.length === 0) return Number.POSITIVE_INFINITY;
  let best = haversineKm(point, path[0]);
  for (let index = 0; index < path.length - 1; index += 1) {
    const start = path[index];
    const end = path[index + 1];
    const origin = localKm(start, point);
    const delta = localKm(start, end);
    const length = delta.x * delta.x + delta.y * delta.y;
    const t = length === 0 ? 0 : Math.min(1, Math.max(0, (origin.x * delta.x + origin.y * delta.y) / length));
    const dropped = Math.hypot(origin.x - delta.x * t, origin.y - delta.y * t);
    if (dropped < best) best = dropped;
  }
  return best;
}

/** Kilometres from the start of the line to the closest point on it. */
export function alongPathKm(path: LatLng[], point: LatLng) {
  if (path.length === 0) return 0;
  if (path.length === 1) return 0;
  let bestKm = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  let walked = 0;
  for (let index = 0; index < path.length - 1; index += 1) {
    const start = path[index];
    const end = path[index + 1];
    const step = haversineKm(start, end);
    const origin = localKm(start, point);
    const delta = localKm(start, end);
    const length = delta.x * delta.x + delta.y * delta.y;
    const t = length === 0 ? 0 : Math.min(1, Math.max(0, (origin.x * delta.x + origin.y * delta.y) / length));
    const dropped = Math.hypot(origin.x - delta.x * t, origin.y - delta.y * t);
    if (dropped < bestDist) {
      bestDist = dropped;
      bestKm = walked + step * t;
    }
    walked += step;
  }
  return bestKm;
}

export function advanceAlong(path: LatLng[], from: LatLng, km: number): LatLng {
  if (path.length === 0) return from;
  let nearest = 0;
  let best = Number.POSITIVE_INFINITY;
  path.forEach((point, index) => {
    const distance = haversineKm(from, point);
    if (distance < best) {
      best = distance;
      nearest = index;
    }
  });
  let left = km;
  for (let index = nearest; index < path.length - 1; index += 1) {
    const step = haversineKm(path[index], path[index + 1]);
    if (step >= left) {
      const t = step === 0 ? 0 : left / step;
      return {
        lat: path[index].lat + (path[index + 1].lat - path[index].lat) * t,
        lng: path[index].lng + (path[index + 1].lng - path[index].lng) * t,
      };
    }
    left -= step;
  }
  return path[path.length - 1];
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
