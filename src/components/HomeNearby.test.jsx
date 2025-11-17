// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import HomeNearby from '@/components/HomeNearby.jsx';

// Initial render shows skeleton loaders

describe('HomeNearby', () => {
  it('renders skeleton cards while loading', () => {
    const { container } = render(<HomeNearby />);
    const skeletons = container.querySelectorAll('.skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
