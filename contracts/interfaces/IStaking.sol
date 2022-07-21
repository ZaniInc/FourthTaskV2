//SPDX-License-Identifier: Unlicense

pragma solidity 0.8.7;

/**
 * @title Staking interface
 * @author Pavel Zanozin
 * @notice This interface contain main functions
 * from 'Staking' contract
 */
interface IStaking {
    /**
     * @dev Store info about beneficiaries
     *
     * @param stakingAmount - how many tokens user staked
     * @param userRewardPerTokens - how many reward user accumulated
     * @param reward - how many reward will be collected by user
     * @param lastTimeStake - last time when user stake tokens
     */
    struct Investor {
        uint256 stakingAmount;
        uint256 userRewardPerTokens;
        uint256 reward;
        uint256 lastTimeStake;
    }

    /**
     * @dev Store info about beneficiaries
     *
     * @param stakingStartDate - when did staking period start
     * @param stakingFinishDate - when users stop collect reward
     * @param stakingPeriod - how long staking
     * @param feePercent - if user un stake before staking is end
     * he will pay fee from collected reward
     * @param cooldownPeriod - when user can re-stake
     */
    struct StakingParams {
        uint256 stakingStartDate;
        uint256 stakingFinishDate;
        uint256 stakingPeriod;
        uint256 feePercent;
        uint256 cooldownPeriod;
    }

    /**
     * @dev event logs info about date when staking is start
     *
     * @param startTime - time when staking period is started
     * @param reward - how many rewards can collect users
     * @param apr - how many tokens collected per second
     */
    event SetRewards(uint256 startTime, uint256 reward, uint256 apr);

    /**
     * @dev event logs info about stake by user
     *
     * @param investor - whos staking
     * @param amount - how many tokens stake by user
     */
    event Stake(address investor, uint256 amount);

    /**
     * @dev event logs info about stake by user
     *
     * @param investor - whos un staking
     * @param amount - how many tokens un stake by user
     */
    event UnStake(address investor, uint256 amount);

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
    ) external;

    /**
     * @dev function allow user stake tokens
     *
     * @param amount_ - how many tokens user want to stake
     *
     * @notice function can call by any one , but sum of
     * all staking tokens can't be higher than 'MAX_STAKING_POOL'
     */
    function stake(uint256 amount_) external;

    /**
     * @dev function allow user to withdraw sum of stake tokens
     * by caller + collected reward for caller
     *
     * @notice if the user call this function before the end of staking period
     * he will receive only 60% of his reward
     */
    function unStake() external;
}
