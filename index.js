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

const getProducts = async (filters = {}) => {
  try {
    const products = await ProductsDB.find(filters)
      .populate("types")
      .populate("section");
    return products;
  } catch (error) {
    throw error;
  }
};

app.get("/api/products", async (req, res) => {
  try {
    // Read query params
    const { category, section, types } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (section) filter.section = section;
    if (types) filter.types = types;

    // Fetch via helper
    const products = await getProducts(filter);

    if (products.length > 0) {
      return res.status(200).json({ data: products });
    }

    res.status(204).json({ data: [], error: "No data exists." });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch products",
      details: error.message,
    });
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

            const saveProducts = new ProductsDB({
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


const getUser = async () => {
  try {
    const users = await User.find()
      .populate({ path: "addresses", strictPopulate: false })
      .populate({
        path: "orders",
        populate: [
          { path: "address", strictPopulate: false },
          { path: "item._id", model: "ProductsDB", strictPopulate: false }, 
        ],
      });

    // Clean up null/invalid refs
    const cleaned = users.map((u) => ({
      ...u.toObject(),
      addresses: (u.addresses || []).filter(Boolean),
      orders: (u.orders || []).filter(Boolean),
    }));

    return cleaned;
  } catch (error) {
    console.error("❌ Error in getUser:", error);
    throw error;
  }
};



app.get("/api/users", async (req, res) => {
  try {
    const user = await getUser();
    if (user && user.length > 0) {
      return res.status(200).json({ user });
    }
    res.status(404).json({ error: "User not found" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch the user.", details: error.message });
  }
});

const updateProducts = async(productId, updatedData)=>{
    try {
        if(updatedData.types?.name){
            let existingTypes = await Types.findOne({ name: updatedData.types.name});
            if(!existingTypes){
                existingTypes = await new Types({name: updatedData.types.name}).save();
            }
            updatedData.types = existingTypes._id;
        }
         if(updatedData.section?.name){
            let existingSection = await Section.findOne({ name: updatedData.section.name});
            if(!existingSection){
                existingSection = await new Section({name: updatedData.section.name}).save();
            }
            updatedData.section = existingSection._id;
        }
        const updateProduct = await ProductsDB.findByIdAndUpdate(productId, updatedData, {new: true}).populate("types").populate("section");
        return updateProduct; 

    } catch (error) {
        throw error;
    }
}

app.post("/api/products/:productId", async(req,res)=>{
    try {
        const productId = req.params.productId;
        if(Object.keys(req.body).length === 0){
            return res.status(400).json({error: "No update data provided"});
        }
        const updatedData = await updateProducts(productId, req.body);
        res.status(200).json({message: "Product updated successfully", product: updatedData})
    } catch (error) {
        res.status(500).json({error: "Failed to update the products"})
    }
})


const getUserById = async (userId) => {
  const user = await User.findById(userId)
    .populate({ path: "addresses", strictPopulate: false })
    .populate({
      path: "orders",
      populate: [
        { path: "address", strictPopulate: false },
        { path: "item._id", model: "ProductsDB", strictPopulate: false },
      ],
    });

  if (!user) return null;

  return {
    ...user.toObject(),
    addresses: (user.addresses || []).filter(Boolean),
    orders: (user.orders || []).filter(Boolean),
  };
};

app.get("/api/user/:id", async (req, res) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json({ user });
  } catch (error) {
    console.error("❌ Error in /api/user/:id:", error);
    res.status(500).json({ error: "Failed to fetch user", details: error.message });
  }
});


const deleteProduct = async (productId) => {
  try {
    const deleted = await ProductsDB.findByIdAndDelete(productId);
    return deleted;
  } catch (error) {
    throw error;
  }
};


app.delete("/api/products/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    const deleted = await deleteProduct(productId);
    if (!deleted) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(200).json({ message: "Product deleted successfully", product: deleted });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete product", details: error.message });
  }
});


const deleteUser = async (userId) => {
  try {
    // Remove all addresses belonging to the user
    await Address.deleteMany({ user: userId });

    // Remove all orders belonging to the user
    await Orders.deleteMany({ user: userId });

    // Finally remove the user
    const deletedUser = await User.findByIdAndDelete(userId);

    return deletedUser;
  } catch (error) {
    throw error;
  }
};


app.delete("/api/user/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await deleteUser(id);

    if (!deletedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully", user: deletedUser });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user", details: error.message });
  }
});

