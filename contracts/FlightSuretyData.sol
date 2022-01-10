pragma solidity ^0.8.11;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    mapping(address => bool) callerAuthorized;
    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
                                ) 
                                public 
    {
        contractOwner = msg.sender;
        airlines[contractOwner] = Airline(contractOwner, StatusAirline.Paid, "1st Airline");
        paidAirlinesTotal++;
    }

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

    modifier requireAuthorizedCaller()
    {
        require(callerAuthorized[msg.sender] || (contractOwner == msg.sender), "Caller is not authorized");
        _;
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

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   

    function authorizeCaller(address caller, bool authorization) external requireContractOwner requireIsOperational returns (bool)
    {
        callerAuthorized[caller] = authorization;
        // return authorizedCallers[caller];
    }

    function callerStatus(address caller) public view requireContractOwner requireIsOperational returns (bool)
    {
        return callerAuthorized[caller] = authorization;
    }

    enum StatusAirline {
        Applied,
        Registered,
        Paid
    }

    struct Airline {
        address airlineAddress;
        StatusAirline state;
        string name;

        mapping(address => bool) airlineApprovals;
        uint8 countApprovals;
    }

    mapping(address => Airline) internal airlinesList;
    uint256 internal paidAirlinesTotal= 0;

    function airlineStatus(address airlineAddress) external view requireCallerAuthorized requireIsOperational returns (StatusAirline)
    {
        return airlinesList[airlineAddress].state;
    }

    function airlineFactory(address airlineAddress, uint8 state, string airlineName) external requireCallerAuthorized requireIsOperational
    {
        airlinesList[airlineAddress] = Airline(airlineAddress, StatusAirline(state), airlineName);
    }

    function airlineStatusUpdate(address airlineAddress, uint8 state) external requireCallerAuthorized requireIsOperational
    {
        airlinesList[airlineAddress].state = StatusAirline(state);
        if (state == 2) 
        {
            paidAirlinesTotal++;
        }
    }

    function paidAirlinesNumber() external view requireCallerAuthorized requireIsOperational returns (uint256)
    {
        return paidAirlinesTotal;
    }

    function airplaneRegisterApproval(address airlineAddress, address approver) external requireCallerAuthorized requireIsOperational returns (uint8)
    {
        require(!airlinesList[airline].approvals[approver], "Caller is already approved");

        airlinesList[airline].airlineApprovals[approver] = true;
        airlinesList[airline].countApprovals++;

        return airlinesList[airline].countApprovals;
    }

     enum InsuranceStatus {
        Purchased,
        Withdrawn
    }

    struct Insurance {
        string flightDetails;
        uint256 insuranceinsuraceAmount;
        uint256 payout;
        InsuranceStatus state;
    }

    mapping(address => mapping(string => Insurance)) private insurances;
    mapping(address => uint256) private travellerBalance;

    function insuranceDetails(address traveller, string flight) external view requireCallerAuthorized requireIsOperational returns (uint256 insuranceAmount, uint256 payout, InsuranceStatus state)
    {
        insuranceAmount = insurances[traveller][flight].insuraceAmount;
        payout = insurances[traveller][flight].payout;
        state = insurances[traveller][flight].state;
    }

    function insuranceFactory(address traveller, string flight, uint256 insuraceAmount, uint256 payout) external requireCallerAuthorized requireIsOperational
    {
        require(insurances[traveller][flight].insuraceAmount != insuraceAmount, "Insurance is already purchased"); 
        insurances[traveller][flight] = Insurance(flight, insuraceAmount, payout, InsuranceState.Purchased);
    }

    function insuranceWithdraw(address traveller, string flight) external requireCallerAuthorized requireIsOperational
    {
        require(insurances[traveller][flight].state == InsuranceState.Purchased, "Insurance already Withdrawn");
        insurances[traveller][flight].state = InsuranceState.Withdrawn;
        travellerBalances[traveller] = travellerBalances[traveller] + insurances[traveller][flight].payout;
    }

    function getTravellerBalance(address traveller) external view requireCallerAuthorized requireIsOperational returns (uint256)
    {
        return travellerBalances[traveller];
    }

    function payTraveller(address traveller) external payable requireCallerAuthorized requireIsOperational
    {
        require(travellerBalances[traveller] > 0, "Traveler has no balance");
        travellerBalances[traveller] = 0;
        payable(traveller).transfer(travellerBalances[traveller]);
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    fallback() external payable 
    {
    }


}

