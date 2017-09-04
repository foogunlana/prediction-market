pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';


contract PredictionMarket is Ownable {

    struct Question {
        uint totalYesAmount;
        uint totalNoAmount;
    }
    struct Bet {
        uint yesAmount;
        uint noAmount;
    }
    mapping (address => bool) public isAdmin;
    mapping (address => bool) public isTrustedSource;
    mapping (address => mapping (bytes32 => Bet)) public bets;
    mapping (bytes32 => Question) public questions;

    event LogAddAdmin(address _admin);
    event LogAddTrustedSource(address _trustedSource);
    event LogAddQuestion(address _admin, string _question);
    event LogPlaceBet(address _user, string _question, uint _yesAmount, uint _noAmount);

    function PredictionMarket() {
        isAdmin[msg.sender] = true;
    }

    modifier onlyAdmin {
        require(isAdmin[msg.sender]);
        _;
    }

    function addAdmin(address _admin)
        public
        onlyAdmin
        returns(bool)
    {
        isAdmin[_admin] = true;
        LogAddAdmin(_admin);
        return true;
    }

    function addTrustedSource(address _trustedSource)
        public
        onlyAdmin
        returns(bool)
    {
        isTrustedSource[_trustedSource] = true;
        LogAddTrustedSource(_trustedSource);
        return true;
    }

    function addQuestion(string _question)
        public
        onlyAdmin
        returns(bool)
    {
        bytes32 questionHash = sha3(_question);
        questions[questionHash] = Question(0, 0);
        LogAddQuestion(msg.sender, _question);
        return true;
    }

    function placeBet(string _question, uint _yesAmount, uint _noAmount)
        public
        payable
        returns(bool)
    {
        require(msg.value == _yesAmount + _noAmount);
        bytes32 questionHash = sha3(_question);
        bets[msg.sender][questionHash] = Bet(_yesAmount, _noAmount);
        questions[questionHash].totalYesAmount += _yesAmount;
        questions[questionHash].totalNoAmount += _noAmount;
        LogPlaceBet(msg.sender, _question, _yesAmount, _noAmount);
        return true;
    }
}
