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
      contract_address: 'terra1marwy7xz56jfy64fa4jvuc40059u4rfnje00mw',
    },
  },
  'columbus-5': {
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
    MIR: {
      contract_address: 'terra15gwkyepfc6xgca5t5zefzwy42uts8l2m4g40k6',
    },
    mAAPL: {
      contract_address: 'terra1vxtwu4ehgzz77mnfwrntyrmgl64qjs75mpwqaz',
    },
    mGOOGL: {
      contract_address: 'terra1h8arz2k547uvmpxctuwush3jzc8fun4s96qgwt',
    },
    mTSLA: {
      contract_address: 'terra14y5affaarufk3uscy2vr6pe6w6zqf2wpjzn5sh',
    },
    mNFLX: {
      contract_address: 'terra1jsxngqasf2zynj5kyh0tgq9mj3zksa5gk35j4k',
    },
    mQQQ: {
      contract_address: 'terra1csk6tc7pdmpr782w527hwhez6gfv632tyf72cp',
    },
    mTWTR: {
      contract_address: 'terra1cc3enj9qgchlrj34cnzhwuclc4vl2z3jl7tkqg',
    },
    mMSFT: {
      contract_address: 'terra1227ppwxxj3jxz8cfgq00jgnxqcny7ryenvkwj6',
    },
    mAMZN: {
      contract_address: 'terra165nd2qmrtszehcfrntlplzern7zl4ahtlhd5t2',
    },
    mBABA: {
      contract_address: 'terra1w7zgkcyt7y4zpct9dw8mw362ywvdlydnum2awa',
    },
    mIAU: {
      contract_address: 'terra15hp9pr8y4qsvqvxf3m4xeptlk7l8h60634gqec',
    },
    mSLV: {
      contract_address: 'terra1kscs6uhrqwy6rx5kuw5lwpuqvm3t6j2d6uf2lp',
    },
    mUSO: {
      contract_address: 'terra1lvmx8fsagy70tv0fhmfzdw9h6s3sy4prz38ugf',
    },
    mVIXY: {
      contract_address: 'terra1zp3a6q6q4953cz376906g5qfmxnlg77hx3te45',
    },
    mFB: {
      contract_address: 'terra1mqsjugsugfprn3cvgxsrr8akkvdxv2pzc74us7',
    },
    aUST: {
      contract_address: 'terra1hzh9vpxhsk8253se0vv5jj6etdvxu3nv8z07zu',
    },
    ANC: {
      contract_address: 'terra14z56l0fp2lsf86zy3hty2z47ezkhnthtr9yq76',
    },
    mCOIN: {
      contract_address: 'terra18wayjpyq28gd970qzgjfmsjj7dmgdk039duhph',
    },
  },
};

export default assetInfos;
