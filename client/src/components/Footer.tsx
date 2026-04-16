import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div>
          <p className={styles.brand}>NIDENTITY</p>
          <p className={styles.tagline}>draft &amp; drop</p>
        </div>
        <div className={styles.rightCol}>
          <p className={styles.copyright}>© 2026 NIDENTITY. Все права защищены.</p>
        </div>
      </div>
    </footer>
  );
}
