import { PrismaClient } from "@prisma/client";
import { network } from "../src/content/network";
import { hashPassword } from "../src/lib/password";
import { nid } from "../src/lib/ids";
import { addDays, dubaiToday } from "../src/lib/time";
import { ensureServiceDay } from "../src/server/service-day";

const prisma = new PrismaClient();

function isoDate(offsetDays: number) {
  return addDays(dubaiToday(), offsetDays);
}

async function main() {
  await prisma.chatMessage.deleteMany();
  await prisma.chatThread.deleteMany();
  await prisma.rideRequest.deleteMany();
  await prisma.boarding.deleteMany();
  await prisma.stopEvent.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.locationPing.deleteMany();
  await prisma.run.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.cluster.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.creditNote.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.commuteSubscription.deleteMany();
  await prisma.savedPlace.deleteMany();
  await prisma.preference.deleteMany();
  await prisma.timeOff.deleteMany();
  await prisma.shiftTemplate.deleteMany();
  await prisma.document.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.stop.deleteMany();
  await prisma.route.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.corporateAccount.deleteMany();
  await prisma.operator.deleteMany();
  await prisma.staffUser.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.note.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.communication.deleteMany();
  await prisma.otpChallenge.deleteMany();
  await prisma.importBatch.deleteMany();

  await prisma.operator.createMany({
    data: [
      {
        id: "op_sawa",
        name: "Sawa Fleet LLC",
        kind: "company",
        licenceRef: "RTA-OP-DEMO-001",
        emirate: "Dubai",
        contactName: "Huda Al Maktoum",
        contactPhone: "+971501000100",
        settlementIban: "AE00DEMO0000000001",
      },
      {
        id: "op_desert",
        name: "Desert Gate Limousines",
        kind: "partner",
        licenceRef: "ITC-PT-DEMO-014",
        emirate: "Abu Dhabi",
        contactName: "Rashid Al Nuaimi",
        contactPhone: "+971501000101",
        settlementIban: "AE00DEMO0000000002",
      },
    ],
  });

  await prisma.corporateAccount.create({
    data: {
      id: "corp_gulf",
      name: "Gulf Campus Holdings",
      domain: "gulfcampus.example",
      billingEmail: "facilities@gulfcampus.example",
    },
  });

  const passwordHash = hashPassword("sawa-demo");
  await prisma.staffUser.createMany({
    data: [
      {
        id: "staff_ops",
        name: "Noor Al Falasi",
        email: "ops@sawa.test",
        phone: "+971501000200",
        role: "owner",
        passwordHash,
      },
      {
        id: "staff_fin",
        name: "Karim Nassar",
        email: "finance@sawa.test",
        phone: "+971501000201",
        role: "finance",
        passwordHash,
      },
    ],
  });

  for (const route of network) {
    await prisma.route.create({
      data: {
        id: `rte_${route.slug}`,
        slug: route.slug,
        nameEn: route.nameEn,
        nameAr: route.nameAr,
        summaryEn: route.summaryEn,
        summaryAr: route.summaryAr,
        detailEn: route.detailEn,
        detailAr: route.detailAr,
        seatPriceAed: route.seatPriceAed,
        privatePriceAed: route.privatePriceAed,
        monthlyPriceAed: route.monthlyPriceAed,
        monthlyPrivateAed: route.monthlyPrivateAed,
        morningTimetableEn: route.morningTimetableEn,
        morningTimetableAr: route.morningTimetableAr,
        eveningTimetableEn: route.eveningTimetableEn,
        eveningTimetableAr: route.eveningTimetableAr,
        womenOnlyAvailable: route.womenOnlyAvailable,
        stops: {
          create: route.stops.map((stop, index) => ({
            id: `stp_${route.slug}_${stop.slug}`,
            slug: stop.slug,
            nameEn: stop.nameEn,
            nameAr: stop.nameAr,
            lat: stop.lat,
            lng: stop.lng,
            sequence: index,
            emirate: stop.emirate,
            landmarkEn: stop.landmarkEn,
            landmarkAr: stop.landmarkAr,
          })),
        },
      },
    });
  }

  await prisma.driver.createMany({
    data: [
      {
        id: "drv_omar",
        operatorId: "op_sawa",
        fullName: "Omar Al Hashimi",
        displayName: "Omar",
        phone: "+971501000002",
        email: "omar@sawa.test",
        dateOfBirth: "1992-04-12",
        nationality: "AE",
        gender: "male",
        languages: "ar,en",
        employmentType: "company",
        status: "approved",
        baseLat: 25.2876,
        baseLng: 55.3686,
        baseAddress: "Al Nahda Dubai",
        womenOnlyEligible: false,
        preferredRouteIds: "sharjah-dubai",
        defaultVehicleId: "veh_omar",
        ratingAvg: 4.8,
        completedTrips: 126,
      },
      {
        id: "drv_fatima",
        operatorId: "op_sawa",
        fullName: "Fatima Al Zarooni",
        displayName: "Fatima",
        phone: "+971501000003",
        email: "fatima@sawa.test",
        dateOfBirth: "1995-09-02",
        nationality: "AE",
        gender: "female",
        languages: "ar,en",
        employmentType: "company",
        status: "approved",
        baseLat: 25.3572,
        baseLng: 55.3913,
        baseAddress: "Rolla, Sharjah",
        womenOnlyEligible: true,
        preferredRouteIds: "sharjah-dubai,ajman-dubai",
        defaultVehicleId: "veh_fatima",
        ratingAvg: 4.9,
        completedTrips: 88,
      },
      {
        id: "drv_imran",
        operatorId: "op_desert",
        fullName: "Imran Qureshi",
        displayName: "Imran",
        phone: "+971501000004",
        email: "imran@desertgate.test",
        dateOfBirth: "1988-01-20",
        nationality: "PK",
        gender: "male",
        languages: "ur,en,ar",
        employmentType: "partner",
        status: "submitted",
        baseLat: 25.418,
        baseLng: 55.436,
        baseAddress: "Ajman Corniche",
        preferredRouteIds: "ajman-dubai",
        defaultVehicleId: "veh_imran",
      },
      {
        id: "drv_sami",
        operatorId: "op_desert",
        fullName: "Sami Haddad",
        displayName: "Sami",
        phone: "+971501000005",
        nationality: "LB",
        gender: "male",
        languages: "ar,en",
        employmentType: "contractor",
        status: "suspended",
        baseLat: 25.0444,
        baseLng: 55.1172,
        baseAddress: "Ibn Battuta",
        preferredRouteIds: "dubai-abu-dhabi",
        defaultVehicleId: "veh_sami",
        incidents: 1,
      },
    ],
  });

  await prisma.vehicle.createMany({
    data: [
      {
        id: "veh_omar",
        operatorId: "op_sawa",
        driverId: "drv_omar",
        plate: "D 44021",
        make: "Toyota",
        model: "Hiace",
        year: 2023,
        color: "White",
        type: "van",
        seatCapacity: 7,
        mulkiyaRef: "MUL-44021",
        insurancePolicy: "INS-44021",
        insuranceExpiry: new Date(`${isoDate(180)}T00:00:00+04:00`),
      },
      {
        id: "veh_fatima",
        operatorId: "op_sawa",
        driverId: "drv_fatima",
        plate: "S 22018",
        make: "Nissan",
        model: "Urvan",
        year: 2022,
        color: "Pearl",
        type: "ladies",
        seatCapacity: 7,
        ladiesLicensed: true,
        mulkiyaRef: "MUL-22018",
        insurancePolicy: "INS-22018",
        insuranceExpiry: new Date(`${isoDate(90)}T00:00:00+04:00`),
      },
      {
        id: "veh_imran",
        operatorId: "op_desert",
        driverId: "drv_imran",
        plate: "A 11820",
        make: "Toyota",
        model: "Hiace",
        year: 2021,
        color: "Silver",
        type: "van",
        seatCapacity: 7,
        status: "active",
      },
      {
        id: "veh_sami",
        operatorId: "op_desert",
        driverId: "drv_sami",
        plate: "D 90311",
        make: "Toyota",
        model: "Camry",
        year: 2020,
        color: "Black",
        type: "sedan",
        seatCapacity: 3,
        status: "blocked",
        insurancePolicy: "INS-90311",
        insuranceExpiry: new Date(`${isoDate(-3)}T00:00:00+04:00`),
      },
    ],
  });

  const long = isoDate(400);
  const soon = isoDate(10);
  const docs: { ownerType: string; ownerId: string; type: string; identifier: string; expiry: string; status: string }[] = [
    { ownerType: "driver", ownerId: "drv_omar", type: "emirates_id", identifier: "784-1992-0000001-1", expiry: long, status: "approved" },
    { ownerType: "driver", ownerId: "drv_omar", type: "licence", identifier: "DXB-LIC-44021", expiry: long, status: "approved" },
    { ownerType: "driver", ownerId: "drv_omar", type: "permit", identifier: "RTA-OP-DEMO-001", expiry: long, status: "approved" },
    { ownerType: "vehicle", ownerId: "veh_omar", type: "insurance", identifier: "INS-44021", expiry: long, status: "approved" },
    { ownerType: "driver", ownerId: "drv_fatima", type: "emirates_id", identifier: "784-1995-0000002-2", expiry: long, status: "approved" },
    { ownerType: "driver", ownerId: "drv_fatima", type: "licence", identifier: "SHJ-LIC-22018", expiry: soon, status: "approved" },
    { ownerType: "driver", ownerId: "drv_fatima", type: "permit", identifier: "RTA-LADIES-22018", expiry: long, status: "approved" },
    { ownerType: "vehicle", ownerId: "veh_fatima", type: "insurance", identifier: "INS-22018", expiry: isoDate(90), status: "approved" },
    { ownerType: "driver", ownerId: "drv_imran", type: "emirates_id", identifier: "784-1988-0000003-3", expiry: long, status: "submitted" },
    { ownerType: "driver", ownerId: "drv_imran", type: "licence", identifier: "AJM-LIC-11820", expiry: long, status: "submitted" },
    { ownerType: "driver", ownerId: "drv_sami", type: "emirates_id", identifier: "784-1984-0000004-4", expiry: long, status: "approved" },
    { ownerType: "driver", ownerId: "drv_sami", type: "licence", identifier: "DXB-LIC-90311", expiry: long, status: "approved" },
    { ownerType: "vehicle", ownerId: "veh_sami", type: "insurance", identifier: "INS-90311", expiry: isoDate(-3), status: "expired" },
  ];
  await prisma.document.createMany({
    data: docs.map((doc) => ({
      id: nid("doc"),
      ownerType: doc.ownerType,
      ownerId: doc.ownerId,
      type: doc.type,
      identifier: doc.identifier,
      expiryDate: doc.expiry,
      status: doc.status,
      fileUrl: "seed://on-file",
      reviewerId: doc.status === "approved" ? "staff_ops" : null,
    })),
  });

  await prisma.shiftTemplate.createMany({
    data: ["drv_omar", "drv_fatima"].flatMap((driverId) => [
      { id: nid("shf"), driverId, days: "0,1,2,3,4", label: "morning", startTime: "05:30", endTime: "10:00" },
      { id: nid("shf"), driverId, days: "0,1,2,3,4", label: "evening", startTime: "16:00", endTime: "21:00" },
    ]),
  });

  const people = [
    { id: "cus_layla", fullName: "Layla Hassan", phone: "+971501000001", gender: "female", corporateId: null as string | null, status: "active", payer: "self", acquired: "app" },
    { id: "cus_youssef", fullName: "Youssef Rahman", phone: "+971501000010", gender: "male", corporateId: "corp_gulf", status: "active", payer: "employer", acquired: "employer" },
    { id: "cus_hassan", fullName: "Hassan Idris", phone: "+971501000011", gender: "male", corporateId: null, status: "active", payer: "self", acquired: "referral" },
    { id: "cus_meera", fullName: "Meera Joseph", phone: "+971501000012", gender: "female", corporateId: "corp_gulf", status: "active", payer: "employer", acquired: "employer" },
    { id: "cus_aisha", fullName: "Aisha Noor", phone: "+971501000013", gender: "female", corporateId: null, status: "paused", payer: "self", acquired: "app" },
    { id: "cus_nabil", fullName: "Nabil Farooq", phone: "+971501000014", gender: "male", corporateId: null, status: "active", payer: "self", acquired: "support" },
  ];
  await prisma.customer.createMany({
    data: people.map((p) => ({
      id: p.id,
      fullName: p.fullName,
      phone: p.phone,
      email: `${p.fullName.split(" ")[0].toLowerCase()}@riders.test`,
      language: "en",
      gender: p.gender,
      corporateId: p.corporateId,
      emergencyName: "Family contact",
      emergencyPhone: "+971501000999",
      acquiredVia: p.acquired,
      status: p.status,
      payerType: p.payer,
    })),
  });

  await prisma.preference.createMany({
    data: [
      { id: "pref_layla", customerId: "cus_layla", womenOnly: false, walkRadiusM: 700, quietRide: true },
      { id: "pref_youssef", customerId: "cus_youssef", womenOnly: false, walkRadiusM: 600 },
      { id: "pref_hassan", customerId: "cus_hassan", womenOnly: false, walkRadiusM: 800 },
      { id: "pref_meera", customerId: "cus_meera", womenOnly: true, walkRadiusM: 600, notes: "Licensed ladies run only." },
      { id: "pref_aisha", customerId: "cus_aisha", womenOnly: true, walkRadiusM: 500 },
      { id: "pref_nabil", customerId: "cus_nabil", womenOnly: false, accessibility: "wheelchair", walkRadiusM: 400, notes: "Needs a licensed wheelchair-capable vehicle." },
    ],
  });

  const place = async (customerId: string, kind: string, stopId: string) => {
    const stop = await prisma.stop.findUniqueOrThrow({ where: { id: stopId } });
    await prisma.savedPlace.create({
      data: {
        id: nid("plc"),
        customerId,
        kind,
        label: kind === "home" ? "Home" : "Work",
        address: stop.nameEn,
        lat: stop.lat,
        lng: stop.lng,
        snappedStopId: stop.id,
      },
    });
  };
  await place("cus_layla", "home", "stp_sharjah-dubai_rolla");
  await place("cus_layla", "work", "stp_sharjah-dubai_fahidi");
  await place("cus_youssef", "home", "stp_sharjah-dubai_nahda-shj");
  await place("cus_youssef", "work", "stp_sharjah-dubai_union");
  await place("cus_hassan", "home", "stp_sharjah-dubai_rolla");
  await place("cus_hassan", "work", "stp_sharjah-dubai_fahidi");
  await place("cus_meera", "home", "stp_sharjah-dubai_rolla");
  await place("cus_meera", "work", "stp_sharjah-dubai_deira-cc");
  await place("cus_nabil", "home", "stp_sharjah-dubai_rolla");
  await place("cus_nabil", "work", "stp_sharjah-dubai_union");

  await prisma.commuteSubscription.createMany({
    data: [
      {
        id: "sub_youssef",
        customerId: "cus_youssef",
        routeId: "rte_sharjah-dubai",
        pickupStopId: "stp_sharjah-dubai_nahda-shj",
        dropStopId: "stp_sharjah-dubai_union",
        days: "0,1,2,3,4",
        morningWindow: "7:00–8:10",
        eveningWindow: "17:40–19:00",
        startDate: isoDate(-20),
        product: "monthly",
        status: "active",
        priceAed: 450,
      },
      {
        id: "sub_hassan",
        customerId: "cus_hassan",
        routeId: "rte_sharjah-dubai",
        pickupStopId: "stp_sharjah-dubai_rolla",
        dropStopId: "stp_sharjah-dubai_fahidi",
        days: "0,1,2,3,4",
        morningWindow: "5:40–7:00",
        eveningWindow: "17:40–19:00",
        startDate: isoDate(-5),
        product: "monthly",
        status: "active",
        priceAed: 450,
      },
      {
        id: "sub_meera",
        customerId: "cus_meera",
        routeId: "rte_sharjah-dubai",
        pickupStopId: "stp_sharjah-dubai_rolla",
        dropStopId: "stp_sharjah-dubai_deira-cc",
        days: "0,1,2,3,4",
        morningWindow: "7:00–8:10",
        eveningWindow: "16:20–17:40",
        startDate: isoDate(-2),
        product: "monthly",
        status: "active",
        priceAed: 450,
        womenOnly: true,
      },
      {
        id: "sub_nabil",
        customerId: "cus_nabil",
        routeId: "rte_sharjah-dubai",
        pickupStopId: "stp_sharjah-dubai_rolla",
        dropStopId: "stp_sharjah-dubai_union",
        days: "0,1,2,3,4",
        morningWindow: "7:00–8:10",
        eveningWindow: "17:40–19:00",
        startDate: isoDate(-1),
        product: "monthly",
        status: "active",
        priceAed: 450,
      },
      {
        id: "sub_aisha",
        customerId: "cus_aisha",
        routeId: "rte_ajman-dubai",
        pickupStopId: "stp_ajman-dubai_corniche",
        dropStopId: "stp_ajman-dubai_difc",
        days: "0,1,2,3,4",
        morningWindow: "7:00–8:10",
        eveningWindow: "17:40–19:00",
        startDate: isoDate(-40),
        product: "monthly",
        status: "paused",
        priceAed: 520,
        womenOnly: true,
      },
    ],
  });

  await prisma.invoice.create({
    data: {
      id: "inv_youssef",
      customerId: "cus_youssef",
      corporateId: "corp_gulf",
      amountAed: 450,
      vatAed: 0,
      status: "paid",
      description: "Monthly pass · Sharjah–Dubai",
      dueDate: isoDate(-20),
      note: "VAT is not applied in this demo.",
      payments: {
        create: {
          id: "pay_youssef",
          amountAed: 450,
          status: "paid",
          last4: "4242",
          processorRef: "demo_youssef_pass",
          method: "card",
        },
      },
    },
  });

  await prisma.invoice.create({
    data: {
      id: "inv_failed",
      customerId: "cus_aisha",
      amountAed: 520,
      status: "failed",
      description: "Monthly pass · Ajman–Dubai",
      dueDate: isoDate(-2),
      note: "Demo failed charge. No card number is stored.",
    },
  });

  await prisma.payout.create({
    data: {
      id: "pyo_desert",
      operatorId: "op_desert",
      period: `${isoDate(-14)} to ${isoDate(-1)}`,
      amountAed: 640,
      status: "draft",
      note: "70% of completed partner seat revenue. Commercial assumption for the demo, not a signed contract.",
    },
  });

  await prisma.ticket.create({
    data: {
      id: "tkt_lost",
      subject: "Water bottle left on the evening van",
      body: "Black bottle with a campus sticker, left under the second row.",
      requesterType: "customer",
      requesterId: "cus_layla",
      customerId: "cus_layla",
      status: "open",
      priority: "normal",
      kind: "lost",
    },
  });

  await prisma.note.create({
    data: {
      id: "note_seed",
      entityType: "driver",
      entityId: "drv_omar",
      authorId: "staff_ops",
      authorName: "Noor Al Falasi",
      text: "Approved against the demo operator file. This is not an RTA clearance.",
      type: "review",
    },
  });

  await prisma.auditEvent.create({
    data: {
      id: "aud_seed",
      actorId: "staff_ops",
      actorName: "Noor Al Falasi",
      action: "seed",
      entity: "system",
      entityId: "demo",
      afterJson: JSON.stringify({ note: "Demo data loaded" }),
    },
  });

  await ensureServiceDay(dubaiToday());
  console.log(`Sawa demo seeded for ${dubaiToday()} (Asia/Dubai).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
