import redis from 'redis';
import { promisify } from 'util';
import { Monitoring } from './Monitoring';
import Relayer from './Relayer';

const REDIS_PREFIX = 'eth_shuttle';
const KEY_LAST_HEIGHT = 'last_height';

const LOAD_UNIT = parseInt(process.env.ETH_LOAD_UNIT || '10');
const ETH_BLOCK_SECOND = parseInt(process.env.ETH_BLOCK_SECOND || '10');
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

class Shuttle {
  monitoring: Monitoring;
  relayer: Relayer;
  getAsync: (key: string) => Promise<string | null>;
  setAsync: (key: string, val: string) => Promise<unknown>;

  constructor() {
    // Redis setup
    const redisClient = redis.createClient(REDIS_URL, { prefix: REDIS_PREFIX });

    this.getAsync = promisify(redisClient.get).bind(redisClient);
    this.setAsync = promisify(redisClient.set).bind(redisClient);

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
  }

  async process() {
    const lastHeight = parseInt((await this.getAsync(KEY_LAST_HEIGHT)) || '0');
    const [newLastHeight, monitoringDatas] = await this.monitoring.load(
      lastHeight
    );

    // Relay to terra chain
    if (monitoringDatas.length > 0) {
      const txhash = await this.relayer.relay(monitoringDatas);
      if (txhash.length !== 0) console.log(`Relay Success: ${txhash}`);
    }

    // Update last_height
    await this.setAsync(KEY_LAST_HEIGHT, newLastHeight.toString());
    console.log(`HEIGHT: ${newLastHeight}`);

    // When catched the block height, wait 10 second
    if (newLastHeight - lastHeight < LOAD_UNIT) {
      await this.sleep(ETH_BLOCK_SECOND * 1000);
    }
  }

  sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export = Shuttle;
