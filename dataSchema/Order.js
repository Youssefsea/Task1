const mongoose = require('mongoose');
const { ORDER_STATUSES } = require('./enums.js');
const { geoPointSchema } = require('./geo.js');

const { Schema, model } = mongoose;


const orderItemSchema = new Schema(
  {
    dish: {
      type: Schema.Types.ObjectId,
      ref: 'Dish',
      required: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    price: {
      type: Schema.Types.Decimal128,
      required: true,
      get: (v) => (v == null ? v : parseFloat(v.toString())),
    },
  },
  {
    _id: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

const orderSchema = new Schema(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
 
    payment: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'pending',
    },
    isReservation: {
      type: Boolean,
      default: false,
    },
    reservationDate: {
      type: Date,
      default: null,
    },
    deliveryAddress: {
      label: {
        type: String,
        required: true,
        maxlength: 255,
      },
      point: {
        type: geoPointSchema,
        required: true,
      },
    },
    totalAmount: {
      type: Schema.Types.Decimal128,
      required: true,
      get: (v) => (v == null ? v : parseFloat(v.toString())),
    },
    deliveryFee: {
      type: Schema.Types.Decimal128,
      default: 0,
      get: (v) => (v == null ? v : parseFloat(v.toString())),
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'An order must contain at least one item.',
      },
    },
  },
  {
    timestamps: true, 
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

orderSchema.index({ customer: 1, createdAt: -1 }); 
orderSchema.index({ restaurant: 1, status: 1 }); 
orderSchema.index(
  { payment: 1 },
  { unique: true, partialFilterExpression: { payment: { $exists: true } } }
);
orderSchema.index({ 'deliveryAddress.point': '2dsphere' });

orderSchema.virtual('itemCount').get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

module.exports = model('Order', orderSchema);
