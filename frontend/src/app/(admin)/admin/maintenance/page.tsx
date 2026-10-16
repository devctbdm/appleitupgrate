'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Construction,
  Eye,
  Power,
  RefreshCw,
  Save,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store';
import { maintenanceApi, type MaintenanceStatus } from '@/lib/api';

function toLocalInput(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function toIso(input: string) {
  if (!input) return null;
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

const DEFAULT_MESSAGE =
  "We're working hard to improve Apple IT Zone and give you a better experience. We'll be back online shortly.";

export default function AdminMaintenancePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [endAt, setEndAt] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  useEffect(() => {
    if (!isLoading && user && user.role !== 'super_admin') {
      router.replace('/admin/dashboard');
    }
  }, [isLoading, user, router]);

  const load = async () => {
    try {
      const { data } = await maintenanceApi.getStatus();
      const m = data.maintenance;
      setEnabled(m.enabled);
      setMessage(m.message || DEFAULT_MESSAGE);
      setEndAt(toLocalInput(m.endAt));
      setContactEmail(m.contactEmail);
      setContactPhone(m.contactPhone);
    } catch {
      toast.error('Could not load maintenance settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSave = async (nextEnabled?: boolean) => {
    setSaving(true);
    try {
      const body: Partial<MaintenanceStatus> = {
        message,
        contactEmail,
        contactPhone,
        endAt: toIso(endAt),
      };
      if (typeof nextEnabled === 'boolean') body.enabled = nextEnabled;
      else body.enabled = enabled;

      const { data } = await maintenanceApi.update(body);
      setEnabled(data.maintenance.enabled);
      toast.success(
        data.maintenance.enabled
          ? 'Maintenance mode is now ON'
          : 'Maintenance mode is now OFF'
      );
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || 'Failed to save maintenance settings'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Maintenance Mode</h2>
          <p className="text-muted-foreground">
            Temporarily take the store offline for everyone except super admins.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-1" /> Reload
          </Button>
          <Link
            href="/maintenance"
            target="_blank"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'inline-flex items-center gap-1.5'
            )}
          >
            <Eye className="h-4 w-4" /> Preview
          </Link>
        </div>
      </div>

      {/* Status banner */}
      <Card
        className={
          enabled
            ? 'border-amber-500/60 bg-amber-50 dark:bg-amber-950/20'
            : ''
        }
      >
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                enabled
                  ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40'
                  : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30'
              }`}
            >
              <Construction className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold">
                  {enabled ? 'Maintenance mode is ON' : 'Store is live'}
                </p>
                <Badge variant={enabled ? 'destructive' : 'secondary'}>
                  {enabled ? 'ACTIVE' : 'OFFLINE'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {enabled
                  ? 'All visitors are seeing the maintenance page. Only super admins can access the store and dashboard.'
                  : 'No one is blocked. The maintenance page is hidden.'}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant={enabled ? 'destructive' : 'default'}
            onClick={() => handleSave(!enabled)}
            disabled={saving}
          >
            <Power className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : enabled ? 'Disable now' : 'Enable now'}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Settings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>
              These are shown on the maintenance page visitors see.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label>Maintenance mode</Label>
                <p className="text-sm text-muted-foreground">
                  Block all users except super admins.
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={DEFAULT_MESSAGE}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="endAt">Expected back online</Label>
                <Input
                  id="endAt"
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Optional. Shown as a countdown; leave empty to hide it.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact phone</Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+880 1234 567890"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="support@appleitzone.com"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={() => handleSave()} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save settings'}
              </Button>
              {enabled && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEnabled(false);
                    handleSave(false);
                  }}
                  disabled={saving}
                >
                  Turn off &amp; save
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle>What happens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <p>
                When enabled, <strong>everyone</strong> except the{" "}
                <strong>super admin</strong> is redirected to{" "}
                <code className="rounded bg-muted px-1">/maintenance</code> —
                including admins, managers and logged-in customers. Super admins
                keep full access to the store and dashboard so they can turn it
                off.
              </p>
            </div>
            <ul className="list-inside list-disc space-y-1">
              <li>Storefront pages are blocked (home, shop, checkout, login).</li>
              <li>Admin panel is blocked for non-super-admin staff.</li>
              <li>Changes apply within ~30 seconds.</li>
              <li>
                The maintenance page checks status every 10s, so it recovers
                automatically once you disable the mode.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
