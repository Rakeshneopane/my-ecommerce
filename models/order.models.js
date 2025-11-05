const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User",
      required: true,
    },
    item: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: "Products" },
        title: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
      },
    ],
    address: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },
    payment: {
      method: { type: String, required: true },
      status: { type: String, default: "pending", enum: ["pending", "completed", "inrupted", "declined"] },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Orders", OrderSchema);
