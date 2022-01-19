var HDWalletProvider = require("truffle-hdwallet-provider");
const mnemonic = "come online patrol sea tomorrow trip dune resist front evolve share master";

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port:9545,
      network_id: '*',
    },
    rinkeby: {
      provider: () => new HDWalletProvider(mnemonic, `https://rinkeby.infura.io/v3/0f3d9f30356e48c7b048c0b6a6c8ceae`),
        network_id: 4,       // rinkeby's id
        gas: 4500000,        // rinkeby has a lower block limit than mainnet
        gasPrice: 10000000000
    }
  },
  compilers: {
    solc: {
      version: "^0.4.25"
    }
  },
  mocha: {
    timeout:20000
  }
};