const mongoose = require('mongoose');

const { Schema, model } = mongoose;


const dishSchema = new Schema(
  {
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    description: {
      type: String,
      default: null,
    },
  
    price: {
      type: Schema.Types.Decimal128,
      required: true,
      get: (v) => (v == null ? v : parseFloat(v.toString())),
    },
    isAvailable: {
      type: Boolean,
      required: true,
      default: true,
    },
    preparationTime: {
      type: Number, 
      default: 30,
      min: 0,
    },
    category: {
      type: String,
      default: null,
      trim: true,
      maxlength: 50,
    },
    image: {
      type: String, 
      default: null,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

dishSchema.index({ restaurant: 1 }); 
dishSchema.index({ restaurant: 1, isAvailable: 1 }); 
dishSchema.index({ restaurant: 1, category: 1 }); 
dishSchema.index({ name: 'text', description: 'text' }); 

module.exports = model('Dish', dishSchema);
