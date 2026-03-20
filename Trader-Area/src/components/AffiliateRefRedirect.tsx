import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

const AffiliateRefRedirect = () => {
  const navigate = useNavigate()
  const { affiliateId } = useParams()

  useEffect(() => {
    if (affiliateId) {
      localStorage.setItem('affiliate_referrer_id', affiliateId)
    }
    navigate('/register', { replace: true })
  }, [affiliateId, navigate])

  return null
}

export default AffiliateRefRedirect