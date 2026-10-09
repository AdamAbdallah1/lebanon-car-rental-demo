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
  admin: ["bookings:read", "bookings:decide", "content:write", "settings:write"],
  agent: ["bookings:read", "bookings:decide"],
  editor: ["content:write"],
});

export function can(role, capability) {
  return (GRANTS[role] ?? []).includes(capability);
}

/**
 * Navigation entries. Stage 2 ships the booking queue; fleet and content
 * appear in later stages once their routes are real.
 */
export const ADMIN_SECTIONS = Object.freeze([
  {
    id: "bookings",
    path: "/admin/bookings",
    labelKey: "admin.nav.bookings",
    icon: "calendar",
    capability: "bookings:read",
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
