import { ListChecksIcon, SlidersHorizontalIcon, TrendingUpIcon } from 'lucide-react';

export const featuresData = [
    {
        icon: <SlidersHorizontalIcon className="w-6 h-6" />,
        title: 'Live Tracking',
        desc: 'Monitor your trading account LIVE with precision — scalp monitor, remaining drawdown, and profit target all in real time. Get instant notifications the moment you hit your limits.'
    },
    {
        icon: <TrendingUpIcon className="w-6 h-6" />,
        title: 'The One Minute Firm',
        desc: 'Hit your profit target? Your Phase 2 or Funded MT5 login is delivered instantly — no request needed, no more 24-hour waiting. Need cash fast? Payouts now land in your bank account within 60 seconds.'
    },
    {
        icon: <ListChecksIcon className="w-6 h-6" />,
        title: 'We lead, Others copy',
        desc: 'First to launch instant automated payouts. First to launch 20% drawdown. First prop firm with just 2 rules. First to hit ₦1billion in payouts. First with a youth empowerment program.'
    }
];

export const plansData = [
    {
        id: '200k',
        name: '₦200k Account',
        price: '₦8,900',
        desc: 'MT5 Account',
        credits: 'challenge fee',
        features: [
            'Max Drawdown: 20%',
            'Profit Target: 10%',
            'Phases: 2',
            'Min. Trading Days: 1',
            'Profit Split: 70%',
            'Profit Cap: 100%',
            '1 Minute Payout'
        ]
    },
    {
        id: '400k',
        name: '₦400k Account',
        price: '₦18,500',
        desc: 'MT5 Account',
        credits: 'challenge fee',
        features: [
            'Max Drawdown: 20%',
            'Profit Target: 10%',
            'Phases: 2',
            'Min. Trading Days: 1',
            'Profit Split: 70%',
            'Profit Cap: 100%',
            '1 Minute Payout'
        ],
        popular: true
    },
    {
        id: '600k',
        name: '₦600k Account',
        price: '₦28,000',
        desc: 'MT5 Account',
        credits: 'challenge fee',
        features: [
            'Max Drawdown: 20%',
            'Profit Target: 10%',
            'Phases: 2',
            'Min. Trading Days: 1',
            'Profit Split: 70%',
            'Profit Cap: 100%',
            '1 Minute Payout'
        ]
    },
    {
        id: '800k',
        name: '₦800k Account',
        price: '₦38,000',
        desc: 'MT5 Account',
        credits: 'challenge fee',
        features: [
            'Max Drawdown: 20%',
            'Profit Target: 10%',
            'Phases: 2',
            'Min. Trading Days: 1',
            'Profit Split: 70%',
            'Profit Cap: 100%',
            '1 Minute Payout'
        ]
    },
    {
        id: '1.5m',
        name: '₦1.5m Account',
        price: '₦99,000',
        desc: 'MT5 Account',
        credits: 'challenge fee',
        features: [
            'Max Drawdown: 20%',
            'Profit Target: 10%',
            'Phases: 2',
            'Min. Trading Days: 1',
            'Profit Split: 70%',
            'Profit Cap: 50%',
            'Max Payout: 50%',
            '1 Minute Payout'
        ]
    },
    {
        id: '3m',
        name: '₦3m Account',
        price: '₦180,000',
        desc: 'MT5 Account (Paused)',
        credits: 'challenge fee',
        features: [
            'Max Drawdown: 20%',
            'Profit Target: 10%',
            'Phases: 2',
            'Min. Trading Days: 1',
            'Profit Split: 70%',
            'Profit Cap: 50%',
            'Max Payout: 50%',
            '1 Minute Payout',
            'Status: Paused'
        ]
    }
];

export const faqData = [
    {
        question: 'Do the Rules & Targets apply to both Phase 1 and Phase 2?',
        answer: 'Yes. The same core Rules & Targets apply to both phases: 10% profit target, 20% overall max drawdown (no daily DD), no 1–4 minute scalping, and activity requirements.'
    },
    {
        question: 'What are the only mandatory trading rules?',
        answer: 'The key mandatory rules are simple: no 1–4 minute scalping and maintain account activity by placing at least one trade within the required inactivity window.'
    },
    {
        question: 'When can I request payout?',
        answer: 'You can request payout after reaching at least 10% profit. Payouts are processed within 24 hours directly to your bank account.'
    },
    {
        question: 'What is the maximum payout rule?',
        answer: 'Maximum payout is 50% for ₦1.5m and ₦3m accounts, and 100% for other account sizes. Profit above those limits is removed according to policy.'
    },
    {
        question: 'Is KYC required before withdrawal?',
        answer: 'Yes. Once you hit 10% profit on a funded account, you must complete KYC before making withdrawals. After KYC approval, you can withdraw anytime and keep trading.'
    },
    {
        question: 'What happens if I exceed 10% profit without KYC?',
        answer: 'Any profit above the first 10% will be removed until KYC is completed. The safe sequence is: make 10%, do KYC, then withdraw or continue trading.'
    },
    {
        question: 'How does account inactivity work?',
        answer: 'Inactive accounts may be deleted automatically by the broker after the inactivity period. To stay active, place at least one trade within the required interval.'
    },
    {
        question: 'Do you offer refunds?',
        answer: 'No. All sales are final once a product/account has been delivered, activated, or used. If incorrect MT5 details are issued, they are corrected at no extra cost.'
    }
];

export const footerLinks = [
    {
        title: "Company",
        links: [
            { name: "Home", url: "#" },
            { name: "Services", url: "#" },
            { name: "Work", url: "#" },
            { name: "Contact", url: "#" }
        ]
    },
    {
        title: "Legal",
        links: [
            { name: "Privacy Policy", url: "#" },
            { name: "Terms of Service", url: "#" }
        ]
    },
    {
        title: "Connect",
        links: [
            { name: "Twitter", url: "#" },
            { name: "LinkedIn", url: "#" },
            { name: "GitHub", url: "#" }
        ]
    }
];