'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  ImagePlus,
  Upload,
  X,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  Plus,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SiteHeader } from '@/components/site-header';
import { sliderApi, type Slider, type SliderType } from '@/lib/api';

const TYPE_TABS: { value: SliderType; label: string; hint: string }[] = [
  {
    value: 'hero',
    label: 'Hero Slides',
    hint: 'Main carousel on the left (70% width)',
  },
  { value: 'ad_top', label: 'Top Ad', hint: 'Right-side top ad box' },
  { value: 'ad_bottom', label: 'Bottom Ad', hint: 'Right-side bottom ad box' },
];

const TYPE_LABEL: Record<SliderType, string> = {
  hero: 'Hero',
  ad_top: 'Top Ad',
  ad_bottom: 'Bottom Ad',
};

type SliderForm = {
  title: string;
  description: string;
  image: string;
  link: string;
  type: SliderType;
  active: boolean;
  sortOrder: number;
};

const emptyForm: SliderForm = {
  title: '',
  description: '',
  image: '',
  link: '',
  type: 'hero',
  active: true,
  sortOrder: 0,
};

const readFileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });

export default function SliderPage() {
  const [sliders, setSliders] = useState<Slider[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SliderType>('hero');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Slider | null>(null);
  const [form, setForm] = useState<SliderForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Slider | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const imageFileRef = useRef<File | null>(null);

  const fetchSliders = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await sliderApi.getAll();
      if (data.success) setSliders(data.sliders || []);
    } catch {
      toast.error('Failed to load sliders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSliders();
  }, [fetchSliders]);

  const groupByType = (t: SliderType) =>
    sliders
      .filter((s) => s.type === t)
      .sort((a, b) => a.sortOrder - b.sortOrder);

  const openCreate = (t: SliderType) => {
    setEditing(null);
    const list = groupByType(t);
    setForm({
      ...emptyForm,
      type: t,
      sortOrder: list.length
        ? Math.max(...list.map((s) => s.sortOrder)) + 1
        : 1,
    });
    setDialogOpen(true);
  };

  const openEdit = (s: Slider) => {
    setEditing(s);
    setForm({
      title: s.title,
      description: s.description,
      image: s.image,
      link: s.link,
      type: s.type,
      active: s.active,
      sortOrder: s.sortOrder,
    });
    setDialogOpen(true);
  };

  const handleImagePick = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Image must be under 4MB');
      return;
    }
    const dataUrl = await readFileToDataUrl(file);
    setForm((f) => ({ ...f, image: dataUrl }));
    imageFileRef.current = file;
    toast.success('Image loaded');
  };

  const handleSave = async () => {
    if (!form.image && !imageFileRef.current) {
      toast.error('Please upload an image or provide an image URL');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        ...form,
        sortOrder: Number(form.sortOrder) || 0,
        image: imageFileRef.current ? '' : form.image,
      };
      if (editing) {
        await sliderApi.update(editing._id, payload, imageFileRef.current);
        toast.success('Slide updated');
      } else {
        await sliderApi.create(payload, imageFileRef.current);
        toast.success('Slide created');
      }
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
      imageFileRef.current = null;
      fetchSliders();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || 'Failed to save slide'
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (s: Slider) => {
    try {
      await sliderApi.update(s._id, { active: !s.active });
      toast.success(`Slide ${s.active ? 'hidden' : 'activated'}`);
      fetchSliders();
    } catch {
      toast.error('Failed to update slide');
    }
  };

  const move = async (list: Slider[], idx: number, dir: -1 | 1) => {
    const swap = list[idx + dir];
    if (!swap) return;
    try {
      await sliderApi.reorder([
        { id: list[idx]._id, sortOrder: swap.sortOrder },
        { id: swap._id, sortOrder: list[idx].sortOrder },
      ]);
      fetchSliders();
    } catch {
      toast.error('Failed to reorder');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await sliderApi.delete(deleteTarget._id);
      toast.success('Slide deleted');
      setDeleteTarget(null);
      fetchSliders();
    } catch {
      toast.error('Failed to delete slide');
    }
  };

  return (
    <div>
      <SiteHeader
        title="Slider Management"
        description="Manage homepage hero slides and side ad boxes."
      />

      <div className="px-4 py-8">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as SliderType)}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <TabsList>
              {TYPE_TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <Button onClick={() => openCreate(activeTab)}>
              <Plus className="mr-2 h-4 w-4" /> Add {TYPE_LABEL[activeTab]}
            </Button>
          </div>

          {TYPE_TABS.map((t) => {
            const list = groupByType(t.value);
            return (
              <TabsContent key={t.value} value={t.value} className="mt-4">
                <p className="mb-3 text-sm text-muted-foreground">{t.hint}</p>
                <div className="space-y-3">
                  {loading ? (
                    <div className="flex items-center justify-center py-16 text-muted-foreground">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading
                      sliders...
                    </div>
                  ) : list.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
                      <ImagePlus className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        No {t.label.toLowerCase()} yet. Click{' '}
                        &quot;Add {TYPE_LABEL[t.value]}&quot; to create one.
                      </p>
                    </div>
                  ) : (
                    list.map((s, idx) => (
                      <Card key={s._id}>
                        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                          <div className="relative h-20 w-full shrink-0 overflow-hidden rounded-md border bg-muted sm:w-36">
                            {s.image ? (
                              <Image
                                src={s.image}
                                alt={s.title || 'Slide'}
                                fill
                                className="object-cover"
                                sizes="144px"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                <ImagePlus className="h-5 w-5" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-medium">
                                {s.title || 'Untitled slide'}
                              </p>
                              <Badge variant="secondary">
                                {TYPE_LABEL[s.type]}
                              </Badge>
                              <Badge
                                variant={s.active ? 'secondary' : 'destructive'}
                              >
                                {s.active ? 'Active' : 'Hidden'}
                              </Badge>
                            </div>
                            {s.description && (
                              <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                                {s.description}
                              </p>
                            )}
                            {s.link && (
                              <p className="mt-0.5 truncate text-xs text-blue-600">
                                Link: {s.link}
                              </p>
                            )}
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                Show:
                              </span>
                              <Switch
                                checked={s.active}
                                onCheckedChange={() => toggleActive(s)}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-1 sm:flex-col">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={idx === 0}
                              onClick={() => move(list, idx, -1)}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={idx === list.length - 1}
                              onClick={() => move(list, idx, 1)}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEdit(s)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(s)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>

      {/* Create / Edit dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          if (!o) imageFileRef.current = null;
          setDialogOpen(o);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit slide' : `New ${TYPE_LABEL[form.type]}`}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update the slide details and image.'
                : 'Add a new slide. Wide images (1600×600) work best.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            {/* Image */}
            <div className="grid gap-3">
              <div className="relative h-40 w-full overflow-hidden rounded-lg border bg-muted">
                {form.image ? (
                  <Image
                    src={form.image}
                    alt="Slide preview"
                    fill
                    className="object-cover"
                    sizes="(max-width: 672px) 100vw, 672px"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
                    <ImagePlus className="h-8 w-8" />
                    <span className="text-xs">No image</span>
                  </div>
                )}
                {form.image && (
                  <button
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, image: '' }));
                      imageFileRef.current = null;
                    }}
                    className="absolute right-2 top-2 rounded-full bg-background/90 p-1 shadow"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) =>
                  handleImagePick(e.target.files?.[0] ?? null)
                }
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" /> Upload image
                </Button>
                <div className="flex-1">
                  <Input
                    value={form.image}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, image: e.target.value }))
                    }
                    placeholder="https://… or upload"
                  />
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="grid gap-1.5">
              <Label htmlFor="slide-title">Title (optional)</Label>
              <Input
                id="slide-title"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="e.g. New Season Deals"
              />
            </div>

            {/* Description */}
            <div className="grid gap-1.5">
              <Label htmlFor="slide-desc">Description (optional)</Label>
              <Textarea
                id="slide-desc"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Short overlay text shown on the image"
                rows={2}
              />
            </div>

            {/* Link */}
            <div className="grid gap-1.5">
              <Label htmlFor="slide-link">Link (optional)</Label>
              <Input
                id="slide-link"
                value={form.link}
                onChange={(e) =>
                  setForm((f) => ({ ...f, link: e.target.value }))
                }
                placeholder="/product/example or https://…"
              />
            </div>

            {/* Type + Sort order */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      type: (v || 'hero') as SliderType,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hero">Hero Slide</SelectItem>
                    <SelectItem value="ad_top">Top Ad</SelectItem>
                    <SelectItem value="ad_bottom">Bottom Ad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="slide-order">Sort order</Label>
                <Input
                  id="slide-order"
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      sortOrder: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>

            {/* Active */}
            <div className="flex items-center gap-2">
              <Switch
                checked={form.active}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, active: v === true }))
                }
              />
              <span className="text-sm text-muted-foreground">
                Show this slide on the homepage
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save changes' : 'Create slide'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this slide?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.title || 'This slide'} will be permanently removed
              from the homepage. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep slide</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Delete slide
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
