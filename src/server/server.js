import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

const TEST_ORACLES_COUNT = 20;

let STATUS_CODE_LATE_AIRLINE = 20;

let defaultStatus = STATUS_CODE_LATE_AIRLINE;

flightSuretyApp.events.OracleRequest({
  fromBlock: 0
}, function (error, event) {
  if (error) console.log(error)
  console.log(event)
});

const app = express();
app.use(cors());
app.listen(80, function () {
})
app.get('/api', (req, res) => {
  res.send({
    message: 'An API for use with your Dapp!'
  })
})

flightSuretyApp.events.OracleRequest({fromBlock: "latest"}, 
  function (error, event) {
  let index = event.returnValues.index;
  let airline = event.returnValues.airline;
  let flight = event.returnValues.flight;
  let timestamp = event.returnValues.timestamp;
  let id = 0;

  oraclesIndexList.forEach((indices) => {
    let oracle = oracleAccounts[id];
    if (indices[0] == index || indices[1] == index || indices[2] == index) {
      console.log(`Oracle: ${oracle} triggered. Indexes: ${indices}.`);
      submitOracleResponse(oracle, index, airline, flight, timestamp);
    }
    id++;
  });
});

function submitOracleResponse(oracle, index, airline, flight, timestamp) {

  flightSuretyApp.methods
    .submitOracleResponse(index, airline, flight, timestamp, defaultStatus)
    .send({
      from: oracle,
      gas: 500000,
      gasPrice: 20000000
    }, (error, result) => {
      if (error) console.log(error);
    });
}

function generateOracleAccounts() {
  return new Promise((resolve, reject) => {
    web3.eth.getAccounts().then(listOfAccounts => {
      addressListForOracles = listOfAccounts.slice(20, 20 + TEST_ORACLES_COUNT);
    }).then(() => {
      resolve(addressListForOracles);
    });
  });
}

function initiateOracles(accounts) {
  return new Promise((resolve, reject) => {
    flightSuretyApp.methods.REGISTRATION_FEE().call().then(registrationFee => {
      for (var counter = 0; address < TEST_ORACLES_COUNT; counter++) {
        flightSuretyApp.methods.registerOracle().send({
          "from": accounts[counter],
          "value": registrationFee,
          "gas": 5000000,
          "gasPrice": 20000000
        }).then(() => {
          flightSuretyApp.methods.getMyIndexes().call({
            "from": accounts[counter]
          }).then(result => {
            console.log(`Oracle ${a} Registered at ${accounts[a]} with [${result}] indexes.`);
            oraclesIndexList.push(result);
          }).catch(err => {
            reject(err);
          });
        }).catch(err => {
          reject(err);
        });
      };
      resolve(oraclesIndexList);
    }).catch(err => {
      reject(err);
    });
  });
}

generateOracleAccounts().then(accounts => {
  initiateOracles(accounts)
    .catch(err => {
      console.log(err.message);
    });
});

export default app;


