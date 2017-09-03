pragma solidity ^0.4.11;


contract PredictionMarket {
    address public admin;
    string public question;

    modifier onlyAdmin {
        require(msg.sender == admin);
        _;
    }

    function PredictionMarket(address _admin) {
        admin = _admin;
    }

    function setQuestion(string _question) public onlyAdmin {
        question = _question;
    }
}
