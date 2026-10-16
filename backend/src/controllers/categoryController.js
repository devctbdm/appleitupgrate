import Category from '../models/Category.js';
import { cloudinary } from '../middleware/upload.js';
import { cacheGet, cacheSet, cacheDel } from '../config/redis.js';

export const getAllCategories = async (req, res) => {
  try {
    const cacheKey = 'categories:all';
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    const categories = await Category.find().sort({ sortOrder: 1, name: 1 });
    await cacheSet(cacheKey, JSON.stringify({ success: true, categories }), 600);
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, description, parentId, imageUrl, bannerUrl, featured, sortOrder, color } =
      req.body;

    const uploadedImage =
      req.files?.image?.[0]?.path || imageUrl || '';
    const uploadedBanner =
      req.files?.banner?.[0]?.path || bannerUrl || '';

    const category = new Category({
      name,
      description,
      parentId: parentId || null,
      imageUrl: uploadedImage,
      bannerUrl: uploadedBanner,
      featured: featured || false,
      sortOrder: sortOrder || 0,
      color: color || '#0071e3',
      createdBy: req.user?._id,
    });

    await category.save();
    await cacheDel('categories:*');
    res.status(201).json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const { name, description, parentId, active, imageUrl, bannerUrl, featured, sortOrder, color } =
      req.body;

    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;
    if (parentId !== undefined) category.parentId = parentId || null;
    if (active !== undefined) category.active = active;
    if (featured !== undefined) category.featured = featured;
    if (sortOrder !== undefined) category.sortOrder = sortOrder;
    if (color !== undefined) category.color = color;

    if (req.files?.image?.[0]) {
      if (category.imageUrl?.includes('cloudinary')) {
        const publicId = category.imageUrl.split('/').pop()?.split('.')[0];
        if (publicId) {
          try {
            await cloudinary.uploader.destroy(`apple-it-zone/categories/${publicId}`);
          } catch (err) {
            console.warn('Could not delete old image:', err.message);
          }
        }
      }
      category.imageUrl = req.files.image[0].path;
    } else if (imageUrl !== undefined) {
      category.imageUrl = imageUrl;
    }

    if (req.files?.banner?.[0]) {
      if (category.bannerUrl?.includes('cloudinary')) {
        const publicId = category.bannerUrl.split('/').pop()?.split('.')[0];
        if (publicId) {
          try {
            await cloudinary.uploader.destroy(`apple-it-zone/categories/${publicId}`);
          } catch (err) {
            console.warn('Could not delete old banner:', err.message);
          }
        }
      }
      category.bannerUrl = req.files.banner[0].path;
    } else if (bannerUrl !== undefined) {
      category.bannerUrl = bannerUrl;
    }

    await category.save();
    await cacheDel('categories:*');
    res.json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const deleteImage = async (url) => {
      if (url?.includes('cloudinary')) {
        const publicId = url.split('/').pop()?.split('.')[0];
        if (publicId) {
          try {
            await cloudinary.uploader.destroy(`apple-it-zone/categories/${publicId}`);
          } catch (err) {
            console.warn('Could not delete image:', err.message);
          }
        }
      }
    };

    await deleteImage(category.imageUrl);
    await deleteImage(category.bannerUrl);

    await Category.deleteMany({ parentId: category._id });
    await category.deleteOne();
    await cacheDel('categories:*');
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const reorderCategories = async (req, res) => {
  try {
    const { orders } = req.body;
    if (!Array.isArray(orders)) {
      return res.status(400).json({ success: false, message: 'orders must be an array' });
    }

    const ops = orders.map(({ id, sortOrder }) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { sortOrder } },
      },
    }));

    await Category.bulkWrite(ops);
    await cacheDel('categories:*');
    res.json({ success: true, message: 'Categories reordered' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
