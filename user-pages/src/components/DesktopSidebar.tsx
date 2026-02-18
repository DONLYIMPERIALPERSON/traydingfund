import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

interface NavItemType {
  label: string
  href: string
  icon: React.ComponentType<any>
  badge?: React.ReactNode
}

interface SidebarSection {
  label: string
  items: NavItemType[]
}

const navItemsWithSections: SidebarSection[] = [
  {
    label: "Trading",
    items: [
      {
        label: "Accounts Overview",
        href: "/",
        icon: () => <i className="fas fa-chart-line" style={{fontSize: '18px', color: '#666'}}></i>,
      },
      {
        label: "Buy Account",
        href: "/trading-accounts",
        icon: () => <i className="fas fa-shopping-cart" style={{fontSize: '18px', color: '#666'}}></i>,
      },
    ],
  },
  {
    label: "Financial",
    items: [
      {
        label: "Payouts",
        href: "/payout",
        icon: () => <i className="fas fa-credit-card" style={{fontSize: '18px', color: '#666'}}></i>,
      },
      {
        label: "Affiliate",
        href: "/affiliate",
        icon: () => <i className="fas fa-users" style={{fontSize: '18px', color: '#666'}}></i>,
      },
      {
        label: "Certificates",
        href: "/certificates",
        icon: () => <i className="fas fa-certificate" style={{fontSize: '18px', color: '#666'}}></i>,
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        label: "Profile",
        href: "/profile",
        icon: () => <i className="fas fa-user" style={{fontSize: '18px', color: '#666'}}></i>,
      },
      {
        label: "Settings",
        href: "/settings",
        icon: () => <i className="fas fa-gear" style={{fontSize: '18px', color: '#666'}}></i>,
      },
      {
        label: "Support",
        href: "/support",
        icon: () => <i className="fas fa-headset" style={{fontSize: '18px', color: '#666'}}></i>,
      },
      {
        label: "KYC Verification",
        href: "/kyc",
        icon: () => <i className="fas fa-id-card" style={{fontSize: '18px', color: '#666'}}></i>,
      },
    ],
  },
  {
    label: "Community",
    items: [
      {
        label: "Leaderboard",
        href: "/leaderboard",
        icon: () => <i className="fas fa-list-ol" style={{fontSize: '18px', color: '#666'}}></i>,
      },
      {
        label: "Competition",
        href: "/competition",
        icon: () => <i className="fas fa-trophy" style={{fontSize: '18px', color: '#666'}}></i>,
      },
      {
        label: "Promotions",
        href: "/promotions",
        icon: () => <i className="fas fa-gift" style={{fontSize: '18px', color: '#666'}}></i>,
      },
      {
        label: "Contact",
        href: "/contact",
        icon: () => <i className="fas fa-envelope" style={{fontSize: '18px', color: '#666'}}></i>,
      },
    ],
  },
]

const DesktopSidebar: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const handleNavigation = (href: string) => {
    if (href !== '#') {
      navigate(href)
    }
  }

  return (
    <aside style={{
      position: 'fixed',
      top: '0', // Start from very top
      left: '0',
      width: '280px',
      height: '100vh',
      backgroundColor: 'white',
      borderRight: '1px solid #e0e0e0',
      display: 'flex',
      flexDirection: 'column',
      zIndex: '1100' // Higher than header (1000)
    }}>
      {/* Logo at top */}
      <div style={{
        padding: '0px 12px 8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start'
      }}>
        <img
          src="/logo.webp"
          alt="NairaTrader Logo"
          style={{
            width: '140px',
            height: '112px',
            borderRadius: '12px',
            objectFit: 'contain'
          }}
        />
      </div>

      {/* Navigation */}
      <div style={{
        flex: '1',
        padding: '24px 0',
        overflowY: 'auto',
        scrollbarWidth: 'none', // Firefox
        msOverflowStyle: 'none', // IE/Edge
      }}
      className="hide-scrollbar">
        <style>{`
          .hide-scrollbar::-webkit-scrollbar {
            display: none; // Chrome, Safari, Opera
          }
        `}</style>
        <nav>
        {navItemsWithSections.map((section, sectionIndex) => (
          <div key={sectionIndex} style={{marginBottom: '32px'}}>
            {/* Section Header */}
            <div style={{
              padding: '0 24px 8px 24px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#666',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {section.label}
            </div>

            {/* Section Items */}
            <div>
              {section.items.map((item, itemIndex) => {
                const isActive = location.pathname === item.href
                return (
                  <div
                    key={itemIndex}
                    onClick={() => handleNavigation(item.href)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 24px',
                      cursor: item.href === '#' ? 'default' : 'pointer',
                      backgroundColor: isActive ? '#f8f9fa' : 'transparent',
                      borderRight: isActive ? '3px solid #FFD700' : '3px solid transparent',
                      transition: 'all 0.2s ease',
                      opacity: item.href === '#' ? 0.6 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (item.href !== '#') {
                        e.currentTarget.style.backgroundColor = '#f8f9fa'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive && item.href !== '#') {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px',
                      color: isActive ? '#FFD700' : '#666'
                    }}>
                      <item.icon />
                    </div>

                    {/* Label */}
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: isActive ? '#333' : '#666',
                      flex: '1'
                    }}>
                      {item.label}
                    </span>

                    {/* Badge */}
                    {item.badge && (
                      <div style={{marginLeft: '8px'}}>
                        {item.badge}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        </nav>
      </div>

      {/* Name at bottom */}
      <div style={{
        padding: '24px',
        borderTop: '1px solid #e0e0e0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          fontSize: '16px',
          fontWeight: '700',
          color: '#333',
          letterSpacing: '-0.5px'
        }}>
          NairaTrader
        </div>
      </div>
    </aside>
  )
}

export default DesktopSidebar
