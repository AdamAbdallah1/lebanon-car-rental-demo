import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { journeyHref } from "./journey.js";

/**
 * A `to` builder that keeps the rental journey intact.
 *
 *   const journeyLink = useJourneyLink();
 *   <Link to={journeyLink("/book?vehicle=x")}>
 *
 * Without this, `/vehicle/:id` and `/book` silently drop the pick-up point
 * and dates the customer already chose.
 */
export function useJourneyLink() {
  const [searchParams] = useSearchParams();
  return useCallback((target) => journeyHref(target, searchParams), [searchParams]);
}

export default useJourneyLink;
