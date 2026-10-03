/**
 * Test Mocks and Safe Execution Helpers
 */
const crypto = require('crypto');

function generateHmacSignature(orderId, paymentId, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(orderId + '|' + paymentId)
    .digest('hex');
}

async function injectRazorpayMock(page, options = {}) {
  await page.evaluateOnNewDocument((opts) => {
    window.Razorpay = function (rzpOptions) {
      this.rzpOptions = rzpOptions;
      this.open = function () {
        if (opts.autoComplete === false) return;

        setTimeout(() => {
          if (opts.shouldFail) {
            if (rzpOptions.modal && rzpOptions.modal.ondismiss) {
              rzpOptions.modal.ondismiss();
            }
          } else if (rzpOptions.handler) {
            const fakeOrderId = rzpOptions.order_id || 'order_mock_' + Date.now();
            const fakePaymentId = 'pay_mock_' + Date.now();
            rzpOptions.handler({
              razorpay_order_id: fakeOrderId,
              razorpay_payment_id: fakePaymentId,
              razorpay_signature: opts.signature || 'sig_valid_mock_' + Date.now()
            });
          }
        }, 100);
      };
    };
  }, options);
}

module.exports = {
  generateHmacSignature,
  injectRazorpayMock
};
