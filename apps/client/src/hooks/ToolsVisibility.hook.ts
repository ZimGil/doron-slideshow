import { useEffect, useRef, useState } from "react";

interface UseToolsVisibility {
    isVisible: boolean;
}


const force = false; // Set to true to force the tools to be always visible

export const useToolsVisibility = (): UseToolsVisibility => {
    if (force) return { isVisible: true }
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
        window.addEventListener("click", handleMouseMove);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("click", handleMouseMove);
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    return { isVisible };
};