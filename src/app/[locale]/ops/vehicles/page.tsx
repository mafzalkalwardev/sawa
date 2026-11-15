import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function VehiclesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireStaff(locale);
  const vehicles = await prisma.vehicle.findMany({ include: { operator: true, driver: true }, orderBy: { plate: "asc" } });
  return (
    <>
      <h1>{locale === "ar" ? "المركبات" : "Vehicles"}</h1>
      <table>
        <tbody>
          {vehicles.map((vehicle) => (
            <tr key={vehicle.id}>
              <td>{vehicle.plate}</td>
              <td>{vehicle.make} {vehicle.model}</td>
              <td>{vehicle.type} · {vehicle.seatCapacity}</td>
              <td>{vehicle.ladiesLicensed ? "ladies" : ""} {vehicle.wheelchair ? "wheelchair" : ""}</td>
              <td>{vehicle.driver?.displayName || "—"}</td>
              <td>{vehicle.operator.name}</td>
              <td>{vehicle.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
