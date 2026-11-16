import { MapView } from "@/components/map";
import { Notice } from "@/components/notice";
import { t } from "@/i18n/copy";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dubaiToday } from "@/lib/time";
import { confirmRecommendation, overrideAssignment, planDay } from "@/server/actions/ops";
import { drive } from "@/server/routing";

export default async function PlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ date?: string; shift?: string; ok?: string; error?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  await requireStaff(locale);
  const date = query.date || dubaiToday();
  const shift = query.shift === "evening" ? "evening" : "morning";
  const clusters = await prisma.cluster.findMany({
    where: { serviceDate: date, shift },
    include: { route: true, recommendations: { include: { driver: true, vehicle: true }, orderBy: { rank: "asc" } } },
  });
  const drivers = await prisma.driver.findMany({ where: { status: "approved" }, orderBy: { displayName: "asc" } });
  const customers = await prisma.customer.findMany();
  const names = new Map(customers.map((customer) => [customer.id, customer.fullName]));
  const stops = await prisma.stop.findMany();
  const corridor = stops.filter((stop) => stop.routeId === "rte_sharjah-dubai").sort((a, b) => a.sequence - b.sequence);
  const road = await drive(corridor);
  const m = t(locale);
  const ar = locale === "ar";
  return (
    <>
      <h1>{m.plan}</h1>
      <Notice locale={locale} ok={query.ok} code={query.error} />
      <form className="row" action={planDay}>
        <input type="hidden" name="locale" value={locale} />
        <label>{m.date}<input type="date" name="serviceDate" defaultValue={date} /></label>
        <label>{m.morning}/{m.evening}
          <select name="shift" defaultValue={shift}>
            <option value="morning">{m.morning}</option>
            <option value="evening">{m.evening}</option>
          </select>
        </label>
        <button className="btn" type="submit">{ar ? "ابنِ الترشيحات" : "Build recommendations"}</button>
      </form>
      <MapView
        points={stops.map((stop) => ({ id: stop.id, lat: stop.lat, lng: stop.lng, label: ar ? stop.nameAr : stop.nameEn, kind: "stop" as const }))}
        path={road.path}
      />
      {clusters.length === 0 ? <p className="card">{ar ? "لا مجموعات بعد. ابنِ الترشيحات ليوم عمل." : "No clusters yet. Build recommendations for a Sunday–Thursday."}</p> : null}
      {clusters.map((cluster) => {
        const ids = JSON.parse(cluster.customerIds) as string[];
        const eligible = cluster.recommendations.filter((item) => item.eligible);
        const excluded = cluster.recommendations.filter((item) => !item.eligible);
        return (
          <section key={cluster.id} className="card">
            <h2>{ar ? cluster.route.nameAr : cluster.route.nameEn} · {cluster.status}</h2>
            <p>{ids.map((id) => names.get(id) || id).join(", ")} · {cluster.requiredSeats} {m.seats}{cluster.womenOnly ? ` · ${m.womenOnly}` : ""}{cluster.wheelchair ? " · wheelchair" : ""}</p>
            {eligible.length === 0 ? <p className="alert">{ar ? "لا سائق مؤهل. يمكن التجاوز بسبب مكتوب." : "No eligible driver. Override is possible with a written reason."}</p> : null}
            <table>
              <tbody>
                {eligible.map((item) => {
                  const parts = JSON.parse(item.breakdown) as Record<string, number>;
                  return (
                    <tr key={item.id}>
                      <td>#{item.rank} {item.driver.displayName}</td>
                      <td>{item.vehicle?.plate}</td>
                      <td>{item.score}</td>
                      <td className="scores">{Object.entries(parts).map(([key, value]) => `${key} ${value}`).join(" · ")}</td>
                      <td>
                        {cluster.status === "proposed" ? (
                          <form action={confirmRecommendation}>
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="clusterId" value={cluster.id} />
                            <input type="hidden" name="driverId" value={item.driverId} />
                            <button className="btn small" type="submit">{m.assign}</button>
                          </form>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <details>
              <summary>{ar ? "المستبعدون" : "Excluded"}</summary>
              <ul>{excluded.map((item) => <li key={item.id}>{item.driver.displayName}: {item.rejectReason}</li>)}</ul>
            </details>
            {cluster.status === "proposed" ? (
              <form className="stack" action={overrideAssignment}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="clusterId" value={cluster.id} />
                <label>{m.override}
                  <select name="driverId">{drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.displayName}</option>)}</select>
                </label>
                <label>{m.reason}<input name="reason" required /></label>
                <button className="btn ghost" type="submit">{m.override}</button>
              </form>
            ) : null}
          </section>
        );
      })}
    </>
  );
}
