'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Store,
  CreditCard,
  Truck,
  Bell,
  Users,
  ShieldCheck,
  Save,
  Upload,
  AlertTriangle,
  ShieldAlert,
  ShieldBan,
  Smartphone,
  KeyRound,
  CheckCircle2,
  X,
  Pencil,
  Settings2,
  FlaskConical,
} from 'lucide-react';
import {
  teamApi,
  authApi,
  storeApi,
  paymentSettingsApi,
  smsApi,
  type TeamMember,
  type Session,
  type PaymentGateway,
} from '@/lib/api';
import { toast } from 'sonner';
import { SiteHeader } from '@/components/site-header';
import Link from 'next/link';

type ShippingZone = {
  id: string;
  name: string;
  regions: string;
  rate: string;
  cost: string;
};

const shippingZones: ShippingZone[] = [
  {
    id: '1',
    name: 'North America',
    regions: 'USA, Canada, Mexico',
    rate: 'Flat Rate',
    cost: '$5.00',
  },
  {
    id: '2',
    name: 'Europe',
    regions: 'UK, DE, FR, IT, ES',
    rate: 'Weight Based',
    cost: 'Varies',
  },
  {
    id: '3',
    name: 'Asia Pacific',
    regions: 'JP, AU, SG, KR',
    rate: 'Flat Rate',
    cost: '$12.00',
  },
  {
    id: '4',
    name: 'Rest of World',
    regions: 'All other countries',
    rate: 'Flat Rate',
    cost: '$25.00',
  },
];

