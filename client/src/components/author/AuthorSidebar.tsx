import { Link, useLocation } from "react-router";
import { LayoutDashboard, Palette, BarChart3, PlusCircle } from "lucide-react";
import styles from "../Sidebar.module.css";

const menuItems = [
  { icon: LayoutDashboard, label: "Дашборд", path: "/author" },
  { icon: Palette, label: "Мои Дизайны", path: "/author/designs" },
  { icon: BarChart3, label: "Статистика Продаж", path: "/author/statistics" },
];

export function AuthorSidebar() {
  const location = useLocation();

  return (
    <aside className={styles.aside}>
      {/* Menu Items */}
      <nav className={styles.nav}>
        {menuItems.map((item) => {
          const isActive =
            item.path === "/author"
              ? location.pathname === "/author"
              : location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={isActive ? styles.navLinkActiveBlue : styles.navLink}
            >
              <item.icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Create New Design Button */}
      <div className={styles.createBtnWrap}>
        <Link to="/author/create" className={styles.createBtn}>
          <PlusCircle size={20} strokeWidth={2.5} />
          Создать дизайн
        </Link>
      </div>
    </aside>
  );
}
