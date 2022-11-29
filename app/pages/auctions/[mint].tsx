import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import dayjs, { Dayjs } from 'dayjs'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import numbro from 'numbro'
import { useEffect, useState } from 'react'
import { Spinner } from '../../components/Spinner'
import { getCancelAuctionTxn } from '../../services/transactions/cancelAuction'
import { getCloseAuctionTxn } from '../../services/transactions/closeAuction'
import { getAnchorProgram, getAuctionPubkey, getAuctionState, getCurrentPrice, getNftByMintMetaplex } from '../../services/utils'

export default function ExistingAuction() {
    const router = useRouter()

    const wallet = useWallet()
    const { connection } = useConnection()

    const auctionQuery = useQuery({
        queryKey: ['auction'],
        queryFn: async () => {
            const program = getAnchorProgram(connection, wallet)
            const auctionPubkey = await getAuctionPubkey(new PublicKey(router.query.mint as string))
            return await program.account.auction.fetchNullable(auctionPubkey)
        },
        retry: false,
        refetchOnMount: 'always'
    })

    const nftQuery = useQuery({
        queryKey: ['nft'],
        queryFn: () => {
            if (!auctionQuery.data?.mint) {
                throw new Error('Mint is missing')
            }
            return getNftByMintMetaplex(connection, new PublicKey(auctionQuery.data.mint))
        },
        retry: false,
        enabled: !!auctionQuery.data?.mint
    })

    const cancelAuctionMutation = useMutation({
        mutationFn: async () => {
            if (!wallet.publicKey) {
                throw new Error('Please connect your wallet')
            }

            const txn = await getCancelAuctionTxn({
                connection,
                wallet,
                creator: auctionQuery.data!.creator,
                mint: auctionQuery.data!.mint
            })

            await wallet.sendTransaction(txn, connection)
        },
        onSuccess: () => auctionQuery.refetch()
    })

    const closeAuctionMutation = useMutation({
        mutationFn: async () => {
            if (!wallet.publicKey) {
                throw new Error('Please connect your wallet')
            }

            const txn = await getCloseAuctionTxn({
                connection,
                wallet,
                creator: auctionQuery.data!.creator,
                mint: auctionQuery.data!.mint,
                buyer: wallet.publicKey
            })

            await wallet.sendTransaction(txn, connection)
        },
        onSuccess: () => auctionQuery.refetch()
    })

    const [currentPrice, setCurrentPrice] = useState<number | null>(null)
    const updateCurrentPrice = () => {
        if (!auctionQuery.data?.intervalMins) return
        const { startingTimestamp, startingPrice, minPrice, priceChange, intervalMins } = auctionQuery.data
        const startingDatetime = dayjs.unix(Number(startingTimestamp))
        const newCurrPrice = getCurrentPrice(
            startingDatetime.clone(),
            startingPrice,
            minPrice,
            intervalMins,
            priceChange
        )
        if (newCurrPrice) setCurrentPrice(newCurrPrice)
    }
    useEffect(() => {
        if (!auctionQuery.data?.intervalMins) return

        updateCurrentPrice()
        const intervalCurrPrice = setInterval(() => {
            updateCurrentPrice()
        }, 1000 * 10)

        return () => {
            clearInterval(intervalCurrPrice)
        }
    }, [auctionQuery.data?.mint.toString()])

    if (auctionQuery.isError || nftQuery.isError) {
        return <div className="alert alert-error shadow-lg">
            <div>
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>Error fetching dutch auction.</span>
                <button className='btn' onClick={() => auctionQuery.refetch()}>Try again</button>
            </div>
        </div>
    }

    if (auctionQuery.isLoading || nftQuery.isLoading) {
        return <div className='flex justify-center items-center h-screen'><Spinner /></div>
    }

    if (auctionQuery.isSuccess && auctionQuery.data && nftQuery.isSuccess && nftQuery.data) {
        const { creator, startingTimestamp, startingPrice, minPrice, priceChange, intervalMins, auctionState: auctionStateNum, boughtPrice } = auctionQuery.data
        const { name, imageUrl } = nftQuery.data
        const auctionState = getAuctionState(auctionStateNum)
        const nextPrice = () => Math.max(minPrice, numbro(currentPrice).subtract(priceChange).value())
        const startingDate = dayjs.unix(Number(startingTimestamp))

        return <div>
            <Head>
                <title>Solana NFT Dutch Auction</title>
                <meta name='description' content='Create and participate in Solana NFT dutch auctions' />
            </Head>
            <Link href='/'>
                <button className='btn btn-accent'>Go back</button>
            </Link>
            <div className='flex justify-center py-10'>
                <div className="flex flex-col md:flex-row md:gap-20 justify-center items-center">
                    <figure className='relative h-80 w-80 md:h-96 md:w-96 lg:h-[32rem] lg:w-[32rem]'>
                        <Image
                            alt={`${name} NFT image`}
                            src={imageUrl}
                            fill
                            className='rounded mx-auto'
                        />
                    </figure>
                    <div className="card-body">
                        <div className='flex justify-center'>
                            <h2 className="card-title">{name}</h2>
                        </div>
                        <div className="">
                            <table className="table w-full">
                                <tbody>
                                    {auctionState === 'Created' && currentPrice && (
                                        <>
                                            <tr>
                                                <td>Current price</td>
                                                <td>{currentPrice} SOL</td>
                                            </tr>
                                            <tr>
                                                <td>Next price</td>
                                                <td>{nextPrice()} SOL</td>
                                            </tr>
                                        </>
                                    )}
                                    <tr>
                                        <td>Price change</td>
                                        <td>{priceChange} SOL</td>
                                    </tr>
                                    <tr>
                                        <td>Interval</td>
                                        <td>{intervalMins} {intervalMins === 1 ? 'minute' : 'minutes'}</td>
                                    </tr>
                                    <tr>
                                        <td>Starting datetime</td>
                                        <td>{startingDate.format('DD-MM-YYYY, HH:mm')}</td>
                                    </tr>
                                    <tr>
                                        <td>Starting price</td>
                                        <td>{startingPrice} SOL</td>
                                    </tr>
                                    <tr>
                                        <td>Minimum price</td>
                                        <td>{minPrice} SOL</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        {cancelAuctionMutation.isError && (
                            <div className="alert alert-error shadow-lg my-6">
                                <div>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <span>Error cancelling auction, please try again.</span>
                                </div>
                            </div>
                        )}
                        {cancelAuctionMutation.isSuccess && (
                            <div className="alert alert-success shadow-lg my-6">
                                <div>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <span>Cancelled auction successfully!</span>
                                </div>
                            </div>
                        )}
                        {closeAuctionMutation.isError && (
                            <div className="alert alert-error shadow-lg my-6">
                                <div>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <span>Error closing auction, please try again.</span>
                                </div>
                            </div>
                        )}
                        {closeAuctionMutation.isSuccess && (
                            <div className="alert alert-success shadow-lg my-6">
                                <div>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <span>Closed auction successfully!</span>
                                </div>
                            </div>
                        )}
                        <div className="mt-6 card-actions justify-between items-end">
                            <div className="badge badge-outline">{auctionState}</div>
                            {auctionState === 'Created' ? (
                                <button
                                    className={`btn btn-primary ${(cancelAuctionMutation.isLoading || closeAuctionMutation.isLoading) && 'loading'}`}
                                    onClick={() => {
                                        if (wallet.publicKey?.toString() === creator.toString()) {
                                            cancelAuctionMutation.mutate()
                                        } else {
                                            closeAuctionMutation.mutate()
                                        }
                                    }}
                                >
                                    {wallet.publicKey?.toString() === creator.toString() ? (
                                        'Cancel auction'
                                    ) : (
                                        'Buy now'
                                    )}
                                </button>
                            ) : (
                                <div>
                                    {auctionState === 'Closed' && (
                                        <span>Bought for {boughtPrice} SOL</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    }

    return <></>
}