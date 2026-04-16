import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { Package, User, Mail, Phone, Edit3, Save, X, LogOut, Shield, MapPin, Clock, ChevronDown, ChevronUp } from "lucide-react";
import styles from "./ProfilePage.module.css";

export function ProfilePage() {
  const { user, role, logout, token, init, refreshToken } = useAuth();
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({ firstName: user?.firstName || "", lastName: user?.lastName || "", phone: user?.phone || "", address: user?.address || "" });

  useEffect(() => { if (user) setProfileData({ firstName: user.firstName || "", lastName: user.lastName || "", phone: user.phone || "", address: user.address || "" }); }, [user]);
  useEffect(() => { init(); }, [init]);
  useEffect(() => {
    if (!token) return;
    fetch("/api/auth/orders", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { if (Array.isArray(data)) setOrders(data); })
      .catch(() => {});
  }, [token]);

  if (!user) return <div className={styles.loading}>Загрузка...</div>;

  const handleSaveProfile = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/auth/profile", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(profileData) });
      if (!res.ok) throw new Error("Ошибка при сохранении");
      await init();
      setIsEditing(false);
    } catch { alert("Не удалось сохранить профиль"); }
  };

  const handleBecomeAuthor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) { setError("Укажите свой никнейм"); return; }
    setIsSubmitting(true); setError("");
    try {
      const response = await fetch("/api/author/become", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ nickname }) });
      let data: any = {}; try { data = await response.json(); } catch {}
      if (!response.ok) throw new Error(data.error || `Ошибка сервера: ${response.status}`);
      await refreshToken(); window.location.reload();
    } catch (err: any) { setError(err.message || "Ошибка соединения с сервером"); } finally { setIsSubmitting(false); }
  };

  const handleRoleAction = async (url: string) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      let data: any = {}; try { data = await response.json(); } catch {}
      if (!response.ok) throw new Error(data.error || `Ошибка сервера: ${response.status}`);
      await refreshToken(); window.location.reload();
    } catch (err: any) { alert(err.message || "Ошибка"); } finally { setIsSubmitting(false); }
  };

  const roleLabel = role === "User" ? "Пользователь" : role === "Author" ? "Автор" : role === "Admin" ? "Администратор" : role;

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <h1 className={styles.pageTitle}>Мой кабинет</h1>
        <button onClick={logout} className={styles.logoutBtn}>
          <LogOut size={16} /> Выйти
        </button>
      </div>

      {/* Profile Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <div className={styles.avatar}>
              {profileData.firstName ? profileData.firstName[0].toUpperCase() : user.name[0].toUpperCase()}
            </div>
            <div>
              <h2 className={styles.cardTitle}>Общая информация</h2>
              <p className={styles.cardSubtitle}>{roleLabel}</p>
            </div>
          </div>
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className={styles.btnBlue}>
              <Edit3 size={16} /> Редактировать
            </button>
          ) : (
            <div className={styles.editBtns}>
              <button onClick={() => setIsEditing(false)} className={styles.btnCancel}>
                <X size={16} /> Отмена
              </button>
              <button onClick={handleSaveProfile} className={styles.btnSave}>
                <Save size={16} /> Сохранить
              </button>
            </div>
          )}
        </div>
        <div className={styles.fieldsGrid}>
          {[
            { label: "Имя", icon: <User size={14} />, key: "firstName" as const, ph: "Имя" },
            { label: "Фамилия", icon: <User size={14} />, key: "lastName" as const, ph: "Фамилия" },
            { label: "Телефон", icon: <Phone size={14} />, key: "phone" as const, ph: "+7 (___) ___-__-__" },
          ].map((f) => (
            <div key={f.key} className={styles.fieldGroup}>
              <label className={styles.label}>{f.icon} {f.label}</label>
              {isEditing ? (
                <input value={profileData[f.key]} onChange={(e) => setProfileData((p) => ({ ...p, [f.key]: e.target.value }))} placeholder={f.ph} className={styles.editInput} />
              ) : (
                <p className={styles.fieldValue}>{profileData[f.key] || "Не указано"}</p>
              )}
            </div>
          ))}
          <div className={styles.fieldGroup}>
            <label className={styles.label}><Mail size={14} /> Email</label>
            <p className={styles.fieldValueDisabled}>{user.name}</p>
          </div>
          <div className={styles.fieldGroupFull}>
            <label className={styles.label}><MapPin size={14} /> Адрес доставки</label>
            {isEditing ? (
              <textarea value={profileData.address} onChange={(e) => setProfileData((p) => ({ ...p, address: e.target.value }))} placeholder="Город, Улица, Дом, Квартира, Индекс"
                className={styles.editTextarea}
              />
            ) : (
              <p className={styles.fieldValueMinHeight}>{profileData.address || "Не указан"}</p>
            )}
          </div>
        </div>
      </div>

      {/* Orders Card */}
      <div className={styles.card}>
        <div className={styles.ordersHeader}>
          <div className={styles.ordersIconBox}>
            <Package size={20} style={{ color: "#1890ff" }} />
          </div>
          <h2 className={styles.ordersTitle}>Мои заказы</h2>
          {orders.length > 0 && <span className={styles.ordersBadge}>{orders.length}</span>}
        </div>
        {orders.length === 0 ? (
          <div className={styles.emptyOrders}>
            <Package size={32} style={{ color: "#d1d5db", marginBottom: 12 }} />
            <p className={styles.emptyOrdersTitle}>У вас пока нет заказов</p>
            <p className={styles.emptyOrdersText}>Ваши будущие покупки будут отображаться здесь.</p>
            <Link to="/market" className={styles.emptyOrdersBtn}>Перейти в маркет</Link>
          </div>
        ) : (
          <div className={styles.ordersList}>
            {orders.map((order: any) => {
              const isExpanded = expandedOrder === order.id;
              const statusMap: Record<string, { label: string; bg: string; color: string }> = {
                Printing: { label: "Печать", bg: "#fef3c7", color: "#b45309" },
                Shipped: { label: "Отправлен", bg: "#dbeafe", color: "#1d4ed8" },
                Delivered: { label: "Доставлен", bg: "#d1fae5", color: "#047857" },
                Cancelled: { label: "Отменён", bg: "#fee2e2", color: "#dc2626" },
              };
              const st = statusMap[order.status] || { label: order.status, bg: "#f3f4f6", color: "#4b5563" };
              return (
                <div key={order.id} className={styles.orderItem}>
                  <button onClick={() => setExpandedOrder(isExpanded ? null : order.id)} className={styles.orderToggle}>
                    <div className={styles.orderToggleLeft}>
                      <div className={styles.orderDate}>
                        <Clock size={13} />
                        {new Date(order.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                      <span className={styles.orderStatusBadge} style={{ background: st.bg, color: st.color }}>{st.label}</span>
                    </div>
                    <div className={styles.orderToggleRight}>
                      <span className={styles.orderTotal}>{Number(order.totalAmount).toLocaleString("ru-RU")} ₽</span>
                      {isExpanded ? <ChevronUp size={16} style={{ color: "#9ca3af" }} /> : <ChevronDown size={16} style={{ color: "#9ca3af" }} />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className={styles.orderDetail}>
                      {order.items?.map((item: any) => (
                        <div key={item.id} className={styles.orderDetailItem}>
                          <div className={styles.orderDetailThumb}>
                            <img src={item.imageUrl} alt={item.title} className={styles.orderDetailThumbImg} />
                          </div>
                          <div className={styles.orderDetailInfo}>
                            <p className={styles.orderDetailTitle}>{item.title}</p>
                            <p className={styles.orderDetailMeta}>Размер: {item.size} · ×{item.quantity}</p>
                          </div>
                          <p className={styles.orderDetailPrice}>{(Number(item.price) * item.quantity).toLocaleString("ru-RU")} ₽</p>
                        </div>
                      ))}
                      {order.address && (
                        <div className={styles.orderAddress}>
                          <MapPin size={12} /> {order.address}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Admin Panel Card */}
      {role === "Admin" && (
        <Link to="/admin" className={styles.panelCardAdmin}>
          <div className={styles.panelGlowAdmin} />
          <div className={styles.panelContent}>
            <div>
              <div className={styles.panelBadgeRow}>
                <span className={styles.panelBadgeIcon}>⚡</span>
                <span className={styles.panelBadgeLabel}>Привилегированный доступ</span>
              </div>
              <h2 className={styles.panelTitle}>Панель Администратора</h2>
              <p className={styles.panelDesc}>Управление пользователями, контентом и настройками</p>
            </div>
            <div className={styles.panelIconBox}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
            </div>
          </div>
        </Link>
      )}

      {/* Author Panel Card */}
      {role === "Author" && (
        <Link to="/author" className={styles.panelCardAuthor}>
          <div className={styles.panelGlowAuthor} />
          <div className={styles.panelContent}>
            <div>
              <div className={styles.panelBadgeRow}>
                <span className={styles.panelBadgeIcon}>✦</span>
                <span className={styles.panelBadgeLabel}>Творческий доступ</span>
              </div>
              <h2 className={styles.panelTitle}>Панель Автора</h2>
              <p className={styles.panelDesc}>Управляйте дизайнами, заказами и статистикой</p>
            </div>
            <div className={styles.panelIconBox}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
            </div>
          </div>
        </Link>
      )}

      {/* Role actions */}
      {role === "Author" && (
        <div className={styles.roleActions}>
          <button onClick={() => handleRoleAction("/api/auth/resign-author")} disabled={isSubmitting} className={styles.btnDanger}>
            {isSubmitting ? "Обработка..." : "БОЛЬШЕ НЕ ХОЧУ БЫТЬ АВТОРОМ"}
          </button>
        </div>
      )}

      {role === "Admin" && (
        <button onClick={() => handleRoleAction("/api/auth/resign-admin")} disabled={isSubmitting} className={styles.btnDanger}>
          {isSubmitting ? "Обработка..." : "БОЛЬШЕ НЕ ХОЧУ БЫТЬ АДМИНИСТРАТОРОМ"}
        </button>
      )}

      {role === "User" && (
          <div className={styles.becomeAuthorCard}>
            <h2 className={styles.becomeAuthorTitle}>Станьте автором!</h2>
            <p className={styles.becomeAuthorDesc}>Откройте для себя новые возможности заработка. Начните создавать уникальный мерч и получайте прибыль с каждой покупки.</p>
            <form onSubmit={handleBecomeAuthor} className={styles.becomeAuthorForm}>
              <div>
                <label htmlFor="nickname" className={styles.becomeAuthorLabel}>Желаемый никнейм автора</label>
                <input id="nickname" type="text" placeholder="Придумайте крутой никнейм..." value={nickname} onChange={(e) => setNickname(e.target.value)} disabled={isSubmitting}
                  className={styles.becomeAuthorInput}
                />
              </div>
              {error && <p className={styles.errorText}>{error}</p>}
              <button type="submit" disabled={isSubmitting} className={styles.becomeAuthorSubmit}>
                {isSubmitting ? "Отправка заявки..." : "ХОЧУ СТАТЬ АВТОРОМ"}
              </button>
            </form>
          </div>
      )}
    </div>
  );
}
