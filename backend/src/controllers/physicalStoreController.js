import PhysicalStore from '../models/PhysicalStore.js';
import {
  getPhysicalStoreSetting,
} from '../models/PhysicalStoreSetting.js';

const toBool = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true' || value === '1';
  return undefined;
};

// Accepts either a real array (JSON body) or a JSON string (multipart body).
const normalizePhones = (value) => {
  let list = value;
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list
    .map((p) => ({
      label: String(p?.label ?? '').trim().slice(0, 40),
      number: String(p?.number ?? '').trim().slice(0, 40),
    }))
    .filter((p) => p.label || p.number);
};

const settingResponse = (setting, count) => ({
  enabled: setting.enabled !== false,
  title: setting.title ?? 'Physical Stores',
  subtitle: setting.subtitle ?? '',
  description: setting.description ?? '',
  buttonLabel: setting.buttonLabel ?? '',
  buttonLink: setting.buttonLink ?? '/physical-stores',
  bannerUrl: setting.bannerUrl ?? '',
  showCount: setting.showCount !== false,
  countSuffix: setting.countSuffix ?? '+',
  count,
});

// @desc    Get all physical stores (active first for storefront, admin sees all)
// @route   GET /api/physical-stores
// @access  Public
export const getAllPhysicalStores = async (req, res) => {
  try {
    const { active } = req.query;
    const query = {};
    if (active === 'true') query.active = true;

    const stores = await PhysicalStore.find(query).sort({
      sortOrder: 1,
      createdAt: 1,
    });
    res.json({ success: true, stores });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get the banner setting + active store count
// @route   GET /api/physical-stores/setting
// @access  Public
export const getPhysicalStoreSettingStatus = async (req, res) => {
  try {
    const setting = await getPhysicalStoreSetting();
    const count = await PhysicalStore.countDocuments({ active: true });
    res.json({ success: true, setting: settingResponse(setting, count) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update the banner setting
// @route   PUT /api/physical-stores/setting
// @access  Private/Admin
export const updatePhysicalStoreSettingStatus = async (req, res) => {
  try {
    const setting = await getPhysicalStoreSetting();
    const body = req.body || {};

    const enabled = toBool(body.enabled);
    if (enabled !== undefined) setting.enabled = enabled;

    const showCount = toBool(body.showCount);
    if (showCount !== undefined) setting.showCount = showCount;

    if (typeof req.body.title === 'string') setting.title = req.body.title;
    if (typeof req.body.subtitle === 'string') setting.subtitle = req.body.subtitle;
    if (typeof req.body.description === 'string')
      setting.description = req.body.description;
    if (typeof req.body.buttonLabel === 'string')
      setting.buttonLabel = req.body.buttonLabel;
    if (typeof req.body.buttonLink === 'string') setting.buttonLink = req.body.buttonLink;
    if (typeof req.body.countSuffix === 'string')
      setting.countSuffix = req.body.countSuffix;

    // Uploaded banner image takes priority; otherwise allow a URL / clearing it.
    if (req.file?.path) {
      setting.bannerUrl = req.file.path;
    } else if (typeof req.body.bannerUrl === 'string') {
      setting.bannerUrl = req.body.bannerUrl;
    }

    await setting.save();

    const count = await PhysicalStore.countDocuments({ active: true });
    res.json({ success: true, setting: settingResponse(setting, count) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single physical store
// @route   GET /api/physical-stores/:id
// @access  Public
export const getPhysicalStoreById = async (req, res) => {
  try {
    const store = await PhysicalStore.findById(req.params.id);
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }
    res.json({ success: true, store });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a physical store
// @route   POST /api/physical-stores
// @access  Private/Admin
export const createPhysicalStore = async (req, res) => {
  try {
    const {
      title,
      address,
      description,
      phones,
      openTime,
      closeTime,
      offDay,
      mapUrl,
      active,
      sortOrder,
    } = req.body;

    if (!title || !String(title).trim()) {
      return res
        .status(400)
        .json({ success: false, message: 'Store title is required' });
    }

    const store = new PhysicalStore({
      title: String(title).trim(),
      address: address || '',
      description: description || '',
      phones: normalizePhones(phones),
      openTime: openTime || '',
      closeTime: closeTime || '',
      offDay: offDay || '',
      mapUrl: mapUrl || '',
      active: toBool(active) ?? true,
      sortOrder: Number(sortOrder) || 0,
      createdBy: req.user?._id || null,
    });

    await store.save();
    res.status(201).json({ success: true, store });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update a physical store
// @route   PUT /api/physical-stores/:id
// @access  Private/Admin
export const updatePhysicalStore = async (req, res) => {
  try {
    const store = await PhysicalStore.findById(req.params.id);
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    const {
      title,
      address,
      description,
      phones,
      openTime,
      closeTime,
      offDay,
      mapUrl,
      active,
      sortOrder,
    } = req.body;

    if (title !== undefined) {
      if (!String(title).trim()) {
        return res
          .status(400)
          .json({ success: false, message: 'Store title is required' });
      }
      store.title = String(title).trim();
    }
    if (address !== undefined) store.address = address;
    if (description !== undefined) store.description = description;
    if (phones !== undefined) store.phones = normalizePhones(phones);
    if (openTime !== undefined) store.openTime = openTime;
    if (closeTime !== undefined) store.closeTime = closeTime;
    if (offDay !== undefined) store.offDay = offDay;
    if (mapUrl !== undefined) store.mapUrl = mapUrl;
    const activeVal = toBool(active);
    if (activeVal !== undefined) store.active = activeVal;
    if (sortOrder !== undefined) store.sortOrder = Number(sortOrder) || 0;

    await store.save();
    res.json({ success: true, store });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete a physical store
// @route   DELETE /api/physical-stores/:id
// @access  Private/Admin
export const deletePhysicalStore = async (req, res) => {
  try {
    const store = await PhysicalStore.findById(req.params.id);
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    await store.deleteOne();
    res.json({ success: true, message: 'Store deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reorder physical stores
// @route   PUT /api/physical-stores/reorder
// @access  Private/Admin
export const reorderPhysicalStores = async (req, res) => {
  try {
    const { orders } = req.body;
    if (!Array.isArray(orders)) {
      return res
        .status(400)
        .json({ success: false, message: 'Orders must be an array' });
    }

    for (const { id, sortOrder } of orders) {
      await PhysicalStore.findByIdAndUpdate(id, { sortOrder });
    }

    res.json({ success: true, message: 'Stores reordered' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
