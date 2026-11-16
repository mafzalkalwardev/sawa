import Link from "next/link";
import { Notice } from "@/components/notice";
import { t } from "@/i18n/copy";
import { requireRider } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { saveProfile } from "@/server/actions/rider";
import { Steps, passengerSteps } from "@/components/steps";

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const next = typeof query.next === "string" && query.next.startsWith(`/${locale}/`) ? query.next : "";
  const customer = await requireRider(locale);
  const pref = await prisma.preference.findUnique({ where: { customerId: customer.id } });
  const m = t(locale);
  const ar = locale === "ar";
  return (
    <>
      <Steps labels={passengerSteps(ar)} current={2} />
      <h1>{ar ? "صورتك وهويتك" : "Your photo and ID"}</h1>
      <p className="muted">{ar ? "السائق يرى وجهك قبل أن يقبل الرحلة." : "The driver sees your face before accepting the ride."}</p>
      <Notice locale={locale} code={query.error} />
      <form className="stack" action={saveProfile}>
        <input type="hidden" name="locale" value={locale} />
        {next ? <input type="hidden" name="next" value={next} /> : null}
        {customer.photoUrl ? <img className="avatar" src={`/api/files/riders/${customer.id}/${customer.photoUrl}`} alt="" /> : <div className="avatar empty" />}
        <label>{ar ? "صورة الوجه" : "Profile photo"}<input name="photo" type="file" accept="image/*" required={!customer.photoUrl} /></label>
        {customer.idDocumentUrl ? <img className="avatar" src={`/api/files/riders/${customer.id}/${customer.idDocumentUrl}`} alt="" /> : null}
        <label>{ar ? "صورة الهوية" : "Emirates ID photo"}<input name="idDocument" type="file" accept="image/*" required={!customer.idDocumentUrl} /></label>
        <label>{m.name}<input name="fullName" defaultValue={customer.fullName} required /></label>
        <label>{m.email}<input name="email" type="email" defaultValue={customer.email ?? ""} /></label>
        <label>{ar ? "الجنس" : "Gender"}
          <select name="gender" defaultValue={customer.gender}>
            <option value="unspecified">{ar ? "غير محدد" : "Unspecified"}</option>
            <option value="female">{ar ? "أنثى" : "Female"}</option>
            <option value="male">{ar ? "ذكر" : "Male"}</option>
          </select>
        </label>
        <label>{ar ? "طوارئ" : "Emergency name"}<input name="emergencyName" defaultValue={customer.emergencyName ?? ""} /></label>
        <label>{ar ? "هاتف الطوارئ" : "Emergency phone"}<input name="emergencyPhone" defaultValue={customer.emergencyPhone ?? ""} /></label>
        <label className="row"><input type="checkbox" name="womenOnly" defaultChecked={pref?.womenOnly} /> {m.womenOnly}</label>
        <label className="row"><input type="checkbox" name="quietRide" defaultChecked={pref?.quietRide} /> {ar ? "رحلة هادئة" : "Quiet ride"}</label>
        <label>{ar ? "إتاحة" : "Access"}
          <select name="accessibility" defaultValue={pref?.accessibility ?? ""}>
            <option value="">{ar ? "لا شيء" : "None"}</option>
            <option value="wheelchair">{ar ? "كرسي متحرك" : "Wheelchair"}</option>
          </select>
        </label>
        <button className="btn" type="submit">{customer.photoUrl && customer.idDocumentUrl ? m.save : (ar ? "متابعة" : "Continue")}</button>
      </form>
      <p><Link href={`/${locale}/privacy`}>{m.privacy}</Link></p>
    </>
  );
}
