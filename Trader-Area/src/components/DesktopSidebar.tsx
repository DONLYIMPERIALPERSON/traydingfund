import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSidebar } from '../contexts/SidebarContext'
import { clearPersistedAuthUser, logoutFromBackend } from '../lib/auth'

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
  const { isCollapsed, toggleSidebar, isMobileOpen, closeMobileSidebar } = useSidebar()

  const handleLogout = async () => {
    try {
      await logoutFromBackend()
    } catch (error) {
      console.warn('Backend logout call failed:', error)
    }
    clearPersistedAuthUser()
    navigate('/login')
  }

  const handleNavigation = (href: string) => {
    if (href !== '#') {
      navigate(href)
    }
  }

  return (
    <>
      {isMobileOpen && (
        <div
          className="mobile-sidebar-overlay"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}
      <aside
        className={isMobileOpen ? 'sidebar-mobile-open' : ''}
        style={{
          position: 'fixed',
          top: '0', // Start from very top
          left: '0',
          width: isCollapsed ? '80px' : '280px',
          height: '100vh',
          backgroundColor: 'white',
          borderRight: '1px solid #e0e0e0',
          display: 'flex',
          flexDirection: 'column',
          zIndex: '1100', // Higher than header (1000)
          transition: 'width 0.3s ease'
        }}>
      {/* Logo and Toggle at top */}
      <div style={{
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'space-between'
      }}>
        {!isCollapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src="/logo.webp"
              alt="MacheFunded Logo"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                objectFit: 'cover'
              }}
            />
            <div style={{
              fontSize: '16px',
              fontWeight: 700,
              letterSpacing: '0.5px'
            }}>
              <span style={{ color: '#008ea4' }}>MACHE</span>
              <span style={{ color: '#111' }}>FUNDED</span>
            </div>
          </div>
        )}
        <button
          className="sidebar-collapse-button"
          onClick={toggleSidebar}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '6px',
            color: '#666',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          <i className={`fas fa-${isCollapsed ? 'chevron-right' : 'chevron-left'}`}></i>
        </button>
      </div>

      {/* Navigation */}
      <div style={{
        flex: '1',
        padding: '24px 0',
        overflowY: 'auto'
      }}>
        <nav>
        {navItemsWithSections.map((section, sectionIndex) => (
          <div key={sectionIndex} style={{marginBottom: isCollapsed ? '16px' : '32px'}}>
            {/* Section Header - Hidden when collapsed */}
            {!isCollapsed && (
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
            )}

            {/* Section Items */}
            <div>
              {section.items.map((item, itemIndex) => {
                const isActive = location.pathname === item.href
                return (
                  <div
                    key={itemIndex}
                    onClick={() => {
                      handleNavigation(item.href)
                      closeMobileSidebar()
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: isCollapsed ? 'center' : 'flex-start',
                      padding: isCollapsed ? '12px' : '12px 24px',
                      cursor: item.href === '#' ? 'default' : 'pointer',
                      backgroundColor: isActive ? '#f8f9fa' : 'transparent',
                      borderRight: isActive ? '3px solid #FFD700' : '3px solid transparent',
                      transition: 'all 0.2s ease',
                      opacity: item.href === '#' ? 0.6 : 1,
                      position: 'relative'
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
                    title={isCollapsed ? item.label : undefined}
                  >
                    {/* Icon */}
                    <div style={{
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: isCollapsed ? '0' : '12px',
                      color: isActive ? '#FFD700' : '#666'
                    }}>
                      <item.icon />
                    </div>

                    {/* Label - Hidden when collapsed */}
                    {!isCollapsed && (
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: isActive ? '#333' : '#666',
                        flex: '1'
                      }}>
                        {item.label}
                      </span>
                    )}

                    {/* Badge - Hidden when collapsed */}
                    {!isCollapsed && item.badge && (
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

      {/* Name at bottom - Hidden when collapsed */}
      {!isCollapsed && (
        <div style={{
          padding: '24px',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <button
            className="mobile-sidebar-logout"
            onClick={handleLogout}
            style={{
              display: 'none',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <i className="fas fa-sign-out-alt" style={{fontSize: '12px'}}></i>
            Logout
          </button>
          <div style={{
            fontSize: '16px',
            fontWeight: '700',
            color: '#333',
            letterSpacing: '-0.5px'
          }}>
            MacheFunded
          </div>
        </div>
      )}
      </aside>
    </>
  )
}

export default DesktopSidebar
