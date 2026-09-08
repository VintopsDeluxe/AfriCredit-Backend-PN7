// src/validators/kycValidator.js
import { z } from 'zod';

export const kycSchema = z.object({
    fullName: z.string().min(3, "Full name is required"),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be in YYYY-MM-DD format"),
    bvn: z.string().length(11, "BVN must be exactly 11 digits").optional(),
    nin: z.string().length(11, "NIN must be exactly 11 digits").optional(),
    idType: z.enum(['PASSPORT', 'DRIVER_LICENSE', 'VOTERS_CARD', 'NATIONAL_ID']),
    idNumber: z.string().min(5, "ID number is required"),
});