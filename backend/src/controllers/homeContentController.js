import HomeContent from '../models/HomeContent.js';

const toResponse = (content) => ({
  _id: content?._id || null,
  content: content?.content || '',
  enabled: content?.enabled ?? true,
  createdAt: content?.createdAt || null,
  updatedAt: content?.updatedAt || null,
});

// @desc    Get home page content
// @route   GET /api/home-content
// @access  Public
export const getHomeContent = async (req, res) => {
  try {
    const content = await HomeContent.findOne().sort({ createdAt: 1 });
    res.json({ success: true, homeContent: toResponse(content) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create or update home page content
// @route   PUT /api/home-content
// @access  Private/Admin
export const upsertHomeContent = async (req, res) => {
  try {
    const updates = {};
    if (typeof req.body.content === 'string') updates.content = req.body.content;
    if (typeof req.body.enabled === 'boolean') updates.enabled = req.body.enabled;
    updates.updatedBy = req.user?._id || null;

    const content = await HomeContent.findOneAndUpdate(
      {},
      { $set: updates },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );

    res.json({ success: true, homeContent: toResponse(content) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete home page content
// @route   DELETE /api/home-content
// @access  Private/Admin
export const deleteHomeContent = async (req, res) => {
  try {
    await HomeContent.deleteMany({});
    res.json({ success: true, message: 'Home page content deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};