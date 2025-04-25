import React from "react";
import IconButton from "@mui/material/IconButton"
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { useSwiper } from "swiper/react";
import styled from "styled-components";
import { useToolsVisibility } from "../hooks/ToolsVisibility.hook";

const NavigationWrapper = styled.div`
    position: absolute;
    bottom: 3rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    z-index: 10;
    pointer-events: none;
    & > button {
        pointer-events: all;
        background-color: rgba(50, 50, 50, 0.5);
        color: white;
        border-radius: 50%;
        padding: 8px;
        &:hover {
            background-color: rgba(50, 50, 50, 0.75);
        }
    }
`;


export const DoronNavigation: React.FC = () => {
    const swiper = useSwiper();
    const { isVisible } = useToolsVisibility();

    const handleNext = () => {
        swiper.slideNext();
    }

    const handlePrev = () => {
        swiper.slidePrev();
    }

    if (!isVisible) {
        return null;
    }

    return (
        <NavigationWrapper>
            <IconButton onClick={handlePrev}><NavigateBeforeIcon /></IconButton>
            <IconButton onClick={handleNext}><NavigateNextIcon /></IconButton>
        </ NavigationWrapper>
    )
}