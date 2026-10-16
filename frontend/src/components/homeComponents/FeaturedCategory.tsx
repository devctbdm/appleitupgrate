"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { categoryApi } from "@/lib/api";
import type { Category } from "@/lib/api";

const FeaturedCategory = () => {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    categoryApi
      .getAll()
      .then(({ data }) => {
        if (data.success) setCategories(data.categories || []);
      })
      .catch(() => {});
  }, []);

  const featuredCategories = categories
    .filter((cat) => cat.featured && cat.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, 7);

  return (
    <>
      <div className="flex flex-col gap-8 py-4">
        <div className="flex flex-col gap-2 items-center justify-center">
          <h2 className="text-2xl font-bold">Featured Category</h2>
          <p className="text-gray-600 text-sm">
            Get Your Desired Product from Featured Category!
          </p>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {featuredCategories.map((category) => (
            <Link
              key={category._id}
              href={`/products/${category.slug}`}
              className="flex gap-2 flex-col justify-center items-center border border-gray-200 rounded-lg p-4 hover:border-gray-400 transition-colors cursor-pointer"
            >
              {category.imageUrl && (
                <div className="relative w-12 h-12">
                  <Image
                    src={category.imageUrl}
                    alt={category.name}
                    fill
                    className="object-contain"
                    sizes="48px"
                  />
                </div>
              )}
              <h3>{category.name}</h3>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
};

export default FeaturedCategory;
