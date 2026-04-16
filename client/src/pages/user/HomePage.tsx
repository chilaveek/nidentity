import { Link } from "react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "motion/react";
const img2 = "/images/tshirt.png";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import styles from "./HomePage.module.css";

function PrimaryButton({ children, to }: { children: React.ReactNode; to?: string }) {
  if (to) {
    return <Link to={to} className={styles.primaryBtn}>{children}</Link>;
  }
  return <button className={styles.primaryBtn}>{children}</button>;
}

function AnimatedAccentText({ text, as: Component = "span" }: { text: string; className?: string; as?: React.ElementType }) {
  const [key, setKey] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setKey((prev) => prev + 1), 5000);
    return () => clearInterval(interval);
  }, []);
  const characters = text.split("");
  const delays = useMemo(
    () => characters.map(() => ({ delay1: Math.random() * 2, delay2: Math.random() * 2 + 0.5, delayMain: Math.random() * 2 + 1 })),
    [text]
  );

  return (
    <Component className={styles.accentText} key={key}>
      <motion.span initial="hidden" animate="visible" variants={{ hidden: { opacity: 1 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }}>
        {characters.map((char, index) => {
          const charContent = char === " " ? "\u00A0" : char;
          const { delay1, delay2, delayMain } = delays[index];
          return (
            <motion.span key={index} className={styles.accentCharWrap} variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}>
              <motion.span
                className={styles.accentGhostCyan}
                animate={{ x: [0, -3, 3, -1, 0, 0], y: [0, 2, -2, 1, 0, 0], opacity: [0, 0.8, 0.5, 0.8, 0, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: delay1, times: [0, 0.05, 0.1, 0.15, 0.2, 1] }}
              >{charContent}</motion.span>
              <motion.span
                className={styles.accentGhostPink}
                animate={{ x: [0, 3, -3, 2, 0, 0], y: [0, -1, 2, -2, 0, 0], opacity: [0, 0.7, 0.9, 0.6, 0, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, repeatDelay: delay2, times: [0, 0.05, 0.1, 0.15, 0.2, 1] }}
              >{charContent}</motion.span>
              <motion.span
                className={styles.accentCharMain}
                animate={{ x: [0, -1, 2, -1, 0, 0], filter: ["blur(0px)", "blur(1px)", "blur(0px)", "blur(0.5px)", "blur(0px)", "blur(0px)"] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: delayMain, times: [0, 0.05, 0.1, 0.15, 0.2, 1] }}
              >{charContent}</motion.span>
            </motion.span>
          );
        })}
      </motion.span>
    </Component>
  );
}

function InteractiveCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animationFrameId: number;
    let width = 0, height = 0;
    const numStars = 600;
    const stars: { x: number; y: number; z: number }[] = [];
    const radius = 1000;
    let rotationX = 0, rotationY = 0;
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      width = rect.width; height = rect.height;
      canvas.width = width; canvas.height = height;
    };
    for (let i = 0; i < numStars; i++) {
      stars.push({ x: (Math.random() - 0.5) * radius * 2, y: (Math.random() - 0.5) * radius * 2, z: (Math.random() - 0.5) * radius * 2 });
    }
    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, width, height);
      const centerX = width / 2, centerY = height / 2, fov = 350;
      rotationY += 0.0015; rotationX += 0.0008;
      const cosY = Math.cos(rotationY), sinY = Math.sin(rotationY), cosX = Math.cos(rotationX), sinX = Math.sin(rotationX);
      ctx.fillStyle = "#000000";
      for (let i = 0; i < numStars; i++) {
        const star = stars[i];
        let x1 = star.x * cosY - star.z * sinY;
        let z1 = star.z * cosY + star.x * sinY;
        let y1 = star.y * cosX - z1 * sinX;
        let z2 = z1 * cosX + star.y * sinX;
        z2 += radius;
        if (z2 > 0) {
          const scale = fov / z2;
          const screenX = centerX + x1 * scale;
          const screenY = centerY + y1 * scale;
          const size = Math.max(0.5, scale * 2);
          if (screenX > 0 && screenX < width && screenY > 0 && screenY < height) {
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    }
    resize(); animate();
    window.addEventListener("resize", resize);
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(animationFrameId); };
  }, []);
  return <canvas ref={canvasRef} className={styles.canvas} />;
}

export function HomePage() {
  const [topProducts, setTopProducts] = useState<{ id: string; title: string; imageUrl: string; price: number; popularityScore: number; authorNickname: string }[]>([]);

  useEffect(() => {
    fetch("/api/market/products")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: any[]) => { if (Array.isArray(data)) setTopProducts(data.slice(0, 3)); })
      .catch(() => {});
  }, []);

  return (
    <div className={styles.wrapper}>
      <InteractiveCanvas />
      <section className={styles.heroSection}>
        <div className={styles.heroImageBox}>
          <img alt="T-shirt" className={styles.heroImage} src={img2} />
        </div>
        <div className={styles.heroContent}>
          <div>
            <p className={styles.heroTitle}>
              СОЗДАЙТЕ СВОЙ УНИКАЛЬНЫЙ ПРИНТ
            </p>
            <AnimatedAccentText as="p" text="за минуту" />
          </div>
          <PrimaryButton to="/create">Попробовать!</PrimaryButton>
        </div>
      </section>

      <section className={styles.productsSection}>
        <div className={styles.productsSectionHeader}>
          <span className={styles.sectionTitle}>НАХОДИ И ПОКУПАЙ </span>
          <AnimatedAccentText as="span" text="ЛУЧШЕЕ" />
        </div>

        {topProducts.length > 0 && (
          <div className={styles.productsGrid}>
            {topProducts.map((product, i) => (
              <Link key={product.id} to="/market" className={styles.productCard}>
                {i === 0 && (
                  <div className={styles.hitBadge}>
                    #1 хит
                  </div>
                )}
                <div className={styles.productImageBox}>
                  <ImageWithFallback src={product.imageUrl} alt={product.title} className={styles.productImage} />
                  {product.popularityScore > 0 && (
                    <span className={styles.salesBadge}>
                      {product.popularityScore} продаж
                    </span>
                  )}
                </div>
                <div className={styles.productInfo}>
                  <p className={styles.productTitle}>{product.title}</p>
                  <p className={styles.productAuthor}>by {product.authorNickname}</p>
                  <p className={styles.productPrice}>{product.price.toLocaleString("ru-RU")} ₽</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className={styles.ctaCenter}>
          <PrimaryButton to="/market">Пора в маркет!</PrimaryButton>
        </div>
      </section>
    </div>
  );
}
