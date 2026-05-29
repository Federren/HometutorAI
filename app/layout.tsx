import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HomeTutor AI",
  description: "WhatsApp Socratic tutoring bot",
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
