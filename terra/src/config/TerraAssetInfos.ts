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
    FHM: {
      contract_address: 'terra139sre3kwut3gljnhf0g3r27u9jw9u4vup2tjkf',
    },
  },
};

export default assetInfos;
