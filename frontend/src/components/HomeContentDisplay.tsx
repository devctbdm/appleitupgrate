'use client';

import { homeContentApi } from '@/lib/api';
import { useEffect, useState } from 'react';

export default function HomeContentDisplay() {
  const [content, setContent] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const response = await homeContentApi.get();
        setContent(response.data.homeContent.content);
        setEnabled(response.data.homeContent.enabled);
      } catch (error) {
        console.error('Failed to load home page content:', error);
      } finally {
        setMounted(true);
      }
    };

    void loadContent();
  }, []);

  if (!mounted) {
    return null;
  }

  if (!enabled) {
    return null;
  }

  if (!content || content === '<p></p>') {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div
        className="rich-text max-w-none"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}
