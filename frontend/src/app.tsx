// hotel-management/frontend/src/app.tsx
// Bun + React entry point

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { CustomerProvider } from './context/CustomerContext';
import { Menu, Cart, Checkout, OrderHistory, OwnerDashboard, KitchenDisplay, WaiterPOS, WaiterView, FrontDeskView, RoomServiceView } from './pages';

export const App: React.FC = () => {
    return (
        <CustomerProvider>
            <CartProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Menu />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/history" element={<OrderHistory />} />
                    <Route path="/admin" element={<OwnerDashboard />} />
                    <Route path="/staff" element={<KitchenDisplay />} />
                    <Route path="/pos" element={<WaiterPOS />} />
                    <Route path="/staff/pos" element={<WaiterPOS />} />
                    <Route path="/waiter" element={<WaiterView />} />
                    <Route path="/staff/waiter" element={<WaiterView />} />
                    <Route path="/frontdesk" element={<FrontDeskView />} />
                    <Route path="/staff/frontdesk" element={<FrontDeskView />} />
                    <Route path="/room" element={<RoomServiceView />} />
                    <Route path="/service/room" element={<RoomServiceView />} />
                    <Route
                        path="*"
                        element={
                            <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'system-ui, sans-serif' }}>
                                <h2>404 - Page Not Found</h2>
                                <a href="/" style={{ color: '#2563eb' }}>Return to Menu</a>
                            </div>
                        }
                    />
                </Routes>
            </BrowserRouter>
            </CartProvider>
        </CustomerProvider>
    );
};

const container = document.getElementById('root');
if (container) {
    const root = ReactDOM.createRoot(container);
    root.render(<App />);
}
