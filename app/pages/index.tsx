import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';

export default function Home() {
  const wallet = useWallet()
  const router = useRouter()

  const { handleSubmit, register } = useForm<{ mint: string }>()

  const goToCreateAuctionPage = () => {
    if (!wallet.publicKey) {
      alert('Please connect your wallet')
      return
    }

    router.push(`/create-auction/${wallet.publicKey.toString()}`)
  }

  const goToExistingAuctionPage = handleSubmit((data) => {
    router.push(`/auctions/${data.mint}`)
  })

  return (
    <div>
      <Head>
        <title>Solana NFT Dutch Auction</title>
        <meta name='description' content='Create and participate in Solana NFT dutch auctions' />
      </Head>
      <div className='mt-10 flex flex-col'>
        <h1 className='text-2xl md:text-3xl font-bold text-center mb-40'>Dutch Auction</h1>
        <form className='flex flex-col' onSubmit={goToExistingAuctionPage}>
          <div className='mb-4'>
            <label className='label-text text-base'>Mint of NFT</label>
            <input
              {...register('mint', {
                validate: (value) => {
                  try {
                    new PublicKey(value)
                  } catch (error) {
                    return 'Invalid mint address'
                  }
                }
              })}
              placeholder='3Bs9qy1SyiQ7KTGiuV4onQgctfJrmEfJLv5orBcL1ZAc'
              className='input input-bordered w-full text-xs md:text-base'
            />
          </div>
          <button type='submit' className='btn btn-block'>Find existing auction</button>
        </form>
        <div className='divider'>OR</div>
        <button className='btn btn-block btn-primary' onClick={goToCreateAuctionPage}>Create new auction</button>
      </div>
    </div>
  )
}
