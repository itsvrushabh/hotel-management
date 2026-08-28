// hotel-management/frontend/src/pages/customer/Cart.tsx
// Shopping cart component

import React from 'react';
import { useNavigate } from 'react-router-dom';

const Cart: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="cart">
            <h1>Your Cart</h1>
            <p>Your cart is empty</p>
            <button onClick={() => navigate('/')}>Browse Menu</button>
        </div>
    );
};

export default Cart;
