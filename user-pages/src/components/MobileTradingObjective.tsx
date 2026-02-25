import React from 'react'
import '../styles/MobileTradingObjective.css'

interface MobileTradingObjectiveProps {
  objectives: Record<string, {
    label: string
    status: 'passed' | 'pending' | 'breached' | string
    note?: string | null
  }>
}

const MobileTradingObjective: React.FC<MobileTradingObjectiveProps> = ({ objectives }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <i className="fas fa-check-circle checked"></i>
      case 'breached':
        return <i className="fas fa-times-circle" style={{color: '#e74c3c'}}></i>
      default:
        return <i className="far fa-circle unchecked"></i>
    }
  }

  const getIconForObjective = (key: string) => {
    switch (key) {
      case 'max_drawdown':
        return <i className="fas fa-circle-exclamation" style={{color: 'rgba(255,255,255,0.4)'}}></i>
      case 'profit_target':
        return <i className="fas fa-bullseye" style={{color: 'rgba(255,255,255,0.4)'}}></i>
      case 'scalping_rule':
        return <i className="fas fa-hourglass-half" style={{color: 'rgba(255,255,255,0.4)'}}></i>
      case 'min_trading_days':
        return <i className="fas fa-calendar-days" style={{color: 'rgba(255,255,255,0.4)'}}></i>
      default:
        return <i className="fas fa-circle" style={{color: 'rgba(255,255,255,0.4)'}}></i>
    }
  }

  const getTooltipForObjective = (key: string) => {
    switch (key) {
      case 'max_drawdown':
        return "Maximum loss allowed per trade"
      case 'profit_target':
        return "Target profit to achieve"
      case 'scalping_rule':
        return "Minimum time between trades"
      case 'min_trading_days':
        return "Minimum number of trading days required"
      default:
        return ""
    }
  }

  return (
    <div className="section">
      <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
        <span className="text-small" style={{textTransform: 'uppercase', fontWeight: '600', color: 'rgba(255,255,255,0.6)'}}>Trading objective</span>
      </div>
      <div className="mobile-objectives-list">
        {Object.entries(objectives).map(([key, objective]) => (
          <div key={key} className="mobile-objective-row">
            <div className="mobile-objective-left">
              <span className="mobile-objective-icon">{getIconForObjective(key)}</span>
              <div className="mobile-objective-content">
                <div className="mobile-objective-text">
                  {key === 'min_trading_days' ? 'Cool Down Period' : objective.label}
                </div>
                {objective.note && key !== 'min_trading_days' && <div className="mobile-objective-info">{objective.note}</div>}
                {key === 'min_trading_days' && (
                  <div className="mobile-objective-info">
                    {(() => {
                      if (objective.note) {
                        // Parse format like "11.50h / 24.00h"
                        const match = objective.note.match(/(\d+(?:\.\d+)?)h\s*\/\s*(\d+(?:\.\d+)?)h/)
                        if (match) {
                          const elapsedHours = parseFloat(match[1] || '0')
                          const totalHours = parseFloat(match[2] || '0')
                          const remainingHours = Math.max(0, totalHours - elapsedHours)

                          if (remainingHours <= 0) {
                            return 'Complete'
                          }

                          const hours = Math.floor(remainingHours)
                          const minutes = Math.floor((remainingHours - hours) * 60)

                          if (hours > 0) {
                            if (minutes > 0) {
                              return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''} left`
                            } else {
                              return `${hours} hour${hours > 1 ? 's' : ''} left`
                            }
                          } else if (minutes > 0) {
                            return `${minutes} minute${minutes > 1 ? 's' : ''} left`
                          } else {
                            return 'Complete'
                          }
                        }
                      }
                      return objective.note || '00:00 Hours'
                    })()}
                  </div>
                )}
              </div>
            </div>
            <div className="mobile-check-status">
              {getStatusIcon(objective.status)}
            </div>
          </div>
        ))}
      </div>
      <div style={{marginTop: '12px', height: '2px', width: '60px', background: 'rgba(255,215,0,0.4)', borderRadius: '10px'}}></div>
    </div>
  )
}

export default MobileTradingObjective
