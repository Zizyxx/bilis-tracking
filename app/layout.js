import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata = {
  title: "Bilis Tracking UIN Jakarta",
  description: "MVP live tracking bus listrik kampus untuk mahasiswa, sopir, dan admin."
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
