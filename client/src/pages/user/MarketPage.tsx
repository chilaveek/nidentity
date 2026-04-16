import { useState, useMemo, useEffect, useRef } from "react";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { Search, X, SlidersHorizontal, Hash } from "lucide-react";
import styles from "./MarketPage.module.css";

type Product = {
  id: string;
  title: string;
  imageUrl: string;
  backImageUrl?: string;
  price: number;
  popularityScore: number;
  authorNickname: string;
  tags: string[];
};

const BACK_FALLBACK = "/images/create/mockup-black-tshirt-back.png";

function parseTags(raw: any): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") { try { const r = JSON.parse(raw); return Array.isArray(r) ? r : []; } catch { return []; } }
  return [];
}

export function MarketPage() {
  const { user } = useAuth();
  const { addToCart, setIsCartOpen } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [maxPriceSlider, setMaxPriceSlider] = useState(10000);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>("M");
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => { if (selectedProduct) { setSelectedSize("M"); setQuantity(1); } }, [selectedProduct]);

  useEffect(() => {
    fetch("/api/market/products")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const parsed = data.map((p: any) => ({ ...p, tags: parseTags(p.tags) }));
          setProducts(parsed);
          const maxP = Math.max(...parsed.map((p: Product) => p.price), 1000);
          const roundedMax = Math.ceil(maxP / 500) * 500;
          setMaxPriceSlider(roundedMax);
          setPriceRange([0, roundedMax]);
        }
      })
      .catch(console.error);
  }, []);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    products.forEach((p) => parseTags(p.tags).forEach((t) => tagSet.add(t)));
    return [...tagSet].sort();
  }, [products]);

  const toggleTag = (tag: string) => setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (p.price < priceRange[0] || p.price > priceRange[1]) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!p.title.toLowerCase().includes(q) && !p.authorNickname?.toLowerCase().includes(q) && !parseTags(p.tags).some((t) => t.toLowerCase().includes(q))) return false;
      }
      if (selectedTags.length > 0 && !selectedTags.some((t) => parseTags(p.tags).includes(t))) return false;
      return true;
    });
  }, [priceRange, products, search, selectedTags]);

  const handleAddToCart = async () => {
    if (!user) { alert("Для покупок необходимо войти в аккаунт."); return; }
    if (!selectedProduct) return;
    setIsAdding(true);
    const res = await addToCart(selectedProduct.id, selectedSize, quantity);
    setIsAdding(false);
    if (res.success) { setSelectedProduct(null); setIsCartOpen(true); } else { alert(res.message || "Ошибка"); }
  };

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <h1 className={styles.pageTitle}>
          ВЫБЕРИ СВОЙ <span className={styles.pageTitleAccent}>Стиль</span>
        </h1>
      </div>

      {/* Search bar */}
      <div className={styles.searchWrap}>
        <Search size={18} className={styles.searchIcon} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию, автору, тегу..."
          className={styles.searchInput}
        />
        {search && (
          <button onClick={() => setSearch("")} className={styles.searchClear}>
            <X size={16} />
          </button>
        )}
      </div>

      <div className={styles.layout}>
        {/* Sidebar filters */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTitle}>
            <SlidersHorizontal size={16} style={{ color: "#1890ff" }} />
            <h2 className={styles.sidebarTitleText}>Фильтры</h2>
          </div>

          {/* Price range */}
          <div className={styles.priceSection}>
            <p className={styles.filterLabel}>Цена</p>
            <div className={styles.priceInputs}>
              <div className={styles.priceInputWrap}>
                <label className={styles.priceInputLabel}>Мин.</label>
                <input type="number" min={0} max={priceRange[1]} step={100} value={priceRange[0]}
                  onChange={(e) => setPriceRange([Math.min(Number(e.target.value) || 0, priceRange[1]), priceRange[1]])}
                  className={styles.filterInput}
                />
              </div>
              <div className={styles.priceDash}>—</div>
              <div className={styles.priceInputWrap}>
                <label className={styles.priceInputLabel}>Макс.</label>
                <input type="number" min={priceRange[0]} max={maxPriceSlider} step={100} value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], Math.max(Number(e.target.value) || 0, priceRange[0])])}
                  className={styles.filterInput}
                />
              </div>
            </div>
            <input type="range" min={0} max={maxPriceSlider} step={100} value={priceRange[1]}
              onChange={(e) => setPriceRange([priceRange[0], Math.max(Number(e.target.value), priceRange[0])])}
              className={styles.priceRange}
            />
          </div>

          {/* Tags */}
          {allTags.length > 0 && (
            <div className={styles.tagsSection}>
              <div className={styles.tagsTitle}>
                <Hash size={13} style={{ color: "#1890ff" }} />
                <p className={styles.tagsTitleText}>Хештеги</p>
              </div>
              <div className={styles.tagsWrap}>
                {allTags.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button key={tag} onClick={() => toggleTag(tag)}
                      className={active ? styles.tagBtnActive : styles.tagBtnInactive}
                    >#{tag}</button>
                  );
                })}
              </div>
              {selectedTags.length > 0 && (
                <button onClick={() => setSelectedTags([])} className={styles.resetTagsBtn}>Сбросить теги</button>
              )}
            </div>
          )}

          <button
            onClick={() => { setPriceRange([0, maxPriceSlider]); setSelectedTags([]); setSearch(""); }}
            className={styles.resetAllBtn}
          >Сбросить все фильтры</button>

          <div className={styles.foundCount}>
            <p className={styles.foundCountText}>
              Найдено: <span className={styles.foundCountNum}>{filtered.length}</span> товаров
            </p>
          </div>
        </aside>

        {/* Product grid */}
        <div className={styles.mainContent}>
          {filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <Search size={32} style={{ color: "#e5e7eb" }} />
              <p className={styles.emptyTitle}>Ничего не найдено</p>
              <p className={styles.emptySubtitle}>Попробуйте изменить фильтры</p>
            </div>
          ) : (
            <div className={styles.productsGrid}>
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} onClick={() => setSelectedProduct(product)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product detail modal */}
      {selectedProduct && (
        <div className={styles.modalOverlay} onClick={() => setSelectedProduct(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedProduct(null)} className={styles.modalClose}>
              <X size={20} style={{ color: "#4b5563" }} />
            </button>
            <div className={styles.modalLayout}>
              <ModalImageSlider product={selectedProduct} />
              <div className={styles.modalRight}>
                <h2 className={styles.modalTitle}>{selectedProduct.title}</h2>
                <div className={styles.modalMeta}>
                  <p className={styles.modalAuthor}>От: <span className={styles.modalAuthorName}>{selectedProduct.authorNickname}</span></p>
                  {selectedProduct.popularityScore > 0 && (
                    <span className={styles.modalSalesBadge}>
                      🔥 {selectedProduct.popularityScore} продаж
                    </span>
                  )}
                </div>
                {selectedProduct.tags?.length > 0 && (
                  <div className={styles.modalTags}>
                    {selectedProduct.tags.map((t) => (
                      <span key={t} className={styles.modalTag}>#{t}</span>
                    ))}
                  </div>
                )}
                <p className={styles.modalPrice}>{selectedProduct.price.toLocaleString("ru-RU")} ₽</p>
                <p className={styles.sizeLabel}>Размер</p>
                <div className={styles.sizeGrid}>
                  {["XS", "S", "M", "L", "XL", "XXL"].map((s) => (
                    <button key={s} onClick={() => setSelectedSize(s)}
                      className={selectedSize === s ? styles.sizeBtnActive : styles.sizeBtnInactive}
                    >{s}</button>
                  ))}
                </div>
                <div className={styles.actionRow}>
                  <div className={styles.quantityBox}>
                    <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className={styles.quantityBtn}>-</button>
                    <div className={styles.quantityValue}>{quantity}</div>
                    <button onClick={() => setQuantity((q) => q + 1)} className={styles.quantityBtn}>+</button>
                  </div>
                  <button onClick={handleAddToCart} disabled={isAdding} className={styles.addToCartBtn}>
                    {isAdding ? "Добавляем..." : "Добавить в корзину"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, onClick }: { product: Product; onClick: () => void }) {
  const images = [product.imageUrl, product.backImageUrl || BACK_FALLBACK];
  const [idx, setIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleMouseEnter = () => {
    intervalRef.current = setInterval(() => setIdx((i) => (i + 1) % images.length), 2500);
  };
  const handleMouseLeave = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setIdx(0);
  };

  return (
    <div
      className={styles.productCard}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={styles.cardImageBox}>
        {images.map((src, i) => (
          <img key={i} src={src} alt={product.title}
            className={idx === i ? styles.cardImageActive : styles.cardImageHidden}
          />
        ))}
        {product.popularityScore > 0 && (
          <span className={styles.salesBadge}>{product.popularityScore} продаж</span>
        )}
        <div className={styles.dots}>
          {images.map((_, i) => (
            <span key={i} className={idx === i ? styles.dotActive : styles.dotInactive} />
          ))}
        </div>
      </div>
      <div className={styles.cardInfo}>
        <p className={styles.cardTitle}>{product.title}</p>
        <p className={styles.cardAuthor}>{product.authorNickname && `by ${product.authorNickname}`}</p>
        {product.tags?.length > 0 && (
          <div className={styles.cardTags}>
            {product.tags.slice(0, 3).map((t) => (
              <span key={t} className={styles.cardTag}>#{t}</span>
            ))}
          </div>
        )}
        <p className={styles.cardPrice}>{product.price.toLocaleString("ru-RU")} ₽</p>
      </div>
    </div>
  );
}

function ModalImageSlider({ product }: { product: Product }) {
  const images = [product.imageUrl, product.backImageUrl || BACK_FALLBACK];
  const [idx, setIdx] = useState(0);

  return (
    <div className={styles.sliderWrap}>
      <div className={styles.sliderMain}>
        {images.map((src, i) => (
          <img key={i} src={src} alt={product.title}
            className={idx === i ? styles.sliderImageActive : styles.sliderImageHidden}
          />
        ))}
      </div>
      <div className={styles.sliderThumbs}>
        {images.map((src, i) => (
          <button key={i} onClick={() => setIdx(i)}
            className={idx === i ? styles.sliderThumbActive : styles.sliderThumbInactive}
          >
            <img src={src} alt="" className={styles.sliderThumbImg} />
          </button>
        ))}
      </div>
    </div>
  );
}
