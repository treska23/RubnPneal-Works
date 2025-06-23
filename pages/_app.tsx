// pages/_app.tsx
import '../styles/globals.css';
import type { AppProps } from 'next/app';
import Nav from '../components/Nav';
import Footer from '../components/Footer';
import AvatarGuide from '@/components/AvatarGuide';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Nav />
      <AvatarGuide />
      <div className="pt-16 w-full">
        <main className="w-full flex flex-col flex-1">
          <Component {...pageProps} />
        </main>
        <Footer />
      </div>
    </>
  );
}
