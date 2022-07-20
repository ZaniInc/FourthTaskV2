//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.7;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../interfaces/IStaking.sol";

/**
 * @title Vesting
 * @author Pavel Zanozin
 * @notice This SC for allows users to stake their
 * tokens for passive income
 */
contract Staking is Ownable, IStaking {
    using SafeERC20 for IERC20;
    using Address for address;

    /**
     * @dev create object of struct
     * @notice using for set staking params
     */
    StakingParams public stakingParams;

    /**
     * @dev contain max value for staking pool
     * in one time
     */
    uint256 public constant MAX_STAKING_POOL = 5000000 ether;

    /**
     * @dev contain 100% in 1e18
     * @notice using for math
     */
    uint256 public constant ONE_HUNDRED_PERCENT = 100 ether;

    /**
     * @dev contain max reward that can be accumulated
     * @notice must be equal 10% of 'MAX_STAKING_POOL'
     */
    uint256 public constant MAX_REWARD = 500_000 ether;

    /**
     * @dev contain all investors whos stake tokens
     */
    mapping(address => Investor) public investorList;

    /**
     * @dev last time in seconds when someone call
     * staking or unstaking
     */
    uint256 public lastTimeUpdate;

    /**
     * @dev how many reward tokens minting per 1 second
     */
    uint256 public apr;

    /**
     * @dev contain how many reward tokens accumulated
     */
    uint256 public rewardPerTokenStored;

    /**
     * @dev contain how many tokens stake
     * at the monment
     */
    uint256 public stakingTotalAmount;

    IERC20 public token;

    /**
     * @dev Set 'token' IERC20 to interact with thrid party token
     *
     * @param token_ - of ERC20 contract
     * @notice set staking params
     */
    constructor(address token_) {
        require(
            token_.isContract(),
            "Error : Incorrect address , only contract address"
        );
        token = IERC20(token_);
        stakingParams.stakingPeriod = 365 days;
        stakingParams.feePercent = 40;
        stakingParams.cooldownPeriod = 10 days;
    }

    /**
     * @dev run staking period and transfer max reward
     * value to this contract
     *
     * @param start_ - input time when staking period
     * will be start
     * @param rewardsAmount_ - max reward on this period
     * @param apr_ - how many tokens wiil be collect
     * per second
     *
     * @notice function can call only owner of SC
     */
    function setRewards(
        uint256 start_,
        uint256 rewardsAmount_,
        uint256 apr_
    ) external override onlyOwner {
        require(
            rewardsAmount_ <= MAX_REWARD,
            "Error : reward above limit - 500000"
        );
        require(
            start_ >= block.timestamp,
            "Error : start time must be greater than current time"
        );
        require(
            rewardsAmount_ > 0 && start_ > 0 && apr_ > 0,
            "Error : one of params equal to 0"
        );
        stakingParams.stakingStartDate = start_;
        stakingParams.stakingFinishDate =
            stakingParams.stakingStartDate +
            stakingParams.stakingPeriod;
        apr = apr_;
        token.safeTransferFrom(msg.sender, address(this), rewardsAmount_);
        emit SetRewards(start_, rewardsAmount_, apr_);
    }

    /**
     * @dev function allow user stake tokens
     *
     * @param amount_ - how many tokens user want to stake
     *
     * @notice function can call by any one , but sum of
     * all staking tokens can't be higher than 'MAX_STAKING_POOL'
     */
    function stake(uint256 amount_) external override {
        require(
            block.timestamp >
                investorList[msg.sender].startDate +
                    stakingParams.cooldownPeriod ||
                investorList[msg.sender].startDate < 0,
            "Error : for re-staking wait 10 days"
        );
        require(amount_ > 0, "Error : you can't stake 0 tokens");
        require(
            stakingParams.stakingStartDate > 0,
            "Error : staking has not started yet"
        );
        require(
            stakingParams.stakingStartDate + stakingParams.stakingPeriod >
                block.timestamp,
            "Error : staking period has end"
        );
        require(stakingTotalAmount <= MAX_STAKING_POOL);
        _updateReward(msg.sender);
        investorList[msg.sender].stakingAmount += amount_;
        stakingTotalAmount += amount_;
        if (stakingTotalAmount > MAX_STAKING_POOL) {
            revert("Error : your stake value too high");
        }
        if (investorList[msg.sender].startDate > 0) {
            token.safeTransferFrom(msg.sender, address(this), amount_);
            emit Stake(msg.sender, amount_);
        } else {
            investorList[msg.sender].startDate = block.timestamp;
            token.safeTransferFrom(msg.sender, address(this), amount_);
            emit Stake(msg.sender, amount_);
        }
    }

    /**
     * @dev function allow user to withdraw sum of stake tokens
     * by caller + collected reward for caller
     *
     * @notice if the user call this function before the end of staking period
     * he will receive only 60% of his reward
     */
    function unStake() external override {
        require(
            investorList[msg.sender].stakingAmount > 0,
            "Error: you are not investor"
        );
        _updateReward(msg.sender);
        uint256 amount;
        uint256 reward = investorList[msg.sender].reward;
        if (block.timestamp < stakingParams.stakingFinishDate) {
            reward = reward - ((reward * 40 ether) / ONE_HUNDRED_PERCENT);
            amount = investorList[msg.sender].stakingAmount + reward;
        } else {
            amount = investorList[msg.sender].stakingAmount + reward;
        }
        stakingTotalAmount -= investorList[msg.sender].stakingAmount;
        delete investorList[msg.sender].startDate;
        investorList[msg.sender].finishDate = block.timestamp;
        delete investorList[msg.sender].stakingAmount;
        delete investorList[msg.sender].reward;
        token.safeTransfer(msg.sender, amount);
        emit UnStake(msg.sender, amount);
    }

    /**
     * @dev internal function which work when someone
     * call 'stake' or 'unstake' functions
     *
     * @notice Update list :
     *
     * Update 'rewardPerTokenStored' to actual value of collected reward
     * Update 'lastTimeUpdate' - last time when some one stake or unstake
     * Update 'investorList[caller_].reward' - how many tokens caller
     * can withdraw like reward
     * Update 'investorList[caller_].userRewardPerTokens' - how many reward
     * user collect in last time when he stake or unstake
     */
    function _updateReward(address caller_) internal {
        rewardPerTokenStored = _rewardPerToken();
        lastTimeUpdate = block.timestamp;
        investorList[caller_].reward = _earned(caller_);
        investorList[caller_].userRewardPerTokens = rewardPerTokenStored;
    }

    /**
     * @dev calculate how many reward collected by all users
     */
    function _rewardPerToken() internal view returns (uint256) {
        uint256 rewardRate = ((stakingTotalAmount * apr) /
            ONE_HUNDRED_PERCENT) / 365 days;
        if (stakingTotalAmount == 0) {
            return 0;
        } else {
            return
                rewardPerTokenStored +
                ((rewardRate * (block.timestamp - lastTimeUpdate) * 1e18)) /
                stakingTotalAmount;
        }
    }

    /**
     * @dev calculate how many reward collected by each user
     */
    function _earned(address caller_) internal view returns (uint256) {
        if (block.timestamp < stakingParams.stakingFinishDate) {
            return
                (investorList[caller_].stakingAmount *
                    (_rewardPerToken() -
                        investorList[caller_].userRewardPerTokens)) / 1e18;
        }
        if (block.timestamp >= stakingParams.stakingFinishDate) {
            uint256 rewardRate = ((investorList[caller_].stakingAmount * apr) /
                ONE_HUNDRED_PERCENT) / 365 days;
            return
                rewardRate *
                (stakingParams.stakingFinishDate -
                    investorList[caller_].startDate);
        }
    }
}
