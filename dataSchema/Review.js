const mongoose = require('mongoose');

const { Schema, model } = mongoose;


const reviewSchema = new Schema(
  {
 
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      default: null,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be a whole number between 1 and 5.',
      },
    },
    comment: {
      type: String,
      default: null,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } } 
);

reviewSchema.index({ restaurant: 1, createdAt: -1 }); 
reviewSchema.index({ customer: 1 }); 
reviewSchema.index(
  { order: 1 },
  { unique: true, partialFilterExpression: { order: { $exists: true } } } ); 

module.exports = model('Review', reviewSchema);
