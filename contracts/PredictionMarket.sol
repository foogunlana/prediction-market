pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';


contract PredictionMarket is Ownable {
    enum Answer {None, Yes, No}
    struct Question {
        uint totalYesAmount;
        uint totalNoAmount;
        Answer answer;
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
    event LogAnswerQuestion(string _question, Answer _answer);

    function PredictionMarket() {
        isAdmin[msg.sender] = true;
    }

    modifier onlyAdmin {
        require(isAdmin[msg.sender]);
        _;
    }

    modifier onlyTrustedSource {
        require(isTrustedSource[msg.sender]);
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
        questions[questionHash] = Question(0, 0, Answer.None);
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

    function answerQuestion(string _question, bool _answer)
        public
        onlyTrustedSource
        returns(bool)
    {
        bytes32 questionHash = sha3(_question);
        Answer answer = _answer ? Answer.Yes : Answer.No;
        questions[questionHash].answer = answer;
        LogAnswerQuestion(_question, answer);
        return true;
    }
}
