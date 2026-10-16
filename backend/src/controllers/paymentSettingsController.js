import PaymentGateway from '../models/PaymentGateway.js';

export const getPaymentGateways = async (req, res) => {
  try {
    const gateways = await PaymentGateway.find().sort({ name: 1 });
    res.json({ success: true, gateways });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getActivePaymentGateways = async (req, res) => {
  try {
    const gateways = await PaymentGateway.find({ enabled: true }).sort({ name: 1 });
    const safe = gateways.map((g) => ({
      name: g.name,
      label: g.config?.label || g.name,
      description: g.config?.description || '',
    }));
    res.json({ success: true, gateways: safe });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePaymentGateway = async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled, config } = req.body;

    let gateway = await PaymentGateway.findOne({ name: id });

    if (!gateway) {
      gateway = new PaymentGateway({
        name: id,
        enabled: enabled ?? false,
        config: config ?? {},
      });
    } else {
      if (typeof enabled === 'boolean') {
        gateway.enabled = enabled;
      }
      if (config && typeof config === 'object') {
        gateway.config = { ...gateway.config, ...config };
      }
    }

    await gateway.save();
    res.json({ success: true, gateway });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
