// backend/scripts/test-email.js
// Sends sample order emails so you can verify Resend + templates.
//
// Usage:
//   node scripts/test-email.js your@gmail.com              -> order confirmation
//   node scripts/test-email.js your@gmail.com send_courier -> a status update
//   (statuses: pending | processing | confirmed | send_courier | cancelled)
//
// IMPORTANT (free tier): without a verified domain, onboarding@resend.dev can
// only deliver to the email address that owns the Resend API key. Use THAT
// address here, or you'll get a 403 "You can only send testing emails to
// your own email address" error.
import 'dotenv/config';
import {
  sendEmail,
  orderConfirmationTemplate,
  orderStatusUpdateTemplate,
} from '../src/services/emailService.js';

const to = process.argv[2];
const status = process.argv[3]; // optional
if (!to) {
  console.error(
    'Usage: node scripts/test-email.js <recipient@email.com> [status]'
  );
  process.exit(1);
}

const fakeOrder = {
  orderNumber: 1001,
  totalAmount: 125000,
  coupon: { code: 'WELCOME10', discount: 5000 },
  orderStatus: 'pending',
  payment: { method: 'sslcommerz' },
  shippingAddress: {
    fullName: 'Test User',
    phone: '01712345678',
    street: 'House 12, Road 5, Dhanmondi',
    city: 'Dhaka',
    state: 'Dhaka',
    postcode: '1209',
    country: 'Bangladesh',
  },
  items: [
    {
      name: 'iPhone 15 Pro Max 256GB — Natural Titanium',
      quantity: 1,
      price: 120000,
      image: '',
    },
    {
      name: 'AirPods Pro (2nd generation) USB-C',
      quantity: 2,
      price: 5000,
      image: '',
    },
  ],
};

console.log(`Sending test email to ${to} ...`);
const html = status
  ? orderStatusUpdateTemplate({
      order: fakeOrder,
      name: to.split('@')[0],
      status,
      storeName: process.env.STORE_NAME || 'Apple IT Zone',
      storeUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    })
  : orderConfirmationTemplate({
      order: fakeOrder,
      name: to.split('@')[0],
      storeName: process.env.STORE_NAME || 'Apple IT Zone',
      storeUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    });

const result = await sendEmail({
  to,
  subject: status
    ? `[TEST] ${status} — #${fakeOrder.orderNumber}`
    : `[TEST] Order confirmed — #${fakeOrder.orderNumber}`,
  html,
});

console.log(result);
if (result.success) {
  console.log('✅ Email sent! Check the inbox (and spam folder).');
} else if (
  result.reason?.includes('You can only send testing emails')
) {
  console.log(
    '\n⚠️ Free-tier restriction: use the email address that owns this Resend API key,\n' +
      '   or verify a domain at https://resend.com/domains'
  );
} else {
  console.log('\n❌ Failed:', result.skipped ? result.reason : result.reason);
}
