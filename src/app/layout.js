// 루트 레이아웃 (App Router)
// 렌더링: SSR(기본 서버 컴포넌트). Providers(클라이언트)로 children 감싸기
import './globals.css';
import Providers from '@/components/Providers';
import IntroSplash from '@/components/IntroSplash.jsx';

export const metadata = {
  title : "CitySignal",
  description : "내 주변의 위험 신호를 감지하고 공유하는 서비스",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CitySignal",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
          <IntroSplash />
          {children}
        </Providers>
      </body>
    </html>
  );
}