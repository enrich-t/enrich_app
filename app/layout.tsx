import './globals.css';
import React from 'react';
import Shell from '../components/Shell';
import { ToastProvider } from '../components/Toast';

export const metadata = {
  title: 'Enrich',
  description: 'Responsible operations dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <Shell>{children}</Shell>
        </ToastProvider>
      </body>
    </html>
  );
}
