const express=require('express');
const app=express();
app.use(express.json());
const router=express.Router();
const auth= require("./Customers/authForCustomers");
const middelware = require('./middelware/vaildJwt');
const authForRestaurants=require('./restaurantServes/authForRestaurant');
const dishes=require('./restaurantServes/Dishes');
const orders=require('./Customers/orders');
const payments=require('./Customers/payments');
const upload=require('./middelware/muilter');
const chat=require('./chat/chatRoutes');

router.post('/LogforAdmin', auth.loginForAdmin);

router.post('/send-otp', auth.sendOTPEmail);

router.post('/signup', auth.signupForCustomer);
router.post('/customer/signup', auth.signupForCustomer);
router.post('/customer/login', auth.loginForCustomer);
router.get('/customer/profile', middelware.sureToken,middelware.verifyRoleForCustomer, auth.getProfile);
router.put('/customer/change-info', middelware.sureToken,middelware.verifyRoleForCustomer, auth.changeUserInfoForCustomer);

router.post('/customer/add-dish-to-cart', middelware.sureToken,middelware.verifyRoleForCustomer, orders.addDishToCart);
router.delete('/customer/remove-dish-from-cart', middelware.sureToken,middelware.verifyRoleForCustomer, orders.deleteDishFromCart);
router.get('/customer/view-cart', middelware.sureToken,middelware.verifyRoleForCustomer, orders.getCartDetails);
router.post('/customer/nearest-restaurants', middelware.sureToken,middelware.verifyRoleForCustomer, orders.lookForNearRestaurants);
router.get('/customer/can-restaurant-receive-order', middelware.sureToken,middelware.verifyRoleForCustomer, orders.restaurantsWhoCanResiveOrder);
router.post('/customer/place-order', middelware.sureToken,middelware.verifyRoleForCustomer, orders.makeOrder);
router.put('/customer/update-dish-quantity-in-cart', middelware.sureToken,middelware.verifyRoleForCustomer, orders.updateDishQuantityInCart);
router.post('/room/:roomId/message', middelware.sureToken, chat.sendMessage);
router.post('/pusher/auth', middelware.sureToken, chat.pusherAuth); 
router.post('/customer/upload-payment-proof', middelware.sureToken, middelware.verifyRoleForCustomer, upload.array('images', 1), payments.uploadPaymentProof);
router.post('/customer/payment-status', middelware.sureToken, middelware.verifyRoleForCustomer, payments.getPaymentStatus);

router.post('/restaurant/signup', authForRestaurants.AddInfoRestaurant);
router.post('/restaurant/login', authForRestaurants.loginForRestaurant);
router.post('/restaurant/send-otp', authForRestaurants.sendOTPEmail);


router.post('/restaurant/add-dish', middelware.sureToken,middelware.verifyRoleForRestaurant, upload.array('images', 5), dishes.addDishesForRestaurant);
router.get('/restaurant/profile', middelware.sureToken,middelware.verifyRoleForRestaurant, authForRestaurants.restaurantProfile);
router.put('/restaurant/change-info', middelware.sureToken,middelware.verifyRoleForRestaurant, authForRestaurants.changeResturantinfo);
router.put('/restaurant/change-password', middelware.sureToken,middelware.verifyRoleForRestaurant, authForRestaurants.changeRestaurantPassword);
router.put('/restaurant/update-location', middelware.sureToken,middelware.verifyRoleForRestaurant, authForRestaurants.updateRestaurantLocation);
router.put('/restaurant/change-dish', middelware.sureToken,middelware.verifyRoleForRestaurant, dishes.changeResturantDish);
router.put('/restaurant/change-dish-availability', middelware.sureToken,middelware.verifyRoleForRestaurant, dishes.changeDishAvailability);
router.get('/restaurant/profile-status', middelware.sureToken,middelware.verifyRoleForRestaurant, authForRestaurants.restaurantProfileStatus);
router.get('/restaurant/is-open', middelware.sureToken,middelware.verifyRoleForRestaurant, authForRestaurants.openOrCloseRestaurant);
router.delete('/restaurant/delete-dish', middelware.sureToken,middelware.verifyRoleForRestaurant, dishes.delelteDish);
router.put('/restaurant/change-delivery-fee', middelware.sureToken,middelware.verifyRoleForRestaurant, authForRestaurants.changeDeliveryFee);
router.get('/Customer/Cartcount', middelware.sureToken,middelware.verifyRoleForCustomer, orders.countAtCart);
router.get('/customer/orders', middelware.sureToken,middelware.verifyRoleForCustomer, orders.getOrdersForCustomer);

router.get('/restaurant/dashboard', middelware.sureToken, middelware.verifyRoleForRestaurant, authForRestaurants.getDashboardStats);
router.get('/restaurant/orders', middelware.sureToken, middelware.verifyRoleForRestaurant, authForRestaurants.getRestaurantOrders);
router.post('/restaurant/order-status', middelware.sureToken, middelware.verifyRoleForRestaurant, authForRestaurants.updateOrderStatus);
router.post('/restaurant/payment-status', middelware.sureToken,middelware.verifyRoleForRestaurant, payments.getPaymentStatusForOrder);

router.post('/admin/confirmPayment', middelware.sureToken,middelware.verifyRoleForAdmin, payments.confirmPayment);
router.post('/admin/rejectPayment', middelware.sureToken,middelware.verifyRoleForAdmin, payments.rejectPayment);
router.get('/admin/pendingPayments', middelware.sureToken,middelware.verifyRoleForAdmin, payments.getPendingPayments);
router.get('/admin/allOrderPaymentProofs', middelware.sureToken,middelware.verifyRoleForAdmin, payments.getAllOrderPaymentProofs);

router.get('/Customer/getBalanceAtWallet', middelware.sureToken,middelware.verifyRoleForCustomer, payments.getBalanceAtWallet);
router.get('/restaurant/dishes', dishes.getAllResDishes);

router.get('/restaurant/all', orders.lookforAllRestaurants);
router.post('/restaurant/all-dishes-for-restaurantV',middelware.sureToken,middelware.verifyRoleForRestaurant, dishes.getAllDishesForRestaurantVendor);
router.post('/restaurant/all-dishes-for-restaurantE', dishes.getAllDishesForRestaurantExplore);

router.get('/restaurant/search-by-name', orders.lookForResByName);

router.get('/customer/chat-rooms', middelware.sureToken, middelware.verifyRoleForCustomer, chat.getChatRoomsForCustomer);
router.get('/customer/chat-room/order/:orderId', middelware.sureToken, middelware.verifyRoleForCustomer, chat.getChatRoomByOrderId);
router.get('/customer/chat-messages/:roomId', middelware.sureToken, middelware.verifyRoleForCustomer, chat.getChatMessages);

// Chat routes للمطعم
router.get('/restaurant/chat-rooms', middelware.sureToken, middelware.verifyRoleForRestaurant, chat.getChatRoomsForRestaurant);
router.get('/restaurant/chat-room/order/:orderId', middelware.sureToken, middelware.verifyRoleForRestaurant, chat.getChatRoomByOrderId);
router.get('/restaurant/chat-messages/:roomId', middelware.sureToken, middelware.verifyRoleForRestaurant, chat.getChatMessages);

module.exports = router;