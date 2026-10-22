import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HomeTutor AI — Personal AI Tutor on WhatsApp",
  description: "A personal AI tutor for your child, available 24/7 on WhatsApp. Guides students to think, not just memorise.",
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
