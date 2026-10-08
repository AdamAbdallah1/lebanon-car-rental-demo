import { Link } from "react-router-dom";

/**
 * Route-level failure boundary — reachable without a login, so it keeps the
 * same editorial system as the rest of the site instead of a browser default.
 */
export function RouteError() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-start justify-center gap-4 py-24">
      <p className="label-micro text-accent">Error</p>
      <h1 className="font-display text-display-2 text-ink" data-display-font>
        Something went wrong
      </h1>
      <p className="max-w-xl text-body text-ink-soft">
        This page could not be loaded. Go back to the fleet and try again.
      </p>
      <Link
        to="/fleet"
        className="inline-flex min-h-11 items-center rounded-md border border-ink px-5 font-mono text-body-sm text-ink transition-colors hover:bg-ink hover:text-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        The fleet
      </Link>
    </div>
  );
}

export default RouteError;
