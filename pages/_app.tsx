// pages/_app.tsx
import '../styles/globals.css';
import type { AppProps } from 'next/app';
import Nav from '../components/Nav';
import Footer from '../components/Footer';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Nav />
      <Component {...pageProps} />
      <Footer />
    </>
  );
}
