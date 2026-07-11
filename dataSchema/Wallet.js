const mongoose = require('mongoose');

const { Schema, model } = mongoose;


const walletSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true, 
    },
    balance: {
      type: Schema.Types.Decimal128,
      default: 0,
      get: (v) => (v == null ? v : parseFloat(v.toString())),
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

walletSchema.index({ user: 1 }, { unique: true });

module.exports = model('Wallet', walletSchema);
