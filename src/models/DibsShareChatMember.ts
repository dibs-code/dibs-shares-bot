import mongoose, {Document, Schema} from 'mongoose';
import {v4 as uuidv4} from 'uuid';

export interface IDibsShareChatMember extends Document {
  _id: string;
  account: string;
  inviteLink: string;
  dibsShareAddress: string;
  chainId: number;
  signature: string | null;
  timestamp: number | null;
  joinedTelegramUserId: number | null;
}

const DibsShareChatMemberSchema: Schema = new Schema({
  _id: {type: String, default: uuidv4},
  account: {type: String, required: true},
  inviteLink: {type: String, required: true, unique: true},
  dibsShareAddress: {type: String, required: true},
  chainId: {type: Number, required: true},
  signature: {type: String, required: false, default: null},
  timestamp: {type: Number, required: false, default: null},
  joinedTelegramUserId: {type: Number, required: false, default: null},
});

export const DibsShareChatMemberModel = mongoose.model<IDibsShareChatMember>('DibsShareChatMember', DibsShareChatMemberSchema);
