import React, { useState, useEffect } from 'react';
import { EffectFade, Virtual } from 'swiper/modules';
import { Swiper, SwiperClass } from 'swiper/react';
import 'swiper/swiper-bundle.css';
import { DoronSlide } from './SwiperSlide';
import { DoronImage } from './Image';
import { DoronImageName } from './ImageName';
import { DoronNavigation } from './Navigation';
import { DoronToolbar } from './Toolbar';
import { AutoplayProvider } from '../providers/Autoplay.provider';

interface Photo {
  url: string;
  name: string;
}

export const DoronSlider: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = () => {
    const newPhotos = Array.from({ length: 20 }, (_, idx) => ({ url: `https://cataas.com/cat?${Math.random()}&idx=${idx}`, name: `This is the image name: ${Math.random()}` }));
    setPhotos((prev) => [...prev, ...newPhotos]);
  };

  const fadeFixer = (swiper: SwiperClass) => {
    swiper.slides.forEach(slide => {
      // @ts-expect-error progress is not defined in swiper types for some reason
      const p = Math.abs(slide.progress);
      slide.style.opacity = `${1 - Math.min(p, 1)}`; // 1 → 0
    });
  }

  return (
    <Swiper
      modules={[EffectFade, Virtual]}
      virtual={{
        enabled: true,
        addSlidesBefore: 5,
        addSlidesAfter: 5
      }}
      lazyPreloadPrevNext={10}
      effect='fade'
      slidesPerView={1}
      speed={750}
      onReachEnd={fetchPhotos}
      onProgress={fadeFixer}
    >

      {photos.map(({ url, name }, idx) => (
        <DoronSlide virtualIndex={idx} data-name={name}>
          <DoronImage
            name={name}
            url={url}
          />
          < div className="swiper-lazy-preloader" />
        </DoronSlide >
      ))}
      <AutoplayProvider>
        <DoronImageName />
        <DoronNavigation />
        <DoronToolbar />
      </AutoplayProvider>
    </Swiper>
  );
};
