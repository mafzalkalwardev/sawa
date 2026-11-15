import { Notice } from "@/components/notice";
import { BookForm } from "@/components/book-form";
import { t } from "@/i18n/copy";
import { prisma } from "@/lib/db";
import { dubaiToday } from "@/lib/time";

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const routes = await prisma.route.findMany({
    where: { active: true },
    include: { stops: { orderBy: { sequence: "asc" } } },
    orderBy: { nameEn: "asc" },
  });
  const m = t(locale);
  return (
    <>
      <h1>{m.bookSeat}</h1>
      <Notice locale={locale} code={query.error} />
      <BookForm
        locale={locale}
        date={dubaiToday()}
        routes={routes.map((route) => ({
          id: route.id,
          nameEn: route.nameEn,
          nameAr: route.nameAr,
          seatPriceAed: route.seatPriceAed,
          monthlyPriceAed: route.monthlyPriceAed,
          womenOnlyAvailable: route.womenOnlyAvailable,
          stops: route.stops.map((stop) => ({ id: stop.id, nameEn: stop.nameEn, nameAr: stop.nameAr })),
        }))}
      />
    </>
  );
}
