export function againPath(locale: string, booking: {
  routeId: string;
  pickupStopId: string;
  dropStopId: string;
  shift: string;
  windowLabel: string;
  product: string;
  rideMode: string;
  womenOnly: boolean;
}) {
  const params = new URLSearchParams({
    route: booking.routeId,
    pickup: booking.pickupStopId,
    drop: booking.dropStopId,
    shift: booking.shift === "evening" ? "evening" : "morning",
    window: booking.windowLabel,
    product: booking.product === "monthly" ? "monthly" : "single",
    mode: booking.rideMode === "private" ? "private" : "shared",
    women: booking.womenOnly ? "1" : "0",
  });
  return `/${locale}/ride/book?${params.toString()}`;
}