const userColors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-orange-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-red-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-rose-500',
  'bg-cyan-500',
];

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    storeName: '',
    storeUrl: '',
    email: '',
    phone: '',
    description: '',
  });

  const [isDirty, setIsDirty] = useState(false);

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  // Business details state
  const [businessDetails, setBusinessDetails] = useState({
    currency: 'bdt',
    timezone: 'gmt+6',
    address: '',
  });

  // Payment preferences state
  const [paymentPreferences, setPaymentPreferences] = useState({
    platformFee: '2.5',
    taxRate: '8.25',
    minPayout: '25.00',
  });

  // Push notifications state
  const [pushNotifications, setPushNotifications] = useState({
    browserPush: true,
    mobilePush: false,
  });

  // Notification toggles state
  const [notifications, setNotifications] = useState({
    orders: true,
    marketing: false,
    security: true,
    stock: true,
    newsletter: false,
  });

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const fetchSessions = useCallback(async () => {
    try {
      const { data } = await authApi.getSessions();
      if (data.success) setSessions(data.sessions);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await smsApi.getSettings();
        if (data.success) {
          setTwoFactorEnabled(!!data.settings.twoFactorEnabled);
          setOtpExpirySeconds(data.settings.otpExpirySeconds || 60);
          setSmsConfigured(!!data.settings.apiKey);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const handleSave2fa = async () => {
    setLoading2fa(true);
    try {
      const { data } = await smsApi.updateSettings({
        twoFactorEnabled,
        otpExpirySeconds,
      });
      if (data.success) {
        setTwoFactorEnabled(!!data.settings.twoFactorEnabled);
        setOtpExpirySeconds(data.settings.otpExpirySeconds || 60);
        toast.success('Two-factor authentication settings saved');
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || 'Failed to save 2FA settings'
      );
    } finally {
      setLoading2fa(false);
    }
  };

  const handleRevokeSession = async (id: string) => {
    try {
      await authApi.revokeSession(id);
      setSessions((prev) => prev.filter((s) => s._id !== id));
      toast.success('Session revoked');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to revoke session');
    }
  };

  // Password strength state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);

  // Two-factor authentication (SMS) state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [otpExpirySeconds, setOtpExpirySeconds] = useState(60);
  const [loading2fa, setLoading2fa] = useState(false);
  const [smsConfigured, setSmsConfigured] = useState(true);

  const getPasswordStrength = (pw: string) => {
    let score = 0;
    if (pw.length > 5) score++;
    if (pw.length > 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    try {
      setChangingPassword(true);
      await authApi.changePassword({ currentPassword, newPassword });
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to update password';
      toast.error(msg);
    } finally {
      setChangingPassword(false);
    }
  };

  const fetchStoreSettings = useCallback(async () => {
    try {
      const { data } = await storeApi.get();
      if (data.success) {
        setProfileForm({
          storeName: data.settings.storeName || '',
          storeUrl: data.settings.storeUrl || '',
          email: data.settings.email || '',
          phone: data.settings.phone || '',
          description: data.settings.description || '',
        });
        setBusinessDetails({
          currency: data.settings.currency || 'bdt',
          timezone: data.settings.timezone || 'gmt+6',
          address: data.settings.address || '',
        });
        setIsDirty(false);
      }
    } catch {
      toast.error('Failed to load store settings');
    }
  }, []);

  useEffect(() => {
    fetchStoreSettings();
  }, [fetchStoreSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await storeApi.update({ ...profileForm, ...businessDetails });
      toast.success('Settings saved');
      setIsDirty(false);
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="bg-card sticky top-0 z-30">
        <div className="flex items-center justify-between px-4">
          <div >
          <h2>Settings</h2>
          <p>Manage your store preferences and configuration</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className="gap-2 mx-4 my-4"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
        </div>
      </div>

      <div className="px-4 py-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-8">
            <TabsTrigger value="profile" className="gap-2">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>

            <TabsTrigger value="security" className="gap-2">
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
          </TabsList>

          {/* ==================== STORE PROFILE TAB ==================== */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Store Profile</CardTitle>
                <CardDescription>
                  Update your store details, branding, and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="storeName">Store Name</Label>
                    <Input
                      id="storeName"
                      value={profileForm.storeName}
                      onChange={(e) => {
                        markDirty();
                        setProfileForm((prev) => ({
                          ...prev,
                          storeName: e.target.value,
                        }));
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storeUrl">Store URL</Label>
                    <Input
                      id="storeUrl"
                      value={profileForm.storeUrl}
                      onChange={(e) => {
                        markDirty();
                        setProfileForm((prev) => ({
                          ...prev,
                          storeUrl: e.target.value,
                        }));
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Contact Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => {
                        markDirty();
                        setProfileForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }));
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={profileForm.phone}
                      onChange={(e) => {
                        markDirty();
                        setProfileForm((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }));
                      }}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">Store Description</Label>
                    <Textarea
                      id="description"
                      rows={3}
                      value={profileForm.description}
                      onChange={(e) => {
                        markDirty();
                        setProfileForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }));
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Business Details</CardTitle>
                <CardDescription>
                  Address, timezone, and currency settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Default Currency</Label>
                    <Select
                      value={businessDetails.currency}
                      onValueChange={(val) => {
                        markDirty();
                        setBusinessDetails((prev) => ({
                          ...prev,
                          currency: val || 'BDT',
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="w-60">
                        <SelectItem value="BDT">
                          BDT (৳) — Bangladeshi Taka
                        </SelectItem>
                        <SelectItem value="USD">USD ($) — US Dollar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={businessDetails.timezone}
                      onValueChange={(val) => {
                        markDirty();
                        setBusinessDetails((prev) => ({
                          ...prev,
                          timezone: val || 'gmt+6',
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gmt+6">
                          GMT+06:00 (Bangladesh)
                        </SelectItem>
                        <SelectItem value="gmt+0">GMT+00:00 (UTC)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Business Address</Label>
                    <Textarea
                      id="address"
                      rows={2}
                      value={businessDetails.address}
                      onChange={(e) => {
                        markDirty();
                        setBusinessDetails((prev) => ({
                          ...prev,
                          address: e.target.value,
                        }));
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== SECURITY TAB ==================== */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <div className="space-y-1 pt-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            i <= passwordStrength ? 'bg-green-500' : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {passwordStrength < 3 ? (
                        <>
                          <AlertTriangle className="h-3 w-3 text-yellow-500" />
                          Use 8+ characters, numbers & symbols
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          Strong password
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                >
                  {changingPassword ? 'Updating...' : 'Update Password'}
                </Button>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <ShieldAlert className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      Two-Factor Authentication
                    </CardTitle>
                    <CardDescription>
                      Add an extra layer of security
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="font-medium">
                        Require SMS code on admin login
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Staff (admin / manager / super admin) must enter a code
                        sent to their phone before signing in.
                      </div>
                    </div>
                    <Switch
                      checked={twoFactorEnabled}
                      onCheckedChange={setTwoFactorEnabled}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="otpExpiry">Code valid for</Label>
                    <Select
                      value={String(otpExpirySeconds)}
                      onValueChange={(v) => setOtpExpirySeconds(Number(v))}
                    >
                      <SelectTrigger id="otpExpiry" className="sm:w-56">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 seconds</SelectItem>
                        <SelectItem value="60">1 minute</SelectItem>
                        <SelectItem value="90">1 minute 30 seconds</SelectItem>
                        <SelectItem value="120">2 minutes</SelectItem>
                        <SelectItem value="180">3 minutes</SelectItem>
                        <SelectItem value="300">5 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {!smsConfigured && (
                    <p className="text-xs text-amber-600">
                      SMS is not configured yet. Add your bulksmsbd API key in
                      the{' '}
                      <Link href="/admin/sms" className="underline">
                        SMS settings
                      </Link>{' '}
                      page before enabling this.
                    </p>
                  )}

                  <Button onClick={handleSave2fa} disabled={loading2fa}>
                    <Save className="h-4 w-4 mr-2" />
                    {loading2fa ? 'Saving...' : 'Save 2FA settings'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Smartphone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Login Sessions</CardTitle>
                    <CardDescription>
                      Manage your active devices
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No active sessions
                    </p>
                  ) : (
                    sessions.map((session) => (
                      <div
                        key={session._id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted"
                      >
                        <div className="flex items-center gap-3">
                          {session.isCurrent ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <ShieldBan className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div>
                            <div className="text-sm font-medium">
                              {session.browser} on {session.os} —{' '}
                              {session.device}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {session.isCurrent
                                ? 'Current session'
                                : new Date(session.lastActive).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        {session.isCurrent ? (
                          <Badge variant="secondary">Active</Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRevokeSession(session._id)}
                          >
                            Revoke
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
