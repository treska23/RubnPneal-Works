import '../styles/globals.css';
import type { AppProps } from 'next/app';
import Footer from '@components/Footer';
import Nav from '@components/Nav';
import AnalyticsTracker from '@components/AnalyticsTracker';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <AnalyticsTracker />
      <Nav />
      <main className="min-h-screen pt-[72px]">
        <Component {...pageProps} />
      </main>
      <Footer />
    </>
  );
}
