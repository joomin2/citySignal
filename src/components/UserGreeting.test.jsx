import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import UserGreeting from './UserGreeting.jsx';
import { useSession } from 'next-auth/react';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

describe('UserGreeting', () => {
  it('should not render when user is not logged in', () => {
    useSession.mockReturnValue({ data: null, status: 'unauthenticated' });
    const { container } = render(<UserGreeting />);
    expect(container.firstChild).toBeNull();
  });

  it('should render greeting with user name when logged in', () => {
    useSession.mockReturnValue({
      data: { user: { name: '홍길동', email: 'hong@example.com' } },
      status: 'authenticated',
    });
    render(<UserGreeting />);
    expect(screen.getByText(/안녕하세요, 홍길동님!/)).toBeTruthy();
    expect(screen.getByText(/오늘도 안전한 하루 되세요/)).toBeTruthy();
  });

  it('should use email username when name is not available', () => {
    useSession.mockReturnValue({
      data: { user: { email: 'testuser@example.com' } },
      status: 'authenticated',
    });
    render(<UserGreeting />);
    expect(screen.getByText(/안녕하세요, testuser님!/)).toBeTruthy();
  });

  it('should not render while loading', () => {
    useSession.mockReturnValue({ data: null, status: 'loading' });
    const { container } = render(<UserGreeting />);
    expect(container.firstChild).toBeNull();
  });
});
