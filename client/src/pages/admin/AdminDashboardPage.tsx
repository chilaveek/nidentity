import { useState, useEffect } from "react";
import { ShieldCheck, MessageSquare, Clock } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import styles from "./AdminDashboardPage.module.css";

export function AdminDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const adminName = user?.name?.split("@")[0] ?? "admin";

  const [pendingDesigns, setPendingDesigns] = useState<any[]>([]);
  const [allTickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("nid_token");
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch("/api/admin/moderation/designs", { headers }).then(r => r.json()),
      fetch("/api/admin/support/tickets", { headers }).then(r => r.json()),
    ])
      .then(([designsData, ticketsData]) => {
        setPendingDesigns(Array.isArray(designsData) ? designsData : []);
        setTickets(Array.isArray(ticketsData) ? ticketsData : []);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const openTickets = allTickets.filter(t => t.status === "Open");

  const metrics = [
    { icon: Clock, label: "Ожидают модерации", value: pendingDesigns.length.toString(), accent: "#f59e0b", bg: "#fffbeb", border: "4px solid #fbbf24" },
    { icon: MessageSquare, label: "Открытых тикетов", value: openTickets.length.toString(), accent: "#8b5cf6", bg: "#f5f3ff", border: "4px solid #a78bfa" },
  ];

  return (
    <div className={styles.container}>
      <div>
        <h1 className={styles.title}>Панель администратора</h1>
        <p className={styles.subtitle}>
          Привет, <span className={styles.subtitleAccent}>{adminName}</span>! Вот что требует внимания.
        </p>
      </div>

      {loading ? (
        <div className={styles.spinner}>
          <div className={styles.spinnerCircle} />
        </div>
      ) : (
        <>
          <div className={styles.metricsGrid}>
            {metrics.map((m, i) => (
              <div key={i} className={styles.metricCard} style={{ borderLeft: m.border }}>
                <div className={styles.metricIcon} style={{ background: m.bg }}>
                  <m.icon size={20} color={m.accent} />
                </div>
                <div>
                  <p className={styles.metricLabel}>{m.label}</p>
                  <p className={styles.metricValue}>{m.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.columnsGrid}>
            {/* Moderation Queue */}
            <div className={styles.column}>
              <div className={styles.columnHeader}>
                <h2 className={styles.columnTitle}>На модерации</h2>
                <Link to="/admin/moderation" className={styles.columnLink}>Все →</Link>
              </div>
              <div className={styles.columnBody}>
                {pendingDesigns.length === 0 ? (
                  <p className={styles.emptyText}>Нет дизайнов для модерации.</p>
                ) : (
                  pendingDesigns.slice(0, 5).map((d) => (
                    <div key={d.id} onClick={() => navigate('/admin/moderation')} className={styles.listItem}>
                      <div className={styles.thumbBox}>
                        {d.thumbnailUrl ? (
                          <img src={d.thumbnailUrl} alt={d.title} className={styles.thumbImg} />
                        ) : (
                          <ShieldCheck size={20} color="#d1d5db" />
                        )}
                      </div>
                      <div className={styles.itemInfo}>
                        <p className={styles.itemTitle}>{d.title}</p>
                        <p className={styles.itemMeta}>@{d.authorNickname} · {new Date(d.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Support Tickets */}
            <div className={styles.column}>
              <div className={styles.columnHeader}>
                <h2 className={styles.columnTitle}>Обращения</h2>
                <Link to="/admin/support" className={styles.columnLink}>Все →</Link>
              </div>
              <div className={styles.columnBody}>
                {allTickets.length === 0 ? (
                  <p className={styles.emptyText}>Нет открытых обращений.</p>
                ) : (
                  allTickets.slice(0, 5).map((t) => (
                    <div key={t.id} onClick={() => navigate('/admin/support')} className={styles.listItem}>
                      <div className={styles.avatar}>
                        <span className={styles.avatarText}>{(t.userName || "U")[0].toUpperCase()}</span>
                      </div>
                      <div className={styles.itemInfo}>
                        <p className={styles.itemTitle}>{t.subject}</p>
                        <p className={styles.itemMeta}>@{t.userName} · {new Date(t.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className={t.status === "Open" ? styles.statusOpen : styles.statusClosed}>
                        {t.status === "Open" ? "Открыт" : "Закрыт"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
