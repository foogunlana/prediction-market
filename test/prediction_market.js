const PredictionMarket = artifacts.require("./PredictionMarket.sol");

function getTransactionReceiptMined(txHash, interval) {
  const transactionReceiptAsync = function(resolve, reject) {
    web3.eth.getTransactionReceipt(txHash, (error, receipt) => {
      if (error) {
        reject(error);
      } else if (receipt == null) {
        setTimeout(
          () => transactionReceiptAsync(resolve, reject),
          interval ? interval : 500);
      } else {
        resolve(receipt);
      }
    });
  };

  if (Array.isArray(txHash)) {
    return Promise.all(txHash.map(
      oneTxHash => getTransactionReceiptMined(oneTxHash, interval)));
  } else if (typeof txHash === "string") {
    return new Promise(transactionReceiptAsync);
  } else {
    throw new Error("Invalid Type: " + txHash);
  }
}

function expectedExceptionPromise(action, gasToUse) {
  return new Promise(function (resolve, reject) {
    try {
      resolve(action());
    } catch(e) {
      reject(e);
    }
  })
  .then(function (txn) {
    // https://gist.github.com/xavierlepretre/88682e871f4ad07be4534ae560692ee6
    return getTransactionReceiptMined(txn);
  })
  .then(function (receipt) {
    // We are in Geth
    assert.equal(receipt.gasUsed, gasToUse, "should have used all the gas");
  })
  .catch(function (e) {
    if (((e + "").indexOf("invalid opcode") > -1) || ((e + "").indexOf("out of gas") > -1)) {
      // We are in TestRPC
    } else if ((e + "").indexOf("please check your gas amount") > -1) {
      // We are in Geth for a deployment
    } else {
      throw e;
    }
  });
}


contract("PredictionMarket", accounts => {
  const owner = accounts[0];
  const administrator = accounts[1];
  const resolver = accounts[2];
  const user = accounts[3];
  const question = "Will climate change end the world by 2050?";
  let instance;

  beforeEach(() => {
    return PredictionMarket.new(
      administrator,
      resolver,
      {from: owner})
    .then(_instance => {
      instance = _instance;
    });
  });

  it("should instantiate with trusted source and administrator", () => {
    return instance.admin()
    .then(_admin => {
      assert.equal(
        _admin,
        administrator,
        "Administrator was not set!"
      );
      return instance.resolver();
    })
    .then(_resolver => {
      assert.equal(
        _resolver,
        resolver,
        "Trused Source was not set!"
      );
    });
  });

  it("should allow the administrator add a question", () => {
    return instance.setQuestion(
      question,
      {from: administrator})
    .then(() => {
      return instance.question();
    })
    .then(_question => {
      assert.equal(
        _question,
        question,
        "Administrator can set question"
      );
    });
  });

  it("should not let anyone but the administrator set the question", () => {
    return expectedExceptionPromise(() => {
      return instance.setQuestion(
        question,
        {from: owner, gas: 2000000});
    }, 2000000);
  });

  it("should allow the resolver resolve the question with a boolean answer", () => {
    const answer = false;
    return instance.resolve(
      answer,
      {from: resolver})
    .then(() => {
      return instance.answer();
    })
    .then(_answer => {
      assert.equal(
        _answer,
        answer,
        "Answer was not set!"
      );
    });
  });

  it("should allow only the resolver answer the question", () => {
    const answer = false;
    return expectedExceptionPromise(() => {
      return instance.resolve(
        answer,
        {from: owner, gas: 2000000});
    }, 2000000);
  });

  it("should let any user bet some value with a yes or no", () => {
    const prediction = false;
    const amount = web3.toWei(1, "ether");
    return instance.place(
      prediction,
      {from: user, value: amount})
    .then(() => {
      return instance.bets(user);
    })
    .then(_bet => {
      assert.equal(
        _bet[0], // prediction... Is there a better way to do this?
        prediction,
        "The bet was not set!"
      );
    });
  });
});
