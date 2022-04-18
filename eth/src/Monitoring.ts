import Web3 from 'web3';
import { Log } from 'web3-core';
import { hexToBytes } from 'web3-utils';
import { bech32 } from 'bech32';
import BigNumber from 'bignumber.js';
import BlueBird from 'bluebird';

BigNumber.config({ ROUNDING_MODE: BigNumber.ROUND_DOWN });

import EthContractInfos from './config/EthContractInfos';
import TerraAssetInfos from './config/TerraAssetInfos';

const FEE_RATE = process.env.FEE_RATE as string;

const ETH_URL = process.env.ETH_URL as string;
const ETH_BLOCK_LOAD_UNIT = parseInt(process.env.ETH_BLOCK_LOAD_UNIT as string);
const ETH_BLOCK_CONFIRMATION = parseInt(
  process.env.ETH_BLOCK_CONFIRMATION as string
);

const ETH_CHAIN_ID = process.env.ETH_CHAIN_ID as string;
const TERRA_CHAIN_ID = process.env.TERRA_CHAIN_ID as string;

const MAX_RETRY = 5;
export class Monitoring {
  Web3: Web3;

  AddressAssetMap: { [address: string]: string };
  TerraAssetInfos: {
    [asset: string]: TerraAssetInfo;
  };

  constructor() {
    // Register eth chain infos
    this.Web3 = new Web3(ETH_URL);

    const ethContractInfos = EthContractInfos[ETH_CHAIN_ID];
    const terraAssetInfos = TerraAssetInfos[TERRA_CHAIN_ID];

    console.log(
      'terra ascii',
      this.Web3.utils.fromAscii('terra1ej058juh27zw6e6c6a9gsgflfvtuaaff56m7dg')
    );

    this.AddressAssetMap = {};
    this.TerraAssetInfos = {};
    for (const [asset, value] of Object.entries(ethContractInfos)) {
      // if (asset === 'MultiSig') {
      //   continue;
      // }

      console.log('asset', asset);

      const info = terraAssetInfos[asset];
      if (info === undefined) {
        continue;
      }

      if (
        (info.denom === undefined && info.contract_address === undefined) ||
        (info.denom !== undefined && info.contract_address !== undefined)
      ) {
        throw new Error('Must provide one of denom and contract_address');
      }

      if (info.denom !== undefined && info.is_eth_asset) {
        throw new Error('Native asset is not eth asset');
      }

      this.AddressAssetMap[value.contract_address] = asset;
      this.TerraAssetInfos[asset] = info;
    }
  }

  async load(
    lastHeight: number,
    missingTxHashes: string[]
  ): Promise<[number, MonitoringData[]]> {
    const latestHeight =
      (await getBlockNumber(this.Web3, MAX_RETRY)) - ETH_BLOCK_CONFIRMATION;

    // skip no new blocks generated
    if (lastHeight >= latestHeight) {
      return [lastHeight, []];
    }

    // If initial state, we start sync from latest height
    const fromBlock = lastHeight === 0 ? latestHeight : lastHeight + 1;
    const toBlock = Math.min(fromBlock + ETH_BLOCK_LOAD_UNIT, latestHeight);

    console.info(`Loading From: ${fromBlock}, To: ${toBlock}`);
    const monitoringDatas = await this.getMonitoringDatas(
      fromBlock,
      toBlock,
      missingTxHashes
    );
    console.log('monitorinDatas', monitoringDatas);

    return [toBlock, monitoringDatas];
  }

  async getMonitoringDatas(
    fromBlock: number,
    toBlock: number,
    missingTxHashes: string[]
  ): Promise<MonitoringData[]> {
    const logs = await getPastLogs(
      this.Web3,
      fromBlock,
      toBlock,
      Object.keys(this.AddressAssetMap),
      MAX_RETRY
    );

    // append missing tx logs
    const missingLogs = await this.getTransactionLogs(missingTxHashes);
    missingLogs.filter((log: Log) => {
      return log.blockNumber < fromBlock;
    });
    logs.push(...missingLogs);

    const txHashMap: { [key: string]: boolean } = {};

    console.log('log', logs);

    const monitoringDatas: MonitoringData[] = logs
      .filter((log: any) => {
        return !log['removed'];
      })
      .map((log: Log) => {
        if (txHashMap[log.transactionHash]) {
          log.transactionHash += `-${log.logIndex}`;
        } else {
          txHashMap[log.transactionHash] = true;
        }

        console.log('decodedDatalog', log);
        const decodedData = decodeLog(this.Web3, log);
        console.log('decodedData', decodedData);

        const requested = new BigNumber(decodedData['amount']);
        const fee = requested.multipliedBy(FEE_RATE);
        const amount = requested.minus(fee);

        // const asset = this.AddressAssetMap[log.address];
        const asset = this.AddressAssetMap[decodedData.tokenAddress];
        const info = this.TerraAssetInfos[asset];
        console.log('log.address, asset', log.address, asset, info)
        console.log('addressmap', this.AddressAssetMap, this.TerraAssetInfos)
        // const terraToAddress = bech32.encode(
        //   'terra',
        //   bech32.toWords(hexToBytes(decodedData['recipient'].slice(0, 42)))
        // )
        const terraToAddress = Web3.utils.hexToAscii(decodedData['recipient']);

        console.log('decodedData recipient', decodedData['recipient']);
        console.log(
          'recipient addr',
          bech32.encode(
            'terra',
            bech32.toWords(hexToBytes(decodedData['recipient'].slice(0, 42)))
          )
        );

        return {
          blockNumber: log.blockNumber,
          txHash: log.transactionHash,
          sender: decodedData['sender'],
          to: terraToAddress,
          requested: requested.toFixed(0),
          amount: amount.toFixed(0),
          fee: fee.toFixed(0),
          asset,
          bridge_contract_address: TerraAssetInfos[TERRA_CHAIN_ID].MultiSig.contract_address,
          terraAssetInfo: info,
        };
      });
    // 0x746572726131656a3035386a756832377a7736653663366139677367666c667674756161666635366d376467
    // terra1ej058juh27zw6e6c6a9gsgflfvtuaaff56m7dg
    // terra1w3jhyunpx9jk5vp48p4826pjxaa8wdn9fg9fnv
    // terra1w3jhyunpx9jk5vp48p4826pjxaa8wdsffcjy7
    return monitoringDatas;
  }

