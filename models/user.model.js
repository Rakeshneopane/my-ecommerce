const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    name:{    type: String,    required: true,    },
    surname:{    type: String,    required: true,    },
    gender:{    type: String,    required: true,    },
    email:{    type: String,    required: true,    },
    phone:{    type: String,    required: true,    },
    addresses:[{    type: mongoose.Schema.Types.ObjectId, ref: "Address"}],  
    orders: [{    type: mongoose.Schema.Types.ObjectId, ref: "Orders"}],
},{ 
    timestamps: true,
});

module.exports = mongoose.model("User", UserSchema);