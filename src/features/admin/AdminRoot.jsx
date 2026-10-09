import { Navigate, Outlet, useLocation } from "react-router-dom";
import SessionProvider from "./SessionProvider.jsx";
import AdminShell from "./AdminShell.jsx";
import { sectionsFor } from "./capabilities.js";
import { useSession } from "./sessionContext.js";

function AdminRootInner() {
  const { pathname } = useLocation();
  // The role is a fact about the *session*, not a second value: the token
  // claim as it was when this session was minted.
  const { session } = useSession();
  const role = session?.role ?? null;

  // The sign-in page stands alone: no navigation, no guard to bounce off.
  if (pathname === "/admin/sign-in") return <Outlet />;

  // The first section this role may open is its front desk. An editor's front
  // desk is the fleet; an agent's is the queue — never a page the guard will
  // immediately refuse.
  if (pathname === "/admin") {
    const home = sectionsFor(role)[0]?.path ?? "/admin/bookings";
    return <Navigate to={home} replace />;
  }

  // Everything else opens inside the shell, which is where the guard lives.
  return <AdminShell />;
}

/**
 * Root of the `/admin` tree — one Auth subscription for the whole surface,
 * two presentations (bare sign-in, or the shell around a work queue).
 */
export function AdminRoot() {
  return (
    <SessionProvider>
      <AdminRootInner />
    </SessionProvider>
  );
}

export default AdminRoot;
