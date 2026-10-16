'use client';
import { FeaturedProductsGrid } from './FeaturedProductsCard';
import { useState, useEffect } from 'react';
import { productApi } from '@/lib/api';
import type { RawProduct } from '@/lib/productMapper';

const FeaturedProducts = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<RawProduct[]>([]);

  useEffect(() => {
    let mounted = true;
    productApi
      .getAll({ limit: 12 })
      .then(({ data }) => {
        if (!mounted) return;
        const all = data.products || [];
        const featured = all.filter(
          (p) => p.featured && p.status !== 'draft'
        );
        setProducts(featured.length > 0 ? featured : all);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <div className="flex flex-col gap-8 py-4">
        <div className="flex flex-col gap-2 items-center justify-center">
          <h2 className="text-2xl font-bold">Featured Products</h2>
          <p className="text-gray-600 text-sm">
            Get Your Desired Product from Featured Products!
          </p>
        </div>
        <FeaturedProductsGrid
          products={products.map((p) => ({
            id: p._id,
            name: p.name,
            slug: p.slug,
            price: p.discountPrice > 0 ? p.discountPrice : p.price,
            comparePrice: p.discountPrice > 0 ? p.price : null,
            images: p.images || [],
            isFeatured: p.featured,
            category: {
              name:
                p.categories && p.categories.length > 0
                  ? p.categories[0]
                  : p.category,
              slug:
                (p.categories && p.categories.length > 0
                  ? p.categories[0]
                  : p.category
                )
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-'),
            },
          }))}
          columns={4}
          imageHeight={220}
          showCategory={true}
          isLoading={isLoading}
          skeletonCount={8}
        />
      </div>
    </>
  );
};

export default FeaturedProducts;
