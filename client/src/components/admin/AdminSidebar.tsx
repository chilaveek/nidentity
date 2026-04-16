import { Link, useLocation } from "react-router";
import { LayoutDashboard, ShieldCheck, MessageSquare } from "lucide-react";
import styles from "../Sidebar.module.css";

const menuItems = [
  { icon: LayoutDashboard, label: "Дашборд", path: "/admin" },
  { icon: ShieldCheck, label: "Модерация", path: "/admin/moderation" },
  { icon: MessageSquare, label: "Поддержка", path: "/admin/support" },
];

export function AdminSidebar() {
  const location = useLocation();

  return (
    <aside className={styles.aside}>
      {/* Admin badge */}
      <div className={styles.adminBadge}>
        <div className={styles.adminBadgeInner}>
          <ShieldCheck size={16} style={{ color: "#c4b5fd" }} />
          <span className={styles.adminBadgeText}>Администратор</span>
        </div>
      </div>

      {/* Menu Items */}
      <nav className={styles.nav}>
        {menuItems.map((item) => {
          const isActive =
            item.path === "/admin"
              ? location.pathname === "/admin"
              : location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={isActive ? styles.navLinkActivePurple : `${styles.navLink} ${styles.navLinkAdmin}`}
            >
              <item.icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
