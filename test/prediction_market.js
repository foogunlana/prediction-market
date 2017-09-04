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
  const admin = accounts[1];
  const otherAdmin = accounts[2];
  const notAdmin = accounts[3];
  const question1 = "Does life have any meaning?";
  let instance;

  beforeEach(() => {
    return PredictionMarket.new(
      {from: owner})
    .then(_instance => {
      instance = _instance;
      return instance.addAdmin(
        admin,
        {from: owner});
    });
  });

  it("should add the owner as an admin", () => {
    return instance.owner()
    .then(_owner => {
      return instance.isAdmin(_owner);
    })
    .then(isAdmin => {
      assert(isAdmin, "Owner was not set as admin");
    });
  });

  it("should let only admins add other admins", () => {
    return instance.isAdmin(admin)
    .then(isAdmin => {
      assert(isAdmin, "Owner could not set admin, is owner not an admin?");
      return instance.addAdmin(
        otherAdmin,
        {from: admin});
    })
    .then(() => {
      return instance.isAdmin(otherAdmin);
    })
    .then(isAdmin => {
      assert(isAdmin, "Admin could not set another admin!");
      return expectedExceptionPromise(() => {
        return instance.addAdmin(
          otherAdmin,
          {from: notAdmin, gas: 2000000});
      }, 2000000);
    })
    .catch(e => {
      if (e.toString().indexOf("Invalid Type") != -1) {
        assert(false, "Anyone can set an admin!");
      } else {
        throw e;
      }
    });
  });

  it("should let only admins add questions", () => {
    return instance.addQuestion(
      question1,
      {from: admin})
    .then(() => {
      return instance.questions(web3.sha3(question1));
    })
    .then(_question => {
      assert.equal(_question, question1, "An admin could not add a question");
      return expectedExceptionPromise(() => {
        return instance.addQuestion(
          question1,
          {from: notAdmin, gas: 2000000});
      }, 2000000);
    })
    .catch(e => {
      if (e.toString().indexOf("Invalid Type") != -1) {
        assert(false, "Anyone can set a question!");
      } else {
        throw e;
      }
    });
  });
});
