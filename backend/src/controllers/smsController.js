import AuditLog from '../models/AuditLog.js';
import SmsLog from '../models/SmsLog.js';
import { getSmsSetting } from '../models/SmsSetting.js';
import { sendSms as sendSmsService } from '../services/smsService.js';

const BULKSMS_BASE = 'https://bulksmsbd.net/api';

// @desc    Get SMS settings (admin only)
// @route   GET /api/sms/settings
export const getSettings = async (req, res) => {
  try {
    const setting = await getSmsSetting();
    res.json({
      success: true,
      settings: {
        provider: setting.provider || 'bulksmsbd',
        apiKey: setting.apiKey || '',
        gatewayUrl: setting.gatewayUrl || '',
        gatewayApiKey: setting.gatewayApiKey || '',
        gatewayApiKeyVariable: setting.gatewayApiKeyVariable || 'api_key',
        gatewaySmsType: setting.gatewaySmsType || 'url',
        senderId: setting.senderId || '',
        signature: setting.signature || '',
        enabled: !!setting.enabled,
        twoFactorEnabled: !!setting.twoFactorEnabled,
        otpExpirySeconds: setting.otpExpirySeconds || 60,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update SMS settings (admin only)
// @route   PUT /api/sms/settings
export const updateSettings = async (req, res) => {
  try {
    const {
      provider, apiKey, senderId, signature, enabled, twoFactorEnabled,
      otpExpirySeconds, gatewayUrl, gatewayApiKey, gatewayApiKeyVariable, gatewaySmsType,
    } = req.body;

    const setting = await getSmsSetting();
    const before = {
      twoFactorEnabled: !!setting.twoFactorEnabled,
      otpExpirySeconds: setting.otpExpirySeconds || 60,
    };
    const wantsTwoFactorChange =
      typeof twoFactorEnabled === 'boolean' ||
      typeof otpExpirySeconds === 'number';

    if (provider === 'bulksmsbd' || provider === 'rtcom') setting.provider = provider;
    if (typeof apiKey === 'string') setting.apiKey = apiKey.trim();
    if (typeof gatewayUrl === 'string') setting.gatewayUrl = gatewayUrl.trim();
    if (typeof gatewayApiKey === 'string') setting.gatewayApiKey = gatewayApiKey.trim();
    if (typeof gatewayApiKeyVariable === 'string') {
      setting.gatewayApiKeyVariable = gatewayApiKeyVariable.trim() || 'api_key';
    }
    if (gatewaySmsType === 'url') setting.gatewaySmsType = gatewaySmsType;
    if (typeof senderId === 'string') setting.senderId = senderId.trim();
    if (typeof signature === 'string') setting.signature = signature.trim();
    if (typeof enabled === 'boolean') setting.enabled = enabled;
    if (typeof twoFactorEnabled === 'boolean') setting.twoFactorEnabled = twoFactorEnabled;
    if (typeof otpExpirySeconds === 'number') {
      setting.otpExpirySeconds = Math.min(
        900,
        Math.max(15, Math.floor(otpExpirySeconds))
      );
    }
    await setting.save();

    // Audit 2FA setting changes (super-admin only by the route gate).
    if (wantsTwoFactorChange) {
      const after = {
        twoFactorEnabled: !!setting.twoFactorEnabled,
        otpExpirySeconds: setting.otpExpirySeconds || 60,
      };
      await AuditLog.create({
        actor: { id: req.user?._id, name: req.user?.name, role: req.user?.role },
        action: 'update_2fa_settings',
        target: 'SmsSetting',
        changes: { before, after },
        ip: req.ip || req.connection?.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
      });
    }

    res.json({
      success: true,
      settings: {
        provider: setting.provider || 'bulksmsbd',
        apiKey: setting.apiKey || '',
        gatewayUrl: setting.gatewayUrl || '',
        gatewayApiKey: setting.gatewayApiKey || '',
        gatewayApiKeyVariable: setting.gatewayApiKeyVariable || 'api_key',
        gatewaySmsType: setting.gatewaySmsType || 'url',
        senderId: setting.senderId || '',
        signature: setting.signature || '',
        enabled: !!setting.enabled,
        twoFactorEnabled: !!setting.twoFactorEnabled,
        otpExpirySeconds: setting.otpExpirySeconds || 60,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Check bulksmsbd.net account balance (admin only)
// @route   GET /api/sms/balance
export const getBalance = async (req, res) => {
  try {
    const setting = await getSmsSetting();
    if (!setting.apiKey) {
      return res.status(400).json({
        success: false,
        message: 'API key not configured. Save it in SMS settings first.',
      });
    }
    const url = `${BULKSMS_BASE}/getBalanceApi?api_key=${encodeURIComponent(setting.apiKey)}`;
    const resp = await fetch(url);
    const data = await resp.json();
    const balance =
      data?.balance ?? data?.data?.balance ?? data?.currentBalance ?? null;
    res.json({
      success: true,
      balance: balance != null && balance !== '' ? Number(balance) : null,
      raw: data,
    });
  } catch (error) {
    console.error('SMS Balance Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send an SMS via bulksmsbd.net (admin only)
// @route   POST /api/sms/send
export const sendSms = async (req, res) => {
  try {
    const { numbers, message, senderId } = req.body;
    if (!numbers) {
      return res.status(400).json({ success: false, message: 'Please provide at least one phone number' });
    }
    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    }

    const result = await sendSmsService({ numbers, message, senderId });

    if (result.skipped) {
      return res.status(400).json({ success: false, message: result.reason });
    }
    if (result.numbers.length === 0) {
      return res.status(400).json({
        success: false,
        message: result.reason || 'No valid Bangladesh phone numbers provided',
      });
    }

    res.json({
      success: result.success,
      log: result.log,
      provider: result.log?.raw || {},
      providerMessage: result.log?.providerMessage || '',
      numbers: result.numbers,
    });
  } catch (error) {
    console.error('SMS Send Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Paginated SMS send history (admin only)
// @route   GET /api/sms/logs
export const getLogs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 15));
    const total = await SmsLog.countDocuments();
    const logs = await SmsLog.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    res.json({
      success: true,
      logs,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
