import { Notice } from "@/components/notice";
import { ROLES } from "@/lib/roles";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createStaff } from "@/server/actions/ops";

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const staff = await requireStaff(locale);
  const people = await prisma.staffUser.findMany({ orderBy: { name: "asc" } });
  const ar = locale === "ar";
  return (
    <>
      <h1>{ar ? "الموظفون والصلاحيات" : "Staff and roles"}</h1>
      <Notice locale={locale} ok={query.ok} code={query.error} />
      <table>
        <tbody>
          {people.map((person) => (
            <tr key={person.id}><td>{person.name}</td><td>{person.email}</td><td>{person.role}</td><td>{person.active ? "active" : "off"}</td></tr>
          ))}
        </tbody>
      </table>
      {staff.role === "owner" ? (
        <form className="card stack" action={createStaff}>
          <input type="hidden" name="locale" value={locale} />
          <h2>{ar ? "موظف جديد" : "New staff user"}</h2>
          <input name="name" placeholder={ar ? "الاسم" : "Name"} required />
          <input name="email" type="email" required />
          <input name="phone" placeholder="+9715..." />
          <input name="password" type="password" minLength={8} required />
          <select name="role">{ROLES.map((role) => <option key={role}>{role}</option>)}</select>
          <button className="btn" type="submit">{ar ? "إنشاء" : "Create"}</button>
        </form>
      ) : <p className="muted">{ar ? "المالك فقط يضيف موظفين." : "Only an owner can add staff."}</p>}
    </>
  );
}
