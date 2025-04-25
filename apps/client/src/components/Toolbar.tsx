import styled from "styled-components"
import { useToolsVisibility } from "../hooks/ToolsVisibility.hook"
import { IconButton } from "@mui/material"
import PauseIcon from "@mui/icons-material/Pause"
import PlayIcon from "@mui/icons-material/PlayArrow"
import DeleteIcon from "@mui/icons-material/Delete"
import ShuffleIcon from "@mui/icons-material/Shuffle"
import RefreshIcon from "@mui/icons-material/Refresh"
import { useAutoplay } from "../hooks/Autoplay.hook"

const ToolbarWrapper = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    background-color: black;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    z-index: 10;
    padding: 0.5rem;
    border-radius: 0 0 1rem 0;
    & > button {
        pointer-events: all;
        background-color: rgba(50, 50, 50, 0.5);
        color: white;
        border-radius: 50%;
        &:hover {
            background-color: rgba(50, 50, 50, 0.75);
        }
    }
`;

export const DoronToolbar = () => {
    const { isVisible } = useToolsVisibility()
    const { isAutoplay: isPlaying, toggleAutoplay } = useAutoplay()

    if (!isVisible) {
        return null
    }

    return (
        <ToolbarWrapper>
            <IconButton onClick={() => toggleAutoplay()}>{isPlaying ? <PauseIcon /> : <PlayIcon />}</IconButton>
            <IconButton><DeleteIcon /></IconButton>
            <IconButton><ShuffleIcon /></IconButton>
            <IconButton onClick={() => window.location.reload()}><RefreshIcon /></IconButton>
        </ToolbarWrapper>
    )
}