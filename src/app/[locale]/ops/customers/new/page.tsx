import { Notice } from "@/components/notice";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createCustomer } from "@/server/actions/ops";

export default async function NewCustomer({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  await requireStaff(locale);
  const routes = await prisma.route.findMany({ include: { stops: { orderBy: { sequence: "asc" } } } });
  const corporates = await prisma.corporateAccount.findMany();
  const ar = locale === "ar";
  return (
    <>
      <h1>{ar ? "تسجيل راكب" : "Enroll a rider"}</h1>
      <Notice locale={locale} code={query.error} />
      <form className="stack card" action={createCustomer}>
        <input type="hidden" name="locale" value={locale} />
        <label>{ar ? "الاسم" : "Name"}<input name="fullName" required /></label>
        <label>{ar ? "الجوال" : "Phone"}<input name="phone" required /></label>
        <label>{ar ? "البريد" : "Email"}<input name="email" /></label>
        <label>{ar ? "الشركة" : "Employer"}
          <select name="corporateId"><option value="">{ar ? "لا" : "None"}</option>{corporates.map((corp) => <option key={corp.id} value={corp.id}>{corp.name}</option>)}</select>
        </label>
        <label>{ar ? "الدافع" : "Payer"}
          <select name="payerType"><option value="self">self</option><option value="employer">employer</option></select>
        </label>
        <label>{ar ? "الممر" : "Route"}
          <select name="routeId"><option value="">{ar ? "لاحقًا" : "Later"}</option>{routes.map((route) => <option key={route.id} value={route.id}>{route.nameEn}</option>)}</select>
        </label>
        <label>{ar ? "صعود" : "Pickup"}
          <select name="pickupStopId"><option value="" />{routes.flatMap((route) => route.stops.map((stop) => <option key={stop.id} value={stop.id}>{route.nameEn} · {stop.nameEn}</option>))}</select>
        </label>
        <label>{ar ? "نزول" : "Drop"}
          <select name="dropStopId"><option value="" />{routes.flatMap((route) => route.stops.map((stop) => <option key={`d${stop.id}`} value={stop.id}>{route.nameEn} · {stop.nameEn}</option>))}</select>
        </label>
        <label className="row"><input type="checkbox" name="womenOnly" /> {ar ? "نساء فقط" : "Women only"}</label>
        <label>{ar ? "إتاحة" : "Access"}
          <select name="accessibility"><option value="" /><option value="wheelchair">wheelchair</option></select>
        </label>
        <button className="btn" type="submit">{ar ? "حفظ" : "Save"}</button>
      </form>
    </>
  );
}
