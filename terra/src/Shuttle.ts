import redis from 'redis';
import { promisify } from 'util';
import { Monitoring } from './Monitoring';
import Relayer from './Relayer';

const REDIS_PREFIX = 'terra_shuttle';
const KEY_LAST_HEIGHT = 'last_height';
const KEY_LAST_TXHASH = 'last_txhash';

const TERRA_BLOCK_SECOND = parseInt(process.env.TERRA_BLOCK_SECOND as string);
const REDIS_URL = process.env.REDIS_URL as string;

class Shuttle {
  monitoring: Monitoring;
  relayer: Relayer;
  getAsync: (key: string) => Promise<string | null>;
  setAsync: (key: string, val: string) => Promise<unknown>;
  delAsync: (key: string) => Promise<unknown>;

  constructor() {
    // Redis setup
    const redisClient = redis.createClient(REDIS_URL, { prefix: REDIS_PREFIX });

    this.getAsync = promisify(redisClient.get).bind(redisClient);
    this.setAsync = promisify(redisClient.set).bind(redisClient);
    this.delAsync = promisify(redisClient.del).bind(redisClient);

    this.monitoring = new Monitoring();
    this.relayer = new Relayer();
  }

  async startMonitoring() {
    // Graceful shutdown
    let shutdown = false;
    process.once('SIGINT', () => {
      shutdown = true;
    });
    process.once('SIGTERM', () => {
      shutdown = true;
    });

    while (!shutdown) {
      await this.process().catch((res) => {
        console.error(`Process failed: ${res}`);
      });

      await this.sleep(500);
    }

    console.log('##### Graceful Shutdown #####');
    process.exit(0);
  }

  async process() {
    const lastHeight = parseInt((await this.getAsync(KEY_LAST_HEIGHT)) || '0');
    const [newLastHeight, monitoringDatas] = await this.monitoring.load(
      lastHeight
    );

    console.log(monitoringDatas);

    // Relay to terra chain
    let relayFlag = false;
    const lastTxHash = await this.getAsync(KEY_LAST_TXHASH);
    for (let i = 0; i < monitoringDatas.length; i++) {
      const data = monitoringDatas[i];
      if (!relayFlag && lastTxHash !== undefined) {
        if (lastTxHash === data.txHash) {
          relayFlag = true;
          continue;
        }
      }

      const txhash = await this.relayer.relay(data);
      await this.setAsync(KEY_LAST_TXHASH, txhash);
      console.log(`Relay Success: ${txhash}`);
    }

    // Update last_height
    await this.setAsync(KEY_LAST_HEIGHT, newLastHeight.toString());
    await this.delAsync(KEY_LAST_TXHASH);

    console.log(`HEIGHT: ${newLastHeight}`);

    // When catched the block height, wait blocktime
    if (newLastHeight === lastHeight) {
      await this.sleep(TERRA_BLOCK_SECOND * 1000);
    }
  }

  sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export = Shuttle;
