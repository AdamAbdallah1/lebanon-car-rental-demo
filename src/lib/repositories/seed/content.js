import { media } from "./media.js";

/**
 * Site content that the future admin edits: navigation, homepage sections,
 * services, offers, FAQs, rental terms, SEO and settings.
 *
 * Everything here is language-neutral business data or `{ en, ar }` localized
 * fields — one document, never one document per language.
 *
 * NOTE: `siteSettings` carries no real awards, certifications, counts,
 * reviews, partners or regulatory numbers, by design.
 */

export const siteSettings = {
  id: "siteSettings",
  brandName: { en: "Cedars Drive", ar: "سيدرز درايف" },
  legalName: { en: "Cedars Drive", ar: "سيدرز درايف" },
  tagline: {
    en: "Car rental in Lebanon",
    ar: "تأجير سيارات في لبنان",
  },
  demo: true,
  demoNotice: {
    en: "Demonstration build — data is seeded and no real reservations are created.",
    ar: "نسخة تجريبية — البيانات مولّدة ولن يتم إنشاء أي حجز حقيقي.",
  },
  currency: "USD",
  vatRate: 0.11,
  reservationWindowDays: 90,
  contact: {
    email: "hello@cedarsdrive.example",
    phone: "+961 1 000 000",
    whatsapp: "+961 71 000 000",
    whatsappLabel: "+961 71 000 000",
    address: {
      en: "Armenia Street, Mar Mikhael, Beirut",
      ar: "شارع أرمينيا، مار مخايل، بيروت",
    },
    hours: { open: "09:00", close: "19:00", days: "mon–sat" },
  },
  locales: ["en", "ar"],
  updatedAt: "2026-10-08T00:00:00.000Z",
};

export const navigation = {
  id: "navigation",
  header: [
    { id: "fleet", labelKey: "nav.fleet", href: "/fleet" },
    { id: "locations", labelKey: "nav.locations", href: "/locations" },
    { id: "services", labelKey: "nav.services", href: "/services" },
    { id: "offers", labelKey: "nav.offers", href: "/offers" },
    { id: "about", labelKey: "nav.about", href: "/about" },
    { id: "contact", labelKey: "nav.contact", href: "/contact" },
  ],
  footer: [
    {
      id: "explore",
      titleKey: "footer.explore",
      links: [
        { id: "fleet", labelKey: "nav.fleet", href: "/fleet" },
        { id: "locations", labelKey: "nav.locations", href: "/locations" },
        { id: "offers", labelKey: "nav.offers", href: "/offers" },
        { id: "services", labelKey: "nav.services", href: "/services" },
      ],
    },
    {
      id: "company",
      titleKey: "footer.company",
      links: [
        { id: "about", labelKey: "nav.about", href: "/about" },
        { id: "contact", labelKey: "nav.contact", href: "/contact" },
        { id: "faq", labelKey: "nav.faq", href: "/faq" },
      ],
    },
    {
      id: "legal",
      titleKey: "footer.legal_links",
      links: [
        { id: "terms", labelKey: "nav.terms", href: "/rental-terms" },
        { id: "faq", labelKey: "nav.faq", href: "/faq" },
      ],
    },
  ],
};

export const homeSections = [
  {
    id: "hero",
    type: "hero",
    eyebrow: {
      en: "Lebanon · Airport, city & hotel delivery",
      ar: "لبنان · المطار والمدينة والتوصيل إلى الفندق",
    },
    title: { en: "Car rental in Lebanon", ar: "تأجير سيارات في لبنان" },
    lede: {
      en: "Pick up at Beirut airport, from a city office, or have the car delivered to your hotel. Clear daily rates, stated deposits, and a real person on WhatsApp.",
      ar: "استلم سيارتك من مطار بيروت، أو من مكتب في المدينة، أو تُسلَّم إلى فندقك. أسعار يومية واضحة، تأمينات معلنة، وشخص حقيقي على واتساب.",
    },
    image: media(39035693, {
      alt: {
        en: "A white four-wheel-drive rental car on a mountain road in daylight",
        ar: "سيارة دفع رباعي بيضاء على طريق جبلي في ضوء النهار",
      },
    }),
    sortOrder: 1,
    enabled: true,
  },
  {
    id: "fleet-showcase",
    type: "fleetShowcase",
    sortOrder: 2,
    enabled: true,
    limit: 6,
    selection: "featured",
  },
  {
    id: "locations-strip",
    type: "locationStrip",
    sortOrder: 3,
    enabled: true,
  },
  {
    id: "how-it-works",
    type: "steps",
    sortOrder: 4,
    enabled: true,
    steps: [
      {
        id: "search",
        title: { en: "Search", ar: "ابحث" },
        body: {
          en: "Choose a pick-up point and your dates. The fleet filters itself to what is actually free.",
          ar: "اختر نقطة الاستلام والتواريخ. يُصفّى الأسطول بما هو متاح فعليًا.",
        },
      },
      {
        id: "request",
        title: { en: "Send a request", ar: "أرسل الطلب" },
        body: {
          en: "No payment online. You send the request, we check the car and the dates.",
          ar: "لا دفع إلكتروني. ترسل الطلب، ونتحقق من السيارة والتواريخ.",
        },
      },
      {
        id: "confirm",
        title: { en: "Confirm", ar: "أكّد" },
        body: {
          en: "We reply with a confirmation, the deposit terms and the pick-up details.",
          ar: "نرد عليك بالتأكيد وشروط التأمين وتفاصيل الاستلام.",
        },
      },
      {
        id: "drive",
        title: { en: "Drive", ar: "قد" },
        body: {
          en: "Keys handed over at the office, the airport, or your address.",
          ar: "تُسلّم المفاتيح في المكتب أو المطار أو عنوانك.",
        },
      },
    ],
  },
];

