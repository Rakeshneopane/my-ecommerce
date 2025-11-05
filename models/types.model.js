const mongoose = require("mongoose");

const TypesSchema = new mongoose.Schema({
    name: {
        type: String,
        required : true,
        unique: true,
    }
},{
    timestamps: true,
});


module.exports = mongoose.model("Types", TypesSchema);