pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import { SafeMath } from './SafeMath';


contract PredictionMarket is Ownable {
    using SafeMath for uint;
    enum Answer {UnAnswered, Yes, No}
    struct Question {
        uint totalYesAmount;
        uint totalNoAmount;
        Answer answer;
    }
    struct Bet {
        uint yesAmount;
        uint noAmount;
    }
    /*struct User {
        bool admin;
        bool trustedSource;
        bool withdrawn;
        mapping (bytes32 => Bet) bets;
    }*/
    mapping (address => bool) public isAdmin;
    mapping (address => bool) public isTrustedSource;
    mapping (address => bool) public withdrawn;

    /*mapping (address => User) public users;*/
    mapping (address => mapping (bytes32 => Bet)) public bets;
    mapping (bytes32 => Question) public questions;

    event LogAddAdmin(address _admin);
    event LogAddTrustedSource(address _trustedSource);
    event LogAddQuestion(address _admin, string _question);
    event LogPlaceBet(address _user, string _question, uint _yesAmount, uint _noAmount);
    event LogAnswerQuestion(string _question, Answer _answer);
    event LogWithdraw(address _user, uint amount);

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

    modifier yetToWithdraw {
        require(!withdrawn[msg.sender]);
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
        questions[questionHash] = Question(0, 0, Answer.UnAnswered);
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
        require(questions[questionHash].answer == Answer.UnAnswered);

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

    // TEST ME!!!
    function withdraw(string _question)
        public
        yetToWithdraw
        returns(bool)
    {
        bytes32 questionHash = sha3(_question);
        Question storage question = questions[questionHash];
        require(question.answer != Answer.UnAnswered);
        uint reward;
        uint total = question.totalYesAmount + question.totalNoAmount;
        if (question.answer == Answer.Yes) {
            amountBet = bets[msg.sender][questionHash].yesAmount;
            reward = amountBet.safeMul(total).safeDiv(question.totalYesAmount);
        } else {
            amountBet = bets[msg.sender][questionHash].noAmount;
            reward = amountBet.safeMul(total).safeDiv(question.totalNoAmount);
        }
        withdrawn[msg.sender] = true;
        msg.sender.transfer(reward);
        LogWithdraw(msg.sender, reward);
        return true;
    }
}
