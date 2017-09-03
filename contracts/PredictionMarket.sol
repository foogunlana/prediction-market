pragma solidity ^0.4.11;


contract PredictionMarket {
    address public admin;

    function PredictionMarket(address _admin) {
        admin = _admin;
    }
}
