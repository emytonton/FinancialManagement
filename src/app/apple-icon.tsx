import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Ícone para "Adicionar à Tela de Início" no iPhone.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#f7f3f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 104, height: 112, background: "#8a2f5c", borderRadius: "14px 14px 52px 52px", display: "flex", justifyContent: "center", paddingTop: 30 }}>
          <div style={{ width: 58, height: 12, borderRadius: 6, background: "#ffffff" }} />
        </div>
      </div>
    ),
    size,
  );
}
