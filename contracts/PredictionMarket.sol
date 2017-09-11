pragma solidity ^0.4.15;

import { Pausable } from 'zeppelin-solidity/contracts/lifecycle/Pausable.sol';
import { SafeMath } from './SafeMath.sol';

// Break into Question and market
// Question should be ownable and stoppable
// Stoppable should include run switch
// Market should create questions
// Each bet should take commission from
// Remove administration from Question using inheritance

contract PredictionMarket is Pausable {
    using SafeMath for uint;
    uint public remainder;

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
    struct User {
        bool isAdmin;
        bool isTrustedSource;
        bool hasWithdrawn;
        bool exists;
        bytes32[] betKeys;
    }

    mapping (address => User) public users;
    mapping (bytes32 => Bet) public bets;
    mapping (bytes32 => Question) public questions;

    modifier onlyAdmin { require(users[msg.sender].isAdmin); _;}
    modifier onlyTrustedSource { require(users[msg.sender].isTrustedSource); _;}

    event LogAddAdmin(address _admin);
    event LogAddTrustedSource(address _trustedSource);
    event LogAddQuestion(address _admin, string _question);
    event LogAnswerQuestion(string _question, Answer _answer);
    event LogWithdraw(address _user, uint amount);
    event LogPlaceBet(
        bytes32 _betHash,
        address _user,
        bytes32 _questionHash,
        uint _yesAmount,
        uint _noAmount);

    function PredictionMarket(address _sponsor) {
        users[msg.sender].isAdmin = true;
        users[_sponsor].isAdmin = true;
    }

    function isAdmin(address user)
        public
        constant
        returns(bool)
    {
        return users[user].isAdmin;
    }

    function isTrustedSource(address user)
        public
        constant
        returns(bool)
    {
        return users[user].isTrustedSource;
    }

    function hasWithdrawn(address user)
        public
        constant
        returns(bool)
    {
        return users[user].hasWithdrawn;
    }


    function addAdmin(address _admin)
        public
        onlyAdmin
        whenNotPaused
        returns(bool)
    {
        users[_admin].isAdmin = true;
        LogAddAdmin(_admin);
        return true;
    }

    function addTrustedSource(address _trustedSource)
        public
        onlyAdmin
        whenNotPaused
        returns(bool)
    {
        users[_trustedSource].isTrustedSource = true;
        LogAddTrustedSource(_trustedSource);
        return true;
    }

    function addQuestion(string _question)
        public
        onlyAdmin
        whenNotPaused
        returns(bool)
    {
        bytes32 questionHash = sha3(_question);
        questions[questionHash] = Question(0, 0, Answer.UnAnswered);
        LogAddQuestion(msg.sender, _question);
        return true;
    }

    // Refactor to allow users add to bets
    // currently existing bet is wiped out without a refund!!!
    function placeBet(string _question, uint _yesAmount, uint _noAmount)
        public
        payable
        whenNotPaused
        returns(bool)
    {
        require(msg.value == _yesAmount + _noAmount);
        bytes32 questionHash = sha3(_question);
        require(questions[questionHash].answer == Answer.UnAnswered);

        bytes32 betHash = sha3(questionHash, msg.sender);
        bets[betHash] = Bet(_yesAmount, _noAmount);
        users[msg.sender].betKeys.push(betHash);

        questions[questionHash].totalYesAmount += _yesAmount;
        questions[questionHash].totalNoAmount += _noAmount;
        LogPlaceBet(betHash, msg.sender, questionHash, _yesAmount, _noAmount);
        return true;
    }

    function answerQuestion(string _question, bool _answer)
        public
        onlyTrustedSource
        whenNotPaused
        returns(bool)
    {
        bytes32 questionHash = sha3(_question);
        Answer answer = _answer ? Answer.Yes : Answer.No;
        questions[questionHash].answer = answer;
        LogAnswerQuestion(_question, answer);
        return true;
    }

    function withdraw(string _question)
        public
        whenNotPaused
        returns(bool)
    {
        require(!users[msg.sender].hasWithdrawn);

        bytes32 questionHash = sha3(_question);
        bytes32 betKey = sha3(questionHash, msg.sender);

        Question storage question = questions[questionHash];
        require(question.answer != Answer.UnAnswered);
        uint amountBet;
        uint reward;
        uint numerator;
        uint total = question.totalYesAmount + question.totalNoAmount;
        if (question.answer == Answer.Yes) {
            amountBet = bets[betKey].yesAmount;
            numerator = amountBet.safeMul(total);
            reward = numerator.safeDiv(question.totalYesAmount);
            remainder += numerator % question.totalYesAmount;
        } else {
            amountBet = bets[betKey].noAmount;
            numerator = amountBet.safeMul(total);
            reward = numerator.safeDiv(question.totalNoAmount);
            remainder += numerator % question.totalNoAmount;
        }
        users[msg.sender].hasWithdrawn = true;
        msg.sender.transfer(reward);
        LogWithdraw(msg.sender, reward);
        return true;
    }
}
