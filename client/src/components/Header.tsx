import { Link, useLocation } from "react-router";
import { User, ShoppingCart, LogIn, LogOut } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useState } from "react";
import { LoginModal } from "./LoginModal";
import { useAuth } from "../context/AuthContext";
import styles from "./Header.module.css";

const navItems = [
  { label: "Главная", path: "/" },
  { label: "Маркет", path: "/market" },
  { label: "Создать мерч", path: "/create" },
  { label: "Поддержка", path: "/support" },
];

export function Header() {
  const location = useLocation();
  const cart = useCart();
  const { setIsCartOpen, items } = cart;
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const { user, logout } = useAuth();

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.bar}>
          {/* Logo */}
          <Link to="/" className={styles.logoLink}>
            <img src="/images/logo.png" alt="NIDENTITY Logo" className={styles.logoImg} />
            <div className={styles.logoTextWrap}>
              <p className={styles.logoText}>
                <span className={styles.logoNi}>NI</span>
                <span className={styles.logoDentity}>DENTITY</span>
              </p>
              <p className={styles.logoSub}>draft &amp; drop</p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className={styles.nav}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={isActive ? styles.navLinkActive : styles.navLink}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className={styles.actions}>
            {/* Cart */}
            <button onClick={() => setIsCartOpen(true)} className={styles.iconBtn}>
              <ShoppingCart size={18} />
              {totalItems > 0 && (
                <span className={styles.cartBadge}>{totalItems}</span>
              )}
            </button>

            {user ? (
              <>
                {/* Profile */}
                <Link
                  to="/profile"
                  className={location.pathname === "/profile" ? styles.profileLinkActive : styles.profileLink}
                >
                  <User size={18} />
                  {user?.authorNickname || (user?.name ? user.name.split("@")[0] : "Профиль")}
                </Link>
                <button onClick={logout} title="Выйти" className={styles.logoutBtn}>
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <button onClick={() => setIsLoginOpen(true)} className={styles.loginBtn}>
                <LogIn size={18} />
                Войти
              </button>
            )}
          </div>
        </div>
      </header>
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
}
