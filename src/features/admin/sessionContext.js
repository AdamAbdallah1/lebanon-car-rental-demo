import { createContext, useContext } from "react";

/**
 * The staff session context.
 *
 * Split from `SessionProvider.jsx` so that file exports one component and
 * stays hot-reloadable; the hook itself lives here, where every consumer
 * already points.
 */
export const SessionContext = createContext(null);

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside <SessionProvider>");
  return context;
}

export default useSession;
