import React from 'react'
import MobileSupportHeader from '../components/MobileSupportHeader'
import '../styles/Home.css'

const MobileSupportPage: React.FC = () => {
  return (
    <div style={{backgroundColor: '#000000', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '0 12px 16px', minHeight: '100vh', color: 'white', lineHeight: '1.4', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale'}}>
      <div style={{position: 'fixed', top: '0', left: '0', right: '0', zIndex: '10', background: '#000000', padding: '20px 12px 0'}}>
        <MobileSupportHeader />
      </div>
      <div style={{maxWidth: '400px', width: '100%', margin: '0 auto', paddingTop: '100px'}}>
        <div style={{height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column'}}>
          <div style={{flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 20px'}}>

            <div style={{flex: 1, overflowY: 'auto', paddingBottom: '20px'}}>
              <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                <div style={{display: 'flex', justifyContent: 'flex-start'}}>
                  <div style={{background: 'rgba(255,215,0,0.1)', borderRadius: '18px 18px 18px 4px', padding: '12px 16px', maxWidth: '280px', border: '0.5px solid rgba(255,215,0,0.2)'}}>
                    <div style={{fontSize: '14px', color: 'white'}}>Hello! How can I help you with your trading account today?</div>
                    <div style={{fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px'}}>10:30 AM</div>
                  </div>
                </div>

                <div style={{display: 'flex', justifyContent: 'flex-end'}}>
                  <div style={{background: 'rgba(255,215,0,0.8)', borderRadius: '18px 18px 4px 18px', padding: '12px 16px', maxWidth: '280px'}}>
                    <div style={{fontSize: '14px', color: 'black'}}>I'm having trouble accessing my account details.</div>
                    <div style={{fontSize: '12px', color: 'rgba(0,0,0,0.6)', marginTop: '4px'}}>10:32 AM</div>
                  </div>
                </div>

                <div style={{display: 'flex', justifyContent: 'flex-start'}}>
                  <div style={{background: 'rgba(255,215,0,0.1)', borderRadius: '18px 18px 18px 4px', padding: '12px 16px', maxWidth: '280px', border: '0.5px solid rgba(255,215,0,0.2)'}}>
                    <div style={{fontSize: '14px', color: 'white'}}>I understand. Let me help you with that. Can you please provide your account number?</div>
                    <div style={{fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px'}}>10:33 AM</div>
                  </div>
                </div>

                <div style={{display: 'flex', justifyContent: 'flex-end'}}>
                  <div style={{background: 'rgba(255,215,0,0.8)', borderRadius: '18px 18px 4px 18px', padding: '12px 16px', maxWidth: '280px'}}>
                    <div style={{fontSize: '14px', color: 'black'}}>Sure, it's 81054239</div>
                    <div style={{fontSize: '12px', color: 'rgba(0,0,0,0.6)', marginTop: '4px'}}>10:34 AM</div>
                  </div>
                </div>

                <div style={{display: 'flex', justifyContent: 'flex-start'}}>
                  <div style={{background: 'rgba(255,215,0,0.1)', borderRadius: '18px 18px 18px 4px', padding: '12px 16px', maxWidth: '280px', border: '0.5px solid rgba(255,215,0,0.2)'}}>
                    <div style={{fontSize: '14px', color: 'white'}}>Thank you. I've verified your account. The issue seems to be with your login credentials. Let me reset your password.</div>
                    <div style={{fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px'}}>10:35 AM</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{position: 'fixed', bottom: '0', left: '0', right: '0', background: '#000000', padding: '16px 20px', borderTop: '0.5px solid rgba(255,255,255,0.1)'}}>
        <div style={{maxWidth: '400px', width: '100%', margin: '0 auto'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <div style={{background: 'rgba(255,215,0,0.1)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'}}>
              <i className="fas fa-plus" style={{color: '#FFD700', fontSize: '16px'}}></i>
            </div>
            <div style={{flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '24px', padding: '12px 16px', border: '0.5px solid rgba(255,255,255,0.1)'}}>
              <input type="text" placeholder="Enter your question..." style={{width: '100%', background: 'transparent', border: 'none', color: 'white', fontSize: '16px', outline: 'none'}} />
            </div>
            <div style={{background: 'rgba(255,215,0,0.8)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'}}>
              <i className="fas fa-paper-plane" style={{color: 'black', fontSize: '14px'}}></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MobileSupportPage