  async getTransactionLogs(transactionHashes: string[]): Promise<Log[]> {
    const logs: Log[] = [];
    for (const transactionHash of transactionHashes) {
      const txReceipt: any = await this.Web3.eth.getTransactionReceipt(
        transactionHash
      );

      if (txReceipt && txReceipt.status && txReceipt.logs) {
        for (const log of txReceipt.logs) {
          if (
            log.address in this.AddressAssetMap &&
            log.topics[0] ===
              '0x7bad95c5817621d8789091ae63d99bf8f7bed9ea4963b10c3d3c6bb7273522b3'
          ) {
            logs.push(log);
            break;
          }
        }
      }
    }

    return logs;
  }
}

async function getPastLogs(
  web3: Web3,
  fromBlock: number,
  toBlock: number,
  address: string[],
  retry: number
): Promise<Log[]> {
  // console.log('past logs address', address)
  try {
    return await web3.eth.getPastLogs({
      fromBlock,
      toBlock,
      address,
      topics: [
        // '0xc3599666213715dfabdf658c56a97b9adfad2cd9689690c70c79b20bc61940c9',
        '0x7bad95c5817621d8789091ae63d99bf8f7bed9ea4963b10c3d3c6bb7273522b3',
      ],
    });
  } catch (err) {
    console.error(err);
    if (
      retry > 0 &&
      (err.message.includes('query returned more than 10000 results') ||
        err.message.includes('invalid project id') ||
        err.message.includes('request failed or timed out') ||
        err.message.includes('unknown block') ||
        err.message.includes('502 Bad Gateway') ||
        err.message.includes('Invalid JSON RPC response') ||
        err.message.includes('exceed maximum block range: 5000') ||
        err.message.includes('system overloaded') ||
        err.message.includes('403 Forbidden'))
    ) {
      console.error('infura errors happened. retry getPastEvents');

      await BlueBird.delay(5000);

      return await getPastLogs(web3, fromBlock, toBlock, address, retry - 1);
    }

    throw err;
  }
}

async function getBlockNumber(web3: Web3, retry: number): Promise<number> {
  try {
    const blockNumber = await web3.eth.getBlockNumber();
    return blockNumber;
  } catch (err) {
    if (
      retry > 0 &&
      (err.message.includes('invalid project id') ||
        err.message.includes('request failed or timed out') ||
        err.message.includes('502 Bad Gateway') ||
        err.message.includes('Invalid JSON RPC response'))
    ) {
      console.error('infura errors happened. retry getBlockNumber');

      await BlueBird.delay(500);

      const blockNumber = await getBlockNumber(web3, retry - 1);
      return blockNumber;
    }

    throw err;
  }
}

function decodeLog(web3: Web3, log: Log): { [key: string]: string } {
  console.log(
    'slicelogtopics',
    log.topics.slice(1).length ? log.topics.slice(1) : [log.topics[0]]
  );
  return web3.eth.abi.decodeLog(
    [
      {
        indexed: false,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: 'recipient',
        type: 'bytes',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address',
      },
    ],
    log.data,
    log.topics.slice(1).length ? log.topics.slice(1) : [log.topics[0]]
    // log.topics
  );
}

export type TerraAssetInfo = {
  is_eth_asset?: boolean;
  contract_address?: string;
  denom?: string;
};

export type MonitoringData = {
  blockNumber: number;
  txHash: string;
  sender: string;
  to: string;
  requested: string;
  amount: string;
  fee: string;
  asset: string;
  bridge_contract_address: string | undefined,

  // terra side data for relayer
  terraAssetInfo: TerraAssetInfo;
};
