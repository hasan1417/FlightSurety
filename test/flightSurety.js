
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

    var config;
    before('setup contract', async () => {
        config = await Test.Config(accounts);
        await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address, true);
    });

    /****************************************************************************************/
    /* Operations and Settings                                                              */
    /****************************************************************************************/

    it(`(multiparty) has correct initial isOperational() value`, async function () {

        // Get operating status
        let status = await config.flightSuretyData.isOperational.call();
        assert.equal(status, true, "Incorrect initial operating status value");

    });

    it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

        // Ensure that access is denied for non-Contract Owner account
        let accessDenied = false;
        try {
            await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
        }
        catch (e) {
            accessDenied = true;
        }
        assert.equal(accessDenied, true, "Access not restricted to Contract Owner");

    });

    it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

        // Ensure that access is allowed for Contract Owner account
        let accessDenied = false;
        try {
            await config.flightSuretyData.setOperatingStatus(false);
        }
        catch (e) {
            accessDenied = true;
        }
        assert.equal(accessDenied, false, "Access not restricted to Contract Owner");

    });

    it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

        await config.flightSuretyData.setOperatingStatus(false);

        let reverted = false;
        try {
            await config.flightSurety.setTestingMode(true);
        }
        catch (e) {
            reverted = true;
        }
        assert.equal(reverted, true, "Access not blocked for requireIsOperational");

        // Set it back for other tests to work
        await config.flightSuretyData.setOperatingStatus(true);

    });

    it('Airlines can apply for registration', async function () {
        
        await config.flightSuretyApp.newAirplineApplication("Second Airline", { from: config.secondAirline });
        await config.flightSuretyApp.newAirplineApplication("Third Airline", { from: config.thirdAirline });
        await config.flightSuretyApp.newAirplineApplication("Fourth Airline", { from: config.fourthAirline });
        await config.flightSuretyApp.newAirplineApplication("Fifth Airline", { from: config.fifthAirline });
 

        const statusApplied = 0;

        assert.equal(await config.flightSuretyData.airlineStatus(config.secondAirline), statusApplied, "Status is not applied");
        assert.equal(await config.flightSuretyData.airlineStatus(config.thirdAirline), statusApplied, "Status is not applied");
        assert.equal(await config.flightSuretyData.airlineStatus(config.fourthAirline), statusApplied, "Status is not applied");
        assert.equal(await config.flightSuretyData.airlineStatus(config.fifthAirline), statusApplied, "Status is not applied");

    });

    it('Airlines with paid status can approve up to 4 applied airlines', async function () {
        await config.flightSuretyApp.airplaneApprovalRequest(config.secondAirline, { from: config.owner });
        await config.flightSuretyApp.airplaneApprovalRequest(config.thirdAirline, { from: config.owner });
        await config.flightSuretyApp.airplaneApprovalRequest(config.fourthAirline, { from: config.owner });

        const statusRegistered = 1;
        console.log(await config.flightSuretyData.airlineStatus(config.secondAirline))
        assert.equal(await config.flightSuretyData.airlineStatus(config.secondAirline), statusRegistered, "Status is not registered");
        assert.equal(await config.flightSuretyData.airlineStatus(config.thirdAirline), statusRegistered, "Status is not registered");
        assert.equal(await config.flightSuretyData.airlineStatus(config.fourthAirline), statusRegistered, "Status is not registered");

    });

    it('Airlines must pay 10 ether to join the contract', async function () {
        await config.flightSuretyApp.airlineFeesPayment({ from: config.secondAirline, value: web3.utils.toWei('10', 'ether') });
        await config.flightSuretyApp.airlineFeesPayment({ from: config.thirdAirline, value: web3.utils.toWei('10', 'ether') });
        await config.flightSuretyApp.airlineFeesPayment({ from: config.fourthAirline, value: web3.utils.toWei('10', 'ether') });

        const statusPaid = 2;
        console.log(await config.flightSuretyData.airlineStatus(config.secondAirline))
        assert.equal(await config.flightSuretyData.airlineStatus(config.secondAirline), statusPaid, "Status is not paid");
        assert.equal(await config.flightSuretyData.airlineStatus(config.thirdAirline), statusPaid, "Status is not paid");
        assert.equal(await config.flightSuretyData.airlineStatus(config.fourthAirline), statusPaid, "Status is not paid");

        const travellerBalance = await web3.eth.getBalance(config.flightSuretyData.address);
        const weiToEther = web3.utils.fromWei(travellerBalance, 'ether');
        console.log(weiToEther);
        assert.equal(weiToEther, 30, "Balance is not 30 ether");
    });

    it('fifth airline needs approval from half of the other airlines', async function () {
        try {
            await config.flightSuretyApp.airplaneApprovalRequest(config.fifthAirline, { from: config.owner });
        } catch (error){}
        assert.equal(await config.flightSuretyData.airlineStatus(config.fifthAirline), 0, "number of approval is not met");

        await config.flightSuretyApp.airplaneApprovalRequest(config.fifthAirline, { from: config.thirdAirline });
        assert.equal(await config.flightSuretyData.airlineStatus(config.fifthAirline), 1, "the aireline is not approved");

    });

    it('traveller purchase insurance', async function () {

        const flight = await config.flightSuretyApp.flightDetails(0);
        const insuranceAmount = await config.flightSuretyApp.MAXIMUM_INSURANCE_COST.call();
        console.log(insuranceAmount)
        const INSURANCE_PAYOUT_FEE = await config.flightSuretyApp.INSURANCE_PAYOUT_FEE.call();
        const payoutAmount = parseFloat(insuranceAmount) + (parseFloat(insuranceAmount)  / parseFloat(INSURANCE_PAYOUT_FEE) );
    
        await config.flightSuretyApp.insurancePayment(flight.airlineAddress, flight.flight, flight.timestamp, { from: config.testAccount, value: insuranceAmount }
        );
    
        const insurance = await config.flightSuretyApp.getInsurance(flight.flight, { from: config.testAccount });
        assert.equal(parseFloat(insurance.payout), payoutAmount, "insurance payout is not valid");
    });
    
    
    it('Traveller cannot exceed the maximum insurance payment of 1 ether', async function () {
    
        let flight = await config.flightSuretyApp.flightDetails(0);
        let insuranceAmount = await config.flightSuretyApp.MAXIMUM_INSURANCE_COST.call();
        let travellerPayment = 2 * insuranceAmount
        console.log(travellerPayment)
    
        let insurancePaymentStatus = false;
    
        try {
            await config.flightSuretyApp.insurancePayment(flight.airlineAddress, flight.flight, flight.timestamp, { from: config.testAccount, value: travellerPayment });
        } catch(err) {
            insurancePaymentStatus = true;
        }
    
        assert.equal(insurancePaymentStatus, true, "more than one ether was PAID!!!");
    });
    

});
