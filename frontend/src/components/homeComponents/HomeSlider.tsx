'use client';

import { sliderApi, type Slider } from '@/lib/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { StaticImageData } from 'next/image';
import Image from 'next/image';
import Link from 'next/link';
import React, { useCallback, useEffect, useState } from 'react';

// Backend-ready data interfaces
export interface SlideData {
  id: string;
  image: string | StaticImageData;
  title: string;
  description?: string;
  link?: string;
}

export interface AdBoxData {
  id: string;
  image: string | StaticImageData;
  title: string;
  description?: string;
  link?: string;
  position: 'top' | 'bottom';
}

export interface HomeSliderData {
  slides: SlideData[];
  adBoxes: AdBoxData[];
}

// Default placeholder data (shown only while loading or on error)
const defaultData: HomeSliderData = {
  slides: [
    {
      id: '1',
      image: '/1.webp',
      title: '',
      description: '',
      link: '#',
    },
    {
      id: '2',
      image: '/2.webp',
      title: '',
      description: '',
      link: '#',
    },
    {
      id: '3',
      image: '/3.webp',
      title: '',
      description: '',
      link: '#',
    },
  ],
  adBoxes: [
    {
      id: 'ad1',
      image: '/ad1.webp',
      title: '',
      description: '',
      link: '#',
      position: 'top',
    },
    {
      id: 'ad2',
      image: '/ad2.webp',
      title: '',
      description: '',
      link: '#',
      position: 'bottom',
    },
  ],
};

interface HomeSliderProps {
  data?: HomeSliderData;
}

const mapSliders = (sliders: Slider[]): HomeSliderData => {
  const slides = sliders
    .filter((s) => s.type === 'hero')
    .map((s) => ({
      id: s._id,
      image: s.image,
      title: s.title,
      description: s.description || undefined,
      link: s.link || undefined,
    }));

  const tops = sliders
    .filter((s) => s.type === 'ad_top')
    .map((s) => ({
      id: s._id,
      image: s.image,
      title: s.title,
      description: s.description || undefined,
      link: s.link || undefined,
      position: 'top' as const,
    }));

  const bottoms = sliders
    .filter((s) => s.type === 'ad_bottom')
    .map((s) => ({
      id: s._id,
      image: s.image,
      title: s.title,
      description: s.description || undefined,
      link: s.link || undefined,
      position: 'bottom' as const,
    }));

  return { slides, adBoxes: [...tops, ...bottoms] };
};

