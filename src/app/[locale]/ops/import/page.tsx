import { Notice } from "@/components/notice";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { commitImport, previewImport } from "@/server/actions/ops";

export default async function ImportPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ batch?: string; error?: string; ok?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  await requireStaff(locale);
  const batch = query.batch ? await prisma.importBatch.findUnique({ where: { id: query.batch } }) : null;
  const rows = batch ? JSON.parse(batch.resultJson) as { name: string; phone: string; errors: string[] }[] : [];
  const ar = locale === "ar";
  return (
    <>
      <h1>{ar ? "استيراد الركاب" : "Import riders"}</h1>
      <Notice locale={locale} code={query.error} ok={query.ok} />
      <p className="muted">name,phone,route,pickup,drop,days</p>
      <pre className="card">Sara Ali,0501234567,sharjah-dubai,rolla,union,0|1|2|3|4</pre>
      <form className="stack" action={previewImport}>
        <input type="hidden" name="locale" value={locale} />
        <textarea name="csv" defaultValue={batch?.csvText} required />
        <button className="btn" type="submit">{ar ? "مراجعة" : "Review"}</button>
      </form>
      {rows.length ? (
        <>
          <table>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.phone}-${index}`}>
                  <td>{row.name}</td>
                  <td>{row.phone}</td>
                  <td>{row.errors.join(" ") || (ar ? "صالح" : "Valid")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {batch && rows.every((row) => row.errors.length === 0) && batch.status === "preview" ? (
            <form action={commitImport}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="batchId" value={batch.id} />
              <button className="btn" type="submit">{ar ? "اعتماد الاستيراد" : "Commit import"}</button>
            </form>
          ) : null}
        </>
      ) : null}
    </>
  );
}
