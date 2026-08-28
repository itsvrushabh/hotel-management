// hotel-frontend/src/app.tsx
// Hotel Management & In-Room Guest Services App

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HotelGuestProvider } from './context/HotelGuestContext';
import { RoomCartProvider } from './context/RoomCartContext';
import { GuestRoomPortal, LaundryService, AmenitiesConcierge, HotelFrontDesk, HotelStaffDashboard } from './pages';

export const App: React.FC = () => {
    return (
        <HotelGuestProvider>
            <RoomCartProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<GuestRoomPortal />} />
                        <Route path="/room" element={<GuestRoomPortal />} />
                        <Route path="/laundry" element={<LaundryService />} />
                        <Route path="/services/laundry" element={<LaundryService />} />
                        <Route path="/amenities" element={<AmenitiesConcierge />} />
                        <Route path="/concierge" element={<AmenitiesConcierge />} />
                        <Route path="/frontdesk" element={<HotelFrontDesk />} />
                        <Route path="/hotel-frontdesk" element={<HotelFrontDesk />} />
                        <Route path="/staff" element={<HotelStaffDashboard />} />
                        <Route path="/hotel-staff" element={<HotelStaffDashboard />} />
                        <Route
                            path="*"
                            element={
                                <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'system-ui, sans-serif' }}>
                                    <h2>404 - Page Not Found</h2>
                                    <a href="/" style={{ color: '#38bdf8' }}>Return to Guest Room Portal</a>
                                </div>
                            }
                        />
                    </Routes>
                </BrowserRouter>
            </RoomCartProvider>
        </HotelGuestProvider>
    );
};

const container = document.getElementById('root');
if (container) {
    const root = ReactDOM.createRoot(container);
    root.render(<App />);
}
