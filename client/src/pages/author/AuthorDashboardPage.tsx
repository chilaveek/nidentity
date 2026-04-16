import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Image, DollarSign, Eye, ShieldCheck, Heart } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import styles from "./AuthorDashboardPage.module.css";

export function AuthorDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [designs, setDesigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("nid_token");
    if (!token) {
      setLoading(false);
      return;
    }
    fetch("/api/author/my-designs", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setDesigns(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const approved = designs.filter(d => d.status === "Published").length;
  const pending = designs.filter(d => d.status === "Moderation").length;
  const totalSalesCount = designs.reduce((sum, d) => sum + (d.popularityScore || 0), 0);
  const totalEarned = designs.reduce((sum, d) => sum + ((d.popularityScore || 0) * (d.finalPrice || 0) * 0.1), 0);

  const metrics = [
    { icon: Image, label: "Активных дизайнов", value: approved.toString(), bg: "#eef2ff", color: "#4f46e5" },
    { icon: DollarSign, label: "Заработано", value: `${totalEarned.toLocaleString("ru-RU")} ₽`, bg: "#f0fdf4", color: "#16a34a" },
    { icon: Heart, label: "Всего продаж", value: totalSalesCount.toString(), bg: "#fdf2f8", color: "#db2777" },
    { icon: ShieldCheck, label: "На модерации", value: pending.toString(), bg: "#fffbeb", color: "#d97706" }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Дашборд автора</h1>
          <p className={styles.subtitle}>
            Добро пожаловать в панель автора, <span className={styles.subtitleHighlight}>{user?.authorNickname || "Творец"}</span>
          </p>
        </div>
        <Link to="/create" className={styles.createBtn}>
          <Image size={16} /> Создать новый принт
        </Link>
      </div>

      <div className={styles.metricsGrid}>
        {metrics.map((m, i) => (
          <div key={i} className={styles.metricCard}>
            <div className={styles.metricIcon} style={{ background: m.bg }}>
              <m.icon size={24} color={m.color} />
            </div>
            <p className={styles.metricLabel}>{m.label}</p>
            <p className={styles.metricValue}>{m.value}</p>
          </div>
        ))}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Последние дизайны</h2>
          <Link to="/author/designs" className={styles.sectionLink}>Показать все →</Link>
        </div>
        
        {loading ? (
          <div className={styles.loading}>Загрузка...</div>
        ) : designs.length === 0 ? (
          <div className={styles.emptyState}>
            <Image size={40} color="#e5e7eb" />
            <p className={styles.emptyText}>У вас пока нет созданных дизайнов</p>
          </div>
        ) : (
          <div className={styles.designsGrid}>
            {designs.slice(0, 4).map((d) => (
              <div key={d.id} onClick={() => navigate("/author/designs")} className={styles.designCard}>
                <div className={styles.thumbBox}>
                  <img src={d.thumbnailUrl} alt={d.title} className={styles.thumbImg} />
                  <span className={`${styles.statusBadge} ${d.status === "Published" ? styles.statusApproved : d.status === "Moderation" ? styles.statusPending : styles.statusRejected}`}>
                    {d.status === "Published" ? "Одобрено" : d.status === "Moderation" ? "Модерация" : "Отклонено"}
                  </span>
                </div>
                <div className={styles.designInfo}>
                  <p className={styles.designTitle}>{d.title}</p>
                  <div className={styles.designStats}>
                    <p className={styles.designPrice}>{(d.finalPrice || 0).toLocaleString("ru-RU")} ₽</p>
                    <div className={styles.designViews}>
                      <Eye size={12} /> {d.popularityScore || 0}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
