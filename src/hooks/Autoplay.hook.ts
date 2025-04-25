import { useCallback, useEffect, useState } from "react";
import { useSwiper } from "swiper/react";

const AUTOPLAY_INTERVAL = 1000;

export const useAutoplay = () => {
    const [isAutoplay, setIsAutoplay] = useState(true);
    const swiper = useSwiper();

    useEffect(() => {
        let interval: number;

        if (isAutoplay) {
            interval = setInterval(() => {
                if (swiper) {
                    swiper.slideNext();
                }
            }, AUTOPLAY_INTERVAL);
        }

        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [isAutoplay, swiper]);

    const toggleAutoplay = useCallback((forceIsAutoplay?: boolean) => {
        if (forceIsAutoplay != undefined) {
            setIsAutoplay(forceIsAutoplay);
        } else {
            setIsAutoplay((prev) => !prev);
        }
    }, [setIsAutoplay]);

    return {
        isAutoplay,
        toggleAutoplay,
    }
}