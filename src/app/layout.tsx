import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Manju · AI Short Drama Generator",
  description:
    "AI short-drama / micro-film generator powered by Doubao (Volcengine Ark): script → storyboard → video prompts → keyframes → video. English overseas short-form dramas.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
