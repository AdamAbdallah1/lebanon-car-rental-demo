/**
 * Categories — the fleet taxonomy used by nav, chips, routes and admin.
 * One document per category, localized fields inline.
 */
export const categories = [
  {
    id: "economy",
    name: { en: "Economy", ar: "اقتصادية" },
    slug: "economy",
    tagline: {
      en: "City driving and short trips",
      ar: "للتنقل داخل المدينة والرحلات القصيرة",
    },
    sortOrder: 1,
    status: "active",
  },
  {
    id: "compact",
    name: { en: "Compact", ar: "مدمجة" },
    slug: "compact",
    tagline: {
      en: "More room without the footprint",
      ar: "مساحة أكبر دون حجم زائد",
    },
    sortOrder: 2,
    status: "active",
  },
  {
    id: "sedan",
    name: { en: "Sedan", ar: "سيدان" },
    slug: "sedan",
    tagline: {
      en: "Comfort for longer coastal runs",
      ar: "راحة لرحلات الساحل الطويلة",
    },
    sortOrder: 3,
    status: "active",
  },
  {
    id: "suv",
    name: { en: "SUV", ar: "دفع رباعي" },
    slug: "suv",
    tagline: {
      en: "Mountains, families and luggage",
      ar: "للجبل والعائلات وحقائب السفر",
    },
    sortOrder: 4,
    status: "active",
  },
  {
    id: "premium",
    name: { en: "Premium", ar: "مميزة" },
    slug: "premium",
    tagline: {
      en: "Specification that stands out",
      ar: "مواصفات لافتة",
    },
    sortOrder: 5,
    status: "active",
  },
  {
    id: "luxury",
    name: { en: "Luxury", ar: "فاخرة" },
    slug: "luxury",
    tagline: {
      en: "Executive saloons with a driver option",
      ar: "سيارات تنفيذية مع خيار سائق",
    },
    sortOrder: 6,
    status: "active",
  },
];

export const inclusions = [
  { id: "unlimited-km-city", name: { en: "Third-party insurance", ar: "تأمين ضد الغير" } },
  { id: "ac", name: { en: "Air conditioning", ar: "تكييف" } },
  { id: "bluetooth", name: { en: "Bluetooth audio", ar: "بلوتوث" } },
  { id: "gps", name: { en: "GPS navigation", ar: "ملاحة GPS" } },
  { id: "second-driver", name: { en: "Second driver", ar: "سائق ثانٍ" } },
  { id: "child-seat", name: { en: "Child seat on request", ar: "مقعد أطفال عند الطلب" } },
  { id: "airport-pickup", name: { en: "Airport meet & greet", ar: "استقبال في المطار" } },
  { id: "hotel-delivery", name: { en: "Hotel delivery", ar: "توصيل إلى الفندق" } },
  { id: "roadside", name: { en: "Roadside assistance", ar: "مساعدة على الطريق" } },
  { id: "full-width-tires", name: { en: "Full-width tyres checked daily", ar: "فحص يومي للإطارات" } },
];
