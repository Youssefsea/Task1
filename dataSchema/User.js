const mongoose=require('mongoose');
const  {USER_ROLES} = require('./enums.js');

const { Schema, model } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 255,
    },
    phone: {
      type: String,
      default: null,
      maxlength: 20,
    },
    password: {
      type: String,
      required: true,
      select: false, 
    },
    role: {
      type: String,
      enum: USER_ROLES,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);


userSchema.index({ email: 1 }, { unique: true });

userSchema.index({ role: 1 });

module.exports = mongoose.models.User || mongoose.model("User", userSchema);