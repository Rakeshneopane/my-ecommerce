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
    const { section, types } = req.query;
    const filter = {};

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

const createProducts = async (data) => {
  try {
    const result = Array.isArray(data) ? data : [data];
    const allSaved = [];

    for (const item of result) {
      const { types, section, ...productFields } = item;

      // 1️⃣ Validate Section ID
      const existingSection = await Section.findById(section);
      if (!existingSection) {
        throw new Error(`Invalid section ID: ${section}`);
      }

      // 2️⃣ Validate Type ID
      const existingType = await Types.findById(types);
      if (!existingType) {
        throw new Error(`Invalid type ID: ${types}`);
      }

      // 3️⃣ Create product with existing section/type
      const newProduct = await new ProductsDB({
        ...productFields,
        section,
        types,
      }).save();

      allSaved.push({
        product: newProduct,
        section: existingSection,
        type: existingType,
      });
    }

    return allSaved;
  } catch (error) {
    throw error;
  }
};

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

const updateProducts = async (productId, updatedData) => {
  try {
    const newData = { ...updatedData };

    // -------------------------
    // 1. HANDLE SECTION
    // -------------------------
    if (updatedData.section?.name) {
      let existingSection = await Section.findOne({ name: updatedData.section.name });

      // Create new section (with at least 1 empty image)
      if (!existingSection) {
        existingSection = await new Section({
          name: updatedData.section.name,
          images: updatedData.section.images || [""],
        }).save();
      }

      newData.section = existingSection._id;
    }

    // -------------------------
    // 2. HANDLE TYPES
    // -------------------------
    if (updatedData.types?.name) {
      // Ensure section exists before creating type!
      let parentSection = null;

      // If section updated in same request, use that
      if (newData.section) {
        parentSection = await Section.findById(newData.section);
      } else {
        // Else fallback to existing product section
        const existingProduct = await ProductsDB.findById(productId).populate("section");
        parentSection = existingProduct.section;
      }

      if (!parentSection) {
        throw new Error("Cannot create type because parent section does not exist.");
      }

      // Check for existing type
      let existingType = await Types.findOne({
        name: updatedData.types.name,
        section: parentSection._id,
      });

      // If type does not exist → create it
      if (!existingType) {
        existingType = await new Types({
          name: updatedData.types.name,
          section: parentSection._id,
          images: updatedData.types.images || [""],
        }).save();
      }

      newData.types = existingType._id;
    }

    // -------------------------
    // 3. UPDATE PRODUCT
    // -------------------------
    const updatedProduct = await ProductsDB.findByIdAndUpdate(
      productId,
      newData,
      { new: true }
    )
      .populate("types")
      .populate("section");

    return updatedProduct;

  } catch (error) {
    console.error("❌ updateProducts error:", error);
    throw error;
  }
};


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


