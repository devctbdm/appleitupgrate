'use client';

import { useState } from 'react';
import { useCart } from '@/store';
import { Product } from '@/types/product';
import { Button } from '@/components/button/Button';

interface Props {
  product: Product;
  quantity?: number;
  disabled?: boolean;
}

const MIN_ADD_DURATION = 600;

export const AddToCartButton: React.FC<Props> = ({
  product,
  quantity = 1,
  disabled = false,
}) => {
  const { addItem, isLoading } = useCart();
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (adding) return;
    setAdding(true);
    try {
      const started = Date.now();
      const hasPromo =
        product.discountPrice > 0 && product.discountPrice < product.price;
      await addItem({
        productId: product._id,
        name: product.name,
        price: hasPromo ? product.discountPrice : product.price,
        promoDiscount: hasPromo ? product.price - product.discountPrice : 0,
        image: product.images[0],
        stock: product.stock,
        quantity,
      });
      const elapsed = Date.now() - started;
      const remaining = MIN_ADD_DURATION - elapsed;
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
    } finally {
      setAdding(false);
    }
  };

  return (
    <Button
      onClick={handleAdd}
      loading={adding || isLoading}
      fullWidth
      size="sm"
      disabled={disabled}
    >
      Add to Cart
    </Button>
  );
};
