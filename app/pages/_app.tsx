import '../styles/globals.css'
import type { AppProps } from 'next/app'
import Script from 'next/script'
import { Wallet } from '../components/Wallet'
import { trpc } from '../trpcHook'
import Head from 'next/head'

function App({ Component, pageProps }: AppProps) {
  return <>
    <Head>
      <link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
    </Head>
    <Wallet>
      {/* <!-- Google tag (gtag.js) --> */}
      <Script async src="https://www.googletagmanager.com/gtag/js?id=G-BGCLHQJ9Y7"></Script>
      <Script>
        {`window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());

        gtag('config', 'G-BGCLHQJ9Y7');`}
      </Script>
      <Component {...pageProps} />
    </Wallet>
  </>
}

export default trpc.withTRPC(App);