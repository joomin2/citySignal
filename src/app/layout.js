import './globals.css';
import Providers from '@/components/Providers';

export const metadata = {
  title : "CitySignal",
  description : "내 주변의 위험 신호를 감지하고 공유하는 서비스",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CitySignal",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; height: 100%; }
        `}</style>
      </head>
      <body className="app-shell">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}