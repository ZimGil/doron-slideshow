import React from 'react';
import styled from 'styled-components';
import { SwiperSlide, SwiperSlideProps } from 'swiper/react';

export const DoronSlide: React.FC<SwiperSlideProps> = styled(SwiperSlide)`
  display: flex;
  justify-content: center;
  align-items: center;
  background: black;
  overflow: hidden;
  width: 100vw;
  height: 100vh;
`;
