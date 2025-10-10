// Root layout for the Next.js application
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '1&1 Assistant Evaluation Platform',
  description: 'Evaluation platform for the 1&1 customer service chatbot',
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
