import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { Wallet } from '../components/Wallet'
import { trpc } from '../trpcHook'

function App({ Component, pageProps }: AppProps) {
  return <Wallet>
    <Component {...pageProps} />
  </Wallet>
}

export default trpc.withTRPC(App);