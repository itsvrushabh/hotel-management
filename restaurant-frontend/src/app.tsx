// hotel-management/frontend/src/app.tsx
// Bun + React entry point

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { CustomerProvider } from './context/CustomerContext';
import { Menu, Cart, Checkout, OrderHistory, OwnerDashboard, KitchenDisplay, WaiterView, FrontDeskView, RoomServiceView, HotelFrontDeskView, RestaurantFrontDeskView, TakeoutDeskView } from './pages';

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
                    <Route path="/waiter" element={<WaiterView />} />
                    <Route path="/staff/waiter" element={<WaiterView />} />
                    <Route path="/frontdesk" element={<RestaurantFrontDeskView />} />
                    <Route path="/restaurant-frontdesk" element={<RestaurantFrontDeskView />} />
                    <Route path="/frontdesk/restaurant" element={<RestaurantFrontDeskView />} />
                    <Route path="/hotel-frontdesk" element={<HotelFrontDeskView />} />
                    <Route path="/frontdesk/hotel" element={<HotelFrontDeskView />} />
                    <Route path="/room" element={<RoomServiceView />} />
                    <Route path="/service/room" element={<RoomServiceView />} />
                    <Route path="/takeout" element={<TakeoutDeskView />} />
                    <Route path="/staff/takeout" element={<TakeoutDeskView />} />
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
