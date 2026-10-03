'use client';
import { createContext, useContext } from 'react';
import type { StudioApi } from '../../lib/types';

export const StudioContext = createContext<StudioApi | null>(null);

/** Workspace data and actions shared by every studio page. */
export function useStudio(): StudioApi {
  const value = useContext(StudioContext);
  if (!value) throw new Error('useStudio must be used inside StudioShell');
  return value;
}
