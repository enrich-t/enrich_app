import './globals.css';
import type { Metadata } from 'next';
import Shell from '../components/Shell';

export const metadata: Metadata = {
  title: 'Enrich',
  description: 'Responsible operations dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        {/* Shell renders the global sidebar on all pages except /login */}
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
