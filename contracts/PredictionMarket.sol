pragma solidity ^0.4.11;


contract PredictionMarket {
    address public admin;
    string public question;

    modifier onlyAdmin {
        require(msg.sender == admin);
        _;
    }

    event LogQuestion(address indexed _sender, string _question);

    function PredictionMarket(address _admin) {
        admin = _admin;
    }

    function setQuestion(string _question)
        public
        onlyAdmin
        returns(bool)
    {
        question = _question;
        LogQuestion(msg.sender, _question);
        return true;
    }
}