export const services = [
  {
    id: "airport-meet",
    title: { en: "Airport meet & greet", ar: "استقبال في المطار" },
    body: {
      en: "An agent meets you in the arrivals hall with the keys and the paperwork, so you are not queueing after a late flight.",
      ar: "يستقبلك المندوب في قاعة الوصول بالمفاتيح والأوراق، دون انتظار بعد رحلة متأخرة.",
    },
    icon: "arrival",
    sortOrder: 1,
    status: "active",
  },
  {
    id: "delivery",
    title: { en: "Hotel & address delivery", ar: "التوصيل إلى الفندق أو العنوان" },
    body: {
      en: "We bring the car to your hotel or home inside Beirut and the coast, inspect it with you, and collect it from the same place.",
      ar: "نحضر السيارة إلى فندقك أو منزلك داخل بيروت والساحل، ونعاينها معك، ونستلمها من المكان نفسه.",
    },
    icon: "van",
    sortOrder: 2,
    status: "active",
  },
  {
    id: "monthly",
    title: { en: "Long-term monthly rental", ar: "تأجير شهري طويل المدى" },
    body: {
      en: "Monthly rates for residents, companies and students, with servicing handled by us.",
      ar: "أسعار شهرية للمقيمين والشركات والطلاب، مع صيانة السيارة علينا.",
    },
    icon: "calendar",
    sortOrder: 3,
    status: "active",
  },
  {
    id: "chauffeur",
    title: { en: "Chauffeur service", ar: "خدمة سائق خاص" },
    body: {
      en: "Airport transfers, business days and events with a driver who knows the roads.",
      ar: "نقل من المطار، وأيام العمل، ومناسبات مع سائق يعرف الطرق.",
    },
    icon: "steering",
    sortOrder: 4,
    status: "active",
  },
  {
    id: "extras",
    title: { en: "Child seats and extras", ar: "مقاعد أطفال وإضافات" },
    body: {
      en: "Child seats, additional drivers and mobile Wi-Fi added to the same booking.",
      ar: "مقاعد أطفال وسائق ثانٍ وواي فاي مضاف إلى الحجز نفسه.",
    },
    icon: "seat",
    sortOrder: 5,
    status: "active",
  },
  {
    id: "roadside",
    title: { en: "Roadside assistance", ar: "مساعدة على الطريق" },
    body: {
      en: "A local number that answers, and a replacement vehicle if the fault is not your fault.",
      ar: "رقم محلي يرد، وسيارة بديلة إذا كان العطل ليس من جانبك.",
    },
    icon: "tool",
    sortOrder: 6,
    status: "active",
  },
];

export const offers = [
  {
    id: "weekly-rate",
    title: { en: "Weekly rate", ar: "سعر الأسبوع" },
    body: {
      en: "Rent for seven days or more and 10% comes off the daily rate at confirmation.",
      ar: "استأجر سبعة أيام أو أكثر ويُخصم ١٠٪ من السعر اليومي عند التأكيد.",
    },
    termsKey: "pricing.weeklyDiscount",
    discountPercent: 10,
    minDays: 7,
    status: "active",
    sortOrder: 1,
  },
  {
    id: "monthly-rate",
    title: { en: "Monthly rate", ar: "سعر الشهر" },
    body: {
      en: "Twenty-eight days or more takes 20% off, including servicing during the rental.",
      ar: "ثمانية وعشرون يومًا أو أكثر تُخصم منها ٢٠٪، مع الصيانة خلال فترة التأجير.",
    },
    termsKey: "pricing.monthlyDiscount",
    discountPercent: 20,
    minDays: 28,
    status: "active",
    sortOrder: 2,
  },
  {
    id: "beirut-delivery",
    title: { en: "Free delivery inside Beirut", ar: "توصيل مجاني داخل بيروت" },
    body: {
      en: "Book four days or more and delivery to your address inside Beirut city is not charged.",
      ar: "احجز أربعة أيام أو أكثر ولا يُحتسب توصيل عنوانك داخل بيروت.",
    },
    termsKey: null,
    discountPercent: 0,
    minDays: 4,
    status: "active",
    sortOrder: 3,
  },
];

