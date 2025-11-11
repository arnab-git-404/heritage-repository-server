import mongoose from "mongoose";

const TaxonomySchema = new mongoose.Schema(
  {
    country: { type: String, required: true },
    state: { type: String, required: true },
    tribes: { type: [String], default: [] },
    villages: { type: [String], default: [] },
  },
  { timestamps: true, versionKey: false }
);

TaxonomySchema.index({ country: 1, state: 1 }, { unique: true });

const Taxonomy = mongoose.model("Taxonomy", TaxonomySchema);
export default Taxonomy;
