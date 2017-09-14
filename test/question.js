const Question = artifacts.require("./Question.sol");

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

function solSha3 (...args) {
  args = args.map(arg => {
    if (typeof arg === "string") {
      if (arg.substring(0, 2) === "0x") {
        return arg.slice(2);
      } else {
        return web3.toHex(arg).slice(2);
      }
    }
  });
  args = args.join("");
  return web3.sha3(args, { encoding: "hex" });
}


contract("Question", accounts => {
  const owner = accounts[0];
  const admin = accounts[1];
  const otherAdmin = accounts[2];
  const notAdmin = accounts[3];
  const trustedSource = accounts[4];
  const user = accounts[5];
  const otherUsers = accounts.slice(6, 9);
  const Answer = {
    None: 0,
    Yes: 1,
    No: 2
  };
  let question;

  beforeEach(async () => {
    question = await Question.new(
      admin,
      {from: owner});
    return await question.addTrustedSource(
      trustedSource,
      {from: admin});
  });

  it("should add the owner and address passed in as admins", async () => {
    const _owner = await question.owner();
    const [ownerIsAdmin, adminIsAdmin] = await Promise.all([
      question.isAdmin(_owner),
      question.isAdmin(admin)
    ]);
    assert(ownerIsAdmin, "Owner was not set as admin");
    assert(adminIsAdmin, "Admin was not set as admin");
  });

  describe("Admin permissions", () => {
    it("should let only admins add other admins", async () => {
      await question.addAdmin(
          otherAdmin,
          {from: admin});
      assert(
        question.isAdmin(otherAdmin),
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
      const answer = true;
      expectedExceptionPromise(() => {
        question.resolve(
          answer,
          {from: user, gas: 2000000});
      }, 2000000)
      .catch(e => {
        if (e.toString().indexOf("Invalid Type") != -1) {
          assert(false, "Anyone can answer a question!");
        } else {
          throw e;
        }
      });

      await question.resolve(
        answer,
        {from: trustedSource});

      assert.equal(
        await question.answer(),
        Answer.Yes,
        "The answer was not set.");
    });
  });

  describe("User API", () => {
    it("should allow anyone place a bet on an unanswered question", async () => {
      const yesAmount = web3.toWei(1, "ether");
      const noAmount = web3.toWei(1, "ether");
      const amount = web3.toWei(2, "ether");
      // const answer = true;
      await question.placeBet(
        yesAmount,
        noAmount,
        {from: user, value: amount});
      // .then(() => {
      //   return instance.questions(solSha3(phrase));
      // })
      //
      // .then(_bet => {
      //   assert.equal(
      //     _bet[yesAmountIndex].valueOf(),
      //     yesAmount.toString(),
      //     "Bet yes was not placed by user");
      //   assert.equal(
      //     _bet[noAmountIndex].valueOf(),
      //     noAmount.toString(),
      //     "Bet no was not placed by user");
      //   return instance.resolve(
      //     phrase,
      //     answer,
      //     {from: trustedSource});
      // })
      // .then(() => {
      //   return expectedExceptionPromise(() => {
      //     return instance.placeBet(
      //       phrase,
      //       yesAmount,
      //       noAmount,
      //       {from: user, value: amount});
      //   })
      //   .catch(e => {
      //     if (e.toString().indexOf("Invalid Type") != -1) {
      //       assert(false, "Seems bets can still be placed after question is answered!");
      //     } else {
      //       throw e;
      //     }
      //   });
      // });
    });

    it("should reject bets that don't add up (i.e. yes + no != total)", () => {
      const yesAmount = web3.toWei(1, "ether");
      const noAmount = web3.toWei(1, "ether");
      const amount = web3.toWei(1, "ether");
      return expectedExceptionPromise(() => {
        return question.placeBet(
          yesAmount,
          noAmount,
          {from: user, value: amount, gas: 2000000});
      }, 2000000)
      .catch(e => {
        if (e.toString().indexOf("Invalid Type") != -1) {
          assert(false, "Invalid amounts can be set!");
        } else {
          throw e;
        }
      });
    });

    // INCOMPLETE TEST!!!
    it("should allow winning users withdraw after question resolution", async () => {
      let users = [{
        address: otherUsers[0],
        yesAmount: web3.toWei(1.5, "ether"),
        noAmount: web3.toWei(1.2582, "ether"),
      }, {
        address: otherUsers[1],
        yesAmount: web3.toWei(0.3777, "ether"),
        noAmount: web3.toWei(2.93, "ether"),
      }, {
        address: otherUsers[2],
        yesAmount: web3.toWei(30, "ether"),
        noAmount: web3.toWei(1.1678, "ether"),
      }];
      let totalYesAmount = users.reduce(
        (total, user) => parseFloat(user.yesAmount) + total, 0);
      let totalNoAmount = users.reduce(
        (total, user) => parseFloat(user.noAmount) + total, 0);
      let total = totalNoAmount + totalYesAmount;
      const answer = true;
      const gasPrice = 1000000;

      await Promise.all(
        users.map(u => question.placeBet(
          u.yesAmount,
          u.noAmount,
          {
            from: u.address,
            value: parseInt(u.yesAmount) + parseInt(u.noAmount)
          })));
      await question.resolve(
        answer,
        {from: trustedSource});

      const originalBalances = await Promise.all(
        users.map(u => web3.eth.getBalance(u.address)));

      const txs = await Promise.all(users.map(u =>
          question.withdraw(
            {from: u.address, gasPrice: gasPrice})));

      const ETHUsed = txs.map(tx => tx.receipt.gasUsed * gasPrice);
      const _balances = await Promise.all(
        users.map(u => web3.eth.getBalance(u.address)));

      for (let i in _balances) {
        let reward = (parseFloat(users[i].yesAmount)/parseFloat(totalYesAmount)) * total;
        // Big number cannot add to sig figs over 15 so must round reward!
        let rounder = 100000;
        let roundedReward = reward - (reward%rounder);
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
