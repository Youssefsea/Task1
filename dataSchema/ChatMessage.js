const mongoose = require('mongoose');

const { Schema, model } = mongoose;


const chatMessageSchema = new Schema(
  {
    room: {
      type: Schema.Types.ObjectId,
      ref: 'ChatRoom',
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

chatMessageSchema.index({ room: 1, createdAt: 1 });

module.exports = model('ChatMessage', chatMessageSchema);
