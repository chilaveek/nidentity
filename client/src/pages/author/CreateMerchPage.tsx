import { useState, useRef, useEffect } from "react";
import { flushSync } from "react-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { toJpeg } from "html-to-image";
import { Upload, Type, X, ChevronUp, ChevronDown, ZoomIn, Image as ImageIcon, AlignJustify, ShoppingBag, CheckCircle, RotateCcw } from "lucide-react";
import styles from "./CreateMerchPage.module.css";

type LayerType = "image" | "text";
type Side = "front" | "back";

interface Layer { id: string; type: LayerType; content: string; scale: number; color?: string; fontFamily?: string; side: Side; }

const FONTS = ["Inter", "Arial", "Impact", "Times New Roman", "Comic Sans MS"];
const BLEND_MODES = [
  { value: "normal", label: "Обычный" }, { value: "screen", label: "Screen" }, { value: "multiply", label: "Multiply" },
  { value: "overlay", label: "Overlay" }, { value: "color-dodge", label: "Color Dodge" }, { value: "hard-light", label: "Hard Light" }
];
const MOCKUPS: Record<Side, string> = { front: "/images/create/mockup-black-tshirt.jpg", back: "/images/create/mockup-black-tshirt-back.png" };

interface Props { mode?: "user" | "author"; }

