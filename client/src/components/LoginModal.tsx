import { useState } from "react";
import { X, Mail, Lock, Eye, EyeOff, Loader } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";
import styles from "./LoginModal.module.css";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      let data;
      try { data = await res.json(); } catch { throw new Error("Сервер вернул некорректный ответ или недоступен."); }
      if (!res.ok) {
        if (data.error) throw new Error(data.error);
        if (data.errors) {
          const errorMsg = Object.values(data.errors).flat().join(", ");
          throw new Error(errorMsg);
        }
        throw new Error("Произошла ошибка");
      }
      login(
        data.token,
        {
          id: data.user.id,
          name: data.user.email || data.user.name || "",
          authorNickname: data.user.authorNickname,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          phone: data.user.phone,
          address: data.user.address,
        },
        data.user.role || "User"
      );
      onClose();
      navigate("/profile");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={styles.overlay}
        >
          <div className={styles.backdrop} onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className={styles.modal}
          >
            <div className={styles.accent} />

            <div className={styles.body}>
              <button onClick={onClose} className={styles.closeBtn}>
                <X size={18} style={{ color: "#888" }} />
              </button>

              <div className={styles.headerCenter}>
                <h2 className={styles.heading}>
                  {mode === "login" ? "Добро пожаловать в" : "Присоединяйтесь к"}
                </h2>
                <p className={styles.brandLine}>
                  <span className={styles.brandNi}>NI</span>
                  <span className={styles.brandDentity}>DENTITY</span>
                </p>
                <p className={styles.subtitle}>
                  {mode === "login" ? "Войдите в аккаунт, чтобы продолжить" : "Создайте новый аккаунт, чтобы начать"}
                </p>
              </div>

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.inputWrap}>
                  <div className={styles.inputIcon}><Mail size={18} /></div>
                  <input
                    type="email"
                    value={email}
                    required
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className={styles.input}
                  />
                </div>

                <div className={styles.inputWrap}>
                  <div className={styles.inputIcon}><Lock size={18} /></div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    required
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Пароль"
                    className={styles.input}
                    style={{ paddingRight: 48 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={styles.togglePwdBtn}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {error && <p className={styles.error}>{error}</p>}

                {mode === "login" && (
                  <div className={styles.forgotRow}>
                    <button type="button" className={styles.forgotBtn}>Забыли пароль?</button>
                  </div>
                )}

                <button type="submit" disabled={isLoading} className={styles.submitBtn}>
                  {isLoading && <Loader size={18} style={{ animation: "spin 1s linear infinite" }} />}
                  {mode === "login" ? "Войти" : "Создать аккаунт"}
                </button>
              </form>

              <div className={styles.divider}>
                <div className={styles.dividerLine} />
                <span className={styles.dividerText}>или</span>
                <div className={styles.dividerLine} />
              </div>

              <p className={styles.switchText}>
                {mode === "login" ? "Нет аккаунта?" : "Уже есть аккаунт?"}{" "}
                <button
                  type="button"
                  onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }}
                  className={styles.switchBtn}
                >
                  {mode === "login" ? "Создать аккаунт" : "Войти"}
                </button>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
