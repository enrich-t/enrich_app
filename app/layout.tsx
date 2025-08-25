import './globals.css';
import React from 'react';

export const metadata = {
  title: 'Enrich',
  description: 'Responsible operations dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
