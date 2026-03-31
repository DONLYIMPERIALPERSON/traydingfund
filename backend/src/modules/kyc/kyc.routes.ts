import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../common/validation'
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

const resolveBankSchema = z.object({
  bank_code: z.string().min(1),
  bank_account_number: z.string().min(6),
})

const saveCryptoSchema = z.object({
  crypto_currency: z.string().min(2),
  crypto_address: z.string().min(8),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
})

const uploadUrlSchema = z.object({
  filename: z.string().min(1),
  content_type: z.string().min(1),
  document_side: z.enum(['front', 'back']),
})

const uploadSchema = z.object({
  filename: z.string().min(1),
  content_type: z.string().min(1),
  document_side: z.enum(['front', 'back']),
  file_base64: z.string().min(10),
})

const submitKycSchema = z.object({
  document_type: z.string().min(1),
  document_number: z.string().min(2),
  id_front_url: z.string().min(5),
  id_back_url: z.string().optional().nullable(),
  selfie_url: z.string().optional().nullable(),
})

kycRouter.get('/banks', listBanks)
kycRouter.get('/eligibility', authenticate, fetchKycEligibility)
kycRouter.get('/history', authenticate, listKycHistory)
kycRouter.post('/resolve-bank', authenticate, validate({ body: resolveBankSchema }), resolveBankAccount)
kycRouter.post('/save-crypto', authenticate, validate({ body: saveCryptoSchema }), saveCryptoPayout)
kycRouter.post('/upload-url', authenticate, validate({ body: uploadUrlSchema }), createKycUploadUrl)
kycRouter.post('/upload', authenticate, validate({ body: uploadSchema }), uploadKycDocument)
kycRouter.post('/submit', authenticate, validate({ body: submitKycSchema }), submitKyc)