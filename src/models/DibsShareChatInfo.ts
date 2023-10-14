import mongoose, {Document, Schema} from 'mongoose';
import {v4 as uuidv4} from 'uuid';

interface IChatInfo extends Document {
  id: number;
  title: string;
  type: string;
}

const ChatInfoSchema: Schema = new Schema({
  id: {type: Number, required: true},
  title: {type: String, required: true},
  type: {type: String, required: true},
});

export interface IDibsShareChatInfo extends Document {
  _id: string;
  chatInfo: IChatInfo;
  dibsShareAddress: string;
  chainId: number;
  signature: string | null;
  timestamp: number | null;
}

const DibsShareChatInfoSchema: Schema = new Schema({
  _id: {type: String, default: uuidv4},
  chatInfo: {type: ChatInfoSchema, required: true},
  dibsShareAddress: {type: String, required: true},
  chainId: {type: Number, required: true},
  signature: {type: String, required: false, default: null},
  timestamp: {type: Number, required: false, default: null},
});

export const DibsShareChatInfoModel = mongoose.model<IDibsShareChatInfo>('DibsShareChatInfo', DibsShareChatInfoSchema);
