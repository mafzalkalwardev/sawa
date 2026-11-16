import { prisma } from "@/lib/db";
import { nid, pinCode, shareToken } from "@/lib/ids";
import { dubaiToday } from "@/lib/time";
import { openChat, say } from "./chat";
import { createRun } from "./runs";

const fares = [
  { slug: "sharjah-dubai", seatPriceAed: 100, privatePriceAed: 350, monthlyPriceAed: 2200, monthlyPrivateAed: 4600 },
  { slug: "ajman-dubai", seatPriceAed: 120, privatePriceAed: 370, monthlyPriceAed: 2600, monthlyPrivateAed: 5000 },
  { slug: "dubai-abu-dhabi", seatPriceAed: 180, privatePriceAed: 430, monthlyPriceAed: 3600, monthlyPrivateAed: 6000 },
];

async function ensureHadi() {
  const existing = await prisma.driver.findUnique({ where: { phone: "+971501000006" } });
  if (existing) return existing;
  const driver = await prisma.driver.create({
    data: {
      id: "drv_hadi",
      operatorId: "op_sawa",
      fullName: "Hadi Al Mansoori",
      displayName: "Hadi",
      phone: "+971501000006",
      email: "hadi@sawa.test",
      nationality: "AE",
      gender: "male",
      languages: "ar,en",
      employmentType: "company",
      status: "approved",
      baseLat: 25.0444,
      baseLng: 55.1172,
      baseAddress: "Ibn Battuta",
      preferredRouteIds: "dubai-abu-dhabi",
      defaultVehicleId: "veh_hadi",
      ratingAvg: 4.7,
      completedTrips: 64,
    },
  });
  await prisma.vehicle.create({
    data: {
      id: "veh_hadi",
      operatorId: "op_sawa",
      driverId: driver.id,
      plate: "D 55110",
      make: "Toyota",
      model: "Hiace",
      year: 2024,
      color: "White",
      type: "van",
      seatCapacity: 7,
      mulkiyaRef: "MUL-55110",
      insurancePolicy: "INS-55110",
      insuranceExpiry: new Date("2027-06-01T00:00:00+04:00"),
    },
  });
  await prisma.document.createMany({
    data: ["emirates_id", "licence", "permit"].map((type) => ({
      id: nid("doc"),
      ownerType: "driver",
      ownerId: driver.id,
      type,
      identifier: `HADI-${type}`,
      expiryDate: "2027-06-01",
      status: "approved",
      fileUrl: "seed://on-file",
    })),
  });
  return driver;
}

async function ensureRashid() {
  return prisma.customer.upsert({
    where: { phone: "+971501000015" },
    update: { status: "active" },
    create: {
      id: "cus_rashid",
      fullName: "Rashid Karim",
      phone: "+971501000015",
      email: "rashid@riders.test",
      gender: "male",
      acquiredVia: "community",
      status: "active",
      payerType: "self",
      emergencyName: "Family contact",
      emergencyPhone: "+971501000999",
    },
  });
}

async function runFor(driverId: string, vehicleId: string, routeId: string, date: string) {
  const found = await prisma.run.findFirst({
    where: { driverId, serviceDate: date, shift: "morning", status: { not: "cancelled" } },
  });
  if (found) return found;
  return createRun({ routeId, driverId, vehicleId, serviceDate: date, shift: "morning", status: "scheduled" });
}

async function seat(opts: {
  customerId: string;
  routeId: string;
  runId: string;
  pickup: string;
  drop: string;
  price: number;
  womenOnly?: boolean;
  date: string;
  hello: string;
  reply: string;
}) {
  let booking = await prisma.booking.findFirst({
    where: {
      customerId: opts.customerId,
      serviceDate: opts.date,
      shift: "morning",
      routeId: opts.routeId,
      status: { not: "cancelled" },
    },
  });
  if (!booking) {
    booking = await prisma.booking.create({
      data: {
        id: nid("bkg"),
        customerId: opts.customerId,
        runId: opts.runId,
        routeId: opts.routeId,
        serviceDate: opts.date,
        shift: "morning",
        windowLabel: "7:00–8:10",
        pickupStopId: opts.pickup,
        dropStopId: opts.drop,
        product: "single",
        rideMode: "shared",
        priceAed: opts.price,
        status: "confirmed",
        pin: pinCode(),
        shareToken: shareToken(),
        womenOnly: Boolean(opts.womenOnly),
      },
    });
  } else if (!booking.runId) {
    booking = await prisma.booking.update({ where: { id: booking.id }, data: { runId: opts.runId, status: "confirmed" } });
  }
  const thread = await openChat(booking.id);
  if (thread) {
    const count = await prisma.chatMessage.count({ where: { threadId: thread.id } });
    if (count === 0) {
      await say(thread.id, "driver", opts.hello);
      await say(thread.id, "rider", opts.reply);
    }
  }
}