export const faqs = [
  {
    id: "documents",
    question: {
      en: "What do I need to rent a car?",
      ar: "ما المستندات المطلوبة لتأجير سيارة؟",
    },
    answer: {
      en: "A valid driving licence, a passport or Lebanese ID, and a credit card for the deposit. If your licence is not Lebanese, an international driving permit is required alongside it.",
      ar: "رخصة قيادة سارية، وجواز سفر أو بطاقة هوية لبنانية، وبطاقة ائتمان للتأمين. إذا لم تكن رخصتك لبنانية، تُشترط بطاقة قيادة دولية إلى جانبها.",
    },
    sortOrder: 1,
  },
  {
    id: "age",
    question: { en: "Is there a minimum age?", ar: "هل يوجد حد أدنى للعمر؟" },
    answer: {
      en: "Drivers must be at least 21. Drivers under 25 pay a young-driver fee, which is shown before you send the request.",
      ar: "يجب ألا يقل عمر السائق عن ٢١ سنة. السائقون تحت ٢٥ يدفعون رسومًا تظهر قبل إرسال الطلب.",
    },
    sortOrder: 2,
  },
  {
    id: "mileage",
    question: { en: "Is mileage limited?", ar: "هل المسافة محدودة؟" },
    answer: {
      en: "Each vehicle states its daily allowance on the vehicle page. Anything above it is charged per kilometre, and the rate is shown with the allowance.",
      ar: "تحدد صفحة كل سيارتها الحصة اليومية. وما يتجاوزها يُحسب لكل كيلومتر، ويظهر السعر مع الحصة.",
    },
    sortOrder: 3,
  },
  {
    id: "deposit",
    question: { en: "How much is the deposit?", ar: "كم مبلغ التأمين؟" },
    answer: {
      en: "It depends on the vehicle and is listed on the vehicle page before you book. It is refunded after the car is returned and inspected.",
      ar: "يعتمد على السيارة ويظهر في صفحتها قبل الحجز. يُعاد بعد إرجاع السيارة وفحصها.",
    },
    sortOrder: 4,
  },
  {
    id: "payment",
    question: { en: "How can I pay?", ar: "كيف يمكنني الدفع؟" },
    answer: {
      en: "In US dollars by card, cash, OMT or Whish Money. Nothing is charged when you send a request.",
      ar: "بالدولار عبر البطاقة أو نقدًا أو OMT أو ويش ماني. لا يُخصم شيء عند إرسال الطلب.",
    },
    sortOrder: 5,
  },
  {
    id: "crossing",
    question: {
      en: "Can I cross the border?",
      ar: "هل يمكنني العبور إلى الدولة المجاورة؟",
    },
    answer: {
      en: "No. Rentals are valid inside Lebanon only, and crossing into Syria or Israel voids the insurance.",
      ar: "لا. التأجير صالح داخل لبنان فقط، والعبور إلى سوريا أو إسرائيل يلغي التأمين.",
    },
    sortOrder: 6,
  },
  {
    id: "cancel",
    question: { en: "Can I cancel?", ar: "هل يمكنني الإلغاء؟" },
    answer: {
      en: "Yes. Cancelling at least 48 hours before pick-up costs nothing. Later cancellations are handled case by case on the confirmation message.",
      ar: "نعم. الإلغاء قبل ٤٨ ساعة من الاستلام بلا تكلفة. وما بعدها يُعالَج حسب رسالة التأكيد.",
    },
    sortOrder: 7,
  },
  {
    id: "flight-delay",
    question: { en: "My flight is delayed", ar: "تأخرت رحلتي" },
    answer: {
      en: "Send us your new landing time on WhatsApp. The airport counter holds your vehicle for late arrivals — tell us and it will be waiting.",
      ar: "أرسل لنا وقت وصولك الجديد على واتساب. يحتفظ مكتب المطار بسيارتك للرحلات المتأخرة — أخبرنا وستكون بانتظارك.",
    },
    sortOrder: 8,
  },
];

