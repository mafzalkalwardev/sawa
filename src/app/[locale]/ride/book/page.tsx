import { Notice } from "@/components/notice";
import { BookForm } from "@/components/book-form";
import { prisma } from "@/lib/db";
import { dubaiToday } from "@/lib/time";
import { Steps, passengerSteps } from "@/components/steps";

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; product?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const routes = await prisma.route.findMany({
    where: { active: true },
    include: { stops: { orderBy: { sequence: "asc" } } },
    orderBy: { nameEn: "asc" },
  });
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
