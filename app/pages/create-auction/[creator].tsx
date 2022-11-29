import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useMutation } from '@tanstack/react-query'
import dayjs from 'dayjs'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Spinner } from '../../components/Spinner'
import { getCreateAuctionTxn } from '../../services/transactions/createAuction'
import { trpc } from '../../trpcHook'

type FormDataType = {
    startingDatetime: number
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

    const nfts = trpc.nftsByOwner.useQuery({ owner: router.query.creator as string }, { retry: false })

    const { register, handleSubmit, formState: { errors }, watch, reset } = useForm<FormDataType>()

    const watchMint = watch('mint')
    const watchIntervalMins = watch('intervalMins')
    const watchPriceChange = watch('priceChange')

    const [mintAddress, setMintAddress] = useState('')

    const createAuctionMutation = useMutation({
        mutationFn: async (data: FormDataType) => {
            if (!wallet.publicKey) {
                throw new Error('Please connect your wallet')
            }
            const { mint, startingDatetime, startingPrice, minPrice, intervalMins, priceChange } = data
            setMintAddress('7RvG1kWnjkF1ZbipYTL7NU6HY7TvLnzMnSYor52ALAfM')

            const txn = await getCreateAuctionTxn({
                connection,
                wallet,
                creator: new PublicKey(wallet.publicKey),
                mint: new PublicKey('7RvG1kWnjkF1ZbipYTL7NU6HY7TvLnzMnSYor52ALAfM'),
                startingTimestamp: dayjs(startingDatetime).unix(),
                startingPrice,
                minPrice,
                intervalMins,
                priceChange
            })
    
            await wallet.sendTransaction(txn, connection)
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
        <div>
            <Head>
                <title>Solana NFT Dutch Auction</title>
                <meta name='description' content='Create and participate in Solana NFT dutch auctions' />
            </Head>
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
                                {/* <select
                                    {...register('mint', {
                                        required: 'NFT is required'
                                    })}
                                    className='select select-bordered w-full'
                                    defaultValue={'DpCnaDxca9wBvupD9i2TnkkXyCmdUTTQyqWwNZ5YWdbG'}
                                >
                                    <option disabled value={''}>NFT</option>
                                    {nfts.isSuccess && nfts.data.map(nft => <option key={nft.tokenAddress} value={nft.tokenAddress}>{nft.name}</option>)}
                                </select>
                                {watchMint && (
                                    <div className='flex justify-center items-center'>
                                        <div className='mt-4'>
                                            <Image
                                                alt={`${watchMint} image`}
                                                src={nfts.data.find(nft => nft.tokenAddress === watchMint)?.imageUrl || ''}
                                                height={240}
                                                width={240}
                                                className='rounded'
                                            />
                                        </div>
                                    </div>
                                )} */}
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
                        </div>
                    )}
                    <input type='submit' className={`my-6 btn btn-primary ${createAuctionMutation.isLoading && 'loading'}`}/>
                </form>
            </div>
        </div>
    )
}