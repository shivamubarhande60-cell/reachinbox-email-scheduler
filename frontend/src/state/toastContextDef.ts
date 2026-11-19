import { createContext } from 'react';
import type { ToastItem } from '../types';

export interface PushToastInput {
  title: string;
  description?: string;
  tone?: ToastItem['tone'];
}

export interface ToastContextValue {
  toasts: ToastItem[];
  pushToast: (input: PushToastInput) => void;
  dismissToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
