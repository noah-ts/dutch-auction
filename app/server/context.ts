import { inferAsyncReturnType } from '@trpc/server'
import * as trpcNext from '@trpc/server/adapters/next'
import { prisma } from './db'
 
export async function createContext(opts: trpcNext.CreateNextContextOptions) {
    return { prisma }
}

export type Context = inferAsyncReturnType<typeof createContext>