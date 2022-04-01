import {
  LCDClient,
  MsgExecuteContract,
  MsgSend,
  Msg,
  Wallet,
  MnemonicKey,
  AccAddress,
  isTxError,
  Coin,
  Tx,
  TxInfo,
} from '@terra-money/terra.js';
import Web3 from 'web3';
import { MonitoringData } from 'Monitoring';
import axios from 'axios';
import secp256k1 from 'secp256k1';
import { randomBytes } from 'crypto';
import * as http from 'http';
import * as https from 'https';

const ax = axios.create({
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
  timeout: 15000,
});

const TERRA_MNEMONIC = process.env.TERRA_MNEMONIC as string;
const TERRA_CHAIN_ID = process.env.TERRA_CHAIN_ID as string;
const TERRA_URL = process.env.TERRA_URL as string;
const TERRA_GAS_PRICE = process.env.TERRA_GAS_PRICE as string;
const TERRA_GAS_PRICE_END_POINT = process.env
  .TERRA_GAS_PRICE_END_POINT as string;
const TERRA_GAS_PRICE_DENOM = process.env.TERRA_GAS_PRICE_DENOM as string;
const TERRA_GAS_ADJUSTMENT = process.env.TERRA_GAS_ADJUSTMENT as string;
const TERRA_DONATION = process.env.TERRA_DONATION as string;

export interface RelayDataRaw {
  tx: string;
  txHash: string;
  createdAt: number;
}

export interface RelayData {
  tx: Tx;
  txHash: string;
  createdAt: number;
}

export class Relayer {
  Wallet: Wallet;
  LCDClient: LCDClient;

  constructor() {
    // Register terra chain infos
    this.LCDClient = new LCDClient({
      URL: TERRA_URL,
      chainID: TERRA_CHAIN_ID,
      gasPrices: TERRA_GAS_PRICE,
      gasAdjustment: TERRA_GAS_ADJUSTMENT,
    });

    this.Wallet = new Wallet(
      this.LCDClient,
      new MnemonicKey({ mnemonic: TERRA_MNEMONIC })
    );
  }

  loadSequence(): Promise<number> {
    return this.Wallet.sequence();
  }

  async build(
    monitoringDatas: MonitoringData[],
    sequence: number
  ): Promise<RelayData | null> {
    const msgs: Msg[] = monitoringDatas.reduce(
      (msgs: Msg[], data: MonitoringData) => {
        const fromAddr = this.Wallet.key.accAddress;

        // If the given `to` address not proper address,
        // relayer send the funds to donation address
        const toAddr = AccAddress.validate(data.to) ? data.to : TERRA_DONATION;

        // 18 decimal to 6 decimal
        // it must bigger than 1,000,000,000,000
        if (data.amount.length < 13) {
          return msgs;
        }

        const amount = data.amount.slice(0, data.amount.length - 12);
        console.log(
          'builddata ========================= ',
          data,
          fromAddr,
          toAddr,
          sequence,
          amount
        );
        const info = data.terraAssetInfo;

        /* if (info.denom) {
          const denom = info.denom;

          msgs.push(new MsgSend(fromAddr, toAddr, [new Coin(denom, amount)]));
        } else if (info.contract_address && !info.is_eth_asset) { */
        if (info.contract_address) {
          const contract_address = info.contract_address;
          let signData = Web3.utils.soliditySha3Raw(
            { t: 'string', v: (sequence + 3).toString() },
            contract_address,
            data.to,
            { t: 'string', v: amount.toString() },
            { t: 'string', v: data.txHash.toString() }
          ) as string;

          console.log(
            'soliditySha3Raw',
            Web3.utils.soliditySha3Raw(
              { t: 'string', v: sequence.toString() },
              contract_address,
              data.to,
              { t: 'string', v: amount.toString() },
              {
                t: 'string',
                v: '0x488895500ae629aaebb71f409088abb82a9cf3bac22f51a4fc9f772fd9542335',
              }
            )
          );

          console.log(
            'hashData',
            sequence.toString(),
            contract_address,
            data.to,
            amount.toString(),
            data.txHash.toString()
          );

          signData = signData.slice(2);
          const signMsg = Uint8Array.from(Buffer.from(signData, 'hex'));
          console.log('signMsg length', signData, signMsg, signMsg.length);
          const privKey = Uint8Array.from(
            Buffer.from(
              'd91c7d1ed8b1fe7264d431dd38fb988cd3a78543cfd7b20f6be0e047df30effe',
              'hex'
            )
          );
          const sigObj = secp256k1.ecdsaSign(signMsg, privKey);
          console.log('signObj', sigObj);

          msgs.push(
            new MsgExecuteContract(
              fromAddr,
              contract_address,
              {
                // transfer: {
                //   // origin
                //   // recipient: toAddr,
                //   // amount: amount,
                // },
                mint: {
                  _amount: amount.toString(),
                  _signature: sigObj.toString(),
                  _to: data.to,
                  _token: 'terra139sre3kwut3gljnhf0g3r27u9jw9u4vup2tjkf',
                  _txHash: data.txHash.toString(),
                },
                // set_pub_key: "03bdab50beb1532e83ec9b19f54865dc833d0b3b115bddfdf92745c802b4b007fc"
              },
              []
            )
          );
        }
        /* } else if (info.contract_address && info.is_eth_asset) {
          const contract_address = info.contract_address;

          msgs.push(
            new MsgExecuteContract(
              fromAddr,
              contract_address,
              {
                mint: {
                  recipient: toAddr,
                  amount: amount,
                },
              },
              []
            )
          );
        } */

        return msgs;
      },
      []
    );

    if (msgs.length === 0) {
      return null;
    }
    console.log('msgs', msgs);

    // if something wrong, pass undefined to use default gas
    const gasPrices = await this.loadGasPrice(
      TERRA_GAS_PRICE_END_POINT,
      TERRA_GAS_PRICE_DENOM
    ).catch((_) => undefined);
    console.log('gasPrices', gasPrices);
    console.log('wallet', this.Wallet);

    const tx = await this.Wallet.createAndSignTx({
      msgs,
      // sequence,
      // gasPrices,
    });

    const txHash = await this.LCDClient.tx.hash(tx);
    console.log('txHash', tx, txHash);

    return {
      tx,
      txHash,
      createdAt: new Date().getTime(),
    };
  }

  async relay(tx: Tx): Promise<void> {
    const result = await this.LCDClient.tx.broadcastSync(tx);

    // error code 19 means tx already in the mempool
    if (isTxError(result) && result.code !== 19) {
      throw new Error(
        `Error while executing: ${result.code} - ${result.raw_log}`
      );
    }
  }

  async getTransaction(txHash: string): Promise<TxInfo | null> {
    return await this.LCDClient.tx.txInfo(txHash).catch(() => {
      return null; // ignore not found error
    });
  }

  async loadGasPrice(url: string, denom: string): Promise<string> {
    return (await ax.get(url)).data[denom] + denom;
  }
}
