import './globals.css';
import Nav from '@/components/Nav';

export const metadata = {
  title: 'Campus Canteen',
  description: 'Campus Canteen Management & Feedback System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  );
}
