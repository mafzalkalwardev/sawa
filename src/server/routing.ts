import { advanceAlong, alongPathKm, distanceToPathKm, haversineKm, minutesAtPeak, type LatLng } from "@/lib/geo";

export type RoadRoute = {
  path: [number, number][];
  distanceKm: number;
  durationMin: number;
  source: "osrm" | "straight";
};

const cache = new Map<string, RoadRoute>();
const ON_ROAD_KM = 8;

function cacheKey(points: LatLng[]) {
  return points.map((point) => `${point.lat.toFixed(4)},${point.lng.toFixed(4)}`).join(";");
}

function straight(points: LatLng[]): RoadRoute {
  let distanceKm = 0;
  for (let index = 0; index < points.length - 1; index += 1) distanceKm += haversineKm(points[index], points[index + 1]);
  return {
    path: points.map((point) => [point.lat, point.lng]),
    distanceKm: Math.round(distanceKm * 10) / 10,
    durationMin: points.length < 2 ? 0 : minutesAtPeak(distanceKm),
    source: "straight",
  };
}

async function osrm(points: LatLng[]): Promise<RoadRoute | null> {
  const coords = points.map((point) => `${point.lng.toFixed(5)},${point.lat.toFixed(5)}`).join(";");
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`,
      { signal: AbortSignal.timeout(2500), headers: { accept: "application/json", "user-agent": "SawaDemo/1.0" } },
    );
    if (!response.ok) return null;
    const body = (await response.json()) as {
      routes?: { distance: number; duration: number; geometry?: { coordinates?: [number, number][] } }[];
    };
    const route = body.routes?.[0];
    const coordinates = route?.geometry?.coordinates;
    if (!route || !coordinates?.length) return null;
    return {
      path: coordinates.map(([lng, lat]) => [lat, lng]),
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      durationMin: Math.max(1, Math.round(route.duration / 60)),
      source: "osrm",
    };
  } catch {
    return null;
  }
}

export async function drive(points: LatLng[]): Promise<RoadRoute> {
  if (points.length < 2) return straight(points);
  const key = cacheKey(points);
  const cached = cache.get(key);
  if (cached) return cached;
  const route = (await osrm(points)) ?? straight(points);
  cache.set(key, route);
  return route;
}

export function onRoad(point: LatLng, path: [number, number][]) {
  const line = path.map(([lat, lng]) => ({ lat, lng }));
  return distanceToPathKm(point, line) <= ON_ROAD_KM;
}

export function awayFromRoadKm(point: LatLng, path: [number, number][]) {
  const line = path.map(([lat, lng]) => ({ lat, lng }));
  const km = distanceToPathKm(point, line);
  return km > ON_ROAD_KM ? Math.round(km) : null;
}

/** Minutes along this road from one point to a later one. A point already passed has no minute count. */
export function minutesAlong(road: RoadRoute, from: LatLng, to: LatLng) {
  const path = road.path.map(([lat, lng]) => ({ lat, lng }));
  if (path.length < 2 || road.durationMin <= 0) return { minutes: null as number | null, passed: false };
  let length = 0;
  for (let index = 0; index < path.length - 1; index += 1) length += haversineKm(path[index], path[index + 1]);
  if (length <= 0) return { minutes: null, passed: false };
  const start = alongPathKm(path, from);
  const end = alongPathKm(path, to);
  if (end < start - 0.4) return { minutes: null, passed: true };
  const fraction = Math.min(1, Math.max(0, end - start) / length);
  return { minutes: Math.max(1, Math.round(road.durationMin * fraction)), passed: false };
}

export function stepAlongRoad(path: [number, number][], from: LatLng, km = 3) {
  return advanceAlong(path.map(([lat, lng]) => ({ lat, lng })), from, km);
}
