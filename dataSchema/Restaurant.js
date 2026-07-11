const mongoose = require('mongoose');
const { geoPolygonSchema } =require ('./geo.js');

const { Schema, model } = mongoose;


const deliveryAreaSchema = new Schema(
  {
    name: {
      type: String,
      default: null,
      trim: true,
      maxlength: 255,
    },
    canDeliver: {
      type: Boolean,
      default: true,
    },
    canReserve: {
      type: Boolean,
      default: true,
    },
    area: {
      type: geoPolygonSchema,
      required: true,
    },
  },
  { _id: true } 
);

const restaurantSchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true, 
    },
    description: {
      type: String,
      default: null,
    },
    location: {
      type: String, 
      default: null,
      maxlength: 255,
    },
    allowedRadiusKm: {
      type: Number,
      default: 5.0,
      min: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isOpen: {
      type: Boolean,
      default: true,
    },
    
    openTime: {
      type: String,
      default: '09:00',
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    closeTime: {
      type: String,
      default: '22:00',
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deliveryFees: {
      type: Number,
      default: 10,
      min: 0,
    },
    deliveryAreas: {
      type: [deliveryAreaSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

restaurantSchema.index({ owner: 1 }, { unique: true });
restaurantSchema.index({ isDeleted: 1, isOpen: 1 });
restaurantSchema.index({ 'deliveryAreas.area': '2dsphere' }); 
restaurantSchema.virtual('isCurrentlyOpen').get(function () {
  if (!this.isOpen) return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [openH, openM] = this.openTime.split(':').map(Number);
  const [closeH, closeM] = this.closeTime.split(':').map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;
  return openMinutes <= closeMinutes
    ? currentMinutes >= openMinutes && currentMinutes < closeMinutes
    : currentMinutes >= openMinutes || currentMinutes < closeMinutes;
});

module.exports = model('Restaurant', restaurantSchema);
