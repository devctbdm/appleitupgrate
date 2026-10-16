import mongoose from 'mongoose';

// A saved PC build belongs to a user and stores the chosen components per slot.
const savedBuildSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      maxlength: [80, 'Build name cannot be more than 80 characters'],
    },
    // Map of slot -> { product, name, image, price, wattage }
    // slot keys: cpu, cpu_cooler, motherboard, ram, storage, gpu, psu, casing,
    //            monitor, casing_cooler, keyboard, mouse, speaker, headphone,
    //            wifi_adapter, antivirus, ups
    components: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

savedBuildSchema.index({ user: 1, createdAt: -1 });

const SavedBuild = mongoose.model('SavedBuild', savedBuildSchema);
export default SavedBuild;
