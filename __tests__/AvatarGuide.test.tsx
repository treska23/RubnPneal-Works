import { render, waitFor } from '@testing-library/react';
import AvatarGuide from '../components/AvatarGuide';

test('renders AvatarGuide with idle state', async () => {
  const { container } = render(<AvatarGuide />);
  const div = container.querySelector('div') as HTMLDivElement;
  await waitFor(() => {
    expect(div.style.getPropertyValue('--sheet')).toBe('url("/sprites/avatar-idle.png")');
  });
});
