const Staking = artifacts.require("./Staking");
const MyToken = artifacts.require("./MyToken");

const {
  ether,           // Big Number support
  constants,    // Common constants, like the zero address and largest integers
  expectEvent,  // Assertions for emitted events
  expectRevert,
  balance,
  time, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

const { expect } = require("chai");
const BN = Web3.utils.BN;

contract("Staking", async ([owner, acc2, acc3, acc4, acc5, acc6]) => {

  let instanceToken;
  let instanceStaking;

  before(async () => {
    instanceToken = await MyToken.new();
    instanceStaking = await Staking.new(instanceToken.address);
  });

  describe("Check investors balance before staking", async () => {
    it("Set Balance", async () => {
      await instanceToken.approve(acc2, ether('100'));
      await instanceToken.transfer(acc2, ether('100'));
      await instanceToken.approve(acc3, ether('200'));
      await instanceToken.transfer(acc3, ether('200'));
      await instanceToken.approve(acc4, ether('300'));
      await instanceToken.transfer(acc4, ether('300'));
      await instanceToken.approve(acc5, ether('400'));
      await instanceToken.transfer(acc5, ether('400'));
      await instanceToken.approve(acc6, ether('500'));
      await instanceToken.transfer(acc6, ether('500'));
    });
    it("Check Balance", async () => {
      let balance1 = await instanceToken.balanceOf(acc2);
      let balance2 = await instanceToken.balanceOf(acc3);
      let balance3 = await instanceToken.balanceOf(acc4);
      let balance4 = await instanceToken.balanceOf(acc5);
      let balance5 = await instanceToken.balanceOf(acc6);
      expect(balance1).to.be.bignumber.equal(ether('100'));
      expect(balance2).to.be.bignumber.equal(ether('200'));
      expect(balance3).to.be.bignumber.equal(ether('300'));
      expect(balance4).to.be.bignumber.equal(ether('400'));
      expect(balance5).to.be.bignumber.equal(ether('500'));
    });
  });

  describe("SetRewards function ", async () => {

    describe("False", async () => {
      it("SetRewards false - Error : reward above limit - 500000", async () => {
        let balanceBeforeOwner = await instanceToken.balanceOf(owner);
        expect(balanceBeforeOwner).to.be.bignumber.equal(ether('5600000'));
        let balanceBeforeContract = await instanceToken.balanceOf(instanceStaking.address);
        expect(balanceBeforeContract).to.be.bignumber.equal(ether('0'));
        let start = await time.latest();
        await instanceToken.approve(instanceStaking.address, ether('500000'));
        await expectRevert(instanceStaking.setRewards(start.add(new BN(60)), ether('5000000'), ether('10')), "Error : reward above limit - 500000");
        let balanceAfterOwner = await instanceToken.balanceOf(owner);
        expect(balanceAfterOwner).to.be.bignumber.equal(ether('5600000'));
        let balanceAfterContract = await instanceToken.balanceOf(instanceStaking.address);
        expect(balanceAfterContract).to.be.bignumber.equal(ether('0'));
      });
      it("SetRewards false - Error : start time must be greater than current time", async () => {
        let balanceBeforeOwner = await instanceToken.balanceOf(owner);
        expect(balanceBeforeOwner).to.be.bignumber.equal(ether('5600000'));
        let balanceBeforeContract = await instanceToken.balanceOf(instanceStaking.address);
        expect(balanceBeforeContract).to.be.bignumber.equal(ether('0'));
        let start = await time.latest();
        await instanceToken.approve(instanceStaking.address, ether('500000'));
        await expectRevert(instanceStaking.setRewards(start.add(new BN(0)), ether('500000'), ether('10')), "Error : start time must be greater than current time");
        let balanceAfterOwner = await instanceToken.balanceOf(owner);
        expect(balanceAfterOwner).to.be.bignumber.equal(ether('5600000'));
        let balanceAfterContract = await instanceToken.balanceOf(instanceStaking.address);
        expect(balanceAfterContract).to.be.bignumber.equal(ether('0'));
      });
      it("SetRewards false - Error : one of params equal to 0", async () => {
        let balanceBeforeOwner = await instanceToken.balanceOf(owner);
        expect(balanceBeforeOwner).to.be.bignumber.equal(ether('5600000'));
        let balanceBeforeContract = await instanceToken.balanceOf(instanceStaking.address);
        expect(balanceBeforeContract).to.be.bignumber.equal(ether('0'));
        let start = await time.latest();
        await instanceToken.approve(instanceStaking.address, ether('500000'));
        await expectRevert(instanceStaking.setRewards(start.add(new BN(60)), ether('500000'), new BN(0)), "Error : one of params equal to 0");
        let balanceAfterOwner = await instanceToken.balanceOf(owner);
        expect(balanceAfterOwner).to.be.bignumber.equal(ether('5600000'));
        let balanceAfterContract = await instanceToken.balanceOf(instanceStaking.address);
        expect(balanceAfterContract).to.be.bignumber.equal(ether('0'));
      });
      it("Stake by acc2 false - Error : staking has not started yet", async () => {
        let balanceBefore = await instanceToken.balanceOf(acc2);
        expect(balanceBefore).to.be.bignumber.equal(ether('100'));
        await instanceToken.approve(instanceStaking.address, ether('100'), { from: acc2 });
        await expectRevert(instanceStaking.stake(ether('60'), { from: acc2 }), "Error : staking has not started yet");
        let balanceAfter = await instanceToken.balanceOf(acc2);
        expect(balanceAfter).to.be.bignumber.equal(ether('100'));
      });
    });

    describe("Done", async () => {
      it("SetRewards - done function", async () => {
        let balanceBeforeOwner = await instanceToken.balanceOf(owner);
        expect(balanceBeforeOwner).to.be.bignumber.equal(ether('5600000'));
        let balanceBeforeContract = await instanceToken.balanceOf(instanceStaking.address);
        expect(balanceBeforeContract).to.be.bignumber.equal(ether('0'));
        let start = await time.latest();
        await instanceToken.approve(instanceStaking.address, ether('500000'));
        let tx = await instanceStaking.setRewards(start.add(new BN(60)), ether('500000'), ether('10'));
        expectEvent(tx, "SetRewards", { startTime: start.add(new BN(60)), reward: ether('500000'), apr: ether('10') });
        let balanceAfterOwner = await instanceToken.balanceOf(owner);
        expect(balanceAfterOwner).to.be.bignumber.equal(ether('5100000'));
        let balanceAfterContract = await instanceToken.balanceOf(instanceStaking.address);
        expect(balanceAfterContract).to.be.bignumber.equal(ether('500000'));
      });
    });
  });

  describe("Stake", async () => {

    describe("False", async () => {
      it("Stake by acc2 false - Error : you can't stake 0 tokens", async () => {
        let balanceBefore = await instanceToken.balanceOf(acc2);
        expect(balanceBefore).to.be.bignumber.equal(ether('100'));
        await instanceToken.approve(instanceStaking.address, ether('100'), { from: acc2 });
        await expectRevert(instanceStaking.stake(ether('0'), { from: acc2 }), "Error : you can't stake 0 tokens");
        let balanceAfter = await instanceToken.balanceOf(acc2);
        expect(balanceAfter).to.be.bignumber.equal(ether('100'));
      });
      it("Stake by acc2 false - Error : your stake value too high", async () => {
        let balanceBefore = await instanceToken.balanceOf(owner);
        expect(balanceBefore).to.be.bignumber.equal(ether('5100000'));
        await instanceToken.approve(instanceStaking.address, ether('5000001'));
        await expectRevert(instanceStaking.stake(ether('5000001'), { from: owner }), "Error : your stake value too high");
        let balanceAfter = await instanceToken.balanceOf(owner);
        expect(balanceAfter).to.be.bignumber.equal(ether('5100000'));
      });
    });

    describe("Done", async () => {
      it("Stake by acc2 - done", async () => {
        let balanceBefore = await instanceToken.balanceOf(acc2);
        expect(balanceBefore).to.be.bignumber.equal(ether('100'));
        await instanceToken.approve(instanceStaking.address, ether('100'), { from: acc2 });
        let tx = await instanceStaking.stake(ether('100'), { from: acc2 });
        expectEvent(tx, "Stake", { investor: acc2, amount: ether('100') });
        let balanceAfter = await instanceToken.balanceOf(acc2);
        expect(balanceAfter).to.be.bignumber.equal(ether('0'));
      });
      it("Stake by acc3 - done", async () => {
        let balanceBefore = await instanceToken.balanceOf(acc3);
        expect(balanceBefore).to.be.bignumber.equal(ether('200'));
        await instanceToken.approve(instanceStaking.address, ether('200'), { from: acc3 });
        let tx = await instanceStaking.stake(ether('200'), { from: acc3 });
        expectEvent(tx, "Stake", { investor: acc3, amount: ether('200') });
        let balanceAfter = await instanceToken.balanceOf(acc3);
        expect(balanceAfter).to.be.bignumber.equal(ether('0'));
      });
      it("Stake by acc4 - done", async () => {
        let balanceBefore = await instanceToken.balanceOf(acc4);
        expect(balanceBefore).to.be.bignumber.equal(ether('300'));
        await instanceToken.approve(instanceStaking.address, ether('300'), { from: acc4 });
        let tx = await instanceStaking.stake(ether('300'), { from: acc4 });
        expectEvent(tx, "Stake", { investor: acc4, amount: ether('300') });
        let balanceAfter = await instanceToken.balanceOf(acc4);
        expect(balanceAfter).to.be.bignumber.equal(ether('0'));
      });
      it("Stake by acc5 - done", async () => {
        let balanceBefore = await instanceToken.balanceOf(acc5);
        expect(balanceBefore).to.be.bignumber.equal(ether('400'));
        await instanceToken.approve(instanceStaking.address, ether('400'), { from: acc5 });
        let tx = await instanceStaking.stake(ether('400'), { from: acc5 });
        expectEvent(tx, "Stake", { investor: acc5, amount: ether('400') });
        let balanceAfter = await instanceToken.balanceOf(acc5);
        expect(balanceAfter).to.be.bignumber.equal(ether('0'));
      });
      it("Stake by acc2 false - Error : for re-staking wait 10 days", async () => {
        let balanceBefore = await instanceToken.balanceOf(acc2);
        expect(balanceBefore).to.be.bignumber.equal(ether('0'));
        await expectRevert(instanceStaking.stake(ether('50'), { from: acc2 }), "Error : for re-staking wait 10 days");
        let balanceAfter = await instanceToken.balanceOf(acc2);
        expect(balanceAfter).to.be.bignumber.equal(ether('0'));
      });
    });
  });

  describe("UnStake", async () => {

    describe("False", async () => {
      it("UnStake by owner false - Error: you are not investor", async () => {
        let ownerInvestor = await instanceStaking.investorList(owner);
        expect(ownerInvestor[2]).to.be.bignumber.equal(ether('0'));
        await expectRevert(instanceStaking.unStake({ from: owner }), "Error: you are not investor");
        let balanceAfter = await instanceStaking.investorList(owner);
        expect(balanceAfter[2]).to.be.bignumber.equal(ether('0'));
      });
    });

    describe("Done", async () => {
      it("UnStake by acc2 after 130 days - done", async () => {
        await time.increase(time.duration.days(130));
        let balanceBefore = await instanceToken.balanceOf(acc2);
        expect(balanceBefore).to.be.bignumber.equal(ether('0'));
        let tx = await instanceStaking.unStake({ from: acc2 });
        let balanceAfter = await instanceToken.balanceOf(acc2);
        expectEvent(tx, "UnStake", { investor: acc2, amount: balanceAfter });
        expect(Number(balanceAfter)).to.be.closeTo(Number(ether('102.13')), Number(ether('0.008')));
      });
      it("First Stake by acc6 after 130 days - done", async () => {
        let balanceBefore = await instanceToken.balanceOf(acc6);
        expect(balanceBefore).to.be.bignumber.equal(ether('500'));
        await instanceToken.approve(instanceStaking.address, ether('500'), { from: acc6 });
        let tx = await instanceStaking.stake(ether('500'), { from: acc6 });
        expectEvent(tx, "Stake", { investor: acc6, amount: ether('500') });
        let balanceAfter = await instanceToken.balanceOf(acc6);
        expect(balanceAfter).to.be.bignumber.equal(ether('0'));
      });
      it("Second Stake by acc2 after 130 days - done", async () => {
        let balanceBefore = await instanceToken.balanceOf(acc2);
        expect(Number(balanceBefore)).to.be.closeTo(Number(ether('102.13')), Number(ether('0.008')));
        await instanceToken.approve(instanceStaking.address, ether('100'), { from: acc2 });
        let tx = await instanceStaking.stake(ether('100'), { from: acc2 });
        expectEvent(tx, "Stake", { investor: acc2, amount: ether('100') });
        let balanceAfter = await instanceToken.balanceOf(acc2);
        expect(Number(balanceAfter)).to.be.closeTo(Number(ether('2.13')), Number(ether('0.008')));
      });
      it("Third Stake by acc2 after 15 days - done", async () => {
        await time.increase(time.duration.days(15));
        let balanceBefore = await instanceToken.balanceOf(acc2);
        expect(Number(balanceBefore)).to.be.closeTo(Number(ether('2.13')), Number(ether('0.008')));
        await instanceToken.approve(instanceStaking.address, balanceBefore, { from: acc2 });
        let tx = await instanceStaking.stake(balanceBefore, { from: acc2 });
        expectEvent(tx, "Stake", { investor: acc2, amount: balanceBefore });
        let balanceAfter = await instanceToken.balanceOf(acc2);
        expect(Number(balanceAfter)).to.be.closeTo(Number(ether('0')), Number(ether('0.008')));
      });
      it("UnStake by acc3 after 365 days - done", async () => {
        await time.increase(time.duration.days(235));
        await time.increase(time.duration.seconds(60));
        let balanceBefore = await instanceToken.balanceOf(acc3);
        expect(balanceBefore).to.be.bignumber.equal(ether('0'));
        let tx = await instanceStaking.unStake({ from: acc3 });
        let balanceAfter = await instanceToken.balanceOf(acc3);
        expectEvent(tx, "UnStake", { investor: acc3, amount: balanceAfter });
        expect(Number(balanceAfter)).to.be.closeTo(Number(ether('220')), Number(ether('0.00008')));
      });
      it("Stake by acc2 false - Error : staking period has end", async () => {
        await expectRevert(instanceStaking.stake(ether('50'), { from: acc2 }), "Error : staking period has end");
      });
      it("UnStake by acc4 after 365 days - done", async () => {
        await time.increase(time.duration.days(235));
        let balanceBefore = await instanceToken.balanceOf(acc4);
        expect(balanceBefore).to.be.bignumber.equal(ether('0'));
        let tx = await instanceStaking.unStake({ from: acc4 });
        let balanceAfter = await instanceToken.balanceOf(acc4);
        expectEvent(tx, "UnStake", { investor: acc4, amount: balanceAfter });
        expect(Number(balanceAfter)).to.be.closeTo(Number(ether('330')), Number(ether('0.00008')));
      });
      it("UnStake by acc5 after 365 days - done", async () => {
        let balanceBefore = await instanceToken.balanceOf(acc5);
        expect(balanceBefore).to.be.bignumber.equal(ether('0'));
        let tx = await instanceStaking.unStake({ from: acc5 });
        let balanceAfter = await instanceToken.balanceOf(acc5);
        expectEvent(tx, "UnStake", { investor: acc5, amount: balanceAfter });
        expect(Number(balanceAfter)).to.be.closeTo(Number(ether('440')), Number(ether('0.00009')));
      });
      it("UnStake by acc6 after 365 days - done", async () => {
        let balanceBefore = await instanceToken.balanceOf(acc6);
        expect(balanceBefore).to.be.bignumber.equal(ether('0'));
        let tx = await instanceStaking.unStake({ from: acc6 });
        let balanceAfter = await instanceToken.balanceOf(acc6);
        expectEvent(tx, "UnStake", { investor: acc6, amount: balanceAfter });
        expect(Number(balanceAfter)).to.be.closeTo(Number(ether('532.1918')), Number(ether('0.00009')));
      });
      it("UnStake by acc2 in second time after 235 days - done", async () => {
        let balanceBefore = await instanceToken.balanceOf(acc2);
        expect(Number(balanceBefore)).to.be.closeTo(Number(ether('0')), Number(ether('0.008')));
        let tx = await instanceStaking.unStake({ from: acc2 });
        let balanceAfter = await instanceToken.balanceOf(acc2);
        expectEvent(tx, "UnStake", { investor: acc2, amount: balanceAfter });
        //before third stake , un stake value = 108.5753
        expect(Number(balanceAfter)).to.be.closeTo(Number(ether('108.7129')), Number(ether('0.00008')));
      });
    });
  });
});