import React, { useState, useEffect } from 'react';
import { Virtual } from 'swiper/modules';
import { Swiper } from 'swiper/react';
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

  const handleReachEnd = () => {
    fetchPhotos();
  };

  return (
    <Swiper
      modules={[Virtual]}
      virtual={{
        enabled: true,
        addSlidesBefore: 5,
        addSlidesAfter: 5
      }}
      lazyPreloadPrevNext={10}
      slidesPerView={1}
      onReachEnd={handleReachEnd}
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
