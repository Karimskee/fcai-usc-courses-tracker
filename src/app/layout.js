import './globals.css';
import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  title: 'FCAI Course Tracker',
  description: 'Track your FCAI course progress interactively.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
