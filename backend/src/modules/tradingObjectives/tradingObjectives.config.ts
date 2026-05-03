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
      key: 'attic',
      label: 'Attic Program',
      phases: [
        {
          key: 'phase_1',
          label: 'Attic Phase',
          rules: [
            { key: 'max_drawdown', label: 'Max Drawdown', value: '20%' },
            { key: 'profit_target', label: 'Profit Target', value: '30%' },
            { key: 'min_trading_days', label: 'Minimum Trading Days', value: '0' },
            { key: 'time_limit', label: 'Time Limit', value: '24 hours' },
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
      key: 'ngn_one_step',
      label: 'NGN 1 Step',
      phases: [
        {
          key: 'phase_1',
          label: 'Phase 1',
          rules: [
            { key: 'max_drawdown', label: 'Max Drawdown', value: '10%' },
            { key: 'max_daily_drawdown', label: 'Max Daily Drawdown', value: '3%' },
            { key: 'profit_target', label: 'Profit Target', value: '10%' },
            { key: 'min_trading_days', label: 'Minimum Trading Days', value: '1' },
            { key: 'min_trade_duration', label: 'Minimum Trade Duration Rule', value: '0 mins' },
          ],
        },
        {
          key: 'funded',
          label: 'Funded',
          rules: [
            { key: 'max_drawdown', label: 'Max Drawdown', value: '10%' },
            { key: 'max_daily_drawdown', label: 'Max Daily Drawdown', value: '3%' },
            { key: 'profit_split', label: 'Profit Split', value: '80%' },
            { key: 'withdrawals', label: 'Withdrawals', value: 'Weekly' },
            { key: 'min_trading_days', label: 'Minimum Trading Days', value: '1' },
            { key: 'min_trade_duration', label: 'Minimum Trade Duration Rule', value: '0 mins' },
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
    {
      key: 'breezy',
      label: 'NGN Breezy',
      phases: [
        {
          key: 'phase_1',
          label: 'Breezy Active',
          rules: [
            { key: 'max_drawdown', label: 'Max Drawdown', value: '50%' },
            { key: 'max_daily_drawdown', label: 'Max Daily Drawdown', value: 'None' },
            { key: 'profit_target', label: 'Profit Target', value: '5%' },
            { key: 'min_trading_days', label: 'Minimum Trading Days', value: '0' },
            { key: 'min_trade_duration', label: 'Minimum Trade Duration Rule', value: '0 mins' },
            { key: 'profit_split', label: 'Profit Split', value: 'Up to 100%' },
            { key: 'withdrawals', label: 'Withdrawals', value: 'On Demand' },
          ],
        },
      ],
    },
  ],
}