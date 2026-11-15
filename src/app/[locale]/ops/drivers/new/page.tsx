import { Notice } from "@/components/notice";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createDriver } from "@/server/actions/ops";

export default async function NewDriver({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  await requireStaff(locale);
  const operators = await prisma.operator.findMany();
  const routes = await prisma.route.findMany();
  const ar = locale === "ar";
  return (
    <>
      <h1>{ar ? "تسجيل سائق" : "Enroll a driver"}</h1>
      <Notice locale={locale} code={query.error} />
      <form className="stack card" action={createDriver}>
        <input type="hidden" name="locale" value={locale} />
        <label>{ar ? "الاسم" : "Name"}<input name="fullName" required /></label>
        <label>{ar ? "الجوال" : "Phone"}<input name="phone" required /></label>
        <label>{ar ? "البريد" : "Email"}<input name="email" type="email" /></label>
        <label>{ar ? "المشغّل" : "Operator"}
          <select name="operatorId">{operators.map((op) => <option key={op.id} value={op.id}>{op.name}</option>)}</select>
        </label>
        <label>{ar ? "التوظيف" : "Employment"}
          <select name="employmentType"><option value="company">company</option><option value="partner">partner</option><option value="contractor">contractor</option></select>
        </label>
        <label>{ar ? "الجنس" : "Gender"}
          <select name="gender"><option value="unspecified">unspecified</option><option value="female">female</option><option value="male">male</option></select>
        </label>
        <label>{ar ? "الجنسية" : "Nationality"}<input name="nationality" /></label>
        <label>{ar ? "اللغات" : "Languages"}<input name="languages" defaultValue="ar,en" /></label>
        <label>{ar ? "العنوان" : "Base address"}<input name="baseAddress" /></label>
        <label>Lat<input name="baseLat" defaultValue="25.2048" /></label>
        <label>Lng<input name="baseLng" defaultValue="55.2708" /></label>
        <label>{ar ? "الممرات المفضلة" : "Preferred route slugs"}
          <input name="preferredRouteIds" placeholder={routes.map((route) => route.slug).join(",")} />
        </label>
        <label className="row"><input type="checkbox" name="womenOnlyEligible" /> {ar ? "مؤهل لرحلة نساء فقط" : "Women-only eligible"}</label>
        <button className="btn" type="submit">{ar ? "حفظ" : "Save"}</button>
      </form>
    </>
  );
}
