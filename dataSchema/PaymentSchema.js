const mongoose = require('mongoose');
const{ PAYMENT_METHODS, PAYMENT_STATUSES } =require('./enums.js');

const { Schema, model } = mongoose;


const paymentSchema = new Schema(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true, 
    },
    amount: {
      type: Schema.Types.Decimal128,
      required: true,
      get: (v) => (v == null ? v : parseFloat(v.toString())),
    },
    method: {
      type: String,
      enum: PAYMENT_METHODS,
      required: true,
    },
    proofImage: {
      type: String,
      default: null,
      maxlength: 255,
    },
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'pending',
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

paymentSchema.index({ order: 1 }, { unique: true }); 
paymentSchema.index({ status: 1, createdAt: 1 }); 
model.exports = model('Payment', paymentSchema);
