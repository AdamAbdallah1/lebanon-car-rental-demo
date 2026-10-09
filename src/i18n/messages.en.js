/**
 * English UI catalogue.
 * Flat dot-notated keys → string. `{placeholder}` interpolation supported.
 * Vehicle/location/service copy lives in the repository as `{ en, ar }`
 * localized fields — this file is for interface chrome only.
 */
export const en = {
  "brand.name": "Cedars Drive",
  "brand.legal": "Cedars Drive is a fictional demonstration product.",
  "brand.by": "A Cedars Tech demonstration",

  "skip.toContent": "Skip to content",

  "nav.fleet": "Fleet",
  "nav.locations": "Locations",
  "nav.services": "Services",
  "nav.offers": "Offers",
  "nav.about": "About",
  "nav.faq": "FAQ",
  "nav.contact": "Contact",
  "nav.terms": "Rental terms",
  "nav.menu": "Menu",
  "nav.menuOpen": "Open menu",
  "nav.menuClose": "Close menu",
  "nav.language": "Language",
  "nav.languageEn": "English",
  "nav.languageAr": "العربية",
  "nav.primary": "Primary",
  "nav.breadcrumb": "Breadcrumb",

  "hero.eyebrow": "Lebanon · Airport, city & hotel delivery",
  "hero.title": "Car rental in Lebanon",
  "hero.titleEmphasis": "Lebanon",
  "hero.lede":
    "Pick up at Beirut airport, from a city office, or have the car delivered to your hotel. Clear daily rates, stated deposits, and a real person on WhatsApp.",
  "hero.imageAlt":
    "A rental SUV in a mountain landscape at golden hour",
  "hero.scroll": "Explore the fleet",
  "hero.trust.delivery": "Airport, city & hotel delivery",
  "hero.trust.pricing": "Rates and deposits stated up front",
  "hero.trust.request": "Request first, no card charged",

  "search.legend": "Start a rental",
  "search.pickupLocation": "Pick-up location",
  "search.pickupDate": "Pick-up date",
  "search.returnDate": "Return date",
  "search.returnHint": "Returned to the same location",
  "search.submit": "Search fleet",
  "search.placeholderLocation": "Choose a location",
  "search.group.airports": "Airports",
  "search.group.cities": "Cities",
  "search.group.offices": "Offices",
  "search.group.delivery": "Delivery",
  "search.validation.location": "Choose a pick-up location.",
  "search.validation.dates": "Choose your pick-up and return dates.",
  "search.validation.range": "Return must be on or after pick-up.",
  "search.to": "to",
  "search.days": "{count} day",
  "search.days_plural": "{count} days",
  "search.clear": "Clear search",

  "fleet.title": "The fleet",
  "fleet.lede":
    "Every vehicle listed with its real daily rate, deposit and mileage allowance. Prices are the same on the page and in the contract.",
  "fleet.showcaseTitle": "Fleet",
  "fleet.showcaseLede":
    "Seventeen vehicles across six categories — from city hatchbacks to long-wheelbase SUVs for the mountain roads.",
  "fleet.browseAll": "Browse the full fleet",
  "fleet.filter.label": "Filter by category",
  "fleet.filter.all": "All vehicles",
  "fleet.filter.count": "{count} vehicle",
  "fleet.filter.count_plural": "{count} vehicles",
  "fleet.sort.label": "Sort",
  "fleet.sort.priceAsc": "Price, low to high",
  "fleet.sort.priceDesc": "Price, high to low",
  "fleet.sort.recommended": "Recommended",
  "fleet.results": "Showing {count} of {total}",
  "fleet.empty.title": "No vehicles match these filters",
  "fleet.empty.body":
    "Try a different category or clear the filters to see the whole fleet.",
  "fleet.empty.action": "Clear filters",
  "fleet.error.title": "The fleet could not be loaded",
  "fleet.error.body":
    "Something went wrong while reaching our data service. Your search is kept — try again.",
  "fleet.error.action": "Try again",
  "fleet.loading": "Loading vehicles",

  "card.perDay": "per day",
  "card.from": "From",
  "card.tripTotal": "trip total",
  "card.dayCount": "{count} day",
  "card.dayCount_plural": "{count} days",
  "card.view": "View vehicle",
  "card.viewLabel": "View {name}",
  "card.availability.available": "Available",
  "card.availability.limited": "Limited",
  "card.availability.unavailable": "Unavailable",
  "card.availability.onRequest": "On request",
  "card.included.label": "Included",
  "card.noImage": "Vehicle photograph coming soon",

  "spec.transmission": "Transmission",
  "spec.fuel": "Fuel",
  "spec.seats": "Seats",
  "spec.doors": "Doors",
  "spec.luggage": "Luggage",
  "spec.body": "Body",
  "spec.year": "Year",
  "spec.mileage": "Mileage",
  "spec.deposit": "Deposit",
  "spec.insurance": "Insurance",
  "spec.availability": "Availability",

  "fuel.petrol": "Petrol",
  "fuel.diesel": "Diesel",
  "fuel.hybrid": "Hybrid",
  "fuel.electric": "Electric",

  "vehicle.back": "Back to fleet",
  "vehicle.gallery": "Gallery",
  "vehicle.galleryOpen": "Open image {index} of {total}",
  "vehicle.lightbox.close": "Close gallery",
  "vehicle.lightbox.next": "Next image",
  "vehicle.lightbox.prev": "Previous image",
  "vehicle.lightbox.counter": "{current} / {total}",
  "vehicle.overview": "Overview",
  "vehicle.specs": "Specifications",
  "vehicle.pricing": "Pricing",
  "vehicle.inclusions": "What's included",
  "vehicle.conditions": "Conditions",
  "vehicle.terms": "Rental terms",
  "vehicle.similar": "Similar vehicles",
  "vehicle.sticky.nav": "On this page",
  "vehicle.request": "Request this vehicle",
  "vehicle.requestShort": "Request",
  "vehicle.whatsapp": "Ask on WhatsApp",
  "vehicle.whatsappLabel": "Ask about the {name} on WhatsApp",
  "vehicle.monthlyEquivalent": "Monthly equivalent",
  "vehicle.dailyRate": "Daily rate",
  "vehicle.tripTotal": "Trip total",
  "vehicle.tripTotalFor": "Total for {days} days",
  "vehicle.noDates": "Add dates to see the trip total",
  "vehicle.priceNote":
    "Rates exclude 11% VAT, which is added at confirmation.",
  "vehicle.description": "About this vehicle",
  "vehicle.notFound.title": "Vehicle not found",
  "vehicle.notFound.body":
    "This vehicle may have been archived or the link is out of date.",
  "vehicle.notFound.action": "Browse the fleet",
  "vehicle.error.title": "This vehicle could not be loaded",
  "vehicle.error.body":
    "The vehicle record did not come back from our data service. Try again, or browse the fleet.",

  "pricing.from": "From",
  "pricing.perDay": "per day",
  "pricing.total": "total",
  "pricing.deposit": "Refundable deposit",
  "pricing.mileageIncluded": "{count} km included per day",
  "pricing.mileageOverage": "{amount}/km after that",
  "pricing.weeklyDiscount": "Weekly rate −{pct}%",
  "pricing.monthlyDiscount": "Monthly rate −{pct}%",
  "pricing.vat": "11% VAT added at confirmation",

  "inclusions.title": "Included in the daily rate",
  "conditions.title": "Before you book",
  "conditions.age": "Minimum driver age 21. Drivers under 25 pay a young-driver fee.",
  "conditions.licence": "Valid licence held for at least one year. International licence required for non-Lebanese licence holders.",
  "conditions.deposit": "Refundable card or cash deposit taken at handover.",
  "conditions.mileage": "Daily mileage allowance applies. Overage is charged per kilometre.",
  "conditions.crossBorder": "Cross-border travel into Syria and Israel is not permitted.",
  "conditions.payment": "Payment accepted in USD by card, cash, OMT and Whish Money.",

  "terms.introduction":
    "These demonstration terms show the structure of a real Lebanese rental contract. They are not a legal agreement.",
  "terms.section.booking": "Booking and confirmation",
  "terms.section.cancel": "Cancellation",
  "terms.section.damage": "Damage and responsibility",
  "terms.section.extension": "Extensions and late return",
  "terms.section.disputes": "Questions",

  "booking.title": "Request this vehicle",
  "booking.subtitle":
    "A request is not a confirmed booking. Our team reviews availability and replies with a confirmation.",
  "booking.step.vehicle": "Vehicle",
  "booking.step.dates": "Dates",
  "booking.step.driver": "Driver",
  "booking.step.review": "Review",
  "booking.reference": "Request reference",
  "booking.status.pending": "Pending review",
  "booking.status.confirmed": "Confirmed",
  "booking.status.declined": "Declined",

  "locations.title": "Pick-up and return",
  "locations.lede":
    "Airport counter, city offices, and delivery to your address. Choose one pick-up point to start — you can change the return location later.",
  "locations.group.airports": "Airports",
  "locations.group.cities": "Cities",
  "locations.group.offices": "Offices",
  "locations.group.delivery": "Delivery",
  "locations.pickup": "Pick-up",
  "locations.return": "Return",
  "locations.hours": "Opening hours",
  "locations.fee": "Airport service fee",
  "locations.free": "No fee",
  "locations.address": "Address",
  "locations.area": "Area",
  "locations.error.title": "Locations could not be loaded",
  "locations.error.body":
    "Pick-up points are served from our data service. Try again in a moment.",
  "locations.select": "Select this location",
  "locations.selected": "Selected",
  "locations.notFound.title": "Location not found",

  "services.title": "Services",
  "services.lede": "Add-ons and support that sit around the rental itself.",

  "offers.title": "Offers",
  "offers.lede": "Current rates and seasonal conditions.",

  "about.title": "About",
  "contact.title": "Contact",
  "faq.title": "Frequently asked questions",
  "faq.lede":
    "Documents, age, mileage, deposits, payment, borders, cancellation and delayed flights.",
  "faq.still.question": "Something not covered here?",

  "about.lede":
    "Cedars Drive is a demonstration product built by Cedars Tech: a public rental site, a repository layer and a Firestore data model shown end to end.",
  "about.fact.currency": "Currency",
  "about.fact.vat": "VAT",
  "about.fact.window": "Reservation window",
  "about.fact.locales": "Languages",
  "about.chapter.what.title": "What this is",
  "about.chapter.what.body":
    "A car rental website for Lebanon. Browse the fleet, compare daily rates, deposits and mileage allowances, then send a rental request.",
  "about.chapter.how.title": "How a rental works",
  "about.chapter.how.body":
    "Search with a location and dates, choose a vehicle, send a request. Our side reviews availability and replies with a confirmation that states the vehicle, the dates, the pick-up point, the deposit and the mileage allowance.",
  "about.chapter.data.title": "Where the data lives",
  "about.chapter.data.body":
    "Vehicles, locations, rates and content are documents behind a repository layer. The public site and the future admin read and write the same records, so a rate changed in one place is the rate shown everywhere.",
  "about.chapter.honest.title": "What is not claimed",
  "about.chapter.honest.body":
    "No awards, certifications, review scores, partner logos or regulatory numbers appear anywhere on this site — a demonstration has no basis for them.",

  "contact.lede":
    "Email, phone or WhatsApp. A person reads it during opening hours and replies within one working day.",
  "contact.channel.email": "Email",
  "contact.channel.phone": "Phone",
  "contact.channel.whatsapp": "WhatsApp",
  "contact.office.title": "Office",
  "contact.response.title": "What happens next",
  "contact.response.body":
    "Add your dates and the vehicle you want so the reply can be specific. Requests are read by a person, not a form inbox.",
  "contact.point.request": "Nothing is confirmed until our team replies.",
  "contact.point.payment": "No payment details are collected on this site.",
  "contact.point.demo": "Demonstration build — no real reservation is created.",

  "locations.details": "Location details",

  "terms.updated": "Updated",

  "booking.field.vehicle": "Vehicle",
  "booking.field.vehiclePlaceholder": "Choose a vehicle",
  "booking.field.name": "Full name",
  "booking.field.email": "Email",
  "booking.field.phone": "Phone",
  "booking.field.notes": "Notes",
  "booking.field.notesHint":
    "Flight number, child seat, second driver — anything we should know.",
  "booking.submit": "Send request",
  "booking.submitting": "Sending…",
  "booking.disclaimer":
    "A request is not a booking and nothing is charged. We review availability and reply with a confirmation.",
  "booking.status.label": "Status",
  "booking.error.title": "The booking form could not be loaded",
  "booking.error.body":
    "Vehicles, locations and rates come from our data service. Try again in a moment.",
  "booking.summary.title": "Your request",
  "booking.summary.empty": "Choose a vehicle and dates to see the price.",
  "booking.error.submit":
    "Your request could not be sent. Please try again.",
  "booking.success.title": "Request received",
  "booking.success.body":
    "Your request is with our team. Nothing has been charged — we reply with a confirmation, or with an alternative if the vehicle is taken.",
  "booking.success.note":
    "The total shown excludes 11% VAT, which is added at confirmation. Keep your reference for the reply.",
  "booking.success.again": "Send another request",
  "booking.validation.vehicle": "Choose a vehicle.",
  "booking.validation.location": "Choose a pick-up location.",
  "booking.validation.dates": "Choose your pick-up and return dates.",
  "booking.validation.range": "Return must be on or after pick-up.",
  "booking.validation.required": "This field is required.",
  "booking.validation.email": "Enter a valid email address.",
  "booking.validation.unavailable":
    "This vehicle is not available for the selected dates.",

  "notFound.title": "This page does not exist",
  "notFound.body":
    "The link may be out of date, or the address may be mistyped. The fleet and the locations are a good place to start.",
  "notFound.home": "Back to home",

  "states.loading": "Loading",
  "states.error.title": "Something went wrong",
  "states.error.body": "Please try again.",
  "states.retry": "Try again",
  "states.empty": "Nothing here yet.",

  "footer.legal":
    "Cedars Drive is a fictional demonstration product built by Cedars Tech. Vehicle names belong to their respective manufacturers. No awards, certifications, partner logos or reviews are claimed anywhere on this site.",
  "footer.explore": "Explore",
  "footer.company": "Company",
  "footer.support": "Support",
  "footer.legal_links": "Legal",
  "footer.rights": "Demonstration build.",
  "footer.builtBy": "Built by Cedars Tech",
  "footer.backToTop": "Back to top",

  "a11y.openInNewTab": "opens in a new tab",
  "a11y.externalLink": "external link",

  "lang.switchTo": "Switch to Arabic",
  "lang.switchToEn": "Switch to English",
  "lang.current": "Current language: English",

  "demo.notice":
    "Demonstration build — data is seeded and no real reservations are created.",

  // ---- trip-fit filters -------------------------------------------------
  "fleet.filter.any": "Any",
  "fleet.filter.passengers": "Passengers",
  "fleet.filter.luggage": "Luggage",
  "fleet.filter.passengersOption": "{count}+ passengers",
  "fleet.filter.luggageOption": "{count}+ bags",

  // ---- location detail --------------------------------------------------
  "locations.fee.delivery": "Delivery service fee",
  "locations.guidance": "What to expect at pick-up",
  "locations.guidance.confirm":
    "Times and handover are confirmed when we reply to your request.",
  "locations.flag.counter": "Counter",
  "locations.flag.counterPresent": "Staffed counter on site",
  "locations.flag.deliveryOnly": "Delivery only, no counter",
  "locations.flag.return": "Return",
  "locations.flag.returnDiff": "May be returned to another point",
  "locations.flag.returnSame": "Collected and returned here",
  "locations.vehicles.title": "Vehicles collected here",
  "locations.vehicles.lede":
    "Every vehicle that can be picked up from this point, with its daily rate.",
  "locations.vehicles.forDates":
    "Priced with the pick-up and return dates from your search.",
  "locations.vehicles.all": "See all {count} vehicles at this point",
  "locations.vehicles.empty.title": "No vehicle list for this point yet",
  "locations.vehicles.empty.body":
    "Which cars reach this point is agreed with our team — send a request and we will match one to your dates.",

  // ---- itemised quote ---------------------------------------------------
  "quote.title": "Price breakdown",
  "quote.charges": "Rental charges",
  "quote.fees": "Mandatory fees",
  "quote.subtotal": "Rental subtotal",
  "quote.vatLine": "{pct}% VAT — added at confirmation",
  "quote.totalExVat": "Rental total, excluding VAT",
  "quote.totalIncVat": "Total including {pct}% VAT",
  "quote.vatNote":
    "Nothing is charged when you send a request. VAT is added when we confirm the booking.",
  "quote.depositTitle": "Refundable deposit",
  "quote.depositNote":
    "Held when you collect the car and released when you return it. It is not a rental charge.",
  "quote.extrasTitle": "Optional extras",
  "quote.extrasNone": "None selected",
  "quote.extrasNote":
    "Child seats, a second driver and mobile Wi-Fi are arranged with the team and quoted before you confirm.",
  "quote.mileageTitle": "Mileage and protection",
  "quote.excess": "Damage excess per incident: {amount}",
  "quote.empty": "Add your pick-up and return dates to see an itemised quote.",
  "quote.pickupNote": "Pick-up and return at {location}.",

  // ---- booking flow -----------------------------------------------------
  "booking.heading.vehicle": "Vehicle and pick-up point",
  "booking.step.back": "Back",
  "booking.step.continue": "Continue",
  "booking.progress.label": "Request steps",
  "booking.progress.note":
    "Nothing is charged and nothing is reserved while you work through these steps.",
  "booking.review.title": "Check your request",
  "booking.review.edit": "Change",
  "booking.review.requirements": "What you will need at handover",
  "booking.review.requirementsNote":
    "These are checked when you collect the car, not when you send the request. Read the full rental terms before you book.",
  "booking.next.title": "What happens next",
  "booking.next.1": "Your request is queued for review. Nothing is reserved yet.",
  "booking.next.2":
    "We check the vehicle, the dates and the pick-up point, then reply with a confirmation or an alternative.",
  "booking.next.3":
    "When you collect the car we check your licence and ID and take the refundable deposit.",
  "booking.reference.hint": "Keep this reference — quote it in any reply.",
  "booking.error.conflict":
    "This vehicle was taken for those dates while you were filling in the form. Choose different dates and send again.",
  "booking.unavailable.action": "Change the dates",
  "booking.validation.past": "Choose today or a later date.",
  "booking.validation.locationMismatch":
    "{location} does not hand this vehicle over. Choose another pick-up point.",
  "booking.availability.available": "Free for your dates.",
  "booking.availability.limited":
    "Limited for your dates — we confirm it before anything is booked.",
  "booking.availability.unavailable": "Already taken for your dates.",
  "booking.availability.onRequest": "Available on request.",
  "booking.availability.note":
    "An indication only — availability is confirmed when we reply.",
};
