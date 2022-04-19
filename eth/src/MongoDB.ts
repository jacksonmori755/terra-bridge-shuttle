import Mongoose, { model, Document, Schema } from 'mongoose';
require('dotenv').config();

const MONGO_URL = process.env.MONGO_URL as string;
const DB_NAME = process.env.DB_NAME as string;
const TABLE_NAME = 'ShuttleTx';
const MAX_LOAD_UNIT = 100;
const MAX_STORE_UNIT = 25;

export interface ITransactionData {
  fromTxHash: string;
  toTxHash: string;
  asset: string;
  sender: string;
  recipient: string;
  amount: string;
}
export const ShuttleTxSchema = new Schema({
  fromTxHash: String,
  toTxHash: String,
  asset: String,
  sender: String,
  recipient: String,
  amount: String,
  createdAt: {
    type: Date,
    default: new Date(),
  },
});
export interface IShuttleTx {
  fromTxHash: string;
  toTxHash: string;
  asset: string;
  sender: string;
  recipient: string;
  amount: string;
}
export interface IShuttleTxDocument extends IShuttleTx, Document {}
export const UserModel = model<IShuttleTxDocument>(
  TABLE_NAME,
  ShuttleTxSchema,
  TABLE_NAME
);

export class MongoDB {
  client: Mongoose.Connection;

  constructor() {
    this.connect();
    this.client = Mongoose.connection;
  }

  connect() {
    Mongoose.connect(
      MONGO_URL,
      {
        dbName: DB_NAME,
      },
      (err: any) =>
        err
          ? console.log(err`${MONGO_URL}/${DB_NAME}`)
          : console.log(`Connected to ${MONGO_URL}/${DB_NAME} database`)
    );
  }

  async hasTransaction(fromTxHash: string): Promise<boolean> {
    // return await this.client
    return await UserModel.find({ fromTxHash: fromTxHash })
      .then((res) => res.length !== 0)
      .catch((err) => {
        console.error('HasTransaction Error', err);
        throw err;
      });
  }

  /**
   * @param fromTxHashes
   * @returns
   * { asdf: true } {"123":true}
   * { fromTxHash: true }
   */
  async hasTransactions(
    fromTxHashes: string[]
  ): Promise<{ [key: string]: boolean }> {
    if (fromTxHashes.length === 0) return {};

    const outOfBoundTxHashes = fromTxHashes.splice(MAX_LOAD_UNIT);

    const foundTxs = [];

    for (const fromTxHash of fromTxHashes) {
      const res = await UserModel.findOne({ fromTxHash });
      res && foundTxs.push(res.fromTxHash);
    }
    foundTxs.push({ '-1': true });

    const outOfBoundFoundTxMap = await this.hasTransactions(outOfBoundTxHashes);

    return Object.assign(
      Object.fromEntries(foundTxs.map((v) => [v as string, true])),
      outOfBoundFoundTxMap
    );
  }

  async storeTransactions(datas: ITransactionData[]) {
    if (datas.length == 0) return;

    const outOfBoundDatas = datas.splice(MAX_STORE_UNIT);

    try {
      for (const data of datas) {
        await UserModel.create({
          amount: data.amount,
          asset: data.asset,
          fromTxHash: data.fromTxHash,
          toTxHash: data.toTxHash,
          sender: data.sender,
          recipient: data.recipient,
        });
      }
      console.info('Stored Successfully!');
    } catch (err) {
      console.error(err);
    }

    await this.storeTransactions(outOfBoundDatas);
  }

  async storeTransaction(data: ITransactionData) {
    try {
      await UserModel.create({
        amount: data.amount,
        asset: data.asset,
        fromTxHash: data.fromTxHash,
        toTxHash: data.toTxHash,
        sender: data.sender,
        recipient: data.recipient,
      });
      console.info('Stored Successfully!');
    } catch (err) {
      console.error(err);
    }
  }

  async disconnect() {
    Mongoose.disconnect();
  }
}
