import { render } from '@testing-library/react';
import AvatarGuide from '../components/AvatarGuide';

test('renders AvatarGuide with idle state', () => {
  const { container } = render(<AvatarGuide />);
  const div = container.querySelector('div');
  expect(div).toHaveStyle('--anim-name: idle');
});
