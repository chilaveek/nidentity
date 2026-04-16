import { Outlet } from "react-router";
import { Header } from "../Header";
import { Footer } from "../Footer";
import { CartSidebar } from "../CartSidebar";
import styles from "./Layout.module.css";

export function UserLayout() {
  return (
    <div className={styles.wrapperUser}>
      <div className={styles.headerWrap}>
        <Header />
      </div>
      <main className={styles.main}>
        <Outlet />
      </main>
      <Footer />
      <CartSidebar />
    </div>
  );
}
