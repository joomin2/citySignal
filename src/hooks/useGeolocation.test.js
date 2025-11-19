// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGeolocation } from './useGeolocation.js';

describe('useGeolocation', () => {
  it('returns coords after successful geolocation', async () => {
    const fakePos = { coords: { latitude: 37.5, longitude: 126.9 } };
    const getCurrentPosition = (success) => setTimeout(() => success(fakePos), 10);
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });

    const { result } = renderHook(() => useGeolocation());
    act(() => { result.current.getLocation(); });
    await vi.waitUntil(() => result.current.status === 'ready', { timeout: 200 });
    expect(result.current.coords).toEqual({ lat: 37.5, lng: 126.9 });
  });

  it('handles geolocation error', async () => {
    const getCurrentPosition = (_s, error) => setTimeout(() => error(new Error('denied')), 10);
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });
    const { result } = renderHook(() => useGeolocation());
    act(() => { result.current.getLocation(); });
    await vi.waitUntil(() => result.current.status === 'error', { timeout: 200 });
    expect(result.current.error).toMatch(/denied/i);
  });
});
