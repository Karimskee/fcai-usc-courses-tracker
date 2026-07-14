import './globals.css';

export const metadata = {
  title: 'FCAI Course Tracker',
  description: 'Track your FCAI course progress interactively.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
