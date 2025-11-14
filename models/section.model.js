const mongoose = require("mongoose");

const SectionSchema = new mongoose.Schema({
    name: {
        type: String,
        required : true,
        unique: true,
    },
    images : {
        type: [String],
        required: true,
    }
},{
    timestamps: true,
});

module.exports = mongoose.model("Section", SectionSchema);