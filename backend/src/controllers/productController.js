// backend/src/controllers/productController.js

import Product from '../models/Product.js';
import { cloudinary } from '../middleware/upload.js';
import slugify from 'slugify';
import { cacheGet, cacheSet, cacheDel } from '../config/redis.js';

// Normalize the optional PC-part metadata. Accepts an object or a JSON string
// (admin forms may send either). Returns null-ish when the product isn't a PC part.
const parsePcPart = (pcPart) => {
  let data = pcPart;
  if (typeof pcPart === 'string') {
    try {
      data = JSON.parse(pcPart);
    } catch {
      data = undefined;
    }
  }
  if (!data || typeof data !== 'object') return undefined;
  const enabled = data.enabled === true || data.enabled === 'true';
  if (!enabled) {
    return { enabled: false, type: '', socket: '', platform: '', formFactor: '', wattage: 0, specs: {} };
  }
  return {
    enabled: true,
    type: data.type || '',
    socket: data.socket || '',
    platform: data.platform || '',
    formFactor: data.formFactor || '',
    wattage: Number(data.wattage) || 0,
    specs: data.specs && typeof data.specs === 'object' ? data.specs : {},
  };
};

// @desc    Get PC-builder parts (products marked as pcPart.enabled)
// @route   GET /api/products/pc-parts
// @access  Public
export const getPcParts = async (req, res) => {
  try {
    const {
      type, socket, platform, formFactor,
      search, sort, page = 1, limit = 200,
      minPrice, maxPrice,
      minCores, maxCores,
      minVram, maxVram,
      series, generation, storageType, coolerType,
      ramType, efficiency, brand, panelType,
      minRefreshRate, maxRefreshRate,
      minCapacity, maxCapacity,
    } = req.query;

    const query = { 'pcPart.enabled': true, status: 'active' };
    if (type) query['pcPart.type'] = type;
    if (socket) query['pcPart.socket'] = socket;
    if (platform) query['pcPart.platform'] = platform;
    if (formFactor) query['pcPart.formFactor'] = formFactor;
    if (search) query.name = { $regex: search, $options: 'i' };

    // Price range (use discountPrice when available, else price)
    if (minPrice || maxPrice) {
      const priceFilter = {};
      if (minPrice) priceFilter.$gte = Number(minPrice);
      if (maxPrice) priceFilter.$lte = Number(maxPrice);
      query.$or = [
        { discountPrice: { ...priceFilter, $gt: 0 } },
        { price: priceFilter },
      ];
    }

    // CPU filters
    if (minCores || maxCores) {
      const f = {};
      if (minCores) f.$gte = Number(minCores);
      if (maxCores) f.$lte = Number(maxCores);
      query['pcPart.specs.cores'] = f;
    }
    if (series) query['pcPart.specs.series'] = series;
    if (generation) query['pcPart.specs.generation'] = generation;

    // GPU filters
    if (minVram || maxVram) {
      const f = {};
      if (minVram) f.$gte = Number(minVram);
      if (maxVram) f.$lte = Number(maxVram);
      query['pcPart.specs.vram'] = f;
    }
    if (brand) query['pcPart.specs.brand'] = brand;

    // Storage filters
    if (storageType) query['pcPart.specs.storageType'] = storageType;
    if (minCapacity || maxCapacity) {
      const f = {};
      if (minCapacity) f.$gte = Number(minCapacity);
      if (maxCapacity) f.$lte = Number(maxCapacity);
      query['pcPart.specs.capacity'] = f;
    }

    // RAM filters
    if (ramType) query['pcPart.specs.ramType'] = ramType;

    // Cooler filters
    if (coolerType) query['pcPart.specs.coolerType'] = coolerType;

    // PSU filters
    if (efficiency) query['pcPart.specs.efficiency'] = efficiency;

    // Monitor filters
    if (panelType) query['pcPart.specs.panelType'] = panelType;
    if (minRefreshRate || maxRefreshRate) {
      const f = {};
      if (minRefreshRate) f.$gte = Number(minRefreshRate);
      if (maxRefreshRate) f.$lte = Number(maxRefreshRate);
      query['pcPart.specs.refreshRate'] = f;
    }

    const sortOption = {};
    if (sort === 'price-asc') sortOption.price = 1;
    else if (sort === 'price-desc') sortOption.price = -1;
    else sortOption.name = 1;

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .select('name price discountPrice images stock brand pcPart slug')
      .sort(sortOption)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    res.json({
      success: true,
      count: products.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      products,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all products (with filters)
// @route   GET /api/products
// @access  Public
export const getAllProducts = async (req, res) => {
  try {
    const { category, minPrice, maxPrice, search, sort, page = 1, limit = 12, holiday } = req.query;

    // Try cache first (key includes the full query so each filter combo is cached separately)
    const cacheKey = `products:list:${JSON.stringify(req.query)}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const query = {};

    if (holiday === 'true' || holiday === true) {
      query.holiday = true;
    }
    if (category) {
      query.$or = [{ categories: category }, { category }];
    }
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) {
        query.price.$gte = Number(minPrice);
      }
      if (maxPrice) {
        query.price.$lte = Number(maxPrice);
      }
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOption = {};
    if (sort === 'price-asc') {
      sortOption.price = 1;
    } else if (sort === 'price-desc') {
      sortOption.price = -1;
    } else if (sort === 'newest') {
      sortOption.createdAt = -1;
    } else if (sort === 'rating') {
      sortOption.averageRating = -1;
    } else {
      sortOption.createdAt = -1;
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('ratings.user', 'name')
      .sort(sortOption)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const payload = {
      success: true,
      count: products.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      products,
    };
    await cacheSet(cacheKey, JSON.stringify(payload), Number(process.env.REDIS_TTL) || 300);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
export const getProductById = async (req, res) => {
  try {
    const cacheKey = `product:id:${req.params.id}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    const product = await Product.findById(req.params.id).populate('ratings.user', 'name');
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    await cacheSet(cacheKey, JSON.stringify({ success: true, product }), Number(process.env.REDIS_TTL) || 300);
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single product by slug
// @route   GET /api/products/slug/:slug
// @access  Public
export const getProductBySlug = async (req, res) => {
  try {
    const cacheKey = `product:slug:${req.params.slug}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    const product = await Product.findOne({ slug: req.params.slug }).populate('ratings.user', 'name');
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    await cacheSet(cacheKey, JSON.stringify({ success: true, product }), Number(process.env.REDIS_TTL) || 300);
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get products by category
// @route   GET /api/products/category/:category
// @access  Public
export const getProductsByCategory = async (req, res) => {
  try {
    const products = await Product.find({
      $or: [{ categories: req.params.category }, { category: req.params.category }],
    });
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new product (Admin only)
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = async (req, res) => {
  try {
    const { name, description, price, discountPrice, costPrice, category, stock, status, featured, holiday, specifications, sku, productCode, content, categories, slug, brand, imageAlts, metaTitle, metaDescription, focusKeyword, canonical, pcPart } = req.body;

    // Handle uploaded images
    const imageUrls = req.files ? req.files.map((file) => file.path) : [];

    const parseArray = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val.filter((v) => typeof v === 'string' && v.trim());
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string' && v.trim()) : [];
        } catch {
          return [val];
        }
      }
      return [];
    };

    const parsedCategories = parseArray(categories);
    const primaryCategory = parsedCategories.length > 0 ? parsedCategories[0] : category;

    const baseSlug =
      slug && String(slug).trim()
        ? slugify(String(slug), { lower: true, strict: true })
        : slugify(name, { lower: true, strict: true });

    const seo = {
      metaTitle: metaTitle ? String(metaTitle) : `${name} - Apple IT Zone`,
      metaDescription: metaDescription
        ? String(metaDescription)
        : description
          ? String(description).substring(0, 320)
          : '',
      focusKeyword: focusKeyword ? String(focusKeyword) : '',
      canonical: canonical ? String(canonical) : '',
    };

    const product = new Product({
      name,
      slug: baseSlug,
      description,
      price,
      discountPrice: discountPrice || 0,
      costPrice: costPrice || 0,
      category: primaryCategory || category,
      categories: parsedCategories,
      brand: brand || undefined,
      imageAlts: parseArray(imageAlts),
      stock,
      sku: sku || undefined,
      productCode: productCode || undefined,
      status: status || 'active',
      featured: featured === 'true' || featured === true,
      holiday: holiday === 'true' || holiday === true,
      specifications: specifications
        ? (typeof specifications === 'string' ? JSON.parse(specifications) : specifications)
        : {},
      content: content
        ? (typeof content === 'string' ? JSON.parse(content) : content)
        : [],
      seo,
      pcPart: parsePcPart(pcPart),
      images: imageUrls,
      createdBy: req.user._id,
    });

    await product.save();
    // Invalidate cached product lists + detail pages
    await cacheDel('products:*');
    await cacheDel('product:*');
    res.status(201).json({ success: true, product });
  } catch (error) {
    console.error('Create Product Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update product (Admin only)
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Update fields
    const { name, description, price, discountPrice, costPrice, category, stock, status, featured, holiday, specifications, sku, productCode, content, categories, slug, brand, imageAlts, metaTitle, metaDescription, focusKeyword, canonical, pcPart } = req.body;

    const parseArray = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val.filter((v) => typeof v === 'string' && v.trim());
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string' && v.trim()) : [];
        } catch {
          return [val];
        }
      }
      return [];
    };

    if (name) {
      product.name = name;
      if (!slug) {
        product.slug = slugify(name, { lower: true, strict: true });
      }
    }
    if (slug && String(slug).trim()) {
      product.slug = slugify(String(slug), { lower: true, strict: true });
    }
    if (description !== undefined) {
      product.description = description;
    }
    if (brand !== undefined) {
      product.brand = brand;
    }
    if (price) {
      product.price = price;
    }
    if (discountPrice !== undefined) {
      product.discountPrice = discountPrice;
    }
    if (costPrice !== undefined) {
      product.costPrice = costPrice;
    }
    if (category) {
      product.category = category;
    }
    if (categories !== undefined) {
      product.categories = parseArray(categories);
      if (product.categories.length > 0 && !category) {
        product.category = product.categories[0];
      }
    }
    if (stock !== undefined) {
      product.stock = stock;
    }
    if (sku !== undefined) {
      product.sku = sku;
    }
    if (productCode !== undefined) {
      product.productCode = productCode;
    }
    if (status) {
      product.status = status;
    }
    if (featured !== undefined) {
      product.featured = featured === 'true' || featured === true;
    }
    if (holiday !== undefined) {
      product.holiday = holiday === 'true' || holiday === true;
    }
    if (pcPart !== undefined) {
      product.pcPart = parsePcPart(pcPart) || product.pcPart;
    }
    if (specifications) {
      try {
        product.specifications = typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
      } catch {
        product.specifications = specifications;
      }
    }
    if (content) {
      try {
        product.content = typeof content === 'string' ? JSON.parse(content) : content;
      } catch {
        product.content = content;
      }
    }
    if (imageAlts !== undefined) {
      product.imageAlts = parseArray(imageAlts);
    }
    if (
      metaTitle !== undefined ||
      metaDescription !== undefined ||
      focusKeyword !== undefined ||
      canonical !== undefined
    ) {
      product.seo = product.seo || {};
      if (metaTitle !== undefined) {
        product.seo.metaTitle = metaTitle
          ? String(metaTitle)
          : `${product.name} - Apple IT Zone`;
      }
      if (metaDescription !== undefined) {
        product.seo.metaDescription = metaDescription
          ? String(metaDescription)
          : product.description
            ? String(product.description).substring(0, 320)
            : '';
      }
      if (focusKeyword !== undefined) {
        product.seo.focusKeyword = focusKeyword ? String(focusKeyword) : '';
      }
      if (canonical !== undefined) {
        product.seo.canonical = canonical ? String(canonical) : '';
      }
    }

    // If new images uploaded, replace old ones (optionally delete old from cloudinary)
    if (req.files && req.files.length > 0) {
      // Delete old images from Cloudinary (optional)
      for (const oldImage of product.images) {
        try {
          const publicId = oldImage.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`apple-it-zone/products/${publicId}`);
        } catch (err) {
          console.warn('Could not delete old image:', err.message);
        }
      }
      product.images = req.files.map((file) => file.path);
    }

    await product.save();
    // Invalidate cached product lists + detail pages
    await cacheDel('products:*');
    await cacheDel('product:*');
    res.json({ success: true, product });
  } catch (error) {
    console.error('Update Product Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add or update rating for a product
// @route   POST /api/products/:id/ratings
// @access  Private
export const addRating = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const existingIndex = product.ratings.findIndex(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (existingIndex > -1) {
      product.ratings[existingIndex].rating = rating;
      if (comment) {
        product.ratings[existingIndex].comment = comment;
      }
      product.ratings[existingIndex].createdAt = Date.now();
      // Re-submission requires admin approval again
      product.ratings[existingIndex].status = 'pending';
      product.ratings[existingIndex].featured = false;
    } else {
      product.ratings.push({
        user: req.user._id,
        rating,
        comment: comment || '',
      });
    }

    product.averageRating = product.calculateAverageRating();
    await product.save();
    // Average rating / review count changed — drop cached product detail
    await cacheDel('product:*');

    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete product (Admin only)
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Delete images from Cloudinary
    for (const imageUrl of product.images) {
      try {
        const publicId = imageUrl.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`apple-it-zone/products/${publicId}`);
      } catch (err) {
        console.warn('Could not delete image:', err.message);
      }
    }

    await product.deleteOne();
    // Invalidate cached product lists + detail pages
    await cacheDel('products:*');
    await cacheDel('product:*');
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete Product Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
