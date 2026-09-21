/* ============================================================
   API ROUTES — the map of every URL to its middleware + controller.
   Add a new feature? Add its route here, controller in
   /controllers, and data logic in /models.
   ============================================================ */
const auth = require("../controllers/authController");
const user = require("../controllers/userController");
const booking = require("../controllers/bookingController");
const payment = require("../controllers/paymentController");
const cms = require("../controllers/cmsController");
const video = require("../controllers/videoController");
const subscription = require("../controllers/subscriptionController");
const websiteContent = require("../controllers/websiteContentController");
const analytics = require("../controllers/analyticsController");
const { requireLogin, optionalLogin, adminOnly } = require("../middleware/auth");

const routes = [
  { method:'GET', path:'/api/catalog/item', middleware:[], handler:user.catalogItem },
  { method:'POST', path:'/api/me/interest', middleware:[requireLogin], handler:user.trackInterest },
  { method:'POST', path:'/api/analytics/view', middleware:[requireLogin], handler:analytics.recordView },
  { method: "POST", path: "/api/login/request", middleware: [],              handler: auth.requestOtp },
  { method: "POST", path: "/api/login/verify",  middleware: [],              handler: auth.verifyOtp  },
  { method: "GET",  path: "/api/me",            middleware: [requireLogin],  handler: user.getMe      },
  { method: "PUT",  path: "/api/me",            middleware: [requireLogin],  handler: user.updateMe   },
  { method: "POST", path: "/api/bookings",      middleware: [requireLogin], handler: booking.create  },
  { method: "DELETE", path: "/api/bookings",    middleware: [requireLogin],  handler: booking.deleteMyBooking },
  { method: "POST", path: "/api/bookings/claim", middleware: [],             handler: booking.claimPayment },
  { method: "GET",  path: "/api/bookings/recover", middleware: [],           handler: booking.recoverBooking },
  
  // --- Admin Endpoints ---
  { method: "GET",  path: "/api/admin/analytics/active-users", middleware: [adminOnly], handler: analytics.getActiveUsers },
  { method: "GET",  path: "/api/admin/analytics", middleware: [adminOnly], handler: analytics.getActiveUsers },
  { method: "POST", path: "/api/admin/upload",   middleware: [adminOnly],    handler: cms.uploadImage },
  { method: "GET",  path: "/api/admin/bookings", middleware: [adminOnly],    handler: booking.listAll },
  { method: "POST", path: "/api/admin/bookings", middleware: [adminOnly],    handler: booking.adminCreateBooking },
  { method: "PUT",  path: "/api/admin/bookings/video", middleware: [adminOnly], handler: booking.updateVideo },
  { method: "POST", path: "/api/admin/upload-video", middleware: [adminOnly], handler: video.uploadLocalVideo },
  { method: "GET",  path: "/api/admin/devotees", middleware: [adminOnly],    handler: user.adminListDevotees },
  { method: "POST", path: "/api/admin/devotees", middleware: [adminOnly],    handler: user.adminCreateDevotee },
  { method: "PUT",  path: "/api/admin/devotees", middleware: [adminOnly],    handler: user.adminUpdateDevotee },
  { method: "DELETE", path: "/api/admin/devotees", middleware: [adminOnly],  handler: user.adminDeleteDevotee },
  { method: "GET",  path: "/api/admin/pujas",    middleware: [adminOnly],    handler: cms.getPujas },
  { method: "PUT",  path: "/api/admin/pujas",    middleware: [adminOnly],    handler: cms.updatePujas },
  { method: "GET",  path: "/api/admin/packages", middleware: [adminOnly],    handler: cms.getPackages },
  { method: "PUT",  path: "/api/admin/packages", middleware: [adminOnly],    handler: cms.updatePackages },
  { method: "GET",  path: "/api/admin/temples",  middleware: [adminOnly],    handler: cms.getTemples },
  { method: "PUT",  path: "/api/admin/temples",  middleware: [adminOnly],    handler: cms.updateTemples },
  { method: "PUT",  path: "/api/admin/bookings/update", middleware: [adminOnly], handler: booking.adminUpdateBooking },
  { method: "DELETE", path: "/api/admin/bookings", middleware: [adminOnly], handler: booking.adminDeleteBooking },
  { method: "PUT",  path: "/api/admin/content/global", middleware: [adminOnly], handler: websiteContent.updateWebsiteContent },
  { method: "GET",  path: "/api/content/global", middleware: [], handler: websiteContent.getWebsiteContent },

  // --- Payment Endpoints ---
  { method: "GET",  path: "/api/payments/config",        middleware: [],              handler: payment.getPaymentConfig },
  { method: "POST", path: "/api/payments/order",         middleware: [optionalLogin], handler: payment.createOrder },
  { method: "POST", path: "/api/payments/webhook",       middleware: [],              handler: payment.webhook },
  { method: "POST", path: "/api/payments/verify",        middleware: [],              handler: payment.verifyPayment },

  // --- Subscription / AutoPay Endpoints ---
  { method: "POST", path: "/api/subscriptions/create",   middleware: [optionalLogin], handler: subscription.create },
  { method: "POST", path: "/api/subscriptions/webhook",  middleware: [],              handler: subscription.webhook }
];

/* returns true if an API route handled the request */
async function handleApi(req, res, url) {
  const route = routes.find(r => r.method === req.method && r.path === url.pathname);
  if (!route) return false;

  /* the Razorpay webhook needs the RAW request body (for signature
     verification) read before anything else touches the request —
     every other route parses JSON as usual inside its controller */
  if (route.path === "/api/payments/webhook" || route.path === "/api/subscriptions/webhook") {
    const { readRawBody } = require("../utils/http");
    req._rawBody = await readRawBody(req);
  }

  for (const mw of route.middleware) {
    if (!mw(req, res, url)) return true; // middleware already sent the error
  }
  await route.handler(req, res, url);
  return true;
}

module.exports = { handleApi };

