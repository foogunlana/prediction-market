pragma solidity ^0.4.15;

import { Pausable } from 'zeppelin-solidity/contracts/lifecycle/Pausable.sol';
import { SafeMath } from './SafeMath.sol';

// Break into Q and market
// Q should be ownable and stoppable
// Stoppable should include run switch
// Market should create questions
// Each bet should take commission from
// Remove administration from Q using inheritance

contract Question is Pausable {
    using SafeMath for uint;
    enum Answer {UnAnswered, Yes, No}

    uint public remainder;
    uint public totalYesAmount;
    uint public totalNoAmount;
    string public phrase;
    Answer public answer;

    struct Bet {
        uint yesAmount;
        uint noAmount;
        bool exists;
    }
    struct User {
        bool isAdmin;
        bool isTrustedSource;
        bool hasWithdrawn;
        Bet bet;
    }

    mapping (address => User) private users;

    modifier onlyAdmin { require(users[msg.sender].isAdmin); _;}
    modifier onlyTrustedSource { require(users[msg.sender].isTrustedSource); _;}

    event LogAddAdmin(address indexed _sender, address indexed _admin);
    event LogAddTrustedSource(address indexed _sender, address indexed _trustedSource);
    event LogAnswer(address indexed _sender, Answer _answer);
    event LogWithdraw(address _sender, uint amount);
    event LogPlaceBet(
        address indexed _sender,
        uint _yesAmount,
        uint _noAmount);

    function Question(address _sponsor, string _phrase) {
        phrase = _phrase;
        users[msg.sender].isAdmin = true;
        users[_sponsor].isAdmin = true;
    }

    function addAdmin(address _admin)
        public
        onlyAdmin
        whenNotPaused
        returns(bool)
    {
        users[_admin].isAdmin = true;
        LogAddAdmin(msg.sender, _admin);
        return true;
    }

    function addTrustedSource(address _trustedSource)
        public
        onlyAdmin
        whenNotPaused
        returns(bool)
    {
        users[_trustedSource].isTrustedSource = true;
        LogAddTrustedSource(msg.sender, _trustedSource);
        return true;
    }

    function placeBet(uint _yesAmount, uint _noAmount)
        public
        payable
        whenNotPaused
        returns(bool)
    {
        // test vuln and give to class as a challenge
        require(answer == Answer.UnAnswered);
        require(msg.value == _yesAmount.safeAdd(_noAmount));
        require(msg.value > 0);

        Bet storage bet = users[msg.sender].bet;
        if (bet.exists) {
            totalYesAmount -= bet.yesAmount;
            totalNoAmount -= bet.noAmount;
            uint refund = bet.yesAmount + bet.noAmount;
            delete users[msg.sender].bet;
            msg.sender.transfer(refund);
        }
        users[msg.sender].bet = Bet(_yesAmount, _noAmount, true);

        totalYesAmount += _yesAmount;
        totalNoAmount += _noAmount;
        LogPlaceBet(msg.sender, _yesAmount, _noAmount);
        return true;
    }

    // Answer can be seen as a transaction before being mined
    // Consider finalising before resolving
    function resolve(bool _answer)
        public
        onlyTrustedSource
        whenNotPaused
        returns(bool)
    {
        require(answer == Answer.UnAnswered);
        answer = _answer ? Answer.Yes : Answer.No;
        LogAnswer(msg.sender, answer);
        return true;
    }

    function withdraw()
        public
        whenNotPaused
        returns(bool)
    {
        require(!users[msg.sender].hasWithdrawn);
        require(answer != Answer.UnAnswered);

        uint reward;
        uint numerator;
        uint total = totalYesAmount.safeAdd(totalNoAmount);
        Bet storage bet = users[msg.sender].bet;

        if (answer == Answer.Yes) {
            numerator = bet.yesAmount.safeMul(total);
            reward = numerator.safeDiv(totalYesAmount);
            remainder += numerator % totalYesAmount;
        } else {
            numerator = bet.noAmount.safeMul(total);
            reward = numerator.safeDiv(totalNoAmount);
            remainder += numerator % totalNoAmount;
        }
        users[msg.sender].hasWithdrawn = true;
        msg.sender.transfer(reward);
        LogWithdraw(msg.sender, reward);
        return true;
    }

    function yesPosition(address _user)
        public
        constant
        returns(uint)
    {
        return users[_user].bet.yesAmount;
    }

    function noPosition(address _user)
        public
        constant
        returns(uint)
    {
        return users[_user].bet.noAmount;
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
}
