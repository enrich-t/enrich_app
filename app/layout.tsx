export const metadata = { title: "Enrich", description: "Enrich App" };
import "./globals.css";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>);
}
