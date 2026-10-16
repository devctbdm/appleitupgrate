'use client';

import { useEffect, useState } from 'react';
import Marquee from '@/components/homeComponents/Marquee';
import { homeSliderTextApi, homeSliderSettingApi } from '@/lib/api';


export default function NotifidText() {
  const [texts, setTexts] = useState<string[]>([]);
  const [settingEnabled, setSettingEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      homeSliderTextApi.getAll({ active: true }),
      homeSliderSettingApi.get(),
    ])
      .then(([textsRes, settingRes]) => {
        if (!alive) return;
        const list = (textsRes.data.texts || [])
          .map((t) => t.text)
          .filter((t) => t && t.trim());
        setTexts(list);
        setSettingEnabled(settingRes.data.setting?.enabled !== false);
      })
      .catch(() => {
        /* keep fallback */
      })
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Hidden while loading (prevents a flash of an empty bar) and when the
  // admin has switched the marquee off from /admin/homeslidertext.
  if (!loaded || !settingEnabled) return null;

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
