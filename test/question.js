const Promise = require("bluebird");
const Question = artifacts.require("./Question.sol");

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

contract("Question", accounts => {
  const owner = accounts[0];
  const admin = accounts[1];
  const otherAdmin = accounts[2];
  const notAdmin = accounts[3];
  const trustedSource = accounts[4];
  const user = accounts[5];
  const otherUsers = accounts.slice(6, 9);
  const phrase = "What will the price of ETH be?";
  const answer = 300;
  let question;

  beforeEach(async () => {
    question = await Question.new(
      admin,
      phrase,
      {from: owner});
    return await question.addTrustedSource(
      trustedSource,
      {from: admin});
  });

  it("should add the owner, admin and trusted source", async () => {
    const _owner = await question.owner();
    const [ownerIsAdmin, adminIsAdmin, sourceIsTrusted] = await Promise.all([
      question.isAdmin.call(_owner),
      question.isAdmin.call(admin),
      question.isTrustedSource.call(trustedSource)
    ]);
    assert(ownerIsAdmin, "Owner was not set as admin");
    assert(adminIsAdmin, "Admin was not set as admin");
    assert(sourceIsTrusted, "Admin was not set as admin");
  });

  describe("Admin permissions", () => {
    it("should let only admins add other admins", async () => {
      await question.addAdmin(
          otherAdmin,
          {from: admin});
      assert(
        await question.isAdmin.call(otherAdmin),
        "Admin could not set another admin!");

      return expectedExceptionPromise(() => {
        return question.addAdmin(
          otherAdmin,
          {from: notAdmin, gas: 2000000});
      }, 2000000)
      .catch(e => {
        if (e.toString().indexOf("Invalid Type") != -1) {
          assert(false, "Anyone can set an admin!");
        } else {
          throw e;
        }
      });
    });

    it("should let only admins add trusted sources", async () => {
      try {
        await question.addTrustedSource(
          trustedSource,
          {from: admin});
      } catch (e) {
        assert(false, "An admin could not add a trusted source");
      }

      return expectedExceptionPromise(() => {
        return question.addTrustedSource(
          trustedSource,
          {from: notAdmin, gas: 2000000});
      }, 2000000)
      .catch(e => {
        if (e.toString().indexOf("Invalid Type") != -1) {
          assert(false, "Anyone can set a trusted source!");
        } else {
          throw e;
        }
      });
    });
  });

  describe("Trusted source permissions", () => {
    it("should allow only trusted sources answer the question", async () => {
      try{
        await question.resolve(
          answer,
          {from: user, gas: 2000000});
        assert(false, "Anyone can set a trusted source!");
      } catch (e) {};

      await question.resolve(
        answer,
        {from: trustedSource});

      const [_answer, _answered] = await Promise.all([
        question.answer(),
        question.answered()
      ]);
      assert.equal(
        _answer,
        answer,
        "The answer was not set.");
      assert.equal(
        _answered,
        true,
        "The contract did not indicate that it had been answered");
    });
  });

  describe("User API", () => {
    it("should allow anyone guess on an unanswered question", async () => {
      const amount = web3.toWei(2, "ether");
      const guess = answer;
      await question.guess(
        guess,
        {from: user, value: amount});
      assert.equal(
        await question.guessed.call(user),
        guess,
        "User's guess was not saved!");
      await question.resolve(
        answer,
        {from: trustedSource});
      try{
        await question.guess(
          guess,
          {from: user, value: amount});
        assert(false, "Seems guessses can still be made after question is answered!");
      } catch (e) {};
    });

    it("should allow winning users withdraw after question resolution", async () => {
      let users = [{
        address: otherUsers[0],
        guess: 170.234,
        amount: web3.toWei(1, "ether")
      }, {
        address: otherUsers[1],
        guess: 101.5,
        amount: web3.toWei(1, "ether")
      }, {
        address: otherUsers[2],
        guess: 250,
        amount: web3.toWei(1, "ether")
      }];
      let total = users.reduce(
        (total, u) => parseFloat(u.amount) + total, 0);

      const gasPrice = 1000000;
      await Promise.all(
        users.map(u => question.guess(
          u.guess,
          {
            from: u.address,
            value: u.amount
          })));
      await question.resolve(
        answer,
        {from: trustedSource});

      const originalBalances = await Promise.all(
        users.map(u => web3.eth.getBalancePromise(u.address)));

      const txs = await Promise.all(users.map(u =>
          question.withdraw(
            {from: u.address, gasPrice: gasPrice})));

      const ETHUsed = txs.map(tx => tx.receipt.gasUsed * gasPrice);
      const _balances = await Promise.all(
        users.map(u => web3.eth.getBalancePromise(u.address)));

      const rounder = 100000;
      for (let i in _balances) {
        let roundedReward = total - (total%rounder);
        assert(
          _balances[i]
          .minus(originalBalances[i]
            .plus(roundedReward)
            .minus(ETHUsed[i]))
          .lte(rounder),
          "Exact reward amount not returned to user!");
      }
    });
  });
});
