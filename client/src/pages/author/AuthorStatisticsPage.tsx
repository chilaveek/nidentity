import { useState, useEffect } from "react";
import { TrendingUp, DollarSign, Image as ImageIcon } from "lucide-react";
import styles from "./AuthorStatisticsPage.module.css";

const getMonthName = (monthIdx: number) => {
  const months = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
  return months[monthIdx];
};

export function AuthorStatisticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("nid_token");
    if (!token) {
      setLoading(false);
      return;
    }
    fetch("/api/author/stats-full", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const chartDataRaw = stats?.chartData || [];
  const displayChartData = chartDataRaw.slice(-7); // Показываем данные только за последние 7 дней

  const salesData = displayChartData.map((d: any) => {
    const dObj = new Date(d.date);
    return {
      name: `${dObj.getDate()} ${getMonthName(dObj.getMonth()).toLowerCase()}`,
      sales: d.revenue,
      items: d.itemsSold
    };
  });

  const weeklyRevenue = displayChartData.reduce((sum: number, d: any) => sum + d.revenue, 0);
  const weeklyItems = displayChartData.reduce((sum: number, d: any) => sum + d.itemsSold, 0);

  const metrics = [
    { label: "Заработано (за неделю)", value: `${weeklyRevenue.toLocaleString("ru-RU")} ₽`, increment: "", icon: DollarSign, color: "#10b981", bg: "#d1fae5" },
    { label: "Продано (за неделю)", value: weeklyItems.toString(), increment: "", icon: TrendingUp, color: "#3b82f6", bg: "#dbeafe" },
    { label: "Активных дизайнов", value: (stats?.activeDesignsCount || 0).toString(), increment: "", icon: ImageIcon, color: "#8b5cf6", bg: "#ede9fe" },
  ];

  const topDesigns = stats?.topDesigns || [];
  const maxSales = Math.max(...salesData.map((d: any) => d.sales), 1000);

  if (loading) return <div className={styles.container}>Загрузка статистики...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Статистика</h1>
          <p className={styles.subtitle}>Аналитика ваших продаж и доходов</p>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        {metrics.map((m, i) => (
          <div key={i} className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <div className={styles.metricIconWrap} style={{ background: m.bg }}>
                <m.icon size={24} color={m.color} />
              </div>
              {m.increment && <span className={styles.metricIncrement} style={{ color: m.color, background: `${m.color}15` }}>{m.increment}</span>}
            </div>
            <p className={styles.metricLabel}>{m.label}</p>
            <p className={styles.metricValue}>{m.value}</p>
          </div>
        ))}
      </div>

      <div className={styles.chartsLayout}>
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Динамика доходов</h2>
          <div className={styles.chartContainer}>
            {salesData.length === 0 ? (
              <div style={{ padding: "40px 0", color: "#9ca3af", textAlign: "center", width: "100%" }}>Нет данных для отображения</div>
            ) : (
              salesData.map((d: any, i: number) => {
                const heightPct = (d.sales / maxSales) * 100;
                return (
                  <div key={i} className={styles.chartCol}>
                    <div className={styles.chartBarWrap}>
                      <div className={styles.chartBar} style={{ height: `${heightPct}%` }}>
                        <div className={styles.chartTooltip}>
                          {d.sales.toLocaleString("ru-RU")} ₽
                        </div>
                      </div>
                    </div>
                    {/* Показываем подпись не для каждого столбца, если их 30, чтобы не было тесно */}
                    {(salesData.length <= 7 || i % 4 === 0 || i === salesData.length - 1) && (
                      <span className={styles.chartLabel} style={{ fontSize: 10, whiteSpace: "nowrap" }}>{d.name.split(" ")[0]} {d.name.split(" ")[1]}</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className={styles.topItemsCard}>
          <div className={styles.topItemsHeader}>
            <h2 className={styles.topItemsTitle}>Лучшие товары</h2>
          </div>
          <div className={styles.topItemsList}>
            {topDesigns.length === 0 ? (
              <div style={{ color: "#9ca3af", textAlign: "center", paddingTop: 20 }}>Пока нет продаж</div>
            ) : (
              topDesigns.map((d: any, i: number) => (
                <div key={i} className={styles.topItemRow}>
                  <div className={styles.topItemRank} style={{
                    background: i === 0 ? "#fef3c7" : i === 1 ? "#f1f5f9" : i === 2 ? "#fed7aa" : "#f8f9fb",
                    color: i === 0 ? "#d97706" : i === 1 ? "#64748b" : i === 2 ? "#c2410c" : "#9ca3af"
                  }}>
                    {i + 1}
                  </div>
                  <div className={styles.topItemInfo}>
                    <p className={styles.topItemTitle}>{d.title}</p>
                    <p className={styles.topItemSales}>{d.salesCount} продаж</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
