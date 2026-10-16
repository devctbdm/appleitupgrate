import TeamMember from '../models/TeamMember.js';

export const getTeamMembers = async (req, res) => {
  try {
    const members = await TeamMember.find()
      .select('-password')
      .sort({ createdAt: -1 });
    res.json({ success: true, members });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createTeamMember = async (req, res) => {
  try {
    const { name, email, password, role, active } = req.body;
    const existing = await TeamMember.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    // Use new + save so the schema pre('save') hook hashes the password.
    const member = new TeamMember({
      name,
      email: email.toLowerCase(),
      password,
      role,
      active,
    });
    await member.save();

    res.status(201).json({ success: true, member });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTeamMember = async (req, res) => {
  try {
    const { name, email, role, active, password } = req.body;
    const member = await TeamMember.findById(req.params.id).select('+password');
    if (!member) {
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }

    if (name !== undefined) member.name = name;
    if (email !== undefined) member.email = email.toLowerCase();
    if (role !== undefined) member.role = role;
    if (typeof active === 'boolean') member.active = active;
    if (password && password.trim()) member.password = password;

    // save() triggers the pre('save') hook so new passwords get hashed.
    await member.save();

    member.password = undefined;
    res.json({ success: true, member });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteTeamMember = async (req, res) => {
  try {
    const member = await TeamMember.findByIdAndDelete(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }
    res.json({ success: true, message: 'Team member deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};