export const rentalTerms = {
  id: "rentalTerms",
  updatedAt: "2026-10-08T00:00:00.000Z",
  introduction: {
    en: "These demonstration terms show the structure of a real Lebanese rental contract. They are not a legal agreement.",
    ar: "هذه الشروط توضيح لبنية عقد تأجير حقيقي في لبنان، وليست اتفاقًا قانونيًا.",
  },
  sections: [
    {
      id: "booking",
      titleKey: "terms.section.booking",
      body: {
        en: "A request reserves nothing until our team replies with a confirmation. The confirmation states the vehicle, the dates, the pick-up point, the deposit and the mileage allowance. Identification and a valid licence are checked at handover, not online.",
        ar: "لا يحجز الطلب شيئًا حتى يرد فريقنا برسالة تأكيد. توضح رسالة التأكيد السيارة والتواريخ ونقطة الاستلام والتأمين والحصة اليومية. تُفحص الهوية والرخصة عند تسليم السيارة، لا عبر الإنترنت.",
      },
    },
    {
      id: "cancel",
      titleKey: "terms.section.cancel",
      body: {
        en: "Free cancellation up to 48 hours before pick-up. Inside 48 hours we keep the deposit only where the vehicle has already been prepared and assigned. No-shows are charged one day of the daily rate.",
        ar: "إلغاء مجاني حتى ٤٨ ساعة قبل الاستلام. وضمنها يُحتفظ بالتأمين فقط إذا كانت السيارة جُهّزت ووُزّعت. عدم الحضور يُحاسب بيوم واحد من السعر اليومي.",
      },
    },
    {
      id: "damage",
      titleKey: "terms.section.damage",
      body: {
        en: "The driver is responsible for damage caused by negligence, off-road driving, driving under the influence, or crossing the border. The excess amount shown on the vehicle page applies per incident. Tyres, glass and underside damage are not covered by the standard excess.",
        ar: "السائق مسؤول عن الضرر الناتج عن الإهمال أو القيادة خارج الطريق أو القيادة تحت التأثير أو العبور إلى الخارج. يُطبَّق مبلغ التحمل المعروض في صفحة السيارة لكل حادث. الإطارات والزجاج وعمود السيارة غير مغطاة بحمل التحمل القياسي.",
      },
    },
    {
      id: "extension",
      titleKey: "terms.section.extension",
      body: {
        en: "Ask for an extension before the return time. Keeping the car past the agreed return time without approval is charged at the daily rate plus a late fee, and the deposit stays held.",
        ar: "اطلب التمديد قبل وقت الإرجاع. وبقاء السيارة بعد الموعد المتفق عليه دون موافقة يُحسب بسعر اليومي إلى جانب رسوم تأخير، ويبقى التأمين محتجزًا.",
      },
    },
    {
      id: "disputes",
      titleKey: "terms.section.disputes",
      body: {
        en: "Questions about an invoice or an incident go to the contact address on this site with your request reference. We reply within one working day.",
        ar: "الاستفسارات عن فاتورة أو حادث تُرسَل إلى عنوان التواصل في هذا الموقع مع رقم الطلب. نرد خلال يوم عمل واحد.",
      },
    },
  ],
};

/** Per-path metadata. Admin-editable; `null` means "derive from the page". */
export const seo = {
  "/": {
    title: "Cedars Drive — Car rental in Lebanon",
    description:
      "Car rental in Lebanon. Airport, city and hotel delivery with clear daily rates and stated deposits.",
  },
  "/fleet": {
    title: "The fleet — Car rental in Lebanon",
    description:
      "Compare economy, family and premium vehicles with real daily rates, deposits and mileage allowances.",
  },
  "/locations": {
    title: "Pick-up and return locations",
    description:
      "Beirut airport, city offices and delivery points for picking up and returning your rental car in Lebanon.",
  },
  "/services": {
    title: "Services",
    description:
      "Airport meet and greet, hotel delivery, monthly rental, chauffeur and roadside support.",
  },
  "/offers": {
    title: "Offers and rates",
    description: "Weekly and monthly rates and delivery conditions for car rental in Lebanon.",
  },
  "/about": { title: "About", description: "Who runs the fleet and how the service works." },
  "/contact": { title: "Contact", description: "Phone, WhatsApp and address for car rental enquiries." },
  "/faq": { title: "Frequently asked questions", description: "Documents, deposits, mileage and cancellation." },
  "/rental-terms": { title: "Rental terms", description: "Booking, cancellation, damage and extension terms." },
  "/book": { title: "Request a vehicle", description: "Send a rental request — no payment is taken online." },
};
