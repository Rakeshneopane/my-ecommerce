const express = require("express");
const cors = require("cors");

const app = express();

app.use(express.json())
app.use(cors());

const { initialiseDatabase } = require("./dbConnect/dbConnect");

const PORT = 3000;

const ProductsDB = require("./models/products.model");
const Section = require("./models/section.model");
const Types = require("./models/types.model");
const Orders = require("./models/order.models");
const Address = require("./models/address.model");
const User = require("./models/user.model");


const resetAllIndexes = async () => {
    try {
        await Types.collection.dropIndexes();
        await Types.createIndexes();
        console.log("Types indexes reset");
        
        await Section.collection.dropIndexes();
        await Section.createIndexes();
        console.log("Section indexes reset");
        
        // Clean up null data
        await Types.deleteMany({ name: null });
        await Section.deleteMany({ name: null });
        console.log("Cleaned up null data");
    } catch (error) {
        console.error("Error resetting indexes:", error);
    }
};

// initialiseDatabase().then(() => {
//     resetAllIndexes();
// });


initialiseDatabase();

app.get("/", (req,res)=>{
    res.send("Merze ApI is working!");
});

app.listen(PORT, ()=>{
    console.log("Listening to port:", PORT);
});

// Admin endpoint to reset indexes 
app.post("/api/admin/reset-indexes", async(req, res) => {
    try {
        await resetAllIndexes();
        res.json({ message: "Indexes reset successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to reset indexes", details: error.message });
    }
});

const getProducts = async()=>{
    try {
    const products = await ProductsDB.find({}).populate("types").populate("section");
    return products;  
    } catch (error) {
        throw error;
    }
};

app.get("/api/products", async(req,res)=>{
    try {
        const products = await getProducts();
        if(products.length > 0){
            res.json({data: products})
        }
        else{
            res.status(204).json({data: [],error: "No data exists."})
        }
    } catch (error) {
        res.status(500).json({error: "Error while fetching the data"})
    }
    
});

const createProducts = async(data) =>{
    try {

        const result = Array.isArray(data) ? data: [data];
        const allSaved = [];
        
        for( const item of result ){

            const {  types, section, ...products } = item;

            let existingType = await Types.findOne({ name: types.name });
            if (!existingType) {
                existingType = await new Types({ name: types.name }).save();
            }

            let existingSection = await Section.findOne({ name: section.name });
            if (!existingSection) {
                existingSection = await new Section({ name: section.name }).save();
            }

            const saveProducts = new Products({
                ...products, 
                types: existingType._id,
                section: existingSection._id,}); 
            const savedProducts = await saveProducts.save();

            allSaved.push({product: savedProducts, type: existingType, section: existingSection})
        }
        return allSaved;
    } catch (error) {
        throw error;
    }
}

app.post("/api/create-products", async(req,res)=>{
    try {
        const data = req.body;
        const payLoad = Array.isArray(data)? data : [data];

        if(payLoad.some(item => !item.types || !item.section || !item.price || !item.title ) ){
            return res.status(400).json({error : "Missing required product fields"});
        }
        const savedProducts = await createProducts(data);
        res.status(201).json({message: "Data Saved sucessfully", products: savedProducts})
    } catch (error) {
        res.status(500).json({error: "Failed to create the products", details: error.message})
    }
})


async function getProductsbyId(productId){
    try {
        const product = await ProductsDB.findById(productId).populate("types").populate("section");
        return product;
    } catch (error) {
        throw error;
    }
}

app.get("/api/products/:productId", async(req,res)=>{
    try {
        const productById = await getProductsbyId(req.params.productId);
        if(productById){
            return res.status(200).json({data: productById});
        }
        res.status(404).json({error: "Product not found"})
        
    } catch (error) {
        res.status(500).json({error: "Failed to fetch the product",  details: error.message})
    }
});

const getTypesById = async(typeId) =>{
    try {
        const categories = await Types.findById(typeId);
        return categories;        
    } catch (error) {
        throw error;
    }
}

app.get("/api/categories/:categoryId", async(req,res)=>{
    try {
        const category =await getTypesById(req.params.categoryId);
        if(category){
            return res.status(200).json({data: category});
        }
        res.status(404).json({error: "Product not found."})
        
    } catch (error) {
        res.status(500).json({error: "Failed to fetch product by category.", details: error.message});
    }
});

const getTypes = async(req,res)=>{
    try {
        const categories = await Types.find();
        return categories;
    } catch (error) {
        throw error;
    }
}

app.get("/api/categories", async(req,res)=>{
    try {
        const categories = await getTypes();
        if(categories){
            return res.json({data: categories});
        }
        res.status(404).json({error: "Category not found."})

    } catch (error) {
        res.status(500).json({error: "Failed to fetch the products by category."})
    }
})

const postOrders = async(order)=>{
    try {
        const orderedData = await new Orders(order).save();

        await User.findByIdAndUpdate(order.user,{
            $push: { orders: orderedData._id}
        });

        return orderedData;
    } catch (error) {
        throw error;
    }
}

app.post("/api/orders", async(req,res)=> {
try {
    const { user, item, address, payment} = req.body;
    if(!user ||!Array.isArray(item) || item.length === 0 || !address || !payment){
            return res.status(400).json({error: "Users, products, address or payment are required to place order." })
        }
    const orderData = await postOrders(req.body);
    res.status(201).json({message: "ordered successfully placed", orderData : orderData})
} catch (error) {
    res.status(500).json({message: "Failed to fetch the request", details: error.message})
}    
})

const addUser = async(userBody)=>{
    try {
        const newUser = await new User(userBody).save();
        return newUser;
     } catch (error) {
        throw error;
    }
}

app.post("/api/users", async(req,res)=>{
    try {
        const {name, surname, gender, email, phone} = req.body;
        if(!name || !surname || !gender || !email || !phone){
            return res.status(400).json({error: "Necessary Details are misssing"});
        }
        const saveUser = await addUser(req.body);
        res.status(201).json({message: "User saved sucessfully", user: saveUser});       
    } catch (error) {
        res.status(500).json({error: "Failed to fetch the route to add user."});
    }
});

const addAddress = async(addressData) =>{
    try {
        const newAddress = await new Address(addressData).save();

        await User.findByIdAndUpdate(addressData.user, {
            $push: {addresses: newAddress._id}
        });

        return newAddress;
    } catch (error) {
        throw error;
    }
}

app.post("/api/users/:id/addresses", async(req,res)=>{
    try {
        const {area,city,state,pincode,addressType} = req.body;
        if(!area || !city || !state || !pincode || !addressType)
            return res.status(400).json({error: "Necessary field are missing"});
        const saveAddress = await addAddress({...req.body, user: req.params.id});
        res.status(201).json({message: "Address saved successfully", address: saveAddress});
    } catch (error) {
        console.error("Error saving address:", error); 
        res.status(500).json({error: "Failed to fetch the route to add the address."})
    }
})

const getUser = async()=>{
    try {
        const user = await User.find().populate("addresses").populate({
            path: "orders",
            populate: [{path: "address"},{path: "item._id"}],
        });
        return user;
    } catch (error) {
        throw error;
    }
}

app.get("/api/user", async(req,res)=>{
    try {
        const user = await getUser();
        if(user){
            return res.status(200).json({user: user});
        }
        res.status(404).json({error: "User not found"});
    } catch (error) {
        res.status(500).json({error: "Failed to fetch the user."})
    }
})