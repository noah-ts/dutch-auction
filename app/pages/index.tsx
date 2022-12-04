import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Spinner } from '../components/Spinner';
import { trpc } from '../trpcHook';

const SearchSvg = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
)

export default function Home() {
  const wallet = useWallet()
  const router = useRouter()

  const [skip, setSkip] = useState(0)

  const auctionsQuery = trpc.getAllAuctions.useQuery({
    name: (router.query.nftName as string) ?? undefined,
    skip
  })

  const { handleSubmit, register } = useForm<{ name: string }>()

  const goToCreateAuctionPage = () => {
    if (!wallet.publicKey) {
      alert('Please connect your wallet')
      return
    }

    router.push(`/create-auction/${wallet.publicKey.toString()}`)
  }

  const loadAuctionsByName = handleSubmit((data) => {
    router.push(`/?nftName=${data.name}`)
  })

  const renderAuctions = () => {
    if (auctionsQuery.isLoading) {
      return <div className='flex justify-center items-center h-1/2 md:h-2/3'><Spinner /></div>
    }

    if (auctionsQuery.isError) {
      return <div className="alert alert-error shadow-lg">
          <div>
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>Error fetching dutch auctions.</span>
              <button className='btn' onClick={() => auctionsQuery.refetch()}>Try again</button>
          </div>
      </div>
    }

    if (!auctionsQuery.isSuccess) return <></>

    return <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-14'>
      {auctionsQuery.data.map(auction => (
        <div key={auction.mint} className="card w-80 bg-base-100 shadow-xl">
          <figure><img src={auction.imageUrl} alt="Shoes" /></figure>
          <div className="card-body">
            <h2 className="card-title">{auction.name}</h2>
            <p>Starting price {auction.startingPrice} SOL</p>
            <p>Minimum price {auction.minPrice} SOL</p>
            <div className="card-actions justify-between items-end">
              <div className="badge badge-outline">{auction.auctionState}</div>
              <Link href={`/auctions/${auction.mint}`}>
                <button className="btn btn-neutral">
                  Details
                </button>
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  }

  return (
    <>
      <Head>
        <title>Solana NFT Dutch Auction</title>
        <meta name='description' content='Create and participate in Solana NFT dutch auctions' />
      </Head>
      <h1 className='text-2xl md:text-3xl font-bold text-center my-10'>Solana NFT Dutch Auction</h1>
      <div className='flex flex-col gap-4 md:flex-row'>
        <form className='flex flex-col md:flex-row md:gap-4 w-full' onSubmit={loadAuctionsByName}>
          <div className='mb-4 w-full'>
            <input
              {...register('name')}
              placeholder='Name of NFT'
              className='input input-bordered w-full'
            />
          </div>
          <button type='submit' className='btn'><SearchSvg /></button>
        </form>
        <button className='btn btn-primary' onClick={goToCreateAuctionPage}>Create new auction</button>
      </div>
      <div className='flex justify-center mt-10'>
        {renderAuctions()}
      </div>
    </>
  )
}
