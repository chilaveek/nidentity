import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Eye, ShieldCheck, Search, Info, MessageCircle } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import styles from "./AuthorDesignsPage.module.css";

export function AuthorDesignsPage() {
  const navigate = useNavigate();
  const [designs, setDesigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDesign, setSelectedDesign] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [editForm, setEditForm] = useState({ title: "", price: 0, description: "" });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const token = localStorage.getItem("nid_token");

  const fetchDesigns = () => {
    setLoading(true);
    fetch("/api/author/my-designs", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setDesigns(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (token) fetchDesigns(); else setLoading(false); }, [token]);

  const openEditModal = (design: any) => {
    setSelectedDesign(design);
    setEditForm({ title: design.title, price: design.finalPrice || 0, description: design.description || "" });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (design: any) => {
    setSelectedDesign(design);
    setIsDeleteModalOpen(true);
  };

  const closeModals = () => {
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedDesign(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDesign) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/author/designs/${selectedDesign.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(editForm)
      });
      if (res.ok) { fetchDesigns(); closeModals(); } else { alert("Ошибка при обновлении"); }
    } catch { alert("Ошибка при обновлении"); } finally { setIsUpdating(false); }
  };

  const handleDelete = async () => {
    if (!selectedDesign) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/author/designs/${selectedDesign.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { fetchDesigns(); closeModals(); } else { alert("Ошибка при удалении"); }
    } catch { alert("Ошибка при удалении"); } finally { setIsDeleting(false); }
  };

  const handleCreateAppeal = (design: any) => {
    const params = new URLSearchParams({ appeal: design.id, title: design.title, reason: design.rejectionReason || "", tags: Array.isArray(design.tags) ? design.tags.join(", ") : design.tags || "" });
    navigate(`/support?${params.toString()}`);
  };

  const filtered = designs.filter(d => {
    const s = search.toLowerCase();
    const matchSearch = d.title.toLowerCase().includes(s) || (d.description && d.description.toLowerCase().includes(s));
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Мои дизайны</h1>
          <p className={styles.subtitle}>Управление вашим творчеством</p>
        </div>
        <Link to="/create" className={styles.createBtn}>
          <Plus size={16} /> Создать новый
        </Link>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Search size={18} className={styles.searchIcon} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по названию..." className={styles.searchInput} />
        </div>
        <div className={styles.statusFilters}>
          {[{ id: "all", label: "Все" }, { id: "Published", label: "Одобрено" }, { id: "Moderation", label: "На модерации" }, { id: "Rejected", label: "Отклонено" }].map(f => (
            <button key={f.id} onClick={() => setStatusFilter(f.id)}
              className={`${styles.filterBtn} ${statusFilter === f.id ? styles.filterBtnActive : styles.filterBtnInactive}`}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <ShieldCheck size={48} color="#e5e7eb" className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>Ничего не найдено</p>
          <p className={styles.emptySubtitle}>У вас пока нет дизайнов, соответствующих фильтрам.</p>
        </div>
      ) : (
        <div className={styles.designsGrid}>
          {filtered.map(d => (
            <div key={d.id} className={styles.card}>
              <div className={styles.thumbBox}>
                <ImageWithFallback src={d.thumbnailUrl} alt={d.title} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 12 }} />
                <span className={`${styles.statusBadge} ${d.status === "Published" ? styles.statusApproved : d.status === "Moderation" ? styles.statusPending : styles.statusRejected}`}>
                  {d.status === "Published" ? "Одобрено" : d.status === "Moderation" ? "Модерация" : "Отклонено"}
                </span>
                {d.popularityScore > 0 && d.status === "Published" && (
                  <span className={styles.salesBadge}>
                    <Eye size={10} /> {d.popularityScore} продаж
                  </span>
                )}
              </div>
              <div className={styles.cardBody}>
                <p className={styles.cardTitle}>{d.title}</p>
                <p className={styles.cardPrice}>{(d.finalPrice || 0).toLocaleString("ru-RU")} ₽</p>
                {d.status === "Rejected" && d.rejectionReason && (
                  <div className={styles.rejectedBox}>
                    <div className={styles.rejectedHeader}>
                      <Info size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className={styles.rejectedReasonTitle}>Причина отказа:</p>
                        <p className={styles.rejectedReasonText}>{d.rejectionReason}</p>
                      </div>
                    </div>
                    <button onClick={() => handleCreateAppeal(d)} className={styles.appealBtn}>
                      <MessageCircle size={12} /> Подать апелляцию
                    </button>
                  </div>
                )}
              </div>
              <div className={styles.actionBts}>
                <button onClick={() => openEditModal(d)} disabled={d.status === "Moderation"} className={styles.editBtn}>
                  <Edit2 size={14} /> Изменить
                </button>
                <button onClick={() => openDeleteModal(d)} className={styles.deleteBtn}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedDesign && (
        <div className={styles.modalOverlay} onClick={closeModals}>
          <div className={`${styles.modalContent} ${styles.modalContentEdit}`} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Редактировать дизайн</h2>
            <form onSubmit={handleUpdate} className={styles.modalInputGroup}>
              <div>
                <label className={styles.inputLabel}>Название</label>
                <input value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} required className={styles.modalInput} />
              </div>
              <div>
                <label className={styles.inputLabel}>Цена (₽)</label>
                <input type="number" value={editForm.price} onChange={e => setEditForm(p => ({ ...p, price: Number(e.target.value) }))} required min={100} className={styles.modalInput} />
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={closeModals} className={styles.cancelBtn}>Отмена</button>
                <button type="submit" disabled={isUpdating} className={styles.saveBtn}>{isUpdating ? "Сохранение..." : "Сохранить"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && selectedDesign && (
        <div className={styles.modalOverlay} onClick={closeModals}>
          <div className={`${styles.modalContent} ${styles.modalContentDelete}`} onClick={e => e.stopPropagation()}>
            <div className={styles.deleteIconWrap}>
              <Trash2 size={28} color="#ef4444" />
            </div>
            <h2 className={styles.modalTitle}>Удалить дизайн?</h2>
            <p className={styles.deleteSubtitle}>Вы уверены, что хотите удалить дизайн <span className={styles.deleteTargetName}>"{selectedDesign.title}"</span>? Это действие нельзя отменить.</p>
            <div className={styles.modalActions}>
              <button type="button" onClick={closeModals} className={styles.cancelBtn}>Отмена</button>
              <button type="button" onClick={handleDelete} disabled={isDeleting} className={styles.confirmDeleteBtn}>{isDeleting ? "Удаление..." : "Удалить"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
