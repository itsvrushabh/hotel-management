// hotel-management/frontend/src/context/CustomerContext.tsx
// Persistent Customer Identification & Active Session State

import React, { createContext, useContext, useEffect, useState } from 'react';

export interface CustomerSession {
    phone: string;
    name?: string;
    tableNumber?: string;
    roomNumber?: string;
    diningMode?: string;
}

interface CustomerContextType {
    customer: CustomerSession | null;
    setCustomerSession: (session: CustomerSession) => void;
    clearCustomerSession: () => void;
    isIdentified: boolean;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

const CUSTOMER_STORAGE_KEY = 'hotel_customer_session_v1';

export const CustomerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [customer, setCustomer] = useState<CustomerSession | null>(() => {
        try {
            const saved = localStorage.getItem(CUSTOMER_STORAGE_KEY);
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    useEffect(() => {
        try {
            if (customer) {
                localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customer));
            } else {
                localStorage.removeItem(CUSTOMER_STORAGE_KEY);
            }
        } catch {
            // ignore
        }
    }, [customer]);

    const setCustomerSession = (session: CustomerSession) => {
        setCustomer(session);
    };

    const clearCustomerSession = () => {
        setCustomer(null);
    };

    return (
        <CustomerContext.Provider
            value={{
                customer,
                setCustomerSession,
                clearCustomerSession,
                isIdentified: Boolean(customer && customer.phone),
            }}
        >
            {children}
        </CustomerContext.Provider>
    );
};

export const useCustomer = (): CustomerContextType => {
    const context = useContext(CustomerContext);
    if (!context) {
        throw new Error('useCustomer must be used within a CustomerProvider');
    }
    return context;
};
