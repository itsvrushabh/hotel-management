// hotel-frontend/src/context/RoomCartContext.tsx
// In-Room Dining & Hotel Services Cart Context

import React, { createContext, useContext, useEffect, useState } from 'react';

export interface RoomCartItem {
    id: number;
    name: string;
    category: string;
    price: number;
    quantity: number;
    notes?: string;
}

interface RoomCartContextType {
    items: RoomCartItem[];
    addItem: (item: { id: number; name: string; category?: string; price: number }, quantity?: number, notes?: string) => void;
    removeItem: (id: number) => void;
    updateQuantity: (id: number, quantity: number) => void;
    updateNotes: (id: number, notes: string) => void;
    clearCart: () => void;
    totalItems: number;
    subtotal: number;
    tax: number;
    total: number;
}

const RoomCartContext = createContext<RoomCartContextType | undefined>(undefined);

const ROOM_CART_KEY = 'hotel_room_cart_v1';

export const RoomCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<RoomCartItem[]>(() => {
        try {
            const saved = localStorage.getItem(ROOM_CART_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(ROOM_CART_KEY, JSON.stringify(items));
        } catch {
            // ignore
        }
    }, [items]);

    const addItem = (
        item: { id: number; name: string; category?: string; price: number },
        quantity = 1,
        notes = ''
    ) => {
        setItems(prev => {
            const existingIndex = prev.findIndex(i => i.id === item.id);
            if (existingIndex > -1) {
                const updated = [...prev];
                const existing = updated[existingIndex]!;
                updated[existingIndex] = {
                    ...existing,
                    quantity: existing.quantity + quantity,
                    notes: notes || existing.notes,
                };
                return updated;
            }
            return [
                ...prev,
                {
                    id: item.id,
                    name: item.name,
                    category: item.category || 'General',
                    price: item.price,
                    quantity,
                    notes,
                },
            ];
        });
    };

    const removeItem = (id: number) => {
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const updateQuantity = (id: number, quantity: number) => {
        if (quantity <= 0) {
            removeItem(id);
            return;
        }
        setItems(prev => prev.map(i => (i.id === id ? { ...i, quantity } : i)));
    };

    const updateNotes = (id: number, notes: string) => {
        setItems(prev => prev.map(i => (i.id === id ? { ...i, notes } : i)));
    };

    const clearCart = () => {
        setItems([]);
    };

    const totalItems = items.reduce((acc, i) => acc + i.quantity, 0);
    const subtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const tax = Math.round(subtotal * 0.05 * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    return (
        <RoomCartContext.Provider
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
        </RoomCartContext.Provider>
    );
};

export const useRoomCart = (): RoomCartContextType => {
    const context = useContext(RoomCartContext);
    if (!context) {
        throw new Error('useRoomCart must be used within a RoomCartProvider');
    }
    return context;
};
