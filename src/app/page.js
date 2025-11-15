import BottomNav from "@/components/BottomNav";
import AuthButton from "@/components/AuthButton";
import CurrentLocation from "@/components/CurrentLocation";

export default function HomePage() {
  const alerts = [
    {
      id: 1,
      level: 4,
      title: "선문대 근처 수상한 봉고차 목격",
      location: "선문대학교 정문 근처",
      time: "5분 전",
      emoji: "🚐",
      bgColor: "bg-red-50",
      borderColor: "border-red-300",
      levelColor: "bg-red-500 text-white"
    },
    {
      id: 2,
      level: 2,
      title: "이상한 사람이 주변 어슬렁거림",
      location: "학생식당 뒤편",
      time: "10분 전",
      emoji: "⚠️",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-300",
      levelColor: "bg-orange-500 text-white"
    },
    {
      id: 3,
      level: 1,
      title: "가로등 불이 꺼짐",
      location: "중앙도서관 앞",
      time: "15분 전",
      emoji: "💡",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-300",
      levelColor: "bg-yellow-500 text-white"
    }
  ];

  return (
    <div className="page">
      <header className="header">
        <div className="header-bar">
          <div>
            <h1>CitySignal</h1>
            <p>내 주변의 위험 신호를 실시간으로 확인하세요</p>
          </div>
          <AuthButton />
        </div>
      </header>

      <main className="container">
        <CurrentLocation />

        <section className="section">
          <div className="section-title">
            <h2>🚨 최근 위험 제보</h2>
            <span className="count">3건</span>
          </div>

          {alerts.map((alert) => (
            <article key={alert.id} className={`card alert ${alert.borderColor}`}>
              <div className="alert-header">
                <span className={`level ${alert.levelColor}`}>위험도 {alert.level}단계</span>
                <span className="emoji">{alert.emoji}</span>
              </div>
              <h3 className="title">{alert.title}</h3>
              <p className="meta">{alert.location}</p>
              <p className="time">⏱️ {alert.time}</p>
            </article>
          ))}
        </section>

        <div className="actions">
          <button className="btn primary">📋 모든 제보</button>
          <button className="btn danger">➕ 신고하기</button>
        </div>

        <section className="card tip">
          <p><strong>💡 팁:</strong> 앱을 홈 화면에 추가하면 더 빠르게 접속할 수 있습니다!</p>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}