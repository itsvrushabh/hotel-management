import { describe, expect, test } from 'bun:test';

describe('Cart Calculations', () => {
    test('calculates subtotal, 5% tax, and total accurately', () => {
        const items = [
            { price: 280, quantity: 2 }, // 560
            { price: 60, quantity: 3 },  // 180
            { price: 120, quantity: 1 }, // 120
        ];

        const subtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
        expect(subtotal).toBe(860);

        const tax = Math.round(subtotal * 0.05 * 100) / 100;
        expect(tax).toBe(43.0);

        const total = Math.round((subtotal + tax) * 100) / 100;
        expect(total).toBe(903.0);
    });

    test('handles decimal tax precision correctly', () => {
        const items = [
            { price: 99.5, quantity: 1 },
        ];

        const subtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
        expect(subtotal).toBe(99.5);

        // 99.5 * 0.05 = 4.975 -> rounds to 4.98
        const tax = Math.round(subtotal * 0.05 * 100) / 100;
        expect(tax).toBe(4.98);

        const total = Math.round((subtotal + tax) * 100) / 100;
        expect(total).toBe(104.48);
    });
});
