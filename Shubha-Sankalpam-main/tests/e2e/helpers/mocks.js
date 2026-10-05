/**
 * Cryptographic and Payload Mocks for E2E Tests
 */
const crypto = require('crypto');

function generateHmacSha256(data, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
}

function generateRazorpayPaymentSignature(orderId, paymentId, keySecret) {
  return generateHmacSha256(`${orderId}|${paymentId}`, keySecret);
}

function createRazorpayWebhookPayload(event, orderId, paymentId, amountPaise = 1100) {
  return JSON.stringify({
    entity: 'event',
    account_id: 'acc_demo_test',
    event,
    contains: ['payment'],
    payload: {
      payment: {
        entity: {
          id: paymentId,
          entity: 'payment',
          amount: amountPaise,
          currency: 'INR',
          status: event === 'payment.captured' ? 'captured' : 'failed',
          order_id: orderId,
          method: 'upi',
          description: 'Puja Booking Payment'
        }
      }
    },
    created_at: Math.floor(Date.now() / 1000)
  });
}

module.exports = {
  generateHmacSha256,
  generateRazorpayPaymentSignature,
  createRazorpayWebhookPayload
};
