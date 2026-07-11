const mongoose = require('mongoose');

const { Schema, model } = mongoose;


const chatRoomSchema = new Schema(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true, 
    },
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
    isOpen: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

chatRoomSchema.index({ order: 1 }, { unique: true });
chatRoomSchema.index({ customer: 1 });
chatRoomSchema.index({ restaurant: 1 });
module.exports = model('ChatRoom', chatRoomSchema);
