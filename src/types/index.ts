import {Context, NarrowedContext} from "telegraf";
import {Message, Update} from "telegraf/typings/core/types/typegram";
export type Address = `0x${string}`

export interface SessionData {
  chainId: number | null,
  dibsShareAddress: Address | null
}
export interface TelegrafContext extends Context {
  session?: SessionData;
}

export type CtxType = NarrowedContext<TelegrafContext,  Update.MessageUpdate<Message>>
