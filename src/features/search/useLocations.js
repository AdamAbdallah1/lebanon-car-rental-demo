import { repositories } from "../../lib/repositories/index.js";
import { useAsyncData } from "../../hooks/useAsyncData.js";

/** Locations + their group order, straight from the repository. */
export function useLocations() {
  return useAsyncData(
    () =>
      Promise.all([
        repositories.queryLocations(),
        repositories.getLocationGroups(),
      ]).then(([locations, groups]) => ({ locations, groups })),
    [],
  );
}
