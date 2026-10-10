/**
 * Role → capability map for the operations surface.
 *
 * The roles themselves are Auth custom claims minted by
 * `functions/scripts/set-role.mjs`; this module only decides what the *UI*
 * shows a signed-in session. It is a convenience, not a control — every read
 * and write behind it is enforced again by `firestore.rules` and by
 * `submitBookingDecision`.
 *
 *   admin    everything
 *   agent    booking review, read-only content
 *   editor   content and fleet authoring; no customer records, no decisions
 *
 * A section is added here only when its route exists, so the navigation never
 * offers a dead end.
 */
export const GRANTS = Object.freeze({
  admin: [
    "bookings:read",
    "bookings:decide",
    "fleet:write",
    "content:write",
    "settings:write",
  ],
  agent: ["bookings:read", "bookings:decide"],
  editor: ["fleet:write", "content:write"],
});

export function can(role, capability) {
  return (GRANTS[role] ?? []).includes(capability);
}

/**
 * Navigation entries. A section is listed here only once its route renders,
 * so the navigation never offers a dead end.
 */
export const ADMIN_SECTIONS = Object.freeze([
  {
    id: "bookings",
    path: "/admin/bookings",
    labelKey: "admin.nav.bookings",
    icon: "calendar",
    capability: "bookings:read",
  },
  {
    id: "fleet",
    path: "/admin/fleet",
    labelKey: "admin.nav.fleet",
    icon: "key",
    capability: "fleet:write",
  },
  {
    id: "categories",
    path: "/admin/categories",
    labelKey: "admin.nav.categories",
    icon: "globe",
    capability: "content:write",
  },
  {
    id: "locations",
    path: "/admin/locations",
    labelKey: "admin.nav.locations",
    icon: "pin",
    capability: "content:write",
  },
  {
    id: "offers",
    path: "/admin/offers",
    labelKey: "admin.nav.offers",
    icon: "star",
    capability: "content:write",
  },
  {
    id: "faqs",
    path: "/admin/faqs",
    labelKey: "admin.nav.faqs",
    icon: "quote",
    capability: "content:write",
  },
  {
    // Rental terms are a legal document, so they sit behind `settings:write`
    // rather than plain content authoring.
    id: "terms",
    path: "/admin/terms",
    labelKey: "admin.nav.terms",
    icon: "shield",
    capability: "settings:write",
  },
]);

/** Sections this session may see — possibly none. */
export function sectionsFor(role) {
  return ADMIN_SECTIONS.filter((section) => can(role, section.capability));
}

/** Which section, if any, owns this path (so the nav can mark it active). */
export function sectionForPath(pathname) {
  return ADMIN_SECTIONS.find(
    (section) => pathname === section.path || pathname.startsWith(`${section.path}/`),
  ) ?? null;
}
