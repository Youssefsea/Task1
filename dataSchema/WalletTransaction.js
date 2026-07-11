const mongoose = require('mongoose');
const  { WALLET_TRANSACTION_TYPES, WALLET_TRANSACTION_SOURCES } =require('./enums.js');

const { Schema, model } = mongoose;


const walletTransactionSchema = new Schema(
  {
    wallet: {
      type: Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
    },
    amount: {
      type: Schema.Types.Decimal128,
      required: true,
      get: (v) => (v == null ? v : parseFloat(v.toString())),
    },
    type: {
      type: String,
      enum: WALLET_TRANSACTION_TYPES,
      required: true,
    },
    source: {
      type: String,
      enum: WALLET_TRANSACTION_SOURCES,
      required: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

walletTransactionSchema.index({ wallet: 1, createdAt: -1 }); 
walletTransactionSchema.index({ order: 1 });

module.exports = model('WalletTransaction', walletTransactionSchema);
