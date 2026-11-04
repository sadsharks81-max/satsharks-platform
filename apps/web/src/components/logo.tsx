export const LOGO_SRC = "/brand/lue-sat-logo.png";
export const LOGO_SIZE = { width: 1474, height: 436 };

export function Logo({ className }: { className?: string }) {
  return (
    // The client-supplied LUE SAT artwork is intentionally kept as one image so its split black/
    // white panels, acorn mark and lettering stay identical everywhere it appears.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO_SRC}
      alt="LUE SAT"
      width={LOGO_SIZE.width}
      height={LOGO_SIZE.height}
      className={`block ${className ?? ""}`}
    />
  );
}
