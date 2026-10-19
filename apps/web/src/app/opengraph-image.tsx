import { ImageResponse } from "next/og";

// The social preview image for every page that does not set its own (WhatsApp, Instagram, X,
// Facebook, LinkedIn). Drawn at build time; no external fonts or images.
export const alt = "SAT Sharks: Digital SAT practice on real past papers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#324dc7", color: "white", padding: 72 }}>
        <div style={{ display: "flex", fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>SAT Sharks</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>Digital SAT practice on real past papers</div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 32, opacity: 0.9 }}>Bluebook-style adaptive tests · scores out of 1600 · your predicted score</div>
        </div>
        <div style={{ display: "flex", fontSize: 28, opacity: 0.85 }}>Free to start · Pakistan (PKR) and worldwide (USD)</div>
      </div>
    ),
    size,
  );
}
