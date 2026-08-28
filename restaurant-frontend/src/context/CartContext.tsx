// hotel-management/frontend/src/context/CartContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';

export interface CartItem {
    menuItemId: number;
    name: string;
    price: number;
    quantity: number;
    prepTime: number;
    notes?: string;
}

interface CartContextType {
    items: CartItem[];
    addItem: (item: { id: number; name: string; price: number; prep_time: number }, quantity?: number, notes?: string) => void;
    removeItem: (menuItemId: number) => void;
    updateQuantity: (menuItemId: number, quantity: number) => void;
    updateNotes: (menuItemId: number, notes: string) => void;
    clearCart: () => void;
    totalItems: number;
    subtotal: number;
    tax: number;
    total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'hotel_cart_items_v1';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<CartItem[]>(() => {
        try {
            const saved = localStorage.getItem(CART_STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
        } catch {
            // ignore storage quota errors
        }
    }, [items]);

    const addItem = (
        item: { id: number; name: string; price: number; prep_time: number },
        quantity = 1,
        notes = ''
    ) => {
        setItems(prev => {
            const existingIndex = prev.findIndex(i => i.menuItemId === item.id);
            if (existingIndex > -1) {
                const updated = [...prev];
                const existing = updated[existingIndex]!;
                updated[existingIndex] = {
                    ...existing,
                    quantity: existing.quantity + quantity,
                    notes: notes ? notes : existing.notes,
                };
                return updated;
            }
            return [
                ...prev,
                {
                    menuItemId: item.id,
                    name: item.name,
                    price: item.price,
                    quantity,
                    prepTime: item.prep_time,
                    notes,
                },
            ];
        });
    };

    const removeItem = (menuItemId: number) => {
        setItems(prev => prev.filter(i => i.menuItemId !== menuItemId));
    };

    const updateQuantity = (menuItemId: number, quantity: number) => {
        if (quantity <= 0) {
            removeItem(menuItemId);
            return;
        }
        setItems(prev =>
            prev.map(i => (i.menuItemId === menuItemId ? { ...i, quantity } : i))
        );
    };

    const updateNotes = (menuItemId: number, notes: string) => {
        setItems(prev =>
            prev.map(i => (i.menuItemId === menuItemId ? { ...i, notes } : i))
        );
    };

    const clearCart = () => {
        setItems([]);
    };

    const totalItems = items.reduce((acc, i) => acc + i.quantity, 0);
    const subtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const tax = Math.round(subtotal * 0.05 * 100) / 100; // 5% GST
    const total = Math.round((subtotal + tax) * 100) / 100;

    return (
        <CartContext.Provider
            value={{
                items,
                addItem,
                removeItem,
                updateQuantity,
                updateNotes,
                clearCart,
                totalItems,
                subtotal,
                tax,
                total,
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

export const useCart = (): CartContextType => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
