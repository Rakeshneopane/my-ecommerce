const TypesSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  images: {
    type: [String],
    required: true,
  },
  section: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Section",
    required: true,   
  }
});
