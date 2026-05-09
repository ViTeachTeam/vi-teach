import './global.css';

export const metadata = {
  title: 'ViTeach | Lumi AI',
  description: 'AI classroom analysis assistant for Vietnamese teachers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
