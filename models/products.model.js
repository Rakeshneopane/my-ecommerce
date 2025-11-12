const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
   
    title: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    rating: {
        type: Number,
        required: true,
    },
    sellerId: {
        type: String,
        required: true,
    },
    stock: {
        type: Number,
        required: true,
        min: 0,
    },
    section: {
        type:  mongoose.Schema.Types.ObjectId,
        ref: "Section",
        required: true,
    },
    types: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Types",
        required: true,
    },
    images:{
        type: [String],
        required: true,
    }
},
{
    timestamps: true
});

module.exports = mongoose.model("ProductsDB", ProductSchema);