app.get("/sections", async (req, res) => {
  try {
    const sections = await Section.find().select("name images");
    res.json({ sections });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/types", async (req, res) => {
  try {
    const types = await Types.find().select("name images section");
    res.json({ types });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.post("/sections/:id/image", async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) return res.status(400).json({ error: "Image URL required" });

    const updated = await Section.findByIdAndUpdate(
      req.params.id,
      { images: [image] },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/types/:id/image", async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) return res.status(400).json({ error: "Image URL required" });

    const updated = await Types.findByIdAndUpdate(
      req.params.id,
      { images: [image] },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// async function seed() {
 

  // 1️⃣ Hard-coded SECTION IMAGES
//   const sections = [
//     { name: "Men", images: ["https://media.gettyimages.com/id/1141653922/photo/the-three-crew-members-of-nasas-apollo-11-lunar-landing-mission-pose-for-a-group-portrait-a.jpg?s=612x612&w=0&k=20&c=Aw7OhPFLeFfEaOjuNribMjCpSnIKMK-vmD8iSS0OawM="] },
//     { name: "Women", images: ["https://media.gettyimages.com/id/1205998357/photo/a-woman-leans-back-resting-on-her-right-elbow-her-left-leg-on-her-right-knee-wearing-a.jpg?s=612x612&w=0&k=20&c=etBVsQ8pDjrmA5VgxSXALTi6UpD1DxgGvei-QeR4QHk="] },
//     { name: "Kids", images: ["https://media.gettyimages.com/id/3249826/photo/boys-shoes-original-publication-picture-post-7884-childrens-shoes-unpub.jpg?s=612x612&w=0&k=20&c=aq7aBf34Tm2JlOhLmyKxQgAFXwEz0Gzzs8MVuiZdcsQ="] },
//     { name: "Accessories", images: ["https://media.gettyimages.com/id/2160351912/photo/autodromo-nazionale-monza-italy-helen-stewart-reflected-in-husband-jackies-sunglasses-during.jpg?s=612x612&w=0&k=20&c=gq4FYi6MF7PUtXBzCXqkV6f4CamgCm0Kl7pHSNrmL2I="] },
//     { name: "Electronics", images: ["https://media.gettyimages.com/id/1172712803/photo/a-group-of-black-friday-online-shopping-purchases-photographed-in-delivery-boxes-filled-with.jpg?s=612x612&w=0&k=20&c=m_feq-w9iaUzMtlr1gJHL9HV6Zi_wBq2s1ilBrXS7MA="] },
//     { name: "Home", images: ["https://media.gettyimages.com/id/514977546/photo/with-a-flip-of-this-models-wrist-clothes-are-washed-rinsed-and-dried-in-one-continuous.jpg?s=612x612&w=0&k=20&c=56Vh-7d3ceLaaGUBjxHlD2lRFCFIaTCJE7rF4GG-QCo="] },
//   ];

//   // 2️⃣ Hard-coded TYPES IMAGES
//   const types = [
//     { name: "Shoes", images: ["https://media.gettyimages.com/id/558933471/photo/a-young-model-poses-with-an-array-of-hawkins-boots-circa-1990.jpg?s=612x612&w=0&k=20&c=s3t-o9inycTl-fZtr7bQcm4JRgk0UxdZS44V_T3GCdE="] },
//     { name: "Smartwatch", images: ["https://media.gettyimages.com/id/1172712775/photo/an-apple-watch-series-5-smartwatch-taken-on-september-20-2019.jpg?s=612x612&w=0&k=20&c=6o5SPRGyhBCP5sClsRsTMVXSM-FIzTuYUgi3RgrCXVc="] },
//     { name: "Jeans", images: ["https://media.gettyimages.com/id/52112099/photo/lech-austria-diana-princess-of-wales-on-a-skiing-holiday-in-lech-austria-with-prince-william.jpg?s=612x612&w=0&k=20&c=f5CBJQFNkZEh37YXHcWh6doTEjvPWsMY710lxpDcrYQ="] },
//     { name: "Smartphone", images: ["https://media.gettyimages.com/id/1281773960/photo/london-england-the-new-iphone-12-and-iphone-12-pro-on-display-during-launch-day-on-october-23.jpg?s=612x612&w=0&k=20&c=3gPtT8DA6zoSG-pVtpvu0lerbRg0eY5MBeNsb7wH7gc="] },
//     { name: "Headphones", images: ["https://media.gettyimages.com/id/3438129/photo/christine-harris-wearing-auralgard-ii-ear-defenders-during-an-exhibition-at-the-design-centre-in.jpg?s=612x612&w=0&k=20&c=5BqJh6hZCWahoclJAGnWmlKLZxyA4lNxsAOySxZFelM="] },
//     { name: "Dress", images: ["https://media.gettyimages.com/id/2204455005/photo/paris-france-violet-grace-wears-pale-yellow-ruffled-dress-boots-sunglasses-outside-the.jpg?s=612x612&w=0&k=20&c=JXgTlz0IgZr2PR-MSA-xr5R9_-Ij1zbCYJN2tJm6Sfk="] },
//     { name: "Laptop", images: ["https://media.gettyimages.com/id/1139259998/photo/detail-of-someone-typing-on-the-keyboard-of-an-apple-macbook-pro-laptop-computer-in-a-cafe.jpg?s=612x612&w=0&k=20&c=AKL6aJaQaDAwl81pUGtDifE8ivNwu9ttwRdtAXaIwtU="] },
//     { name: "Sportswear", images: ["https://media.gettyimages.com/id/52440174/photo/canadian-professional-hockey-player-lorne-gump-worsley-of-the-new-york-rangers-poses-in-the.jpg?s=612x612&w=0&k=20&c=KuP0Cijo6qfMbP31aSJvyG8-BZXtVpdl96Lv46Dn4qE="] },
//     { name: "Handbag", images: ["https://media.gettyimages.com/id/515103076/photo/murray-resnick-the-president-of-the-firm-gay-pauley-is-seen-here-surrounded-with-every-type-of.jpg?s=612x612&w=0&k=20&c=1aS7IpdnGnC5jEdPfEKk8FYKyH0uEqTcOxbh9SQwv2o="] },
//     { name: "Console", images: ["https://media.gettyimages.com/id/90774619/photo/japan-super-nintendo-entertainment-system-1992-computer-games-console-with-alien-3-game.jpg?s=612x612&w=0&k=20&c=Xnegnu__vvO8c8wbFMKW3LPZA9UH5FaTLF3tibE1wvA="] },
//     { name: "Sunglasses", images: ["https://media.gettyimages.com/id/52104818/photo/abu-dhabi-united-arab-emirates-the-princess-of-wales-in-abu-dhabi-during-her-gulf-tour.jpg?s=612x612&w=0&k=20&c=S79Y5FP_-BybB1xBKsUitta_HsKIWszPeIeAjFbj7II="] },
//     { name: "Baby Clothes", images: ["https://media.gettyimages.com/id/584553994/photo/colorado-springs-co-republican-presidential-nominee-donald-trump-reacts-to-the-cries-of-three.jpg?s=612x612&w=0&k=20&c=FdBcTVaAzV5tWuWWG9Kp4PGsUKpEPTW1pPQkIvfMBs8="] },
//     { name: "Toys", images: ["https://media.gettyimages.com/id/50477625/photo/mr-potato-head-toy-w-detachable-accessories.jpg?s=612x612&w=0&k=20&c=YeB9XylRFgs4IYFM2RnR1Os3-igTo3t4wJQ2mpzLPPs="] },
//     { name: "Activewear", images: ["https://media.gettyimages.com/id/1190827607/photo/diana-princess-of-wales-opens-the-womens-international-tennis-association-european-office-at.jpg?s=612x612&w=0&k=20&c=fn4sk7QB81fblEMZUEUL-BQ6mcbiRs1yXC5bbhe1lyg="] },
//     { name: "Appliance", images: ["https://media.gettyimages.com/id/98071044/photo/marin-city-ca-an-energy-star-label-is-displayed-on-a-brand-new-washing-machine-at-a-best-buy.jpg?s=612x612&w=0&k=20&c=Nnh2Ygu1lW2Ga59bN-cPK1CLWJ8dlSm0YpenRMFryfQ="] },
//     { name: "Polo", images: ["https://media.gettyimages.com/id/530794730/photo/1953-publicity-photograph-of-famed-actor-marlon-brando-leaning-against-a-white-wall.jpg?s=612x612&w=0&k=20&c=ji9JMfOdlld5FR9k92VhXya9Euy4yy3vSxcXUcQgasc="] },
//     { name: "Watch", images: ["https://media.gettyimages.com/id/2207466225/photo/new-rolex-land-dweller-model-watches-are-seen-in-a-showcase-of-swiss-watch-designer-and.jpg?s=612x612&w=0&k=20&c=bBDsAWP-K80_9bR85g8v9HVlxd0-WmUY0BFlxuX49C4="] },
//     { name: "Camera", images: ["https://media.gettyimages.com/id/106930323/photo/a-b-m-16mm-silent-pro-movie-camera-manufactured-by-j-a-maurer-inc-of-new-york-circa-1940-it-is.jpg?s=612x612&w=0&k=20&c=35ql_-0x7qczejRLlvUf4YK0Di3Gf-gdPWW7c6AZDqo="] },
//     { name: "T-Shirt", images: ["https://media.gettyimages.com/id/141257662/photo/paul-newman-us-actor-wearing-a-white-t-shirt-in-a-publicity-still-issued-for-the-film-the.jpg?s=612x612&w=0&k=20&c=MTLNgCDLOQBTGRkIz2uFCsq65wS6yKEYYllEN3G64S4="] },
//     { name: "Pant", images: ["https://media.gettyimages.com/id/514689286/photo/6-5-1948-new-york-ny-star-of-stage-and-screen-katharine-hepburn-becomingly-clad-in-slacks.jpg?s=612x612&w=0&k=20&c=C5BOQaQOVK_6W1GsQPtW5HnVz4VuLECT30ErXnRk-r0="] },
//     { name: "Jacket", images: ["https://media.gettyimages.com/id/1282563440/photo/bandar-seri-begawan-brunei-american-singer-songwriter-and-dancer-michael-jackson-performs-on.jpg?s=612x612&w=0&k=20&c=sP8JZTOE3MUvGadIuvLs698cM3AwSVIT7iWmxch7P1s="] },
//   ];

//   // 3️⃣ Remove previous seeds (optional)
//   await Section.deleteMany({});
//   await Types.deleteMany({});

//   // 4️⃣ Insert fresh data
//   await Section.insertMany(sections);
//   await Types.insertMany(types);

//   console.log("Sections & Types seeded successfully!");
//   // mongoose.disconnect();
// }

// seed();

// app.post("/admin/fix-types-section", async (req, res) => {
//   try {
//     const products = await ProductsDB.find().populate("section").populate("types");

//     for (const p of products) {
//       if (p.types && p.section) {
//         await Types.findByIdAndUpdate(
//           p.types._id,
//           { section: p.section._id }
//         );
//       }
//     }

//     res.json({ message: "Types section field updated successfully!" });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email })
      .populate({ path: "addresses", strictPopulate: false })
      .populate({
        path: "orders",
        populate: [
          { path: "address", strictPopulate: false },
          { path: "item._id", model: "ProductsDB", strictPopulate: false },
        ],
      });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({
      error: "Login failed",
      details: error.message,
    });
  }
});

// Create Section
app.post("/sections", async (req, res) => {
  try {
    const { name, images } = req.body;

    if (!name) return res.status(400).json({ error: "Section name required" });

    let existing = await Section.findOne({ name });
    if (existing) return res.status(400).json({ error: "Section already exists" });

    const newSection = await new Section({
      name,
      images: images?.length ? images : [""]
    }).save();

    res.status(201).json({ section: newSection });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Type
app.post("/types", async (req, res) => {
  try {
    const { name, section, images } = req.body;

    if (!name || !section) {
      return res.status(400).json({ error: "Type name & section are required" });
    }

    const sectionExists = await Section.findById(section);
    if (!sectionExists)
      return res.status(404).json({ error: "Section not found" });

    let existing = await Types.findOne({ name, section });
    if (existing) return res.status(400).json({ error: "Type already exists" });

    const newType = await new Types({
      name,
      section,
      images: images?.length ? images : [""]
    }).save();

    res.status(201).json({ type: newType });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE an address
app.delete("/api/users/:userId/addresses/:addressId", async (req, res) => {
  try {
    const { userId, addressId } = req.params;

    const user = await User.findById(userId).populate("addresses");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Delete from Address collection
    const deletedAddress = await Address.findByIdAndDelete(addressId);
    if (!deletedAddress) {
      return res.status(404).json({ error: "Address not found" });
    }

    // Safely remove reference from user.addresses
    user.addresses = user.addresses.filter((addr) => {
      const id = addr._id ? addr._id.toString() : addr.toString();
      return id !== addressId;
    });

    await user.save();

    return res.json({
      message: "Address deleted successfully",
      addresses: user.addresses,
    });
  } catch (error) {
    console.error("❌ Delete Address Error:", error);
    res.status(500).json({
      error: "Failed to delete address",
      details: error.message,
    });
  }
});
