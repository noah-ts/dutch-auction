import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import numbro from 'numbro'
import { useEffect, useState } from 'react'
import { Spinner } from '../../components/Spinner'
import { getCancelAuctionTxn } from '../../services/transactions/cancelAuction'
import { getCloseAuctionTxn } from '../../services/transactions/closeAuction'
import { getAnchorProgram, getAuctionPubkey, getAuctionState, getCurrentPrice, getNftByMintMetaplex } from '../../services/utils'
import { trpcClient } from '../../trpcHook'

export default function ExistingAuction() {
    const router = useRouter()

    const wallet = useWallet()
    const { connection } = useConnection()

    const auctionQuery = useQuery({
        queryKey: ['auction'],
        queryFn: async () => {
            const program = getAnchorProgram(connection, wallet)
            const mint = router.query.mint as string
            const auctionPubkey = await getAuctionPubkey(new PublicKey(mint))
            const auctionData = await program.account.auction.fetchNullable(auctionPubkey)
            const nftData = await getNftByMintMetaplex(connection, new PublicKey(mint))
            return { auctionData, nftData }
        },
        retry: false,
        refetchOnMount: 'always'
    })

    const cancelAuctionMutation = useMutation({
        mutationFn: async () => {
            if (!wallet.publicKey) {
                alert('Please connect your wallet')
                throw new Error('Wallet not connected')
            }

            if (!auctionQuery.data?.auctionData) return

            const { startingTimestamp, startingPrice, minPrice, priceChange, intervalMins } = auctionQuery.data.auctionData
            const startingDatetime = dayjs.unix(Number(startingTimestamp))
            const currPrice = getCurrentPrice(
                startingDatetime.clone(),
                startingPrice,
                minPrice,
                intervalMins,
                priceChange
            )

            if (!currPrice || currPrice !== minPrice) {
                alert('Current price did not reach minimum price yet')
                throw new Error('Current price did not reach minimum price yet')
            }

            const txn = await getCancelAuctionTxn({
                connection,
                wallet,
                creator: auctionQuery.data!.auctionData!.creator,
                mint: auctionQuery.data!.auctionData!.mint
            })

            await wallet.sendTransaction(txn, connection)

            await trpcClient.updateAuction.mutate({
                mint: auctionQuery.data!.auctionData!.mint.toString(),
                auctionState: 'CANCELLED'
            })
        },
        onSuccess: () => {
            setTimeout(() => {
                auctionQuery.refetch()
            }, 2000)
        }
    })

    const closeAuctionMutation = useMutation({
        mutationFn: async () => {
            if (!wallet.publicKey) {
                alert('Please connect your wallet')
                throw new Error('Wallet not connected')
            }

            if (dayjs() < dayjs.unix(Number(auctionQuery.data?.auctionData?.startingTimestamp))) {
                alert('Auction did not start yet')
                throw new Error('Auction did not start yet')
            }

            const txn = await getCloseAuctionTxn({
                connection,
                wallet,
                creator: auctionQuery.data!.auctionData!.creator,
                mint: auctionQuery.data!.auctionData!.mint,
                buyer: wallet.publicKey
            })

            await wallet.sendTransaction(txn, connection)

            await trpcClient.updateAuction.mutate({
                mint: auctionQuery.data!.auctionData!.mint.toString(),
                auctionState: 'CLOSED'
            })
        },
        onSuccess: () => {
            setTimeout(() => {
                auctionQuery.refetch()
            }, 2000)
        }
    })

    const [currentPrice, setCurrentPrice] = useState<number | null>(null)
    const updateCurrentPrice = () => {
        if (!auctionQuery.data?.auctionData?.intervalMins) return
        const { startingTimestamp, startingPrice, minPrice, priceChange, intervalMins } = auctionQuery.data.auctionData
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
        if (!auctionQuery.data?.auctionData?.intervalMins) return

        updateCurrentPrice()
        const intervalCurrPrice = setInterval(() => {
            updateCurrentPrice()
        }, 1000 * 10)

        return () => {
            clearInterval(intervalCurrPrice)
        }
    }, [auctionQuery.data?.auctionData?.mint.toString()])

    if (auctionQuery.isError) {
        return <div className="alert alert-error shadow-lg">
            <div>
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>Error fetching dutch auction.</span>
                <Link href='/'>
                    <button className='btn btn-accent'>Go back</button>
                </Link>
                <button className='btn' onClick={() => auctionQuery.refetch()}>Try again</button>
            </div>
        </div>
    }

    if (auctionQuery.isLoading) {
        return <div className='flex justify-center items-center h-screen'><Spinner /></div>
    }

    if (auctionQuery.isSuccess && auctionQuery.data && auctionQuery.data.auctionData) {
        const { creator, startingTimestamp, startingPrice, minPrice, priceChange, intervalMins, auctionState: auctionStateNum, boughtPrice } = auctionQuery.data.auctionData
        const { name, imageUrl } = auctionQuery.data.nftData
        const auctionState = getAuctionState(auctionStateNum)
        const nextPrice = () => Math.max(minPrice, numbro(currentPrice).subtract(priceChange).value())
        const startingDate = dayjs.unix(Number(startingTimestamp))

        return <>
            <Head>
                <title>{name} Dutch Auction</title>
                <meta name='description' content={`${name} dutch auction`} />
            </Head>
            <div>
                <Link href='/'>
                    <button className='btn btn-accent'>Go back</button>
                </Link>
                <div className='flex justify-center py-10'>
                    <div className="flex flex-col md:flex-row md:gap-20 justify-center items-center">
                        <figure className='relative h-80 w-80 md:h-96 md:w-96 lg:h-[32rem] lg:w-[32rem]'>
                            <img
                                alt={`${name} NFT image`}
                                src={imageUrl}
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
                                        {auctionState === 'CREATED' && currentPrice && (
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
                                        <span>Error cancelling auction</span>
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
                                        <span>Error closing auction</span>
                                    </div>
                                </div>
                            )}
                            {closeAuctionMutation.isSuccess && (
                                <div className="alert alert-success shadow-lg my-6">
                                    <div>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        <span>Bought NFT successfully!</span>
                                    </div>
                                </div>
                            )}
                            <div className="mt-6 card-actions justify-between items-end">
                                <div className="badge badge-outline">{auctionState}</div>
                                {auctionState === 'CREATED' ? (
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
                                        {auctionState === 'CLOSED' && (
                                            <span>Bought for {numbro(boughtPrice).format({ trimMantissa: true, mantissa: 4 })} SOL</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    }

    return <></>
}