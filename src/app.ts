import {Address, CtxType, TelegrafContext} from "./types";
import {MessageTypes, recoverTypedSignature, SignTypedDataVersion} from '@metamask/eth-sig-util';

import cors from 'cors';
import {Markup, session, Telegraf} from "telegraf";
import express from 'express';
import mongoose from 'mongoose';
import {ChatMember} from "telegraf/typings/core/types/typegram";
import {Chat} from "@telegraf/types/manage";
import {DibsShareChatInfoModel, IDibsShareChatInfo} from "./models/DibsShareChatInfo";
import {TypedMessage} from "@metamask/eth-sig-util/dist/sign-typed-data";
import {Web3} from "web3";
import bondingTokenABI from './abi/bondingToken.json'
import {DibsShareChatMemberModel} from "./models/DibsShareChatMember";

require('dotenv').config();


// define Mongoose model
const StringModel = mongoose.model('String', new mongoose.Schema({name: String}));

const app = express();

if (process.env.NODE_ENV === 'development') {
  app.use(cors());
}
const port = 3000;

// Middleware to parse JSON
app.use(express.json());

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  throw Error("MONGO_URI not provided")
}

const dibsSharesFrontendUrl = process.env.DIBS_SHARES_FRONTEND_URL
if (!dibsSharesFrontendUrl) {
  throw Error("DIBS_SHARES_FRONTEND_URL not provided")
}

// connection to MongoDB
mongoose.connect(mongoUri).then(() => {
  console.log("Successfully connected to MongoDB");
}).catch(error => {
  console.error(`Error connecting to database: ${error}`);
});

async function getDibsSharesChatId(dibsShareAddress: Address, chainId: number) {
  const docs = await
    DibsShareChatInfoModel
      .find({
        signature: {$ne: null},
        dibsShareAddress,
        chainId,
      })
      .sort('-timestamp')
      .limit(1)
  return docs[0]?.chatInfo.id
}

