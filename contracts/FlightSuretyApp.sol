pragma solidity ^0.4.25;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./FlightSuretyData.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    address private contractOwner;          // Account used to deploy contract
    bool private operational = true;
    FlightSuretyData dataContract;
    address flightSuretyDataContractAddress;



    struct Flight {
        uint8 statusCode;
        uint256 timestamp;
        address airline;
        string flight;
    }

    mapping(bytes32 => Flight) private flights;
    bytes32[] private keyListsToFlight;

 
    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
         // Modify to call data contract's status
        require(operational, "Contract is currently not operational");  
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireAirlineRegistered()
    {
        require(dataContract.airlineStatus(msg.sender) == 1, "only registered airlines");
        _;
    }

    modifier requireAirlinePaid()
    {
        require(dataContract.airlineStatus(msg.sender) == 2, "Only paid airlines");
        _;
    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
    * @dev Contract constructor
    *
    */
    constructor(address dataContractAddress) public 
    {
        contractOwner = msg.sender;
        flightSuretyDataContractAddress = dataContractAddress;
        dataContract = FlightSuretyData(flightSuretyDataContractAddress);
        bytes32 firstFlight = getFlightKey(contractOwner, "Flight One", now);
        flights[firstFlight] = Flight(STATUS_CODE_UNKNOWN, now, contractOwner, "Flight One");
        keyListsToFlight.push(firstFlight);

        bytes32 secondFlight = getFlightKey(contractOwner, "Flight Two", now + 3 days);
        flights[secondFlight] = Flight(STATUS_CODE_LATE_AIRLINE, now + 3 days, contractOwner, "Flight Two");
        keyListsToFlight.push(secondFlight);

        bytes32 thirdFlight = getFlightKey(contractOwner, "Flight Three", now + 6 days);
        flights[thirdFlight] = Flight(STATUS_CODE_UNKNOWN, now + 6 days, contractOwner, "Flight Three");
        keyListsToFlight.push(thirdFlight);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                            requireContractOwner 
    {
        operational = mode;
    }
    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    uint8 private constant AIRPLANE_REQUIRED_NUMBER_FOR_VOTING = 4;

    event AppliedAirline(address airlineAddress);
    event RegisteredAirline(address airlineAddress);
    event PaidAirline(address airlineAddress);
  
    function newAirplineApplication(string airline) external
    {
        dataContract.airlineFactory(msg.sender, 0, airline);
        emit AppliedAirline(msg.sender);
    }

    function airplaneApprovalRequest(address airlineAddress) external requireAirlinePaid
    {
        require(dataContract.airlineStatus(airlineAddress) == 0, "there is no application for this airline");

        bool airplaneApproval = false;
        uint256 paidAirlinesTotal = dataContract.paidAirlinesNumber();

        if (paidAirlinesTotal < AIRPLANE_REQUIRED_NUMBER_FOR_VOTING) {
            airplaneApproval = true;
        } else {
            uint8 approvalCount = dataContract.airplaneRegisterApproval(airlineAddress, msg.sender);
            uint256 neededRequestsNO = paidAirlinesTotal / 2;
            if (approvalCount >= neededRequestsNO) 
                airplaneApproval = true;
        }

        if (airplaneApproval) {
            dataContract.airlineStatusUpdate(airlineAddress, 1);
            emit RegisteredAirline(airlineAddress);
        }
    }

    function airlineFeesPayment() external payable requireAirlineRegistered
    {
        require(msg.value == 10 ether, "Payment of 10 ether is required");

        flightSuretyDataContractAddress.transfer(msg.value);
        dataContract.airlineStatusUpdate(msg.sender, 2);

        emit PaidAirline(msg.sender);
    }

    uint public constant MAXIMUM_INSURANCE_COST = 1 ether;
    uint public constant INSURANCE_PAYOUT_FEE = 2;

    event InsurancePurchased(address traveller, bytes32 flightKey);


    function insurancePayment(address airlineAddress, string flight, uint256 timestamp)
    external payable
    {
        bytes32 flightKey = getFlightKey(airlineAddress, flight, timestamp);

        require(bytes(flights[flightKey].flight).length > 0, "Flight Not Found!");
        require(msg.value <= MAXIMUM_INSURANCE_COST && msg.value > 0, "Your Cost is Invalid");

       flightSuretyDataContractAddress.transfer(msg.value);
        uint256 payoutAmount = msg.value + ( msg.value / INSURANCE_PAYOUT_FEE);
        dataContract.insuranceFactory(msg.sender, flight, msg.value, payoutAmount);

        emit InsurancePurchased(msg.sender, flightKey);
    }

    function getInsurance(string flight)
    external view
    returns (uint256 amount, uint256 payout, uint256 state)
    {
        return dataContract.insuranceDetails(msg.sender, flight);
    }

    function insuranceWithdraw(address airlineAddress, string flight, uint256 timestamp)
    external
    {
        bytes32 flightKey = getFlightKey(airlineAddress, flight, timestamp);
        require(flights[flightKey].statusCode == STATUS_CODE_LATE_AIRLINE, "You are not eligible to withdraw insurance");
        dataContract.insuranceWithdraw(msg.sender, flight);
    }

    function showBalance()
    external view
    returns (uint256 balance)
    {
        balance = dataContract.getTravellerBalance(msg.sender);
    }

    function withdrawInsurancePayout()
    external
    {
        dataContract.payTraveller(msg.sender);
    }


    event FlightStateIsChanged(address airlineAddress, string  flight, uint8 statusCode);

    function flightNumber() external view returns(uint256 count)
    {
        return keyListsToFlight.length;
    }

    function flightDetails(uint256 index) external view returns(address airlineAddress, string flight, uint256 timestamp, uint8 statusCode)
    {
        airlineAddress = flights[ keyListsToFlight[index] ].airline;
        flight = flights[ keyListsToFlight[index] ].flight;
        timestamp = flights[ keyListsToFlight[index] ].timestamp;
        statusCode = flights[ keyListsToFlight[index] ].statusCode;
    }

    function registerFlight(uint8 status, string flight)
    external requireAirlinePaid
    {
        bytes32 flightKey = getFlightKey(msg.sender, flight, now);

        flights[flightKey] = Flight(status, now, msg.sender, flight);
        keyListsToFlight.push(flightKey);
    }

    function changeFlightStatus(address airlineAddress, string flight, uint256 timestamp, uint8 statusCode)
    private
    {
        bytes32 flightKey = getFlightKey(airlineAddress, flight, timestamp);
        flights[flightKey].statusCode = statusCode;

        emit FlightStateIsChanged(airlineAddress, flight, statusCode);
    }

  function fetchFlightStatus
                        (
                            address airline,
                            string flight,
                            uint256 timestamp                            
                        )
                        external
    {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        oracleResponses[key] = ResponseInfo({
                                                requester: msg.sender,
                                                isOpen: true
                                            });

        emit OracleRequest(index, airline, flight, timestamp);
    } 


// region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;    

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;

    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;        
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
                                                        // This lets us group responses and identify
                                                        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint8 status);

    event OracleReport(address airline, string flight, uint256 timestamp, uint8 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);

    event OracleRegistered(address oracle);

    // Register an oracle with the contract
    function registerOracle
                            (
                            )
                            external
                            payable
    {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({
                                        isRegistered: true,
                                        indexes: indexes
                                    });
    }

    function getMyIndexes
                            (
                            )
                            view
                            external
                            returns(uint8[3] memory)
    {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");

        return oracles[msg.sender].indexes;
    }

    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse
                        (
                            uint8 index,
                            address airline,
                            string flight,
                            uint256 timestamp,
                            uint8 statusCode
                        )
                        external
    {
        require((oracles[msg.sender].indexes[0] == index) || (oracles[msg.sender].indexes[1] == index) || (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");


        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp)); 
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {

            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            changeFlightStatus(airline, flight, timestamp, statusCode);
        }
    }

    function getFlightKey
                        (
                            address airline,
                            string flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes
                            (                       
                                address account         
                            )
                            internal
                            returns(uint8[3] memory)
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);
        
        indexes[1] = indexes[0];
        while(indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex
                            (
                                address account
                            )
                            internal
                            returns (uint8)
    {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);

        if (nonce > 250) {
            nonce = 0;  // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

    // endregion
}
