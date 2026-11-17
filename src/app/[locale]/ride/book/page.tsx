import { Notice } from "@/components/notice";
import { BookForm } from "@/components/book-form";
import { requireRider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { windows } from "@/content/network";
import { dubaiToday } from "@/lib/time";
import { Steps, passengerSteps } from "@/components/steps";

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; product?: string; route?: string; pickup?: string; drop?: string; shift?: string; window?: string; mode?: string; women?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const customer = await requireRider(locale);
  const places = await prisma.savedPlace.findMany({ where: { customerId: customer.id, kind: { in: ["home", "work"] } } });
  const home = places.find((place) => place.kind === "home");
  const work = places.find((place) => place.kind === "work");
  const homeStop = home?.snappedStopId ? await prisma.stop.findUnique({ where: { id: home.snappedStopId } }) : null;
  const workStop = work?.snappedStopId ? await prisma.stop.findUnique({ where: { id: work.snappedStopId } }) : null;
  const saved = homeStop && workStop && homeStop.routeId === workStop.routeId && homeStop.id !== workStop.id
    ? { routeId: homeStop.routeId, homeId: homeStop.id, workId: workStop.id }
    : null;
  const routes = await prisma.route.findMany({
    where: { active: true },
    include: { stops: { orderBy: { sequence: "asc" } } },
    orderBy: { nameEn: "asc" },
  });
  const chosen = routes.find((route) => route.id === query.route);
  const pickup = chosen?.stops.find((stop) => stop.id === query.pickup);
  const drop = chosen?.stops.find((stop) => stop.id === query.drop);
  const shift: "morning" | "evening" | null = query.shift === "evening" ? "evening" : query.shift === "morning" ? "morning" : null;
  const windowLabel = shift ? (windows[shift].find((slot) => slot.en === query.window)?.en ?? "") : "";
  const again = chosen && pickup && drop && pickup.id !== drop.id && shift && windowLabel
    ? {
        routeId: chosen.id,
        pickupId: pickup.id,
        dropId: drop.id,
        shift,
        windowLabel,
        product: query.product === "monthly" ? "monthly" as const : "single" as const,
        rideMode: query.mode === "private" ? "private" as const : "shared" as const,
        womenOnly: query.women === "1",
      }
    : null;
  const ar = locale === "ar";
  return (
    <>
      <Steps labels={passengerSteps(ar)} current={3} />
      <h1>{ar ? "إلى أين؟" : "Where are you going?"}</h1>
      <p className="muted">{ar ? "سائق على نفس الطريق يراها ويمكنه قبولها." : "A driver on this road sees it and can accept it."}</p>
      <Notice locale={locale} code={query.error} />
      <BookForm
        locale={locale}
        date={dubaiToday()}
        initialProduct={query.product || "single"}
        saved={saved}
        again={again}
        routes={routes.map((route) => ({
          id: route.id,
          slug: route.slug,
          nameEn: route.nameEn,
          nameAr: route.nameAr,
          seatPriceAed: route.seatPriceAed,
          privatePriceAed: route.privatePriceAed,
          monthlyPriceAed: route.monthlyPriceAed,
          monthlyPrivateAed: route.monthlyPrivateAed,
          womenOnlyAvailable: route.womenOnlyAvailable,
          stops: route.stops.map((stop) => ({ id: stop.id, slug: stop.slug, sequence: stop.sequence, nameEn: stop.nameEn, nameAr: stop.nameAr })),
        }))}
      />
    </>
  );
}
