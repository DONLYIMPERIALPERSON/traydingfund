import type { Request, Response, NextFunction } from 'express'
import { fetchEconomicCalendar, filterEconomicCalendarByImpact } from '../../services/economicCalendar.service'

export const getEconomicCalendar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const impact = typeof req.query.impact === 'string' ? req.query.impact : undefined
    const data = filterEconomicCalendarByImpact(await fetchEconomicCalendar(), impact)

    res.json({
      success: true,
      count: data.length,
      data,
    })
  } catch (error) {
    next(error)
  }
}