export type StopSeed = {
  slug: string;
  nameEn: string;
  nameAr: string;
  lat: number;
  lng: number;
  emirate: string;
  landmarkEn: string;
  landmarkAr: string;
};

export type RouteSeed = {
  slug: string;
  nameEn: string;
  nameAr: string;
  summaryEn: string;
  summaryAr: string;
  detailEn: string;
  detailAr: string;
  seatPriceAed: number;
  privatePriceAed: number;
  monthlyPriceAed: number;
  monthlyPrivateAed: number;
  morningTimetableEn: string;
  morningTimetableAr: string;
  eveningTimetableEn: string;
  eveningTimetableAr: string;
  womenOnlyAvailable: boolean;
  stops: StopSeed[];
};

const morningEn = "First departure 5:40, then every 20 minutes until 9:20. You reserve a seat inside a window, not an instant taxi.";
const morningAr = "أول انطلاق 5:40، ثم كل 20 دقيقة حتى 9:20. تحجز مقعدًا داخل نافذة زمنية، وليس تاكسيًا فوريًا.";
const eveningEn = "First departure 16:20, then every 20 minutes until 20:20.";
const eveningAr = "أول انطلاق 16:20، ثم كل 20 دقيقة حتى 20:20.";

export const network: RouteSeed[] = [
  {
    slug: "sharjah-dubai",
    nameEn: "Sharjah–Dubai",
    nameAr: "الشارقة–دبي",
    summaryEn: "A reserved seat on a licensed shared van between Rolla and Bur Dubai, using published stops instead of a door-to-door zigzag.",
    summaryAr: "مقعد محجوز على فان مشترك مرخّص بين الرولة وبر دبي، عبر مواقف معلنة بدل التنقل من باب إلى باب.",
    detailEn: "Commuters on this corridor usually post a pickup, a drop and a time in Facebook and WhatsApp groups, then wait for a driver on the same road. Sawa keeps that match, but only on a licensed van. A shared seat is AED 100. Booking the same vehicle alone is AED 350, so the shared seat is AED 250 less. These are demo tariffs, not an RTA-approved fare.",
    detailAr: "هذا ممر البداية. الصعود من مواقف معروفة قرب الرولة والنهدة ومحطات مترو دبي. أجرة المقعد التجريبية 25 درهمًا للاتجاه الواحد، والاشتراك الشهري 450 درهمًا. هذه أسعار توضيحية للعرض وليست تعرفة معتمدة من هيئة الطرق والمواصلات. يُذكر أن شهرًا من حافلات هذا الممر يقارب 528 درهمًا قبل المترو، وأن السيارة المنفردة تُقدَّر غالبًا بين 690 و1235 درهمًا مع الوقود وسالك والمواقف.",
    seatPriceAed: 100,
    privatePriceAed: 350,
    monthlyPriceAed: 2200,
    monthlyPrivateAed: 4600,
    morningTimetableEn: morningEn,
    morningTimetableAr: morningAr,
    eveningTimetableEn: eveningEn,
    eveningTimetableAr: eveningAr,
    womenOnlyAvailable: true,
    stops: [
      { slug: "rolla", nameEn: "Rolla Square", nameAr: "ساحة الرولة", lat: 25.3572, lng: 55.3913, emirate: "Sharjah", landmarkEn: "Rolla bus hub", landmarkAr: "محطة حافلات الرولة" },
      { slug: "nahda-shj", nameEn: "Al Nahda Sharjah", nameAr: "النهدة الشارقة", lat: 25.3048, lng: 55.3698, emirate: "Sharjah", landmarkEn: "Residential cluster", landmarkAr: "تجمع سكني" },
      { slug: "nahda-dxb", nameEn: "Al Nahda Dubai", nameAr: "النهدة دبي", lat: 25.2876, lng: 55.3686, emirate: "Dubai", landmarkEn: "Border-side stop", landmarkAr: "موقف جهة الحدود" },
      { slug: "qusais", nameEn: "Al Qusais Metro", nameAr: "مترو القصيص", lat: 25.2633, lng: 55.387, emirate: "Dubai", landmarkEn: "Metro feeder", landmarkAr: "موقف تغذية المترو" },
      { slug: "stadium", nameEn: "Stadium Metro", nameAr: "مترو الاستاد", lat: 25.255, lng: 55.366, emirate: "Dubai", landmarkEn: "E11 corridor stop", landmarkAr: "موقف ممر E11" },
      { slug: "deira-cc", nameEn: "Deira City Centre", nameAr: "ديرة سيتي سنتر", lat: 25.2522, lng: 55.331, emirate: "Dubai", landmarkEn: "Mall hub", landmarkAr: "مركز تجاري" },
      { slug: "union", nameEn: "Union Metro", nameAr: "مترو الاتحاد", lat: 25.2662, lng: 55.3139, emirate: "Dubai", landmarkEn: "Metro interchange", landmarkAr: "تقاطع المترو" },
      { slug: "fahidi", nameEn: "Al Fahidi", nameAr: "الفهيدي", lat: 25.2634, lng: 55.2972, emirate: "Dubai", landmarkEn: "Bur Dubai drop", landmarkAr: "نزول بر دبي" },
    ],
  },
  {
    slug: "ajman-dubai",
    nameEn: "Ajman–Dubai",
    nameAr: "عجمان–دبي",
    summaryEn: "A licensed shared seat from Ajman Corniche toward DIFC and Business Bay, with airport and Al Rashidiya as mid stops.",
    summaryAr: "مقعد مشترك مرخّص من كورنيش عجمان نحو مركز دبي المالي والخليج التجاري، مع محطات في الراشدية ومطار دبي.",
    detailEn: "Same community pattern as Sharjah: people name Ajman Corniche or Al Nuaimiya, a Dubai office, and a morning window. A shared seat is AED 120. The licensed vehicle alone is AED 370, AED 250 more. Stops stay on the published list.",
    detailAr: "أجرة المقعد التجريبية 30 درهمًا للاتجاه، والاشتراك الشهري 520 درهمًا. المواقف تبقى على القائمة المعلنة حتى لا يتحول المسار إلى توصيل غير مرخّص من الباب.",
    seatPriceAed: 120,
    privatePriceAed: 370,
    monthlyPriceAed: 2600,
    monthlyPrivateAed: 5000,
    morningTimetableEn: morningEn,
    morningTimetableAr: morningAr,
    eveningTimetableEn: eveningEn,
    eveningTimetableAr: eveningAr,
    womenOnlyAvailable: true,
    stops: [
      { slug: "corniche", nameEn: "Ajman Corniche", nameAr: "كورنيش عجمان", lat: 25.418, lng: 55.436, emirate: "Ajman", landmarkEn: "Corniche hub", landmarkAr: "موقف الكورنيش" },
      { slug: "nuaimiya", nameEn: "Al Nuaimiya", nameAr: "النعيمية", lat: 25.3928, lng: 55.4555, emirate: "Ajman", landmarkEn: "Residential stop", landmarkAr: "موقف سكني" },
      { slug: "rashidiya", nameEn: "Al Rashidiya", nameAr: "الراشدية", lat: 25.2285, lng: 55.3912, emirate: "Dubai", landmarkEn: "Metro side", landmarkAr: "جهة المترو" },
      { slug: "dxt3", nameEn: "Airport Terminal 3", nameAr: "مطار دبي مبنى 3", lat: 25.2532, lng: 55.3657, emirate: "Dubai", landmarkEn: "Terminal curb", landmarkAr: "رصيف المبنى" },
      { slug: "difc", nameEn: "DIFC", nameAr: "مركز دبي المالي العالمي", lat: 25.211, lng: 55.282, emirate: "Dubai", landmarkEn: "Gate Avenue side", landmarkAr: "جهة غيت أفينيو" },
      { slug: "business-bay", nameEn: "Business Bay Metro", nameAr: "مترو الخليج التجاري", lat: 25.191, lng: 55.26, emirate: "Dubai", landmarkEn: "Metro plaza", landmarkAr: "ساحة المترو" },
    ],
  },
  {
    slug: "dubai-abu-dhabi",
    nameEn: "Dubai–Abu Dhabi",
    nameAr: "دبي–أبوظبي",
    summaryEn: "A hub-to-hub shared seat in the pattern of the official Ibn Battuta–Al Wahda shared taxi, on a licensed vehicle only.",
    summaryAr: "مقعد مشترك من محور إلى محور على نمط التاكسي المشترك الرسمي بين ابن بطوطة والوحدة، وعلى مركبة مرخّصة فقط.",
    detailEn: "Hub to hub, in the pattern of the Ibn Battuta–Al Wahda shared taxi, on a licensed vehicle only. A shared seat is AED 180. The vehicle alone is AED 430, which is AED 250 more. RTA’s 2024 shared-taxi pilot published per-person fares of AED 132, 88, or 66. These demo numbers are not that table.",
    detailAr: "أجرة المقعد التجريبية 75 درهمًا للاتجاه، والاشتراك الشهري 1200 درهم. نشرت هيئة الطرق تجربة التاكسي المشترك عام 2024 أجورًا للراكب 132 أو 88 أو 66 درهمًا حسب عدد الركاب. سوى لا تنسخ ذلك الجدول؛ الأرقام هنا أسعار تجريبية لمقعد على مركبة شريكة.",
    seatPriceAed: 180,
    privatePriceAed: 430,
    monthlyPriceAed: 3600,
    monthlyPrivateAed: 6000,
    morningTimetableEn: "Departures at 6:00, 7:00, and 8:10 from Ibn Battuta. Evening returns at 16:30, 17:40, and 19:00 from Al Wahda.",
    morningTimetableAr: "انطلاقات 6:00 و7:00 و8:10 من ابن بطوطة. العودة مساءً 16:30 و17:40 و19:00 من الوحدة.",
    eveningTimetableEn: "Evening returns at 16:30, 17:40, and 19:00 from Al Wahda toward Ibn Battuta.",
    eveningTimetableAr: "العودة المسائية 16:30 و17:40 و19:00 من الوحدة نحو ابن بطوطة.",
    womenOnlyAvailable: false,
    stops: [
      { slug: "ibn-battuta", nameEn: "Ibn Battuta", nameAr: "ابن بطوطة", lat: 25.0444, lng: 55.1172, emirate: "Dubai", landmarkEn: "Mall transport hub", landmarkAr: "محور النقل في المركز" },
      { slug: "jebel-ali", nameEn: "Jebel Ali", nameAr: "جبل علي", lat: 24.987, lng: 55.027, emirate: "Dubai", landmarkEn: "Industrial gate stop", landmarkAr: "موقف البوابة الصناعية" },
      { slug: "ghantoot", nameEn: "Ghantoot", nameAr: "غنتوت", lat: 24.902, lng: 54.91, emirate: "Abu Dhabi", landmarkEn: "Mid-corridor halt", landmarkAr: "توقف منتصف الممر" },
      { slug: "yas", nameEn: "Yas Mall", nameAr: "ياس مول", lat: 24.488, lng: 54.608, emirate: "Abu Dhabi", landmarkEn: "Yas Island hub", landmarkAr: "محور جزيرة ياس" },
      { slug: "al-wahda", nameEn: "Al Wahda", nameAr: "الوحدة", lat: 24.4705, lng: 54.3725, emirate: "Abu Dhabi", landmarkEn: "Al Wahda hub", landmarkAr: "محور الوحدة" },
    ],
  },
];

