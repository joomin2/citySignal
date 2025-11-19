// 루트 레이아웃 (App Router)
// 렌더링: SSR(기본 서버 컴포넌트). Providers(클라이언트)로 children 감싸기
import './globals.css';
import Providers from '@/components/Providers';
import SWRegister from '@/components/SWRegister.jsx';
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
  // Provide an initial data-theme that matches likely client result to reduce diff.
  // suppressHydrationWarning silences expected attribute changes after inline script runs.
  const initialTheme = 'light'; // could be made dynamic via cookie later
  return (
    <html lang="ko" data-theme={initialTheme} suppressHydrationWarning>
      <head>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; height: 100%; }
        `}</style>
        {/* 초기 페인트 전에 저장된 테마 적용 (FOUC 방지) */}
        <script dangerouslySetInnerHTML={{ __html: `try{var m=localStorage.getItem('theme-mode');if(m==='dark'||m==='light'){document.documentElement.setAttribute('data-theme',m);}else if(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.setAttribute('data-theme','dark');}}catch{}` }} />
      </head>
      <body className="app-shell">
        <Providers>
          <IntroSplash />
          <SWRegister />
          {children}
        </Providers>
      </body>
    </html>
  );
}