import { X, ShoppingBag, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import styles from "./CartSidebar.module.css";

export function CartSidebar() {
  const { isCartOpen, setIsCartOpen, items, removeFromCart, cartTotal, checkout } = useCart();
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isCartOpen) return null;

  const handleCheckout = async () => {
    if (!user) {
      setResult({ success: false, message: "Войдите в аккаунт для оформления заказа." });
      return;
    }
    if (items.length === 0) {
      setResult({ success: false, message: "Корзина пуста." });
      return;
    }
    setIsChecking(true);
    setResult(null);
    const res = await checkout();
    setIsChecking(false);
    setResult(res);
    if (res.success) {
      setTimeout(() => {
        setResult(null);
        setIsCartOpen(false);
      }, 2500);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} onClick={() => setIsCartOpen(false)} />
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>
            <ShoppingBag size={24} /> Корзина
            {items.length > 0 && (
              <span className={styles.headerBadge}>{items.length}</span>
            )}
          </h2>
          <button onClick={() => setIsCartOpen(false)} className={styles.closeBtn}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.itemsList}>
          {items.map((item) => (
            <div key={item.id} className={styles.item}>
              <div className={styles.itemImgBox}>
                <img src={item.imageUrl} alt={item.title} className={styles.itemImg} />
              </div>
              <div className={styles.itemContent}>
                <h3 className={styles.itemTitle}>{item.title}</h3>
                <p className={styles.itemMeta}>Размер: {item.size} · ×{item.quantity}</p>
                <div className={styles.itemBottom}>
                  <p className={styles.itemPrice}>
                    {(item.price * item.quantity).toLocaleString("ru-RU")} ₽
                  </p>
                  <button onClick={() => removeFromCart(item.id)} className={styles.deleteBtn}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className={styles.emptyState}>
              <ShoppingBag size={48} style={{ opacity: 0.2 }} />
              <p className={styles.emptyText}>В корзине пока пусто</p>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          {result && (
            <div className={result.success ? styles.resultSuccess : styles.resultError}>
              {result.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {result.message}
            </div>
          )}
          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>Итого:</span>
            <span className={styles.totalValue}>{cartTotal.toLocaleString("ru-RU")} ₽</span>
          </div>
          <button
            onClick={handleCheckout}
            disabled={isChecking || items.length === 0}
            className={styles.checkoutBtn}
          >
            {isChecking ? "Оформляем..." : "Оформить заказ"}
          </button>
        </div>
      </div>
    </div>
  );
}
