const mongoose = require('mongoose');

const { Schema } = mongoose;

 const geoPointSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], 
      required: true,
    },
  },
  { _id: false }
);

 const geoPolygonSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['Polygon'],
      default: 'Polygon',
    },
    coordinates: {
      type: [[[Number]]], 
      required: true,
    },
  },
  { _id: false }
);
module.exports = { geoPointSchema, geoPolygonSchema };