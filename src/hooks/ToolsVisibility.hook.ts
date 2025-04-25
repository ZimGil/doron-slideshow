import { useEffect, useRef, useState } from "react";

interface UseToolsVisibility {
    isVisible: boolean;
}

export const useToolsVisibility = (): UseToolsVisibility => {
    const [isVisible, setVisible] = useState(false);
    const timerRef = useRef<number | null>(null);

    const handleMouseMove = () => {
        setVisible(true);
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = window.setTimeout(() => setVisible(false), 2000);
    };

    useEffect(() => {
        window.addEventListener("mousemove", handleMouseMove);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    return { isVisible };
};