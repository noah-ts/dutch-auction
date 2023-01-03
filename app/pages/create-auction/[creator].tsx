import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useMutation } from '@tanstack/react-query'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Spinner } from '../../components/Spinner'
import { getCreateAuctionTxn } from '../../services/transactions/createAuction'
import { trpc, trpcClient } from '../../trpcHook'
import { NftHeliusType } from '../../types/NftHeliusType'

dayjs.extend(utc)

type FormDataType = {
    startingDatetime: string
    startingPrice: number
    minPrice: number
    intervalMins: number
    priceChange: number
    mint: string
}

export default function CreateAuction() {
    const wallet = useWallet()
    const { connection } = useConnection()
    const router = useRouter()

    useEffect(() => {
        if (!wallet.publicKey) return
        if (wallet.publicKey.toString() !== router.query.creator as string) {
            router.push(`/create-auction/${wallet.publicKey.toString()}`)
        }
    }, [wallet.publicKey])

    const nfts = trpc.nftsByOwner.useQuery({ owner: router.query.creator as string }, { retry: false })

    const { register, handleSubmit, formState: { errors }, watch } = useForm<FormDataType>()

    const watchMint = watch('mint')
    const watchIntervalMins = watch('intervalMins')
    const watchPriceChange = watch('priceChange')

    const [mintAddress, setMintAddress] = useState('')

    const createAuctionMutation = useMutation({
        mutationFn: async (data: FormDataType) => {
            if (!wallet.publicKey) {
                alert('Please connect your wallet')
                throw new Error('Wallet not connected')
            }

            if (!nfts.data) {
                throw new Error('No nfts data')
            }

            const { mint, startingDatetime, startingPrice, minPrice, intervalMins, priceChange } = data
            setMintAddress(mint)

            const mintPubkey = new PublicKey(mint)

            const txn = await getCreateAuctionTxn({
                connection,
                wallet,
                creator: wallet.publicKey,
                mint: mintPubkey,
                startingTimestamp: dayjs(startingDatetime).unix(),
                startingPrice,
                minPrice,
                intervalMins,
                priceChange
            })
    
            await wallet.sendTransaction(txn, connection)

            const { name, imageUrl } = nfts.data.find(nft => nft.tokenAddress === mint) as NftHeliusType

            await trpcClient.createAuction.mutate({
                creator: wallet.publicKey.toString(),
                mint,
                startingDateUTC: dayjs(startingDatetime).clone().utc().toString(),
                startingPrice: Number(startingPrice),
                minPrice: Number(minPrice),
                priceChange: Number(priceChange),
                intervalMins: Number(intervalMins),
                auctionState: 'CREATED',
                name,
                imageUrl
            })
        }
    })

    const onSubmit = handleSubmit(data => {
        if (!wallet.publicKey) {
            alert('Please connect your wallet')
            return
        }
        createAuctionMutation.mutate(data)
    })

    return (
        <>
            <Head>
                <title>Create Dutch Auction</title>
                <meta name='description' content='Create Solana NFT dutch auction' />
            </Head>
            <div>
                <Link href='/'>
                    <button className='btn btn-accent'>Go back</button>
                </Link>
                <div className='flex flex-col items-center gap-10 mt-10'>
                    <h1 className='text-xl font-bold text-center'>Create new dutch auction</h1>
                    <form onSubmit={onSubmit} className='w-full max-w-3xl flex flex-col gap-4'>
                        <div>
                            <label className='label-text text-base'>Starting datetime</label>
                            <input
                                {...register('startingDatetime', {
                                    required: 'Starting datetime is required'
                                })}
                                type='datetime-local'
                                className='input input-bordered w-full'
                                min={dayjs().format('YYYY-MM-DDTHH:mm')}
                            />
                            {errors.startingDatetime && <span className='text-error'>{errors.startingDatetime.message}</span>}
                        </div>
                        <div>
                            <label className='label-text text-base'>Starting price (SOL)</label>
                            <input
                                {...register('startingPrice', {
                                    required: 'Starting price is required',
                                    min: {
                                        value: 0.01,
                                        message: 'Starting price should be greater than or equal to 0.01'
                                    }
                                })}
                                className='input input-bordered w-full'
                            />
                            {errors.startingPrice && <span className='text-error'>{errors.startingPrice.message}</span>}
                        </div>
                        <div>
                            <label className='label-text text-base'>Minimum price (SOL)</label>
                            <input
                                {...register('minPrice', {
                                    required: 'Minimum price is required',
                                    min: {
                                        value: 0.01,
                                        message: 'Minimum price should be greater than or equal to 0.01'
                                    }
                                })}
                                className='input input-bordered w-full'
                            />
                            {errors.minPrice && <span className='text-error'>{errors.minPrice.message}</span>}
                        </div>
                        <div>
                            <label className='label'>
                                <span className='label-text text-base'>Interval (minutes)</span>
                                <span className='label-text-alt text-sm'>decrease price every {watchIntervalMins ? watchIntervalMins : 'x'} {Number(watchIntervalMins) === 1 ? 'minute' : 'minutes'}</span>
                            </label>
                            <input
                                {...register('intervalMins', {
                                    required: 'Interval is required',
                                    min: {
                                        value: 1,
                                        message: 'Interval should be greater than or equal to 1'
                                    },
                                    max: {
                                        value: 60,
                                        message: 'Interval should be less than or equal to 60'
                                    },
                                    validate: value => {
                                        if (value % 1 !== 0) return 'Interval should not have decimal numbers'
                                    }
                                })}
                                className='input input-bordered w-full'
                            />
                            {errors.intervalMins && <span className='text-error'>{errors.intervalMins.message}</span>}
                        </div>
                        <div>
                            <label className='label'>
                                <span className='label-text text-base'>Price change (SOL)</span>
                                <span className='label-text-alt text-sm'>decrease price by {watchPriceChange ? watchPriceChange : 'x'} SOL</span>
                            </label>
                            <input
                                {...register('priceChange', {
                                    required: 'Price change is required',
                                    min: {
                                        value: 0.01,
                                        message: 'Price change should be greater than or equal to 0.01'
                                    }
                                })}
                                className='input input-bordered w-full'
                            />
                            {errors.priceChange && <span className='text-error'>{errors.priceChange.message}</span>}
                        </div>
                        <div>
                            <label className='label-text text-base'>NFT</label>
                            {nfts.isLoading && <Spinner />}
                            {nfts.isError && (
                                <div>
                                    <div>Error loading your NFTs</div>
                                    <button className='btn' onClick={() => nfts.refetch()}>Try again</button>
                                </div>
                            )}
                            {nfts.isSuccess && (
                                <div>
                                    <select
                                        {...register('mint', {
                                            required: 'NFT is required'
                                        })}
                                        className='select select-bordered w-full'
                                        defaultValue={''}
                                    >
                                        <option disabled value={''}>NFT</option>
                                        {nfts.isSuccess && nfts.data.map(nft => <option key={nft.tokenAddress} value={nft.tokenAddress}>{nft.name}</option>)}
                                    </select>
                                    {watchMint && (
                                        <div className='flex justify-center items-center'>
                                            <div className='mt-4'>
                                                <img
                                                    alt='NFT image'
                                                    src={nfts.data.find(nft => nft.tokenAddress === watchMint)?.imageUrl || ''}
                                                    height={240}
                                                    width={240}
                                                    className='rounded'
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            {errors.mint && <span className='text-error'>{errors.mint.message}</span>}
                        </div>
                        {createAuctionMutation.isError && (
                            <div className="alert alert-error shadow-lg my-6">
                                <div>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <span>Error creating auction, please try again.</span>
                                </div>
                            </div>
                        )}
                        {createAuctionMutation.isSuccess && mintAddress && (
                            <div className="alert alert-success shadow-lg my-6">
                                <div>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <span>
                                        Created {' '}
                                        <Link href={`/auctions/${mintAddress}`} className='link'>
                                            auction
                                        </Link>
                                        {' '}successfully!
                                    </span>
                                </div>
                                <div className='flex'>
                                    <div className=''>Copy and share this link with others:</div>
                                    <div>
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth={1.5}
                                            stroke="currentColor"
                                            className="w-6 h-6 cursor-pointer active:bg-accent"
                                            onClick={() => {
                                                navigator.clipboard.writeText(`${window.location.origin}/auctions/${mintAddress}`)
                                            }}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        )}
                        <ul className='list-disc mt-4'>
                            <li>Platform fee is 5%</li>
                            <li>You will be able to cancel the auction to get back your NFT when it reaches the minimum price</li>
                        </ul>
                        <input type='submit' className={`my-6 btn btn-primary ${createAuctionMutation.isLoading && 'loading'}`}/>
                    </form>
                </div>
            </div>
        </>
    )
}