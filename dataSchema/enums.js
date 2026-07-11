

 const USER_ROLES = ['customer', 'restaurant', 'admin'];

 const ORDER_STATUSES = ['pending', 'cooking', 'delivering', 'completed', 'cancelled'];

 const PAYMENT_METHODS = ['vodafone_cash', 'instapay'];

 const PAYMENT_STATUSES = ['pending', 'confirmed', 'rejected'];

 const WALLET_TRANSACTION_TYPES = ['add', 'subtract', 'refund'];

 const WALLET_TRANSACTION_SOURCES = ['order', 'admin', 'penalty'];

 module.exports = {
   USER_ROLES,
   ORDER_STATUSES,
   PAYMENT_METHODS,
   PAYMENT_STATUSES,
   WALLET_TRANSACTION_TYPES,
   WALLET_TRANSACTION_SOURCES,
 };