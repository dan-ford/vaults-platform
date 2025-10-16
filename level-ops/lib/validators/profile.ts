import { z } from 'zod';

// Value schema
export const valueSchema = z.object({
  label: z.string().min(1, 'Label is required').max(100, 'Label too long'),
  description: z.string().optional(),
});

// Goal schema
export const goalSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  timeframe: z.string().optional(),
  owner_id: z.string().uuid().optional(),
  status: z
    .enum(['not_started', 'in_progress', 'completed', 'on_hold'])
    .optional(),
});

// Website schema
export const websiteSchema = z.object({
  label: z.string().min(1, 'Label is required').max(50, 'Label too long'),
  url: z.string().url('Invalid URL'),
});

// Phone schema
export const phoneSchema = z.object({
  label: z.string().min(1, 'Label is required').max(50, 'Label too long'),
  number: z.string().min(1, 'Number is required').max(30, 'Number too long'),
});

// Email schema
export const emailSchema = z.object({
  label: z.string().min(1, 'Label is required').max(50, 'Label too long'),
  email: z.string().email('Invalid email address'),
});

// Social schema
export const socialSchema = z.object({
  platform: z
    .string()
    .min(1, 'Platform is required')
    .max(50, 'Platform name too long'),
  url: z.string().url('Invalid URL'),
});

// Key contact schema
export const keyContactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  role: z.string().min(1, 'Role is required').max(100, 'Role too long'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(30, 'Phone too long').optional().or(z.literal('')),
});

// Vault profile schema
export const vaultProfileSchema = z.object({
  legal_name: z.string().max(200, 'Legal name too long').optional().or(z.literal('')),
  brand_name: z.string().max(200, 'Brand name too long').optional().or(z.literal('')),
  mission: z.string().max(1000, 'Mission too long').optional().or(z.literal('')),
  vision: z.string().max(1000, 'Vision too long').optional().or(z.literal('')),
  values: z.array(valueSchema).max(12, 'Maximum 12 values allowed').default([]),
  goals: z.array(goalSchema).max(20, 'Maximum 20 goals allowed').default([]),
  websites: z.array(websiteSchema).max(10, 'Maximum 10 websites allowed').default([]),
  phones: z.array(phoneSchema).max(10, 'Maximum 10 phones allowed').default([]),
  emails: z.array(emailSchema).max(10, 'Maximum 10 emails allowed').default([]),
  socials: z.array(socialSchema).max(15, 'Maximum 15 social links allowed').default([]),
  industry: z.string().max(100, 'Industry too long').optional().or(z.literal('')),
  company_size: z.string().max(50, 'Company size too long').optional().or(z.literal('')),
  incorporation_date: z.string().optional().or(z.literal('')), // Will be date string
  registration_number: z.string().max(100, 'Registration number too long').optional().or(z.literal('')),
  tax_id: z.string().max(100, 'Tax ID too long').optional().or(z.literal('')),
  description: z.string().max(5000, 'Description too long').optional().or(z.literal('')),
  key_contacts: z.array(keyContactSchema).max(20, 'Maximum 20 contacts allowed').default([]),
});

// Address schema
export const addressSchema = z.object({
  label: z.string().max(50, 'Label too long').optional().or(z.literal('')),
  address_line1: z.string().max(200, 'Address line 1 too long').optional().or(z.literal('')),
  address_line2: z.string().max(200, 'Address line 2 too long').optional().or(z.literal('')),
  city: z.string().max(100, 'City too long').optional().or(z.literal('')),
  region: z.string().max(100, 'Region too long').optional().or(z.literal('')),
  postal_code: z.string().max(20, 'Postal code too long').optional().or(z.literal('')),
  country: z.string().max(100, 'Country too long').optional().or(z.literal('')),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  google_place_id: z.string().max(200).optional().or(z.literal('')),
  is_primary: z.boolean().default(false),
});

// Types
export type VaultProfile = z.infer<typeof vaultProfileSchema>;
export type VaultAddress = z.infer<typeof addressSchema>;
export type Value = z.infer<typeof valueSchema>;
export type Goal = z.infer<typeof goalSchema>;
export type Website = z.infer<typeof websiteSchema>;
export type Phone = z.infer<typeof phoneSchema>;
export type Email = z.infer<typeof emailSchema>;
export type Social = z.infer<typeof socialSchema>;
export type KeyContact = z.infer<typeof keyContactSchema>;
