import React, { useState, useEffect } from 'react';
import { Autoplay, Navigation, Virtual } from 'swiper/modules';
import { Swiper } from 'swiper/react';
import 'swiper/swiper-bundle.css';
import { DoronSwiperSlide } from './SwiperSlide';
import { DoronImage } from './Image';

export const DoronSlider: React.FC = () => {
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = () => {
    const newPhotos = Array.from({ length: 20 }, (_, idx) => `https://cataas.com/cat?${Math.random()}&idx=${idx}`);
    setPhotos((prev) => [...prev, ...newPhotos]);
  };

  const handleReachEnd = () => {
    fetchPhotos();
  };

  return (
    <Swiper
      modules={[Autoplay, Navigation, Virtual]}
      virtual={{
        enabled: true,
        addSlidesBefore: 5,
        addSlidesAfter: 5
      }}
      lazyPreloadPrevNext={10}
      navigation
      slidesPerView={1}
      onReachEnd={handleReachEnd}
      autoplay={{ delay: 1000 }}
    >
      {photos.map((url, idx) => (
        <DoronSwiperSlide key={idx} virtualIndex={idx}>
          <DoronImage
            loading="lazy"
            src={url}
          />
          <div className="swiper-lazy-preloader" />
        </DoronSwiperSlide>
      ))}
    </Swiper>
  );
};
