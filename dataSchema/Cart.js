const mongoose =require('mongoose');

const { Schema, model } = mongoose;

const cartItemSchema = new Schema(
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
  },
  { _id: true } 
);

const cartSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true, 
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

cartSchema.index({ user: 1 }, { unique: true }); 

cartSchema.virtual('itemCount').get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

module.exports = model('Cart', cartSchema);
