pragma solidity ^0.4.11;


contract PredictionMarket {
    address public admin;
    address public resolver;
    string public question;
    bool public answer;
    mapping (address => Bet) public bets;

    struct Bet {
        bool prediction;
        uint amount;
    }

    modifier onlyAdmin {
        require(msg.sender == admin);
        _;
    }

    modifier onlyResolver {
        require(msg.sender == resolver);
        _;
    }

    event LogQuestion(address indexed _sender, string _question);
    event LogBet(address indexed _sender, bool indexed _prediction);
    event LogAnswer(address indexed _sender, bool indexed _answer);

    function PredictionMarket(address _admin, address _resolver) {
        admin = _admin;
        resolver = _resolver;
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

    function place(bool _prediction)
        public
        payable
        returns(bool)
    {
        require(msg.value > 0);
        uint amount = msg.value;
        Bet memory bet = Bet(_prediction, amount);
        bets[msg.sender] = bet;
        LogBet(msg.sender, _prediction);
        return true;
    }

    function resolve(bool _answer)
        public
        onlyResolver
        returns(bool)
    {
        answer = _answer;
        LogAnswer(msg.sender, _answer);
        return true;
    }
}
