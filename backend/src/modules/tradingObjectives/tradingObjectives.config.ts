export type TradingObjectiveRule = {
  key: string
  label: string
  value: string
}

export type TradingObjectivePhase = {
  key: string
  label: string
  rules: TradingObjectiveRule[]
}

export type TradingObjectiveChallengeType = {
  key: string
  label: string
  phases: TradingObjectivePhase[]
}

export type TradingObjectivesConfig = {
  challenge_types: TradingObjectiveChallengeType[]
}

export const DEFAULT_TRADING_OBJECTIVES: TradingObjectivesConfig = {
  challenge_types: [
    {
      key: 'two_step',
      label: '2 Step Challenge',
      phases: [
        {
          key: 'phase_1',
          label: 'Phase 1',
          rules: [
            { key: 'max_drawdown', label: 'Max Drawdown', value: '11%' },
            { key: 'max_daily_drawdown', label: 'Max Daily Drawdown', value: '5%' },
            { key: 'profit_target', label: 'Profit Target', value: '10%' },
            { key: 'min_trading_days', label: 'Minimum Trading Days', value: '1' },
            { key: 'min_trade_duration', label: 'Minimum Trade Duration Rule', value: '3 mins (3 trades closed under 3 mins breach the account)' },
          ],
        },
        {
          key: 'phase_2',
          label: 'Phase 2',
          rules: [
            { key: 'max_drawdown', label: 'Max Drawdown', value: '11%' },
            { key: 'max_daily_drawdown', label: 'Max Daily Drawdown', value: '5%' },
            { key: 'profit_target', label: 'Profit Target', value: '5%' },
            { key: 'min_trading_days', label: 'Minimum Trading Days', value: '1' },
            { key: 'min_trade_duration', label: 'Minimum Trade Duration Rule', value: '3 mins (3 trades closed under 3 mins breach the account)' },
          ],
        },
        {
          key: 'funded',
          label: 'Funded',
          rules: [
            { key: 'max_drawdown', label: 'Max Drawdown', value: '11%' },
            { key: 'max_daily_drawdown', label: 'Max Daily Drawdown', value: '5%' },
            { key: 'profit_split', label: 'Profit Split', value: '80%' },
            { key: 'withdrawals', label: 'Withdrawals', value: 'Weekly' },
            { key: 'min_trading_days', label: 'Minimum Trading Days', value: '1' },
            { key: 'min_trade_duration', label: 'Minimum Trade Duration Rule', value: '3 mins (3 trades closed under 3 mins breach the account)' },
          ],
        },
      ],
    },
    {
      key: 'one_step',
      label: '1 Step Challenge',
      phases: [
        {
          key: 'phase_1',
          label: 'Phase 1',
          rules: [
            { key: 'max_drawdown', label: 'Max Drawdown', value: '11%' },
            { key: 'max_daily_drawdown', label: 'Max Daily Drawdown', value: '5%' },
            { key: 'profit_target', label: 'Profit Target', value: '10%' },
            { key: 'min_trading_days', label: 'Minimum Trading Days', value: '1' },
            { key: 'min_trade_duration', label: 'Minimum Trade Duration Rule', value: '3 mins (3 trades closed under 3 mins breach the account)' },
          ],
        },
        {
          key: 'funded',
          label: 'Funded',
          rules: [
            { key: 'max_drawdown', label: 'Max Drawdown', value: '11%' },
            { key: 'max_daily_drawdown', label: 'Max Daily Drawdown', value: '5%' },
            { key: 'profit_split', label: 'Profit Split', value: '80%' },
            { key: 'withdrawals', label: 'Withdrawals', value: 'Weekly' },
            { key: 'min_trading_days', label: 'Minimum Trading Days', value: '1' },
            { key: 'min_trade_duration', label: 'Minimum Trade Duration Rule', value: '3 mins (3 trades closed under 3 mins breach the account)' },
          ],
        },
      ],
    },
    {
      key: 'instant_funded',
      label: 'Instant Funded',
      phases: [
        {
          key: 'funded',
          label: 'Instant Funded',
          rules: [
            { key: 'max_drawdown', label: 'Max Drawdown', value: '5%' },
            { key: 'max_daily_drawdown', label: 'Max Daily Drawdown', value: '2%' },
            { key: 'min_trading_days', label: 'Minimum Trading Days', value: '5' },
            { key: 'min_trade_duration', label: 'Minimum Trade Duration Rule', value: '3 mins (3 trades closed under 3 mins breach the account)' },
            { key: 'profit_split', label: 'Profit Split', value: '50%' },
            { key: 'withdrawals', label: 'Withdrawals', value: 'Bi-weekly' },
          ],
        },
      ],
    },
    {
      key: 'ngn_standard',
      label: 'NGN Standard',
      phases: [
        {
          key: 'phase_1',
          label: 'Phase 1',
          rules: [
            { key: 'max_drawdown', label: 'Max Drawdown', value: '11%' },
            { key: 'max_daily_drawdown', label: 'Max Daily Drawdown', value: '5%' },
            { key: 'profit_target', label: 'Profit Target', value: '10%' },
            { key: 'min_trading_days', label: 'Minimum Trading Days', value: '1' },
            { key: 'min_trade_duration', label: 'Minimum Trade Duration Rule', value: '3 mins (3 trades closed under 3 mins breach the account)' },
          ],
        },
        {
          key: 'phase_2',
          label: 'Phase 2',
          rules: [
            { key: 'max_drawdown', label: 'Max Drawdown', value: '11%' },
            { key: 'max_daily_drawdown', label: 'Max Daily Drawdown', value: '5%' },
            { key: 'profit_target', label: 'Profit Target', value: '5%' },
            { key: 'min_trading_days', label: 'Minimum Trading Days', value: '1' },
            { key: 'min_trade_duration', label: 'Minimum Trade Duration Rule', value: '3 mins (3 trades closed under 3 mins breach the account)' },
          ],
        },
        {
          key: 'funded',
          label: 'Funded',
          rules: [
            { key: 'max_drawdown', label: 'Max Drawdown', value: '11%' },
            { key: 'max_daily_drawdown', label: 'Max Daily Drawdown', value: '5%' },
            { key: 'profit_split', label: 'Profit Split', value: '80%' },
            { key: 'withdrawals', label: 'Withdrawals', value: 'Weekly' },
            { key: 'min_trading_days', label: 'Minimum Trading Days', value: '1' },
            { key: 'min_trade_duration', label: 'Minimum Trade Duration Rule', value: '3 mins (3 trades closed under 3 mins breach the account)' },
          ],
        },
      ],
    },
    {
      key: 'ngn_flexi',
      label: 'NGN Flexi',
      phases: [
        {
          key: 'phase_1',
          label: 'Phase 1',
          rules: [
            { key: 'max_drawdown', label: 'Max Drawdown', value: '20%' },
            { key: 'profit_target', label: 'Profit Target', value: '10%' },
            { key: 'min_trading_days', label: 'Minimum Trading Days', value: '0' },
            { key: 'min_trade_duration', label: 'Minimum Trade Duration Rule', value: '3 mins (3 trades closed under 3 mins breach the account)' },
          ],
        },
        {
          key: 'phase_2',
          label: 'Phase 2',
          rules: [
            { key: 'max_drawdown', label: 'Max Drawdown', value: '20%' },
            { key: 'profit_target', label: 'Profit Target', value: '10%' },
            { key: 'min_trading_days', label: 'Minimum Trading Days', value: '0' },
            { key: 'min_trade_duration', label: 'Minimum Trade Duration Rule', value: '3 mins (3 trades closed under 3 mins breach the account)' },
          ],
        },
        {
          key: 'funded',
          label: 'Funded',
          rules: [
            { key: 'max_drawdown', label: 'Max Drawdown', value: '20%' },
            { key: 'profit_split', label: 'Profit Split', value: '70%' },
            { key: 'withdrawals', label: 'Withdrawals', value: 'Daily' },
            { key: 'min_trading_days', label: 'Minimum Trading Days', value: '0' },
            { key: 'min_trade_duration', label: 'Minimum Trade Duration Rule', value: '3 mins (3 trades closed under 3 mins breach the account)' },
          ],
        },
      ],
    },
  ],
}