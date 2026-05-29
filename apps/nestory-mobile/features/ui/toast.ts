// Lightweight singleton toast store.
//
// `showToast(...)` is callable from anywhere (including non-React code such as
// react-query onError callbacks), while React components subscribe via the
// `useToastState` hook. A single ToastHost rendered at the root of the app
// (see app/_layout.tsx) renders whatever the store currently holds.

import { useSyncExternalStore } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMsg {
  id:       number;
  message:  string;
  type:     ToastType;
  duration: number;   // ms before auto-dismiss
}

let _current: ToastMsg | null = null;
let _nextId  = 1;
let _timer: ReturnType<typeof setTimeout> | null = null;
const _listeners = new Set<() => void>();

function emit() { _listeners.forEach((fn) => fn()); }
function clearTimer() { if (_timer) { clearTimeout(_timer); _timer = null; } }

export function showToast(opts: { message: string; type?: ToastType; duration?: number }): void {
  const msg: ToastMsg = {
    id:       _nextId++,
    message:  opts.message,
    type:     opts.type ?? 'info',
    duration: opts.duration ?? 3200,
  };
  _current = msg;
  clearTimer();
  _timer = setTimeout(() => {
    // Only dismiss if this exact toast is still showing — newer ones replace.
    if (_current?.id === msg.id) {
      _current = null;
      emit();
    }
  }, msg.duration);
  emit();
}

export function dismissToast(): void {
  clearTimer();
  _current = null;
  emit();
}

export function useToastState(): ToastMsg | null {
  return useSyncExternalStore(
    (cb) => { _listeners.add(cb); return () => { _listeners.delete(cb); }; },
    () => _current,
    () => null,
  );
}
