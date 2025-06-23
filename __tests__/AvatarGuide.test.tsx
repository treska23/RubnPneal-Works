import { render, waitFor } from '@testing-library/react';
import AvatarGuide from '../components/AvatarGuide';

test('renders AvatarGuide with idle state', async () => {
  render(<AvatarGuide />);
  await waitFor(() => {
    const fig = document.querySelector('figure.avatar-guide') as HTMLElement;
    expect(fig).toBeTruthy();
    expect(fig.style.getPropertyValue('--frames')).toBe('2');
  });
});
