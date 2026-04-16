import { Outlet } from "react-router";
import { Header } from "../Header";
import { Footer } from "../Footer";
import { AdminSidebar } from "../admin/AdminSidebar";
import styles from "./Layout.module.css";

export function AdminLayout() {
  return (
    <div className={styles.wrapperAdmin}>
      <div className={styles.headerWrapCompact}>
        <Header />
      </div>
      <div className={styles.contentArea}>
        <AdminSidebar />
        <main className={styles.mainWithSidebar}>
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
}
