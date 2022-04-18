const assetInfos: {
  [network: string]: {
    [asset: string]: {
      is_eth_asset?: boolean;
      contract_address?: string;
      denom?: string;
    };
  };
} = {
  'bombay-12': {
    LUNA: {
      denom: 'uluna',
    },
    UST: {
      denom: 'uusd',
    },
    KRT: {
      denom: 'ukrw',
    },
    SDT: {
      denom: 'usdr',
    },
    MNT: {
      denom: 'umnt',
    },
    minter: {
      contract_address: 'terra1cjzlxltxmmtc7pnvkwn5rs3rl496pvwe4m0y8y',
    },
    FHM: {
      contract_address: 'terra1fvr56w2lddnpf25rkpl8mzkldxfjl3sw2mgc52',
    },
    USDB: {
      contract_address: 'terra1yc68z9lhdl6huhf8pqmn9kke6d8fn44aef4tsm',
    },
  },
};

export default assetInfos;
