/**
 * Payment types.
 *
 * NOTE: `PaymentData` mirrors the NOWPayments crypto-payment provider's
 * response shape, which uses snake_case field names. These are external
 * provider fields (not chain/SDK DTOs), so snake_case is intentional here.
 */

export interface PaymentData {
    payment_id: string;
    pay_address: string;
    pay_amount: number;
    pay_currency: string;
    price_amount: number;
    expires_at: string;
    success?: boolean;
}
