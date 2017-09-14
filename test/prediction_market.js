const Promise = require("bluebird");
const Question = artifacts.require("./Question.sol");
const PredictionMarket = artifacts.require("./PredictionMarket.sol");

Promise.promisifyAll(web3.eth, { suffix: "Promise" });

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
  const phrase = "What will the price of ETH be?";
  let market;

  beforeEach(async () => {
    market = await PredictionMarket.new(
      {from: owner});
    await market.addAdmin(
      admin,
      {from: owner});
  });

  describe("Admin priviledges", () => {
    it("should make owner an admin", async () => {
      assert(
        await market.isAdmin(owner),
        "Owner was not set to admin!");
    });

    it("should let only admins add admins", async () => {
      await market.addAdmin(
        otherAdmin,
        {from: admin});
      assert(
        await market.isAdmin(otherAdmin),
        "Admin could not set another admin!");
      try{
        await market.addAdmin(
          admin,
          {from: notAdmin});
        assert(false, "Admin was added by a stranger!");
      } catch (e) {};
    });

    it("should let only admins ask questions", async () => {
      await market.ask(
        phrase,
        {from: admin});
      try {
        await market.getQuestion.call(phrase);
      } catch (e) {
        assert(false, "Failed to create question!");
      }
      try {
        await market.ask(
          phrase,
          {from: notAdmin});
        assert(false, "Strangers are making questions mate!");
      } catch (e) {};
    });
  });

  describe("Questions created", () => {
    let question;

    beforeEach(async () => {
      await market.ask(
        phrase,
        {from: admin});
      const address = await market.getQuestion(phrase);
      question = await Question.at(address);
    });

    it("should be created with the market as owner and sender as an admin", async () => {
      await market.ask(
        phrase,
        {from: admin});
      const address = await market.getQuestion(phrase);
      const question = await Question.at(address);
      assert(
        await question.isAdmin(admin),
        "Creator is not an admin on the question :(");
      assert.equal(
        await question.owner(),
        market.address,
        "Market is not the owner of the question :(");
    });

    it("should be pausable and unpausable only by admins", async () => {
      try{
        await market.pauseQuestion(
          phrase,
          {from: notAdmin});
        assert(false, "Anybody could pause the question!");
      } catch (e) {};

      await market.pauseQuestion(
        phrase,
        {from: admin});
      assert(
        await question.paused(),
        "An admin could not pause the question");

      try{
        await market.unpauseQuestion(
          phrase,
          {from: notAdmin});
        assert(false, "Anybody could unpause the question!");
      } catch (e) {};

      await market.unpauseQuestion(
        phrase,
        {from: admin});
      assert(
        !await question.paused(),
        "An admin could not pause the question");
    });
  });
});