export const windows = {
  morning: [
    { id: "m1", en: "5:40–7:00", ar: "5:40–7:00" },
    { id: "m2", en: "7:00–8:10", ar: "7:00–8:10" },
    { id: "m3", en: "8:10–9:20", ar: "8:10–9:20" },
  ],
  evening: [
    { id: "e1", en: "16:20–17:40", ar: "16:20–17:40" },
    { id: "e2", en: "17:40–19:00", ar: "17:40–19:00" },
    { id: "e3", en: "19:00–20:20", ar: "19:00–20:20" },
  ],
} as const;

export const faq = [
  {
    qEn: "What is Sawa?",
    qAr: "ما هي سوى؟",
    aEn: "Sawa is a booking product for a reserved seat on a licensed shared vehicle — a commuter van, minibus, or partner taxi — on fixed UAE corridors. The first corridors are Sharjah–Dubai, Ajman–Dubai, and Dubai–Abu Dhabi.",
    aAr: "سوى منتج حجز لمقعد محجوز على مركبة مشتركة مرخّصة — فان للموظفين أو حافلة صغيرة أو تاكسي شريك — على ممرات ثابتة في الإمارات. الممرات الأولى هي الشارقة–دبي، وعجمان–دبي، ودبي–أبوظبي.",
  },
  {
    qEn: "Can a private car owner offer paid seats?",
    qAr: "هل يستطيع مالك سيارة خاصة عرض مقاعد مدفوعة؟",
    aEn: "No. Sawa does not let a private-car owner charge strangers for a lift. Dubai treats paid carriage in an unlicensed vehicle as an offence. Supply in this product is a licensed operator only.",
    aAr: "لا. سوى لا تسمح لمالك سيارة خاصة بأخذ أجرة من غرباء مقابل توصيلة. نقل الركاب بأجر في مركبة غير مرخّصة يُعامَل في دبي كمخالفة. العرض في هذا المنتج من مشغّل مرخّص فقط.",
  },
  {
    qEn: "Is this the same as booking an instant taxi?",
    qAr: "هل هذا مثل حجز تاكسي فوري؟",
    aEn: "No. The home screen is a corridor timetable and a seat on a scheduled run. Instant on-demand shared seats are a later phase, and only on a licensed vehicle.",
    aAr: "لا. الشاشة الأولى جدول ممر ومقعد على رحلة مجدولة. المقاعد الفورية عند الطلب مرحلة لاحقة، وعلى مركبة مرخّصة فقط.",
  },
  {
    qEn: "How do women-only trips work?",
    qAr: "كيف تعمل الرحلات للنساء فقط؟",
    aEn: "A women-only preference is stored in version one. A women-only run is offered only when the vehicle and driver are licensed for that service. Sawa does not market women-only lifts in private cars.",
    aAr: "يُحفظ تفضيل «نساء فقط» في النسخة الأولى. تُعرض رحلة للنساء فقط عندما تكون المركبة والسائق مرخّصين لهذه الخدمة. سوى لا تسوّق توصيلات نساء فقط في سيارات خاصة.",
  },
  {
    qEn: "How do I pay?",
    qAr: "كيف أدفع؟",
    aEn: "This demo accepts the test card 4242 4242 4242 4242 and stores only the last four digits plus a fake processor reference. A live UAE acquirer is not connected. Ride fares are real-world transport, so a future store listing would use a normal card processor, not Apple In-App Purchase.",
    aAr: "هذا العرض يقبل البطاقة التجريبية 4242 4242 4242 4242 ويحفظ آخر أربعة أرقام ومرجع معالج وهمي فقط. لا يوجد تحصيل إماراتي حقيقي متصل. أجور الرحلات خدمة نقل في العالم الحقيقي، لذا فإن أي نشر لاحق في المتجر يستخدم معالج بطاقات عاديًا وليس الشراء داخل التطبيق.",
  },
  {
    qEn: "Is Sawa allowed to carry passengers today?",
    qAr: "هل يُسمح لسوى بنقل الركاب اليوم؟",
    aEn: "No. This repository is demonstration software. Carrying paying passengers needs written comfort from the Dubai RTA, Abu Dhabi’s Integrated Transport Centre, and Sharjah RTA, plus a licensed fleet or licensed partner. Nothing in the app is legal advice.",
    aAr: "لا. هذا المستودع برنامج للعرض. نقل الركاب بأجر يحتاج اطمئنانًا مكتوبًا من هيئة الطرق والمواصلات في دبي ومركز النقل المتكامل في أبوظبي وهيئة الشارقة، مع أسطول مرخّص أو شريك مرخّص. لا شيء في التطبيق يُعد استشارة قانونية.",
  },
] as const;
