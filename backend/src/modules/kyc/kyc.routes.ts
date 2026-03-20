import { Router } from 'express'
import { authenticate } from '../../common/auth'
import {
  createKycUploadUrl,
  fetchKycEligibility,
  listBanks,
  listKycHistory,
  resolveBankAccount,
  saveCryptoPayout,
  submitKyc,
  uploadKycDocument,
} from './kyc.controller'

export const kycRouter = Router()

kycRouter.get('/banks', listBanks)
kycRouter.get('/eligibility', authenticate, fetchKycEligibility)
kycRouter.get('/history', authenticate, listKycHistory)
kycRouter.post('/resolve-bank', authenticate, resolveBankAccount)
kycRouter.post('/save-crypto', authenticate, saveCryptoPayout)
kycRouter.post('/upload-url', authenticate, createKycUploadUrl)
kycRouter.post('/upload', authenticate, uploadKycDocument)
kycRouter.post('/submit', authenticate, submitKyc)