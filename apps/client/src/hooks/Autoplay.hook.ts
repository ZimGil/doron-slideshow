import { useContext } from 'react';
import { AutoplayContext } from '../providers/Autoplay.provider';
import type { AutoplayContextValue } from '../providers/Autoplay.provider';

export const useAutoplay = (): AutoplayContextValue => {
  const ctx = useContext(AutoplayContext);
  if (!ctx)
    throw new Error('useAutoplay must be used inside <AutoplayProvider>');
  return ctx;
};
