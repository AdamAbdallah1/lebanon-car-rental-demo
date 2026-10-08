import { useState } from "react";
import { cn } from "../../lib/cn.js";

/**
 * Responsive image driven by a repository `mediaAsset`:
 * { src, srcSet: [{width,url}], width, height, alt:{en,ar} }.
 *
 * `alt` is localized and resolved by the caller (localized at read time).
 * Aspect ratio is enforced by the container so nothing shifts on load —
 * one ratio per grid, per the design direction.
 */
export function Picture({
  asset,
  alt,
  sizes = "100vw",
  ratio = "4 / 3",
  fit = "cover",
  priority = false,
  className,
  imgClassName,
  position = "center",
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!asset) return null;

  const srcSet = (asset.srcSet ?? [])
    .map((entry) => `${entry.url} ${entry.width}w`)
    .join(", ");

  return (
    <div
      className={cn("relative overflow-hidden bg-surface-sunken", className)}
      style={{ aspectRatio: ratio }}
    >
      {failed ? (
        <div
          className="absolute inset-0 flex items-center justify-center bg-surface-sunken"
          aria-hidden="true"
        >
          <span className="label-micro text-ink-faint">No image</span>
        </div>
      ) : (
        <img
          src={asset.src}
          srcSet={srcSet || undefined}
          sizes={srcSet ? sizes : undefined}
          alt={alt ?? ""}
          width={asset.width}
          height={asset.height}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          fetchPriority={priority ? "high" : "auto"}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            "h-full w-full transition-opacity duration-[480ms] ease-out",
            loaded ? "opacity-100" : "opacity-0",
            imgClassName,
          )}
          style={{ objectFit: fit, objectPosition: position }}
        />
      )}
    </div>
  );
}

export default Picture;