export async function ensureCommunity(date = dubaiToday()) {
  for (const fare of fares) {
    await prisma.route.update({ where: { slug: fare.slug }, data: fare }).catch(() => null);
  }
  const hadi = await ensureHadi();
  const rashid = await ensureRashid();
  const pilots = [
    { phone: "+971501000002", lat: 25.2876, lng: 55.3686 },
    { phone: "+971501000003", lat: 25.418, lng: 55.436 },
    { phone: hadi.phone, lat: 25.0444, lng: 55.1172 },
  ];
  for (const pilot of pilots) {
    await prisma.driver.update({
      where: { phone: pilot.phone },
      data: { onShift: true, liveLat: pilot.lat, liveLng: pilot.lng, liveAt: new Date(), status: "approved" },
    });
  }

  const routes = await prisma.route.findMany({ include: { stops: true } });
  const bySlug = Object.fromEntries(routes.map((route) => [route.slug, route]));
  const stop = (slug: string, name: string) => bySlug[slug]?.stops.find((item) => item.slug === name)?.id;
  const sharjah = bySlug["sharjah-dubai"];
  const ajman = bySlug["ajman-dubai"];
  const capital = bySlug["dubai-abu-dhabi"];
  const omar = await prisma.driver.findUnique({ where: { phone: "+971501000002" } });
  const fatima = await prisma.driver.findUnique({ where: { phone: "+971501000003" } });
  if (!sharjah || !ajman || !capital || !omar?.defaultVehicleId || !fatima?.defaultVehicleId || !hadi.defaultVehicleId) return;

  const omarRun = await runFor(omar.id, omar.defaultVehicleId, sharjah.id, date);
  const fatimaRun = await runFor(fatima.id, fatima.defaultVehicleId, ajman.id, date);
  const hadiRun = await runFor(hadi.id, hadi.defaultVehicleId, capital.id, date);
  const people = await prisma.customer.findMany({
    where: { phone: { in: ["+971501000001", "+971501000011", "+971501000012", rashid.phone] } },
  });
  const who = Object.fromEntries(people.map((person) => [person.phone, person]));
  const layla = who["+971501000001"];
  const hassan = who["+971501000011"];
  const meera = who["+971501000012"];
  const pairs: Array<Parameters<typeof seat>[0] | null> = [
    layla && stop("sharjah-dubai", "nahda-shj") && stop("sharjah-dubai", "fahidi")
      ? {
          customerId: layla.id,
          routeId: sharjah.id,
          runId: omarRun.id,
          pickup: stop("sharjah-dubai", "nahda-shj")!,
          drop: stop("sharjah-dubai", "fahidi")!,
          price: 100,
          date,
          hello: "Omar here. White Hiace D 44021 is at Al Nahda Dubai. Your window is 7:00–8:10, pickup Al Nahda Sharjah.",
          reply: "Layla. I'll be at the Al Nahda Sharjah stop for the shared seat.",
        }
      : null,
    hassan && stop("sharjah-dubai", "rolla") && stop("sharjah-dubai", "union")
      ? {
          customerId: hassan.id,
          routeId: sharjah.id,
          runId: omarRun.id,
          pickup: stop("sharjah-dubai", "rolla")!,
          drop: stop("sharjah-dubai", "union")!,
          price: 100,
          date,
          hello: "Omar. I can take Rolla on the same Sharjah–Dubai van. Shared seat, plate D 44021.",
          reply: "Hassan. I'm at Rolla Square for the 7:00 window.",
        }
      : null,
    meera && stop("ajman-dubai", "corniche") && stop("ajman-dubai", "business-bay")
      ? {
          customerId: meera.id,
          routeId: ajman.id,
          runId: fatimaRun.id,
          pickup: stop("ajman-dubai", "corniche")!,
          drop: stop("ajman-dubai", "business-bay")!,
          price: 120,
          womenOnly: true,
          date,
          hello: "Fatima. Ladies-licensed van S 22018, Ajman Corniche, window 7:00–8:10.",
          reply: "Meera. Women-only seat confirmed. I'll wait at the Corniche hub.",
        }
      : null,
    stop("dubai-abu-dhabi", "ibn-battuta") && stop("dubai-abu-dhabi", "al-wahda")
      ? {
          customerId: rashid.id,
          routeId: capital.id,
          runId: hadiRun.id,
          pickup: stop("dubai-abu-dhabi", "ibn-battuta")!,
          drop: stop("dubai-abu-dhabi", "al-wahda")!,
          price: 180,
          date,
          hello: "Hadi. Licensed van D 55110 leaves Ibn Battuta at 7:00 toward Al Wahda.",
          reply: "Rashid. Shared seat from Ibn Battuta. I'll be at the mall hub.",
        }
      : null,
  ];
  for (const pair of pairs) {
    if (pair) await seat(pair);
  }
}
