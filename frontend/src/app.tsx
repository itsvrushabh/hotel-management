// hotel-management/frontend/src/app.tsx
// Bun + React entry point

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Menu, Cart, Checkout, OrderHistory, OwnerDashboard, KitchenDisplay } from './pages';

const routes = [
    { path: '/', component: Menu },
    { path: '/cart', component: Cart },
    { path: '/checkout', component: Checkout },
    { path: '/history', component: OrderHistory },
    { path: '/admin', component: OwnerDashboard },
    { path: '/staff', component: KitchenDisplay },
    { path: '*', component: () => <div><p>Not found</p></div> },
];

const container = document.getElementById('root');
if (container) {
    const root = ReactDOM.createRoot(container);
    root.render(
        <BrowserRouter>
            <Routes>
                {routes.map(route => (
                    <Route key={route.path} path={route.path} element={<route.component />} />
                ))}
            </Routes>
        </BrowserRouter>
    );
}
