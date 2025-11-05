const mongoose = require("mongoose");

require("dotenv").config();

const mongoUri = process.env.MONGO;

async function initialiseDatabase(){
    await mongoose.connect(mongoUri)
    .then(()=> {
        console.log("Connection establised to database")}
    )
    .catch((error)=>{
            console.log("Failed to connect to database.", error)
        })
    
}

module.exports = { initialiseDatabase }