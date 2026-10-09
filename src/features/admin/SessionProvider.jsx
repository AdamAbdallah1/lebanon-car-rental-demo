import { useCallback, useEffect, useMemo, useState } from "react";
import { repositories } from "../../lib/repositories/index.js";
import { SessionContext } from "./sessionContext.js";

/**
 * Staff session for the operations surface.
 *
 * There is no session of any kind without Firebase. The seed adapter serves a
 * demo storefront; it has no identity provider, so rather than inventing a
 * sign-in that authenticates nothing, `/admin` refuses to open and says why.
 *
 * The session itself is read from Auth custom claims (`admin` / `agent` /
 * `editor`). The client can display them; only `functions/scripts/set-role.mjs`
 * can create them.
 *
 *   status: "unavailable"     no Firebase configuration — admin is closed
 *           "loading"         subscription not settled yet
 *           "authenticated"   a session with an identity
 *           "anonymous"       Firebase says nobody is signed in
 *           "error"           the Auth SDK could not be reached
 */

const INITIAL = (available) => ({
  status: available ? "loading" : "unavailable",
  session: null,
  error: null,
});

export function SessionProvider({ children }) {
  const available = repositories.adapter === "firestore";
  const [state, setState] = useState(() => INITIAL(available));

  useEffect(() => {
    if (!available) return undefined;

    let cancelled = false;
    let unsubscribe = null;

    (async () => {
      const { observeAuth } = await import("../../lib/firebase/auth.js");
      unsubscribe = await observeAuth((session) => {
        if (cancelled) return;
        setState({
          status: session ? "authenticated" : "anonymous",
          session,
          error: null,
        });
      });
      if (cancelled) unsubscribe();
    })().catch((error) => {
      if (cancelled) return;
      setState({ status: "error", session: null, error });
    });

    return () => {
      cancelled = true;
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [available]);

  const signIn = useCallback(async (email, password) => {
    const { signIn: authenticate } = await import("../../lib/firebase/auth.js");
    const session = await authenticate(email, password);
    setState({ status: "authenticated", session, error: null });
    return session;
  }, []);

  const signOut = useCallback(async () => {
    const { signOutUser } = await import("../../lib/firebase/auth.js");
    await signOutUser();
    setState({ status: "anonymous", session: null, error: null });
  }, []);

  const value = useMemo(
    () => ({ ...state, signIn, signOut }),
    [state, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}


export default SessionProvider;
