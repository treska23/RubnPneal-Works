// pages/_app.tsx
import '../styles/globals.css';
import type { AppProps } from 'next/app';
import AvatarGuide from '@components/AvatarGuide';
import Nav from '@components/Nav';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Nav />
      <main className="pt-[64px]">
        <Component {...pageProps} />
      </main>
      <AvatarGuide />
    </>
  );
}
