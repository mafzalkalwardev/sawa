export const DETOUR_CAP_MIN = 12;

export type ScoreParts = {
  distance: number;
  detour: number;
  overlap: number;
  seats: number;
  schedule: number;
  rating: number;
  vehicle: number;
  women: number;
};

export type RankInput = {
  distanceKm: number;
  detourMin: number;
  detourCap: number;
  sameRoute: boolean;
  seatsFree: number;
  seatsNeeded: number;
  capacity: number;
  scheduleFit: number;
  rating: number;
  vehicleMatch: boolean;
  hardVehicleFail: boolean;
  womenRequired: boolean;
  womenEligible: boolean;
  ladiesVehicle: boolean;
  approved: boolean;
  docsValid: boolean;
  licensedOperator: boolean;
  available: boolean;
  doubleBookedElsewhere: boolean;
};

export type RankResult = {
  eligible: boolean;
  rejectReason: string | null;
  score: number;
  breakdown: ScoreParts;
};

function clamp(n: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, n));
}

export function rankDriver(input: RankInput): RankResult {
  const breakdown: ScoreParts = {
    distance: 0,
    detour: 0,
    overlap: 0,
    seats: 0,
    schedule: 0,
    rating: 0,
    vehicle: 0,
    women: 0,
  };

  const reject = (reason: string): RankResult => ({
    eligible: false,
    rejectReason: reason,
    score: 0,
    breakdown,
  });

  if (!input.approved) return reject("Driver is not approved.");
  if (!input.docsValid) return reject("A critical document is missing or expired.");
  if (!input.licensedOperator) return reject("Driver is not attached to a licensed operator.");
  if (!input.available) return reject("Driver is not available in this window.");
  if (input.doubleBookedElsewhere) return reject("Driver is already assigned on another corridor.");
  if (input.seatsFree < input.seatsNeeded) return reject("Not enough free seats.");
  if (input.hardVehicleFail) return reject("Vehicle does not meet an accessibility requirement.");
  if (input.womenRequired && !input.womenEligible) return reject("Women-only run required; driver is not eligible.");
  if (input.ladiesVehicle && !input.womenRequired) return reject("Ladies-licensed vehicle cannot take a mixed group.");
  if (input.detourMin > input.detourCap) return reject(`Detour ${input.detourMin} min exceeds the ${input.detourCap} min cap.`);

  breakdown.distance = Math.round(20 * (1 - clamp(input.distanceKm / 80)) * 10) / 10;
  breakdown.detour = Math.round(20 * (1 - clamp(input.detourMin / Math.max(1, input.detourCap))) * 10) / 10;
  breakdown.overlap = input.sameRoute ? 15 : 0;
  breakdown.seats = Math.round(15 * clamp(input.seatsNeeded / Math.max(1, input.capacity)) * 10) / 10;
  breakdown.schedule = Math.round(15 * clamp(input.scheduleFit) * 10) / 10;
  breakdown.rating = Math.round(5 * clamp(input.rating / 5) * 10) / 10;
  breakdown.vehicle = input.vehicleMatch ? 5 : 2;
  breakdown.women = input.womenRequired ? 5 : 3;

  const score =
    breakdown.distance +
    breakdown.detour +
    breakdown.overlap +
    breakdown.seats +
    breakdown.schedule +
    breakdown.rating +
    breakdown.vehicle +
    breakdown.women;

  return {
    eligible: true,
    rejectReason: null,
    score: Math.round(score * 10) / 10,
    breakdown,
  };
}