app.post('/api/dibsShareChatInfo/:id/verify', async (req, res) => {
  const {id} = req.params;
  let doc: IDibsShareChatInfo | null = null
  if (!req.body.signature || typeof req.body.signature !== 'string') {
    return res.status(400).json({message: 'A string signature must be sent'});
  }
  if (!req.body.timestamp || typeof req.body.timestamp !== 'number') {
    return res.status(400).json({message: 'timestamp must be sent'});
  }
  try {
    doc = await DibsShareChatInfoModel.findById(id);
    if (!doc) {
      return res.status(404).json({message: 'No document with the provided ID was found'});
    }
    if (doc.signature) {
      return res.status(400).json({message: 'Already signed'});
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({message: 'An error occurred while processing your request'});
  }
  const signature: string = req.body.signature;
  const timestamp: number = req.body.timestamp;

  const domain = {
    name: 'DibsShareChatInfo',
    version: '1',
  };

  const types = {
    EIP712Domain: [
      {name: "name", type: "string"},
      {name: "version", type: "string"},
    ],
    DibsShareChatInfo: [
      {name: 'chainId', type: 'uint256'},
      {
        name: 'dibsShareAddress',
        type: 'address',
      },
      {name: 'requestId', type: 'string'},
      {name: 'timestamp', type: 'uint256'}
    ],
  };

  const message = {
    chainId: doc.chainId,
    dibsShareAddress: doc.dibsShareAddress,
    requestId: doc._id,
    timestamp
  };

  const typedData: TypedMessage<MessageTypes> = {
    domain,
    message,
    primaryType: 'DibsShareChatInfo',
    types,
  };
  let signer: Address | null = null;
  try {
    signer = recoverTypedSignature({
      data: typedData,
      signature,
      version: SignTypedDataVersion.V4
    }) as Address
  } catch (e) {
    console.log(e)
    return res.status(400).json({message: 'Invalid Signature'});
  }
  const web3 = new Web3('https://ethereum-goerli.publicnode.com');
  const contract = new web3.eth.Contract(bondingTokenABI, doc.dibsShareAddress);
  const author = (await contract.methods.author().call()) as Address
  if (author.toLowerCase() !== signer.toLowerCase()) {
    return res.status(400).json({message: 'Request should be signed by the author of the contract'});
  }
  doc.signature = signature;
  doc.timestamp = timestamp;
  await doc.save()
  return res.status(200).json({success: true});
});

app.post('/api/dibsSharesChatJoinRequest', async (req, res) => {
  if (!req.body.dibsShareAddress || typeof req.body.dibsShareAddress !== 'string') {
    return res.status(400).json({message: 'dibsShareAddress must be sent'});
  }
  if (!req.body.signature || typeof req.body.signature !== 'string') {
    return res.status(400).json({message: 'signature must be sent'});
  }
  if (!req.body.chainId || typeof req.body.chainId !== 'number') {
    return res.status(400).json({message: 'chainId must be sent'});
  }
  if (!req.body.timestamp || typeof req.body.timestamp !== 'number') {
    return res.status(400).json({message: 'timestamp must be sent'});
  }
  const dibsShareAddress: Address = req.body.dibsShareAddress.toLowerCase();
  const signature: string = req.body.signature;
  const timestamp: number = req.body.timestamp;
  const chainId: number = req.body.chainId;

  const domain = {
    name: 'DibsShareChatJoinRequest',
    version: '1',
  };

  const types = {
    EIP712Domain: [
      {name: "name", type: "string"},
      {name: "version", type: "string"},
    ],
    DibsShareChatJoinRequest: [
      {name: 'chainId', type: 'uint256'},
      {
        name: 'dibsShareAddress',
        type: 'address',
      },
      {name: 'timestamp', type: 'uint256'},
    ],
  };

  const message = {
    chainId,
    dibsShareAddress,
    timestamp
  };

  const typedData: TypedMessage<MessageTypes> = {
    domain,
    message,
    primaryType: 'DibsShareChatJoinRequest',
    types,
  };
  let signer: Address | null = null;
  try {
    signer = recoverTypedSignature({
      data: typedData,
      signature,
      version: SignTypedDataVersion.V4
    }) as Address
  } catch (e) {
    console.log(e)
    return res.status(400).json({message: 'Invalid Signature'});
  }

  const web3 = new Web3('https://ethereum-goerli.publicnode.com');
  const contract = new web3.eth.Contract(bondingTokenABI, dibsShareAddress);
  // @ts-ignore
  const [balance, decimals] = await Promise.all([contract.methods.balanceOf(signer).call(signer), contract.methods.decimals().call()]) as [bigint, bigint]
  if (balance < BigInt(10) ** decimals) {
    return res.status(400).json({message: 'Signer should have at least 1 of share token'});
  }

  try {
    const inviteLink = (await bot.telegram.createChatInviteLink(
      await getDibsSharesChatId(dibsShareAddress, chainId),
      {
        creates_join_request: true,
      }
    )).invite_link;
    const chatMemberInfo = new DibsShareChatMemberModel({
      account: signer,
      inviteLink,
      dibsShareAddress,
      chainId,
      signature,
      timestamp
    });
    await chatMemberInfo.save();
    return res.status(200).json({inviteLink});
  } catch (error) {
    console.log(error);
    return res.status(500).json({message: 'An error occurred while processing your request'});
  }
});

app.get('/api/dibsShareChatInfo/:id', async (req, res) => {
  const {id} = req.params;
  try {
    const doc = await DibsShareChatInfoModel.findById(id);
    if (!doc) {
      return res.status(404).json({message: 'No document with the provided ID was found'});
    }
    return res.json(doc);
  } catch (error) {
    console.error(error);
    return res.status(500).json({message: 'An error occurred while processing your request'});
  }
});
app.get('/api/isChatInfoSet/:chainId/:dibsShareAddress', async (req, res) => {
  const {chainId, dibsShareAddress} = req.params;
  try {
    const chatId = await getDibsSharesChatId(dibsShareAddress.toLowerCase() as Address, Number(chainId))
    return res.json({result: Boolean(chatId)});
  } catch (error) {
    console.error(error);
    return res.status(500).json({message: 'An error occurred while processing your request'});
  }
});
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

const BOT_API_TOKEN = process.env.BOT_API_TOKEN
if (!BOT_API_TOKEN) {
  throw new Error("BOT_API_TOKEN not provided");
}
const bot = new Telegraf<TelegrafContext>(BOT_API_TOKEN);
bot.use(session());
const chatRequestKeyboard = Markup.keyboard([Markup.button.groupRequest('Select Group', 1), Markup.button.channelRequest('Select Channel', 2)]).oneTime().resize()

async function askForGroup(ctx: CtxType) {
  return ctx.reply('Use the button below to select the group/channel that you want to have your Share holders in. Note that the bot must be an admin in that chat', {
    ...chatRequestKeyboard
  })
}

async function handleMessage(ctx: CtxType) {
  ctx.session = ctx.session ?? {
    dibsShareAddress: null,
    chainId: null
  }

  if ('chat_shared' in ctx.message) {
    const chatId = ctx.message.chat_shared.chat_id;
    let chatMemberInfo: ChatMember | null = null
    try {
      chatMemberInfo = await ctx.telegram.getChatMember(chatId, ctx.botInfo.id)
    } catch (e) {
    }
    if (!chatMemberInfo) {
      return ctx.reply(`The bot is not a member of this group/channel. Please first add the bot and make it an admin. you can use this link to add the bot to a group: https://t.me/${ctx.botInfo.username}?startgroup or use this link to add it to a channel: https://t.me/${ctx.botInfo.username}?startchannel\n\nThen use the buttons below to select that chat`, {
        ...chatRequestKeyboard
      })
    }
    if (chatMemberInfo.status === 'member') {
      return ctx.reply(`The bot is not an admin of this group/channel. Please first make it an admin.\n\nThen use the buttons below to select that chat`, {
        ...chatRequestKeyboard
      })
    }
    //TODO: check if the bot has the required permissions

    const chatInfo = await ctx.telegram.getChat(chatId) as Chat.GroupGetChat | Chat.SupergroupGetChat | Chat.ChannelGetChat
    try {
      const chatDataToSet = new DibsShareChatInfoModel({
        chatInfo: {
          id: chatInfo.id,
          title: chatInfo.title,
          type: chatInfo.type,
        },
        dibsShareAddress: ctx.session.dibsShareAddress,
        chainId: ctx.session.chainId
      });
      const res = await chatDataToSet.save();
      const link = `${dibsSharesFrontendUrl}/shares/setchat/${res._id}`
      return ctx.reply(`Please visit this url to set *${chatInfo.title}* ${chatInfo.type} for your Dibs Share:\n\n${link}`, {
        parse_mode: "Markdown",
      })
    } catch (error) {
      console.log(error);
      return ctx.reply('Error')
    }
  }

  // @ts-ignore
  let text: string | null = ctx.message?.text || ctx.match?.[0] || null;
  if (!text) return
  if (text.startsWith("/start")) {
    const args = text.slice("/start ".length).split("-")
    for (let i = 0; i < args.length; i++) {
      const [name, value] = args[i].split("=");
      if (name === 's') {
        ctx.session.dibsShareAddress = value.toLowerCase() as Address
      }
      if (name === 'c') {
        ctx.session.chainId = Number(value)
      }
    }
    if (ctx.session.dibsShareAddress) {
      return askForGroup(ctx)
    }
  }
}

bot.on("message", (ctx) => {
  handleMessage(ctx).catch(console.log)
});

bot.on("chat_join_request", (ctx) => {
  async function handle() {
    const chatJoinRequest = ctx.update.chat_join_request;
    const joinedTelegramUserId = chatJoinRequest.from.id;
    if (!chatJoinRequest.invite_link || chatJoinRequest.invite_link?.creator.id !== ctx.botInfo.id) return;
    const inviteLink = chatJoinRequest.invite_link.invite_link
    const doc = await DibsShareChatMemberModel.findOne({inviteLink})
    if (doc && !doc.joinedTelegramUserId) {
      await bot.telegram.approveChatJoinRequest(
        chatJoinRequest.chat.id,
        joinedTelegramUserId
      );
      doc.joinedTelegramUserId = joinedTelegramUserId
      doc.save()
    } else {
      await bot.telegram.declineChatJoinRequest(
        chatJoinRequest.chat.id,
        joinedTelegramUserId
      );
    }
    await bot.telegram.revokeChatInviteLink(
      chatJoinRequest.chat.id,
      inviteLink
    );
  }

  handle().catch(console.log)
});

bot.launch();
