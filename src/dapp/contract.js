import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        this.config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(this.config.url));
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
        this.setWeb3Connection()
            .then(() => this.web3 = new Web3(this.web3Connection))
            .then(() => {
                this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, this.config.appAddress);
                this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, this.config.dataAddress);
                return this.web3.eth.getAccounts((err, accounts) => {
                    this.owner = accounts[0];
                })
            })
            .then(() => this.appContractAuthorization(callback))
            .catch(() => callback(false));
    }


    setWeb3Connection = async () => {

        if (window.ethereum) {
            this.web3Connection = window.ethereum;
            try {
                await window.ethereum.enable();
            } catch (error) {
                console.error("Access was denied");
            }
        } else if (window.web3) {
            this.web3Connection = window.web3.currentProvider;
        } else {
            this.web3Connection = new Web3.providers.HttpProvider(this.config.url);
        }

        return this.web3Connection;
    }

    appContractAuthorization(callback) {
        this.flightSuretyData.methods
            .callerStatus(this.config.appAddress)
            .call({ from: this.owner }, (error, result) => {

                if (result) {
                    //caller is authorized
                    return callback(result);
                }

                this.flightSuretyData.methods
                    .authorizeCaller(this.config.appAddress, true)
                    .send({ from: this.owner }, () => {
                        callback(true);
                    });

            });
    }

    isOperational() {
        return new Promise((resolve, reject) => {
            this.flightSuretyApp.methods
                .isOperational()
                .call({ from: this.owner }, (error, response) => {
                    if (response) {
                        resolve(response);
                    } else {
                        reject(error);
                    }
                });
        });
    }

    flightDetails() {
        return new Promise((resolve, reject) => {
            this.flightSuretyApp.methods
                .flightNumber()
                .call({ from: this.owner }, async (err, flightsTotal) => {
                    let flightsList = [];

                    for (let counter = 0; counter < flightsTotal; counter++) {
                        let flight = await this.flightSuretyApp.methods.flightDetails(counter).call({ from: this.owner });
                        flightsList.push(flight);
                    }
                    resolve(flightsList);
                });
        });
    }

    insurancePayment(airlineAddress, flight, timestamp, insuranceAmount, callback) {
        return new Promise((resolve, reject) => {
            console.log('here')
            this.flightSuretyApp.methods
                .insurancePayment(airlineAddress, flight, timestamp)
                .send(
                    { from: this.owner, value: this.web3.utils.toWei(insuranceAmount.toString(), 'ether') },
                    (error, result) => {
                        if (error) {
                            reject(error);
                        }
                        resolve(result);
                    }
                )
        });
    }

    getInsurance(flightsList) {
        let insurancesList = [];

        return Promise
            .all(flightsList.map(async (eachFlight) => {
                const travellerInsurance = await this.flightSuretyApp.methods
                    .getInsurance(eachFlight.flight)
                    .call({ from: this.owner });

                if (travellerInsurance.amount !== "0") {
                    insurancesList.push({
                        amount: this.web3.utils.fromWei(travellerInsurance.amount, 'ether'),
                        payout: this.web3.utils.fromWei(travellerInsurance.payout, 'ether'),
                        state: travellerInsurance.state,
                        flight: eachFlight
                    });
                }
            }))
            .then(() => insurancesList)
    }

    fetchFlightStatus(airlineAddress, flight, timestamp) {
        return new Promise((resolve, reject) => {
            this.flightSuretyApp.methods
                .fetchFlightStatus(airlineAddress, flight, timestamp)
                .send({
                    from: this.owner
                }, (error, result) => {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                }
                );
        });
    }

    insuranceWithdraw(airlineAddress, flight, timestamp) {
        return new Promise((resolve, reject) => {
            this.flightSuretyApp.methods
                .insuranceWithdraw(airlineAddress, flight, timestamp)
                .send({
                    from: this.owner
                }, (error, result) => {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                }
                );
        });
    }

    showBalance() {
        return new Promise((resolve, reject) => {
            this.flightSuretyApp.methods
                .showBalance()
                .call({ from: this.owner }, async (error, balance) => {
                    resolve(this.web3.utils.fromWei(balance, 'ether'));
                });
        });
    }

    withdrawInsurancePayout() {
        return new Promise((resolve, reject) => {
            this.flightSuretyApp.methods
                .withdrawInsurancePayout()
                .send({
                    from: this.owner
                }, (error, result) => {
                    if (error) {
                        reject(error);
                    }
                    resolve(result);
                }
                );
        });
    }
}