// hotel-frontend/src/context/HotelGuestContext.tsx
// Persistent Guest Room Session State

import React, { createContext, useContext, useEffect, useState } from 'react';

export interface HotelGuest {
    roomNumber: string;
    phone: string;
    name?: string;
}

interface HotelGuestContextType {
    guest: HotelGuest | null;
    setGuestSession: (guest: HotelGuest) => void;
    clearGuestSession: () => void;
    isIdentified: boolean;
}

const HotelGuestContext = createContext<HotelGuestContextType | undefined>(undefined);

const GUEST_STORAGE_KEY = 'hotel_room_guest_session_v1';

export const HotelGuestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [guest, setGuest] = useState<HotelGuest | null>(() => {
        try {
            const saved = localStorage.getItem(GUEST_STORAGE_KEY);
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    useEffect(() => {
        try {
            if (guest) {
                localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guest));
            } else {
                localStorage.removeItem(GUEST_STORAGE_KEY);
            }
        } catch {
            // ignore
        }
    }, [guest]);

    const setGuestSession = (g: HotelGuest) => {
        setGuest(g);
    };

    const clearGuestSession = () => {
        setGuest(null);
    };

    return (
        <HotelGuestContext.Provider
            value={{
                guest,
                setGuestSession,
                clearGuestSession,
                isIdentified: Boolean(guest && guest.roomNumber && guest.phone),
            }}
        >
            {children}
        </HotelGuestContext.Provider>
    );
};

export const useHotelGuest = (): HotelGuestContextType => {
    const context = useContext(HotelGuestContext);
    if (!context) {
        throw new Error('useHotelGuest must be used within a HotelGuestProvider');
    }
    return context;
};
