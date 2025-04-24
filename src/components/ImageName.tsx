import { useState } from "react";
import styled from "styled-components";
import { useSwiper } from "swiper/react";

export const StyledImageName = styled.div`
  position: absolute;
  inset-inline-start: 0.5rem;
  inset-block-end: 0.5rem;
  color: white;
  z-index: 1;
  font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
  background-color: rgba(0, 0, 0, 0.4);
  padding: 1px 8px;
  font-size: 1.25rem;
  overflow-wrap: anywhere;
`

export const DoronImageName: React.FC = () => {
  const swiper = useSwiper()
  const [imageName, setImageName] = useState<string>('')


  const handleNewImageName = () => {
    // @ts-expect-errpr visibleSlides actually exists
    setImageName(swiper.visibleSlides?.[0]?.dataset.name)
  }

  swiper.on('slidesUpdated', handleNewImageName)
  swiper.on('slideChange', handleNewImageName)


  return <StyledImageName>{imageName}</ StyledImageName>
}

