import { cn } from "../../lib/cn.js";

/**
 * Inline SVG icon set — no icon dependency, 1.5px stroke, inherits colour.
 * Icons are decorative by default (`aria-hidden`); give the wrapper an
 * accessible label when an icon carries meaning on its own.
 */
const PATHS = {
  chevronDown: "M4 6.5 8 10.5l4-4",
  chevronRight: "M6.5 4 10.5 8l-4 4",
  chevronLeft: "M9.5 4 5.5 8l4 4",
  arrowRight: "M3 8h10M9.5 4.5 13 8l-3.5 3.5",
  arrowLeft: "M13 8H3M6.5 4.5 3 8l3.5 3.5",
  arrowUp: "M8 13V3M4.5 6.5 8 3l3.5 3.5",
  menu: "M2.5 4.5h11M2.5 8h11M2.5 11.5h11",
  close: "M4 4l8 8M12 4l-8 8",
  search: "M7.25 12.5a5.25 5.25 0 1 0 0-10.5 5.25 5.25 0 0 0 0 10.5ZM11.2 11.2 14 14",
  calendar:
    "M3 5.5h10v8H3v-8ZM3 8.5h10M5.5 3.5v3M10.5 3.5v3",
  pin: "M8 14s4.5-4.2 4.5-7.5a4.5 4.5 0 1 0-9 0C3.5 9.8 8 14 8 14ZM8 8.4a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8Z",
  check: "M3.5 8.5 6.5 11.5 12.5 4.5",
  plus: "M8 3.5v9M3.5 8h9",
  minus: "M3.5 8h9",
  whatsapp:
    "M8 2.6a5.4 5.4 0 0 0-4.6 8.2L2.6 13.4l2.7-.8A5.4 5.4 0 1 0 8 2.6Zm0 9.4a4 4 0 0 1-2-.5l-.2-.1-1.5.4.4-1.4-.1-.2A4 4 0 1 1 8 12Zm-1.7-2.6c0-.4.2-.7.4-.9l.5-.4c.1-.1.3-.1.4 0l.6.7c.1.1.1.3 0 .4l-.3.3c-.1.1-.1.3 0 .4.3.5.8 1 1.3 1.2.1.1.3.1.4 0l.3-.4c.1-.1.3-.1.4 0l.7.6c.1.1.1.3 0 .4l-.3.5c-.2.3-.5.5-.9.5-.9 0-2.5-1.5-2.6-2.8l.5-.5Z",
  phone:
    "M5.2 3.2 6.6 3l1.1 2.5-.9.9c.5 1 1.3 1.8 2.3 2.3l.9-.9 2.5 1.1-.2 1.4c-.1.6-.7 1-1.3 1A8.6 8.6 0 0 1 3.4 4.5c0-.6.4-1.2 1-1.3Z",
  mail: "M2.5 4.5h11v7h-11v-7Zm0 .5 5.5 4 5.5-4",
  external: "M9 3.5h3.5V7M12.5 3.5 7.5 8.5M11.5 9.5v3h-8v-8h3",
  luggage:
    "M5.5 5.5h5v7h-5v-7ZM6.8 5.5V3.6h2.4v1.9M4 12.5h8M6.2 8v2.5M9.8 8v2.5",
  seats:
    "M5 3.5h3.2c.6 0 1.1.4 1.2 1l.6 3.2M4.5 7.5h5.2c.8 0 1.4.7 1.3 1.5l-.3 2.5c-.1.7-.7 1.2-1.4 1.2H5.2c-.7 0-1.3-.5-1.4-1.2L3.4 8.8c-.1-.7.4-1.3 1.1-1.3ZM5 7.5v4.7",
  fuel: "M4 13.5V3.8c0-.7.6-1.3 1.3-1.3h2.9c.7 0 1.3.6 1.3 1.3v9.7M3 13.5h7.7M4.7 6.5h4.1M10 6.5h1.6c.6 0 1 .5 1 1v3.6c0 .6-.4 1-1 1s-1-.4-1-1",
  gear:
    "M6.2 3.2 9.8 6.4M4 5.5l1.6 5.8 1.6.9M12 5.5l-1.6 5.8-1.6.9M4 10.5h2.6M9.4 10.5H12M4 8.5h2.6M9.4 8.5H12M4 8.5h8",
  door: "M4.5 13V4.2L11 3v10H4.5Zm5-6.3.1.1M3 13h10",
  clock: "M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12ZM8 4.8V8l2.2 1.4",
  alert: "M8 5.5v3.2M8 11h.01M7 2.8 2.4 11.4c-.3.5 0 1.1.6 1.1h10c.6 0 .9-.6.6-1.1L9 2.8c-.3-.5-.8-.5-1 0Z",
  info: "M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12ZM8 7.5v3.2M8 5.4h.01",
  plane: "M2.5 9.2 13.5 6M2.5 6.8 13.5 10M6 8l.7-3.4L8 4.4V11l-1.3-.2L6 7.4",
  building:
    "M3 13.5V3.5h6v10M9 7h4v6.5M4.6 5.6h1.3M4.6 8.1h1.3M4.6 10.6h1.3M10.4 9.1h1.3M10.4 11.3h1.3",
  home: "M2.8 7.4 8 3l5.2 4.4V13a.5.5 0 0 1-.5.5H3.3a.5.5 0 0 1-.5-.5V7.4ZM6.3 13.5V9.2h3.4v4.3",
  wrench:
    "M10.4 2.9a3.4 3.4 0 0 0-3.8 4.5L3 11v2h2l3.6-3.6a3.4 3.4 0 0 0 4.5-3.8L11 7.7 9.4 6.1l1-3.2Z",
  key: "M10.6 5.4a2.6 2.6 0 1 1-3.7 3.7L3 13v1.5h1.5V13H6v-1.5H4.5M10.6 5.4 13 3M11.7 6.5 9.9 8.3",
  route: "M4.5 13.5a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6ZM11.5 6.1a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6ZM4.5 11.7c0-3 7-1.4 7-4.4",
  shield: "M8 2.5 3.5 4.2v3.5c0 2.7 1.9 5 4.5 5.8 2.6-.8 4.5-3.1 4.5-5.8V4.2L8 2.5ZM6.2 8 7.5 9.3l2.4-2.6",
  star: "M8 2.8 9.6 6l3.6.5-2.6 2.5.6 3.6L8 10.9 4.8 12.6l.6-3.6L2.8 6.5 6.4 6 8 2.8Z",
  globe: "M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12ZM2.6 8h10.8M8 2c1.6 1.7 2.4 3.7 2.4 6S9.6 12.3 8 14C6.4 12.3 5.6 10.3 5.6 8S6.4 3.7 8 2Z",
  quote: "M6.5 5.5C5 6.3 4 7.7 4 9.4V11h3V8H5.6c.1-1 .6-1.8 1.4-2.3L6.5 5.5Zm5 0c-1.5.8-2.5 2.2-2.5 3.9V11h3V8h-1.4c.1-1 .6-1.8 1.4-2.3L11.5 5.5Z",
};

export function Icon({ name, size = 16, className, strokeWidth = 1.5, title }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
      aria-hidden={title ? undefined : "true"}
      role={title ? "img" : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <path d={d} />
    </svg>
  );
}

export default Icon;
