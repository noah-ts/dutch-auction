import React, { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import {
    WalletModalProvider
} from '@solana/wallet-adapter-react-ui';
import dynamic from 'next/dynamic';

require('@solana/wallet-adapter-react-ui/styles.css');

const WalletMultiButtonDynamic = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
    { ssr: false }
);

export const Wallet: FC<{ children: ReactNode }> = ({ children }) => {
    const endpoint = 'https://lively-frequent-meadow.solana-mainnet.discover.quiknode.pro/1f1ef10280be82c5138b8e7b05808cb2707009f2/'

    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter()
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [endpoint]
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <main className='p-2 md:p-6'>
                        <div className='flex justify-end'><WalletMultiButtonDynamic /></div>
                        {children}
                    </main>
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};