import { Outlet } from "react-router";
import { Header } from "../Header";
import { Footer } from "../Footer";
import { AuthorSidebar } from "../author/AuthorSidebar";
import styles from "./Layout.module.css";

export function AuthorLayout() {
  return (
    <div className={styles.wrapperAuthor}>
      <div className={styles.headerWrapCompact}>
        <Header />
      </div>
      <div className={styles.contentArea}>
        <AuthorSidebar />
        <main className={styles.mainWithSidebar}>
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
}
