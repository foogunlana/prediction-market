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
  const question = "Will climate change end the world by 2050?";
  let instance;

  beforeEach(() => {
    return PredictionMarket.new(
      administrator,
      {from: owner})
    .then(_instance => {
      instance = _instance;
    });
  });

  it("should allow a creator add an administrator", () => {
    return instance.admin()
    .then(_admin => {
      assert.equal(
        _admin,
        administrator,
        "Administrator was not set!"
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
        {from: owner});
    }, 2000000);
  });
});
