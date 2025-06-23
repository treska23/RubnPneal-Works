import { render, waitFor } from '@testing-library/react';
import AvatarGuide from '../components/AvatarGuide';

test('renders AvatarGuide with idle state', async () => {
  const { container } = render(<AvatarGuide />);
  const fig = container.querySelector('figure') as HTMLElement;
  await waitFor(() => {
    expect(fig.classList.contains('avatar-guide')).toBe(true);
    expect(fig.style.getPropertyValue('--frames')).toBe('2');
  });
});
