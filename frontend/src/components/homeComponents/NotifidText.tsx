'use client';

import { useEffect, useState } from 'react';
import Marquee from '@/components/homeComponents/Marquee';
import { homeSliderTextApi } from '@/lib/api';


export default function NotifidText() {
  const [texts, setTexts] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    homeSliderTextApi
      .getAll({ active: true })
      .then(({ data }) => {
        if (!alive) return;
        const list = (data.texts || [])
          .map((t) => t.text)
          .filter((t) => t && t.trim());
        if (list.length) setTexts(list);
      })
      .catch(() => {
        /* keep fallback */
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="bg-gray-100 rounded-md py-2">
      <Marquee speed="slow">
        {texts.map((notification, index) => (
          <span key={index}>{notification}</span>
        ))}
      </Marquee>
    </div>
  );
}
