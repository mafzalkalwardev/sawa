import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0e2a24",
          color: "#f3efe6",
          padding: 72,
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 6, color: "#c4a574" }}>SAWA</div>
        <div style={{ fontSize: 68, lineHeight: 1.05, maxWidth: 900 }}>
          A reserved seat on a licensed van. Not a private-car lift.
        </div>
        <div style={{ fontSize: 28 }}>Sharjah–Dubai · Ajman–Dubai · Dubai–Abu Dhabi</div>
      </div>
    ),
    size,
  );
}