const HomeSlider: React.FC<HomeSliderProps> = ({ data }) => {
  const [fetchedData, setFetchedData] = useState<HomeSliderData | null>(null);
  const [loading, setLoading] = useState(!data);
  const [currentIndex, setCurrentIndex] = useState(0);

  const sliderData = data || fetchedData || defaultData;
  const slideCount = sliderData.slides.length;

  // Fetch live slides from the backend unless a `data` prop was provided
  useEffect(() => {
    if (data) return;
    let mounted = true;
    sliderApi
      .getAll({ active: true })
      .then(({ data: res }) => {
        if (mounted) setFetchedData(mapSliders(res.sliders || []));
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [data]);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (slideCount > 0 ? (prev + 1) % slideCount : 0));
  }, [slideCount]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) =>
      slideCount > 0 ? (prev - 1 + slideCount) % slideCount : 0
    );
  }, [slideCount]);

  // Auto-advance slider
  useEffect(() => {
    if (slideCount <= 1) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(timer);
  }, [nextSlide, slideCount]);

  // Keep currentIndex in bounds if slides change
  useEffect(() => {
    if (currentIndex >= slideCount) setCurrentIndex(0);
  }, [slideCount, currentIndex]);

  const slideVariants = {
    enter: {
      opacity: 0,
    },
    center: {
      opacity: 1,
    },
    exit: {
      opacity: 0,
    },
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="w-full">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:h-[clamp(360px,35vw,500px)] lg:grid-cols-10">
            <div className="aspect-video lg:col-span-7 lg:aspect-auto lg:h-full">
              <div className="relative h-full overflow-hidden rounded-xl bg-gray-200 animate-pulse" />
            </div>
            <div className="flex h-auto flex-row gap-4 lg:col-span-3 lg:h-full lg:flex-col lg:gap-6">
              <div className="aspect-4/3 min-w-0 flex-1 rounded-xl bg-gray-200 animate-pulse lg:aspect-auto" />
              <div className="aspect-4/3 min-w-0 flex-1 rounded-xl bg-gray-200 animate-pulse lg:aspect-auto" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state (no active slides)
  if (slideCount === 0) {
    return (
      <div className="w-full">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:h-[clamp(360px,35vw,500px)] lg:grid-cols-10">
            <div className="aspect-video rounded-xl bg-gray-100 lg:col-span-7 lg:aspect-auto" />
            <div className="flex h-auto flex-row gap-4 lg:col-span-3 lg:h-full lg:flex-col lg:gap-6">
              <div className="aspect-4/3 min-w-0 flex-1 rounded-xl bg-gray-100 lg:aspect-auto" />
              <div className="aspect-4/3 min-w-0 flex-1 rounded-xl bg-gray-100 lg:aspect-auto" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentSlide = sliderData.slides[currentIndex];
  const currentLink =
    currentSlide.link && currentSlide.link !== '#' ? currentSlide.link : null;

  return (
    <div className="w-full">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:h-[clamp(360px,35vw,500px)] lg:grid-cols-10">
          {/* Left Side - Main Slider (70% width on desktop) */}
          <div className="relative aspect-video lg:col-span-7 lg:aspect-auto lg:h-full">
            <div className="relative h-full overflow-hidden rounded-xl bg-gray-100">
              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={currentIndex}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    opacity: { duration: 0.8, ease: 'easeInOut' },
                  }}
                  className="absolute inset-0"
                >
                  {currentLink ? (
                    <Link href={currentLink} className="absolute inset-0">
                      <Image
                        src={currentSlide.image}
                        alt={currentSlide.title}
                        fill
                        className="object-cover object-center"
                        sizes="(max-width: 1024px) 100vw, 70vw"
                        loading="eager"
                      />
                      {currentSlide.title && (
                        <>
                          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                            <motion.h2
                              initial={{ y: 20, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: 0.2 }}
                              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2"
                            >
                              {currentSlide.title}
                            </motion.h2>
                            {currentSlide.description && (
                              <motion.p
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-sm sm:text-base text-gray-200 mb-4"
                              >
                                {currentSlide.description}
                              </motion.p>
                            )}
                          </div>
                        </>
                      )}
                    </Link>
                  ) : (
                    <>
                      <Image
                        src={currentSlide.image}
                        alt={currentSlide.title}
                        fill
                        className="object-cover object-center"
                        sizes="(max-width: 1024px) 100vw, 70vw"
                        loading="eager"
                      />
                      {currentSlide.title && (
                        <>
                          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                            <motion.h2
                              initial={{ y: 20, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: 0.2 }}
                              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2"
                            >
                              {currentSlide.title}
                            </motion.h2>
                            {currentSlide.description && (
                              <motion.p
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-sm sm:text-base text-gray-200 mb-4"
                              >
                                {currentSlide.description}
                              </motion.p>
                            )}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Navigation Buttons */}
              <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-colors z-10"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-colors z-10"
                aria-label="Next slide"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Dots Indicator */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {sliderData.slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentIndex ? 'bg-white w-6' : 'bg-white/50'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Side - Two Ad Boxes (30% width on desktop, horizontal on mobile) */}
          <div className="flex h-auto flex-row gap-4 lg:col-span-3 lg:h-full lg:flex-col lg:gap-6">
            {sliderData.adBoxes.map((adBox) => {
              const adLink =
                adBox.link && adBox.link !== '#' ? adBox.link : null;
              const adContent = (
                <>
                  <Image
                    src={adBox.image}
                    alt={adBox.title}
                    fill
                    className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 1024px) 100vw, 30vw"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-lg font-bold text-white mb-1">
                      {adBox.title}
                    </h3>
                    {adBox.description && (
                      <p className="text-sm text-gray-200">
                        {adBox.description}
                      </p>
                    )}
                  </div>
                </>
              );
              return (
                <motion.div
                  key={adBox.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: adBox.position === 'top' ? 0.4 : 0.5 }}
                  className="relative aspect-4/3 min-w-0 flex-1 overflow-hidden rounded-xl bg-gray-100 group cursor-pointer lg:aspect-auto lg:min-h-0"
                >
                  {adLink ? (
                    <Link href={adLink} className="absolute inset-0">
                      {adContent}
                    </Link>
                  ) : (
                    adContent
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeSlider;
