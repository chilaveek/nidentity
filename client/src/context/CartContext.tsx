import { createContext, useContext, useState, type ReactNode, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";

export interface CartItem {
  id: string;
  productId: string;
  size: string;
  quantity: number;
  title: string;
  price: number;
  imageUrl: string;
}

interface CartContextType {
  items: CartItem[];
  fetchCart: () => void;
  addToCart: (productId: string, size?: string, quantity?: number) => Promise<{ success: boolean; message: string }>;
  addCustomToCart: (data: { layersDataJson: string; thumbnailUrl: string; backThumbnailUrl?: string; productType: string; color: string; size: string; quantity: number; title?: string }) => Promise<{ success: boolean; message: string }>;
  removeFromCart: (id: string) => void;
  checkout: () => Promise<{ success: boolean; message: string }>;
  cartTotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const TOKEN_KEY = "nid_token";

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const getToken = () => localStorage.getItem(TOKEN_KEY) ?? "";

  const fetchCart = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    try {
      const res = await fetch("/api/cart", {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (e) {
      console.error("Cart fetch error", e);
    }
  }, [user]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (productId: string, size = "M", quantity = 1) => {
    try {
      const res = await fetch("/api/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ productId, size, quantity })
      });
      const data = await res.json();
      if (res.ok) {
        await fetchCart();
        return { success: true, message: data.message };
      }
      return { success: false, message: data.error || "Ошибка" };
    } catch (e) {
      return { success: false, message: "Ошибка сети" };
    }
  };

  const addCustomToCart = async (data: { layersDataJson: string; thumbnailUrl: string; backThumbnailUrl?: string; productType: string; color: string; size: string; quantity: number; title?: string }) => {
    try {
      const res = await fetch("/api/cart/add-custom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(data)
      });
      const resData = await res.json();
      if (res.ok) {
        await fetchCart();
        return { success: true, message: resData.message };
      }
      return { success: false, message: resData.error || "Ошибка" };
    } catch (e) {
      return { success: false, message: "Ошибка сети" };
    }
  };

  const removeFromCart = async (id: string) => {
    try {
      const res = await fetch(`/api/cart/remove/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        fetchCart();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const checkout = async () => {
    try {
      const res = await fetch("/api/cart/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (res.ok) {
        setItems([]);
        return { success: true, message: data.message };
      }
      return { success: false, message: data.error };
    } catch (e) {
      return { success: false, message: "Ошибка сети" };
    }
  };

  const cartTotal = items.reduce((total, item) => total + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        fetchCart,
        addToCart,
        addCustomToCart,
        removeFromCart,
        checkout,
        cartTotal,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