export function CreateMerchPage({ mode = "author" }: Props) {
  const { user, role } = useAuth();
  const { addCustomToCart, setIsCartOpen } = useCart();
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<"tshirt" | "hoodie">("tshirt");
  const [selectedColor, setSelectedColor] = useState("Black");
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [blendMode, setBlendMode] = useState("normal");
  const constraintsRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const canvasCenterRef = useRef<HTMLDivElement>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const [isCapturing, setIsCapturing] = useState(false);
  const [activeSide, setActiveSide] = useState<Side>("front");

  const visibleLayers = layers.filter(l => l.side === activeSide);
  const frontLayers = layers.filter(l => l.side === "front");
  const backLayers = layers.filter(l => l.side === "back");

  useEffect(() => {
    if (!canvasCenterRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const scaleW = entry.contentRect.width / 440;
        const scaleH = entry.contentRect.height / 540;
        setCanvasScale(Math.min(scaleW, scaleH, 1));
      }
    });
    observer.observe(canvasCenterRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("nid_design_draft");
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (draft.layers) setLayers(draft.layers.map((l: any) => ({ ...l, side: l.side || "front" })));
        if (draft.selectedType) setSelectedType(draft.selectedType);
        if (draft.selectedColor) setSelectedColor(draft.selectedColor);
        if (draft.blendMode) setBlendMode(draft.blendMode);
      } catch {}
      localStorage.removeItem("nid_design_draft");
    }
  }, []);

  const activeLayer = layers.find(l => l.id === activeLayerId) ?? null;

  const generateThumbnailForSide = async (side: Side): Promise<string> => {
    const prevSide = activeSide;
    const prevActive = activeLayerId;
    flushSync(() => { setActiveSide(side); setActiveLayerId(null); setIsCapturing(true); });
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    if (!mockupRef.current) {
      flushSync(() => { setActiveSide(prevSide); setActiveLayerId(prevActive); setIsCapturing(false); });
      throw new Error("Mockup не найден");
    }
    const dataUrl = await toJpeg(mockupRef.current, { quality: 0.92, pixelRatio: 1, cacheBust: true, style: { boxShadow: "none", borderRadius: "0", transform: "scale(1)" } });
    flushSync(() => { setActiveSide(prevSide); setActiveLayerId(prevActive); setIsCapturing(false); });
    return dataUrl;
  };

  const handleCheckout = async () => {
    if (!user) { alert("Для заказа необходимо войти в аккаунт."); return; }
    if (layers.length === 0) { alert("Невозможно заказать пустое изделие."); return; }
    try {
      const frontThumb = await generateThumbnailForSide("front");
      const backThumb = await generateThumbnailForSide("back");
      const res = await addCustomToCart({
        layersDataJson: JSON.stringify(layers), thumbnailUrl: frontThumb, backThumbnailUrl: backThumb,
        productType: selectedType === "tshirt" ? "TShirt" : "Hoodie", color: selectedColor, size: "M", quantity: 1,
      });
      if (res.success) setIsCartOpen(true); else alert(res.message || "Ошибка");
    } catch { alert("Ошибка оформления заказа."); }
  };

  const handleTransferToEditor = () => {
    localStorage.setItem("nid_design_draft", JSON.stringify({ layers, selectedType, selectedColor, blendMode }));
    window.location.href = "/author/create";
  };

  const addImageLayer = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const layer: Layer = { id: Date.now().toString(), type: "image", content: ev.target?.result as string, scale: 1, side: activeSide };
      setLayers(p => [...p, layer]); setActiveLayerId(layer.id);
    };
    reader.readAsDataURL(file); e.target.value = "";
  };

  const addTextLayer = () => {
    const layer: Layer = { id: Date.now().toString(), type: "text", content: "Мой текст", scale: 1, color: "#ffffff", fontFamily: "Inter", side: activeSide };
    setLayers(p => [...p, layer]); setActiveLayerId(layer.id);
  };

  const updateLayer = (id: string, updates: Partial<Layer>) => setLayers(p => p.map(l => l.id === id ? { ...l, ...updates } : l));
  const removeLayer = (id: string) => { setLayers(p => p.filter(l => l.id !== id)); if (activeLayerId === id) setActiveLayerId(null); };
  const swap = (arr: Layer[], i: number, j: number) => { const next = [...arr]; [next[i], next[j]] = [next[j], next[i]]; return next; };

  const [publishOpen, setPublishOpen] = useState(false);
  const [publishTitle, setPublishTitle] = useState("");
  const [publishPrice, setPublishPrice] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [publishTags, setPublishTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("nid_token") ?? "" : "";
  const baseCost = selectedType === "tshirt" ? 800 : 1500;
  const priceNum = parseFloat(publishPrice) || 0;
  const markup = Math.max(0, priceNum - baseCost);
  const authorEarnings = +(markup * 0.7).toFixed(2);

  const handlePublish = async () => {
    if (!publishTitle.trim()) { setPublishError("Введите название."); return; }
    if (isNaN(priceNum) || priceNum < baseCost) { setPublishError(`Минимальная цена: ${baseCost.toLocaleString("ru-RU")} ₽ (себестоимость).`); return; }
    if (layers.length === 0) { setPublishError("Добавьте хотя бы один слой."); return; }
    setPublishing(true); setPublishError("");
    try {
      const frontThumb = await generateThumbnailForSide("front");
      const backThumb = await generateThumbnailForSide("back");
      const res = await fetch("/api/author/publish", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: publishTitle, layersDataJson: JSON.stringify(layers), thumbnailUrl: frontThumb, backThumbnailUrl: backThumb,
          productType: selectedType === "tshirt" ? "TShirt" : "Hoodie", color: selectedColor, finalPrice: priceNum, tags: publishTags,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Неизвестная ошибка");
      setPublishSuccess(true); setLayers([]);
      setTimeout(() => { setPublishOpen(false); setPublishSuccess(false); setPublishTitle(""); setPublishPrice(""); setPublishTags([]); setTagInput(""); }, 2200);
    } catch (e: any) { setPublishError(e.message ?? "Ошибка сети"); } finally { setPublishing(false); }
  };

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Создание мерча</h1>
        </div>

        <div className={styles.mainLayout}>
          {/* LEFT SIDEBAR */}
          <aside className={styles.leftSidebar}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <p className={styles.cardTitle}>Добавить</p>
              </div>
              <div className={styles.cardBody} style={{ overflowY: 'visible', padding: 12 }}>
                <label className={styles.actionBtn}>
                  <div className={styles.actionIcon}><ImageIcon size={16} color="#1890ff" /></div>
                  <div>
                    <p className={styles.actionText}>Картинка</p>
                    <p className={styles.actionSub}>PNG, JPG, SVG</p>
                  </div>
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={addImageLayer} />
                </label>
                <button onClick={addTextLayer} className={styles.actionBtn}>
                  <div className={styles.actionIcon}><Type size={16} color="#1890ff" /></div>
                  <div>
                    <p className={styles.actionText}>Текст</p>
                    <p className={styles.actionSub}>Любой шрифт</p>
                  </div>
                </button>
              </div>
            </div>

            <div className={`${styles.card} ${styles.cardFlex}`}>
              <div className={styles.cardHeader}>
                <p className={styles.cardTitle}>Слои</p>
                <span className={styles.badge}>{visibleLayers.length}</span>
              </div>
              {visibleLayers.length === 0 ? (
                <div className={styles.emptyState}>
                  <AlignJustify size={28} color="#e5e7eb" className={styles.emptyIcon} />
                  <p className={styles.emptyText}>Добавьте элементы на {activeSide === "front" ? "переднюю" : "заднюю"} сторону</p>
                </div>
              ) : (
                <div className={styles.cardBody}>
                  {[...visibleLayers].reverse().map(layer => {
                    const idx = layers.indexOf(layer);
                    const isActive = activeLayerId === layer.id;
                    return (
                      <div key={layer.id} onClick={() => setActiveLayerId(layer.id)} className={`${styles.layerItem} ${isActive ? styles.active : ''}`}>
                        <div className={styles.layerIcon}>
                          {layer.type === "image" ? <ImageIcon size={13} color={isActive ? "#fff" : "#1890ff"} /> : <Type size={13} color={isActive ? "#fff" : "#1890ff"} />}
                        </div>
                        <span className={styles.layerName}>{layer.type === "text" ? layer.content || "Текст" : "Изображение"}</span>
                        <div className={styles.layerActions}>
                          <button onClick={e => { e.stopPropagation(); setLayers(p => swap(p, idx, idx + 1)); }} disabled={idx === layers.length - 1} className={styles.layerBtn}>
                            <ChevronUp size={12} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setLayers(p => swap(p, idx, idx - 1)); }} disabled={idx === 0} className={styles.layerBtn}>
                            <ChevronDown size={12} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); removeLayer(layer.id); }} className={styles.layerBtnDelete}>
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          {/* CENTER CANVAS */}
          <div className={styles.centerCanvas}>
            <div className={styles.sideToggle}>
              <div className={styles.sideToggleWrap}>
                {(["front", "back"] as Side[]).map(side => {
                  const isActive = activeSide === side;
                  const count = side === "front" ? frontLayers.length : backLayers.length;
                  return (
                    <button key={side} onClick={() => { setActiveSide(side); setActiveLayerId(null); }} className={`${styles.sideBtn} ${isActive ? styles.active : ''}`}>
                      <RotateCcw size={14} style={{ transform: side === "front" ? "scaleX(-1)" : "none" }} />
                      {side === "front" ? "Перед" : "Зад"}
                      {count > 0 && <span className={styles.sideBtnCount}>{count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.canvasBox} ref={canvasCenterRef} onClick={() => setActiveLayerId(null)}>
              <div className={styles.canvasBg} />
              <div className={styles.canvasScaler} style={{ transform: `scale(${canvasScale})` }}>
                <div ref={mockupRef} className={styles.mockupWrap}>
                  <img src={MOCKUPS[activeSide]} alt="Mockup" className={styles.mockupImg} />
                  <div ref={constraintsRef} className={styles.printZone} style={{ mixBlendMode: blendMode as any }}>
                    {visibleLayers.length === 0 && !isCapturing && (
                      <div className={styles.printZoneEmpty}>
                        <p className={styles.printZoneEmptyText}>Зона печати</p>
                      </div>
                    )}
                    {visibleLayers.map((layer, idx) => (
                      <motion.div key={layer.id} drag dragConstraints={mockupRef} dragElastic={0} dragMomentum={false} onClick={e => { e.stopPropagation(); setActiveLayerId(layer.id); }}
                        className={`${styles.dragLayer} ${activeLayerId === layer.id ? styles.activeLayer : ''}`}
                        style={{ zIndex: idx + 1, top: "50%", left: "50%", x: "-50%", y: "-50%" }}
                      >
                        <div style={{ transform: `scale(${layer.scale})`, transformOrigin: "center center" }}>
                          {layer.type === "image" ? (
                            <img src={layer.content} draggable={false} style={{ display: "block", maxWidth: 240, maxHeight: 220, objectFit: "contain", pointerEvents: "none" }} />
                          ) : (
                            <span style={{ display: "block", fontWeight: 700, pointerEvents: "none", whiteSpace: "nowrap", color: layer.color, fontFamily: layer.fontFamily, fontSize: 36, lineHeight: 1.1 }}>{layer.content}</span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <aside className={styles.rightSidebar}>
            {activeLayer && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <p className={styles.cardTitle}>Свойства слоя</p>
                </div>
                <div className={styles.cardBody} style={{ overflow: 'visible', padding: 16 }}>
                  {activeLayer.type === "text" && (
                    <>
                      <div>
                        <label className={styles.propLabel}>Текст</label>
                        <input value={activeLayer.content} onChange={e => updateLayer(activeLayer.id, { content: e.target.value })} className={styles.inputField} />
                      </div>
                      <div>
                        <label className={styles.propLabel}>Шрифт</label>
                        <select value={activeLayer.fontFamily} onChange={e => updateLayer(activeLayer.id, { fontFamily: e.target.value })} className={styles.inputField} style={{ fontFamily: activeLayer.fontFamily, paddingRight: 32 }}>
                          {FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={styles.propLabel}>Цвет текста</label>
                        <div className={styles.colorPickerWrap}>
                          <div style={{ position: "relative", flexShrink: 0 }}>
                            <div className={styles.colorPreview} style={{ backgroundColor: activeLayer.color }} />
                            <input type="color" value={activeLayer.color} onChange={e => updateLayer(activeLayer.id, { color: e.target.value })} style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer" }} />
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#040055", textTransform: "uppercase" }}>{activeLayer.color}</span>
                        </div>
                      </div>
                    </>
                  )}
                  <div>
                    <label className={styles.propLabel}>Масштаб — {Math.round(activeLayer.scale * 100)}%</label>
                    <div className={styles.scaleWrap}>
                      <ZoomIn size={14} color="#9ca3af" />
                      <input type="range" min="0.1" max="3" step="0.05" value={activeLayer.scale} onChange={e => updateLayer(activeLayer.id, { scale: parseFloat(e.target.value) })} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <p className={styles.cardTitle}>Изделие</p>
              </div>
              <div className={styles.cardBody} style={{ overflow: 'visible', padding: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {(["tshirt", "hoodie"] as const).map(t => {
                    const disabled = t === "hoodie";
                    return (
                      <button key={t} onClick={() => !disabled && setSelectedType(t)} disabled={disabled}
                        className={`${styles.typeBtn} ${selectedType === t ? styles.active : ''}`}>
                        {t === "tshirt" ? "Футболка" : "Худи"}
                      </button>
                    );
                  })}
                </div>
                <div>
                  <label className={styles.propLabel}>Цвет</label>
                  <div className={styles.colorBtns}>
                    {[{ name: "Black", d: false }, { name: "White", d: true }, { name: "Gray", d: true }].map(c => (
                      <button key={c.name} onClick={() => !c.d && setSelectedColor(c.name)} disabled={c.d}
                        className={`${styles.colorBtn} ${selectedColor === c.name ? styles.active : ''}`}
                        style={{ backgroundColor: c.name.toLowerCase() }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className={styles.propLabel}>Смешивание</label>
                  <select value={blendMode} onChange={e => setBlendMode(e.target.value)} className={styles.inputField}>
                    {BLEND_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.card} style={{ padding: 16, gap: 12 }}>
              {mode === "author" ? (
                <>
                  <button onClick={() => { setPublishError(""); setPublishOpen(true); }} className={styles.btnBlue}>Опубликовать</button>
                  <button onClick={handleCheckout} className={styles.btnDark}>Заказать себе</button>
                </>
              ) : (
                <>
                  <button onClick={handleCheckout} className={styles.btnDark}>Оформить заказ</button>
                  {role === "Author" && (
                    <button onClick={handleTransferToEditor} className={`${styles.btnDark} ${styles.btnOutline}`}>Перенести в редактор</button>
                  )}
                </>
              )}
            </div>
          </aside>
        </div>
      </div>

      <AnimatePresence>
        {publishOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={styles.modalOverlay} onClick={() => setPublishOpen(false)}>
            <motion.div initial={{ scale: 0.92, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0, y: 20 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={styles.modalContent} onClick={e => e.stopPropagation()}>
              {publishSuccess ? (
                <div className={styles.modalSuccessContent}>
                  <CheckCircle size={52} color="#10b981" />
                  <p style={{ fontSize: 20, fontWeight: 900, color: "#040055", margin: 0 }}>Опубликовано!</p>
                  <p style={{ fontSize: 14, color: "#9ca3af", textAlign: "center", margin: 0 }}>ВАШ ДИЗАЙН ОТПРАВЛЕН НА МОДЕРАЦИЮ!</p>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: "#e5f4fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <ShoppingBag size={20} color="#1890ff" />
                      </div>
                      <div>
                        <h2 style={{ fontSize: 18, fontWeight: 900, color: "#040055", margin: 0 }}>Публикация в маркет</h2>
                        <p style={{ fontSize: 12, color: "#9ca3af", margin: 0, marginTop: 2 }}>Футболка · {selectedColor} · {layers.length} сл.</p>
                      </div>
                    </div>
                    <button onClick={() => setPublishOpen(false)} className={styles.closeModalBtn}>
                      <X size={18} color="#9ca3af" />
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <label className={styles.propLabel}>Название дизайна</label>
                      <input value={publishTitle} onChange={e => setPublishTitle(e.target.value)} placeholder="Например: Retro Wave 2025" className={styles.modalInput} />
                    </div>
                    <div>
                      <label className={styles.propLabel}>Цена продажи (₽)</label>
                      <input type="number" min={baseCost} value={publishPrice} onChange={e => setPublishPrice(e.target.value)} placeholder={`от ${baseCost.toLocaleString("ru-RU")}`} className={`${styles.modalInput} ${priceNum > 0 && priceNum < baseCost ? styles.modalInputError : ''}`} />
                    </div>
                    <div>
                      <label className={styles.propLabel}>Хештеги</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                        {publishTags.map(tag => (
                          <span key={tag} className={styles.tagBadge}>
                            #{tag} <button onClick={() => setPublishTags(t => t.filter(x => x !== tag))}><X size={10} /></button>
                          </span>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input value={tagInput} onChange={e => setTagInput(e.target.value.replace(/[^a-zA-Zа-яА-ЯёЁ0-9_]/g, ""))} onKeyDown={e => { if (e.key === "Enter" && tagInput.trim()) { e.preventDefault(); if (!publishTags.includes(tagInput.trim().toLowerCase())) setPublishTags(t => [...t, tagInput.trim().toLowerCase()]); setTagInput(""); } }} placeholder="anime, retro..." className={styles.modalInput} style={{ flex: 1 }} />
                        <button type="button" onClick={() => { if (tagInput.trim() && !publishTags.includes(tagInput.trim().toLowerCase())) setPublishTags(t => [...t, tagInput.trim().toLowerCase()]); setTagInput(""); }} className={styles.tagInputBtn}>+</button>
                      </div>
                    </div>
                    <div className={styles.earningsBox}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280" }}> <span>Себестоимость</span> <span style={{ fontWeight: 700 }}>{baseCost.toLocaleString("ru-RU")} ₽</span> </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280" }}> <span>Ваша надбавка</span> <span style={{ fontWeight: 700 }}>{markup > 0 ? `+${markup.toLocaleString("ru-RU")} ₽` : "—"}</span> </div>
                      <div style={{ height: 1, background: "rgba(24,144,255,0.2)", margin: "4px 0" }} />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}> <span style={{ fontSize: 14, fontWeight: 700, color: "#040055" }}>Ваш доход (70%)</span> <span style={{ fontSize: 16, fontWeight: 900, color: authorEarnings > 0 ? "#1890ff" : "#9ca3af" }}>{authorEarnings > 0 ? `${authorEarnings.toLocaleString("ru-RU")} ₽` : "0 ₽"}</span> </div>
                      {priceNum > 0 && priceNum < baseCost && <p style={{ fontSize: 11, color: "#ef4444", fontWeight: 600, marginTop: 4, margin: 0 }}>⚠ Минимальная цена: {baseCost.toLocaleString("ru-RU")} ₽</p>}
                    </div>
                    {publishError && <p style={{ fontSize: 14, color: "#ef4444", fontWeight: 600, background: "#fef2f2", padding: "8px 16px", borderRadius: 12, margin: 0 }}>{publishError}</p>}
                    <button onClick={handlePublish} disabled={publishing || (priceNum > 0 && priceNum < baseCost)} className={styles.btnBlue}>
                      {publishing ? "Публикуем..." : `Опубликовать за ${priceNum > 0 ? priceNum.toLocaleString("ru-RU") + " ₽" : "..."}`}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
