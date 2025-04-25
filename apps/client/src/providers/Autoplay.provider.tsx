import React, { createContext, useCallback, useEffect, useState } from "react";
import { useSwiper } from "swiper/react";

const AUTOPLAY_INTERVAL = 1000;

interface AutoplayContextValue {
    isAutoplay: boolean;
    toggleAutoplay: () => void
    startAutoplay: () => void
    stopAutoplay: () => void
}

export const AutoplayContext = createContext<AutoplayContextValue | null>(null);

export const AutoplayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAutoplay, setIsAutoplay] = useState(true);
    const autoplayIntervalRef = React.useRef<number | null>(null);
    const swiper = useSwiper();

    const startAutoplay = useCallback(() => {
        if (!isAutoplay) {
            setIsAutoplay(true);
        }
        if (autoplayIntervalRef.current === null) {
            autoplayIntervalRef.current = setInterval(() => {
                if (swiper) {
                    swiper.slideNext();
                }
            }, AUTOPLAY_INTERVAL);
        }
    }, [swiper, isAutoplay]);

    const stopAutoplay = useCallback(() => {
        if (isAutoplay) {
            setIsAutoplay(false);
        }
        if (autoplayIntervalRef.current !== null) {
            clearInterval(autoplayIntervalRef.current);
            autoplayIntervalRef.current = null;
        }
    }, [isAutoplay]);

    useEffect(() => {
        startAutoplay();
        return () => {
            stopAutoplay();
        };
    }, [swiper, startAutoplay, stopAutoplay]);

    const toggleAutoplay = useCallback(() => {
        if (isAutoplay) {
            stopAutoplay();
        } else {
            startAutoplay();
        }
    }, [isAutoplay, startAutoplay, stopAutoplay]);

    useEffect(() => {
        const handlePauseAutoplay = (event: KeyboardEvent) => {
            if ([' ', 'Enter'].includes(event.key)) {
                event.preventDefault();
                toggleAutoplay();
            }
        };
        window.addEventListener('keydown', handlePauseAutoplay)
        return () => {
            window.removeEventListener('keydown', handlePauseAutoplay);
        };
    }, [toggleAutoplay]);

    return (
        <AutoplayContext.Provider value={{ isAutoplay, toggleAutoplay, startAutoplay, stopAutoplay }}>
            {children}
        </AutoplayContext.Provider>
    );
};