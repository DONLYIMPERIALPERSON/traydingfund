import { ListChecksIcon, SlidersHorizontalIcon, TrendingUpIcon } from 'lucide-react';

export const featuresData = [
    {
        icon: <SlidersHorizontalIcon className="w-6 h-6" />,
        title: 'Simplicity',
        desc: 'A modern prop firm with simple rules that make traders feel less restricted.\nMT5 is available.'
    },
    {
        icon: <TrendingUpIcon className="w-6 h-6" />,
        title: 'Highest drawdown limit globally',
        desc: 'We offer the highest drawdown limit of any prop firm worldwide.'
    },
    {
        icon: <ListChecksIcon className="w-6 h-6" />,
        title: 'Our Rules',
        desc: 'We have just 2 simple rules:\n• 20% maximum drawdown\n• No 1 - 4 minutes fast scalping'
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
            '24hr Payout'
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
            '24hr Payout'
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
            '24hr Payout'
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
            '24hr Payout'
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
            'Max Payout: 50%',
            '24hr Payout'
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
            'Max Payout: 50%',
            '24hr Payout',
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