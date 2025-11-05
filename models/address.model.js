const mongoose = require("mongoose");

const AddressSchema = new mongoose.Schema(
{
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    area: {
        type: String,
        required: true,
    },
    city:{
        type: String,
        required: true,
    },
    state:{
        type: String,
        required: true,
    },
    pincode:{
        type: Number,
        required: true,
    },
    landmark: String,
    alternatePhone: Number,
    addressType: {
        type: String,
        required: true,
        enum: ["Home", "Work", "Other"],
    },
},
{
    timestamps: true,
}
);

module.exports = mongoose.model("Address", AddressSchema);