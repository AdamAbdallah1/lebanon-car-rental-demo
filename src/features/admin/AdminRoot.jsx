import { Navigate, Outlet, useLocation } from "react-router-dom";
import SessionProvider from "./SessionProvider.jsx";
import AdminShell from "./AdminShell.jsx";

function AdminRootInner() {
  const { pathname } = useLocation();

  // The sign-in page stands alone: no navigation, no guard to bounce off.
  if (pathname === "/admin/sign-in") return <Outlet />;
  // The queue is the front desk — there is no dashboard page to show instead.
  if (pathname === "/admin") return <Navigate to="/admin/bookings" replace />;

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
