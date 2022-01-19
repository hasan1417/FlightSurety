
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


class App {

    constructor() {

        this.flightsList = [];
        this.travellerBalance = 0;

        this.contract = new Contract('localhost', (authorization) => {

            if (!authorization) return display(
                'the authorization of the app contract',
                'verify if the app contract is authorized to call data contract functions',
                [ { label: 'Contract Status', value: authorization} ]
            );

            this.contract.isOperational()
                .then((result) => {
                    display(
                        'Operational Status',
                        'verify the operationality of the contract',
                        [ { label: 'Status', value: result} ]
                    );
                })
                .catch((error) => {
                    display(
                        'Operational Status',
                        'verify the operationality of the contract',
                        [ { label: 'Status', error: error} ]
                    );
                });

            this.watchTheStateOfFlight();
            this.flightDetails();
            this.showBalance();
        });
    }

    async flightDetails() {
        this.flightsList = await this.contract.flightDetails() || [];

        const insurancePurchaseSelector = DOM.elid('flights-insurance-payment');

        this.flightsList.forEach((flight) => {
            let createOption = document.createElement('option');
            createOption.value = `${flight.airlineAddress}-${flight.flight}-${flight.timestamp}`;
            let formattedDate = new Date(flight.timestamp * 1000).toDateString();
            createOption.textContent = `${flight.flight} on ${formattedDate}`;
            insurancePurchaseSelector.appendChild(createOption);
        });

        this.getInsurance();
        this.showBalance();
    }

    async getInsurance() {
        this.travellerInsurances = await this.contract.getInsurance(this.flightsList) || [];

        const flightsListWithInsurance = DOM.elid("flights-with-insurance");
        let insuranceButton = '';
        if (this.travellerInsurances.length == 0) {
        insuranceButton = `<h5>There is no insurance was purchased currently</h5>`;
        }

        this.travellerInsurances.forEach((eachInsurance, i) => {
            const formattedDate = new Date(eachInsurance.flight.timestamp * 1000).toDateString();

            let button = `<button data-option="1" data-insurance-option="${i}">Insurance Status</button>`;
            if (eachInsurance.state == "1") {
                button = `<button disabled>Withdraw Insurance</button>`;
            }
            else if (eachInsurance.flight.statusCode == "20") {
            button = `<button data-option="2" data-insurance-option="${i}">Withdraw Insurance</button>`;
            }
            insuranceButton += `
            <li data-insurance-option="${i}">
                <div>
                    <p>${eachInsurance.flight.flight} on ${formattedDate}</p>
                    <p>${eachInsurance.amount} ETH insurance us Purchased with ${eachInsurance.payout} ETH insurance payout</p>
                    <p>Flight Code Status: <strong>${eachInsurance.flight.statusCode}</strong></p>
                </div>
                <div>
                    ${button}
                    
                </div>
            </li>
            `;
        });

        flightsListWithInsurance.innerHTML = insuranceButton;
    }

    async showBalance() {
        this.contract.showBalance().then((balance) => {
            this.balance = balance;
            document.getElementById('traveller-balance').textContent = `${balance} ETH`;
        });
    }

    async fetchFlightStatus(airlineAddress, flight, timestamp) {
        this.contract.fetchFlightStatus(airlineAddress, flight, timestamp)
            .then(() => {
                display(
                    'Current Oracles',
                    'loading flights data from the oracles',
                    [
                        { label: 'Flight', value: flight}
                     ]
                );
            })
            .catch((error)=>{})
    }

    async watchTheStateOfFlight() {
        this.contract.flightSuretyApp.events.FlightStateIsChanged({fromBlock: 0}, (error, event) => {
            this.flightDetails();
        });
    }

    async insurancePayment(flight, amount) {
        console.log(flight[0], flight[1], flight[2], amount)
        this.contract.insurancePayment(flight[0], flight[1], flight[2], amount)
            .then(() =>  this.flightDetails())
            .catch((error) => console.log(error));
    }

    async insuranceWithdraw(airline, flight, timestamp) {
        this.contract.insuranceWithdraw(airline, flight, timestamp)
            .then((res) => {
                this.flightDetails();
            })
            .catch((error) => console.log(error));
    }

    async withdrawInsurancePayout() {
        this.contract.withdrawInsurancePayout()
            .then(() => this.showBalance())
            .catch((error) => console.log(error))
    }

}

const app = new App();


document.addEventListener('click', (event) => {
    if (!event.target.dataset.option) return;

        const option = parseFloat(event.target.dataset.option);

    let insuranceOption;
    let insurance;

    if(option === 0){
        const flight = DOM.elid('flights-insurance-payment').value.split("-");
        const insuranceCost = DOM.elid('insurance-cost').value;
        app.insurancePayment(flight, insuranceCost);
    }else if(option === 1){
        insuranceOption = event.target.dataset.insuranceOption;
        insurance = app.travellerInsurances[insuranceOption];
        app.fetchFlightStatus(insurance.flight.airlineAddress, insurance.flight.flight, insurance.flight.timestamp);
    }else if(option === 2){
        insuranceOption = event.target.dataset.insuranceOption;
        insurance = app.travellerInsurances[insuranceOption];
        app.fetchFlightStatus(insurance.flight.airlineAddress, insurance.flight.flight, insurance.flight.timestamp);
    }else if(option === 3){
        app.withdrawInsurancePayout ();
    }
}
);


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}







