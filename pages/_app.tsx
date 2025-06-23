// pages/_app.tsx
import '../styles/globals.css';
import type { AppProps } from 'next/app';
import AvatarGuide from '@/components/AvatarGuide';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <AvatarGuide />
    </>
  );
}
