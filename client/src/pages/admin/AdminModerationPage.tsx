import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Eye } from "lucide-react";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import { formatDate } from "../../utils/formatters";
import styles from "./AdminModerationPage.module.css";

interface Design {
  id: string;
  title: string;
  authorNickname: string;
  thumbnailUrl: string;
  backThumbnailUrl?: string;
  tags: string;
  createdAt: string;
}

export function AdminModerationPage() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [preview, setPreview] = useState<Design | null>(null);
  const [previewSide, setPreviewSide] = useState<"front" | "back">("front");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("nid_token");

  const fetchDesigns = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/moderation/designs", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setDesigns(await res.json());
    } catch (err) { console.error("Failed to fetch designs:", err); }
    setLoading(false);
  };

  useEffect(() => { fetchDesigns(); }, []);

  const openPreview = (d: Design) => {
    setPreview(d);
    setPreviewSide("front");
  };

  const approve = async (id: string) => {
    try {
      await fetch(`/api/admin/moderation/designs/${id}/approve`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      setDesigns(prev => prev.filter(d => d.id !== id));
      setPreview(null);
    } catch (err) { console.error("Failed to approve:", err); }
  };

  const reject = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    try {
      await fetch(`/api/admin/moderation/designs/${rejectId}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason })
      });
      setDesigns(prev => prev.filter(d => d.id !== rejectId));
      setRejectId(null);
      setRejectReason("");
      setPreview(null);
    } catch (err) { console.error("Failed to reject:", err); }
  };

  return (
    <div className={styles.container}>
      <div>
        <h1 className={styles.title}>Модерация дизайнов</h1>
        <p className={styles.subtitle}>
          Ожидают проверки: <span className={styles.subtitleAccent}>{designs.length}</span>
        </p>
      </div>

      {loading ? (
        <div className={styles.loadingBox}>
          <p className={styles.loadingText}>Загрузка...</p>
        </div>
      ) : designs.length > 0 ? (
        <div className={styles.listCard}>
          <div className={styles.listHeader}>
            <h2 className={styles.listTitle}>На рассмотрении</h2>
          </div>
          <div className={styles.listBody}>
            {designs.map((d) => (
              <div key={d.id} className={styles.row}>
                <ImageWithFallback src={d.thumbnailUrl} alt={d.title} style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
                <div className={styles.rowInfo}>
                  <p className={styles.rowTitle}>{d.title}</p>
                  <p className={styles.rowMeta}>@{d.authorNickname} · {formatDate(d.createdAt)}</p>
                </div>
                <div className={styles.rowActions}>
                  <button onClick={() => openPreview(d)} className={styles.btnPreview}>
                    <Eye size={14} /> Просмотр
                  </button>
                  <button onClick={() => approve(d.id)} className={styles.btnApprove}>
                    <CheckCircle2 size={14} /> Одобрить
                  </button>
                  <button onClick={() => { setRejectId(d.id); setRejectReason(""); }} className={styles.btnReject}>
                    <XCircle size={14} /> Отклонить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <CheckCircle2 size={48} color="#6ee7b7" />
          <p className={styles.emptyTitle}>Всё проверено!</p>
          <p className={styles.emptySubtitle}>Нет дизайнов, ожидающих модерации</p>
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div className={styles.modalOverlay} onClick={() => setPreview(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.previewImgBox}>
              <ImageWithFallback
                src={previewSide === "front" ? preview.thumbnailUrl : (preview.backThumbnailUrl || preview.thumbnailUrl)}
                alt={preview.title}
                className={styles.previewImg}
              />
            </div>
            <div className={styles.sideToggle}>
              <button onClick={() => setPreviewSide("front")} className={previewSide === "front" ? styles.sideBtnActive : styles.sideBtn}>
                <ImageWithFallback src={preview.thumbnailUrl} alt="Перед" className={styles.sideImg} />
              </button>
              <button onClick={() => setPreviewSide("back")} className={previewSide === "back" ? styles.sideBtnActive : styles.sideBtn}>
                <ImageWithFallback src={preview.backThumbnailUrl || preview.thumbnailUrl} alt="Зад" className={styles.sideImg} />
              </button>
            </div>
            <h3 className={styles.previewTitle}>{preview.title}</h3>
            <p className={styles.previewMeta}>@{preview.authorNickname} · {formatDate(preview.createdAt)}</p>
            <div className={styles.previewActions}>
              <button onClick={() => approve(preview.id)} className={styles.btnApproveLg}>Одобрить</button>
              <button onClick={() => { setRejectId(preview.id); setRejectReason(""); }} className={styles.btnRejectLg}>Отклонить</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectId && (
        <div className={styles.modalOverlay} style={{ zIndex: 110 }} onClick={() => setRejectId(null)}>
          <div className={styles.rejectModalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.rejectTitle}>Причина отклонения</h3>
            <p className={styles.rejectSubtitle}>Укажите, почему дизайн не прошёл модерацию</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Например: некорректное изображение, нарушение авторских прав..."
              rows={4}
              className={styles.rejectTextarea}
            />
            <div className={styles.rejectActions}>
              <button onClick={() => setRejectId(null)} className={styles.btnCancel}>Отмена</button>
              <button onClick={reject} disabled={!rejectReason.trim()} className={styles.btnRejectConfirm}>Отклонить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
