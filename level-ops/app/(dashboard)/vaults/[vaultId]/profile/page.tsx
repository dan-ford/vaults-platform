"use client";

import { use, useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';
import { Pencil, Save, Plus, X, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SectionCard } from '@/components/profile/SectionCard';
import { MapEmbed } from '@/components/profile/MapEmbed';
import { vaultProfileSchema, type VaultProfile } from '@/lib/validators/profile';
import {
  getVaultProfile,
  updateVaultProfile,
  createAddress,
  updateAddress,
  deleteAddress,
  type ProfileResponse,
} from '@/lib/api/profile';
import { useAuditLog } from '@/lib/hooks/use-audit-log';

const defaultProfile: VaultProfile = {
  legal_name: '',
  brand_name: '',
  mission: '',
  vision: '',
  values: [],
  goals: [],
  websites: [],
  phones: [],
  emails: [],
  socials: [],
  industry: '',
  company_size: '',
  incorporation_date: '',
  registration_number: '',
  tax_id: '',
  description: '',
  key_contacts: [],
};

export default function VaultProfilePage({
  params,
}: {
  params: Promise<{ vaultId: string }>;
}) {
  const resolvedParams = use(params);
  const [editing, setEditing] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [currentProfile, setCurrentProfile] = useState<VaultProfile | null>(null);
  const { logAgentAction } = useAuditLog();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isDirty },
  } = useForm<VaultProfile>({
    resolver: zodResolver(vaultProfileSchema),
    defaultValues: defaultProfile,
  });

  const { fields: valueFields, append: appendValue, remove: removeValue } =
    useFieldArray({ control, name: 'values' });

  const { fields: goalFields, append: appendGoal, remove: removeGoal } =
    useFieldArray({ control, name: 'goals' });

  const { fields: websiteFields, append: appendWebsite, remove: removeWebsite } =
    useFieldArray({ control, name: 'websites' });

  const { fields: phoneFields, append: appendPhone, remove: removePhone } =
    useFieldArray({ control, name: 'phones' });

  const { fields: emailFields, append: appendEmail, remove: removeEmail } =
    useFieldArray({ control, name: 'emails' });

  const { fields: socialFields, append: appendSocial, remove: removeSocial } =
    useFieldArray({ control, name: 'socials' });

  const { fields: contactFields, append: appendContact, remove: removeContact } =
    useFieldArray({ control, name: 'key_contacts' });

  // Load profile data
  const loadProfile = async () => {
    try {
      setLoading(true);
      const data: ProfileResponse = await getVaultProfile(resolvedParams.vaultId);
      setCanEdit(data.canEdit);
      setAddresses(data.addresses || []);
      if (data.profile) {
        reset(data.profile);
        setCurrentProfile(data.profile);
      } else {
        reset(defaultProfile);
        setCurrentProfile(null);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      alert('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [resolvedParams.vaultId]);

  // Save profile
  const onSubmit = async (data: VaultProfile) => {
    try {
      setSaving(true);
      await updateVaultProfile(resolvedParams.vaultId, data);
      setEditing(false);
      await loadProfile();
      alert('Profile saved successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  // Make profile readable to AI
  useCopilotReadable({
    description: "The current organisation's profile information including identity, contact details, mission, vision, and values",
    value: currentProfile || defaultProfile,
  });

  // AI action to update profile fields
  useCopilotAction({
    name: "updateVaultProfile",
    description: "Update organisation profile information such as brand name, legal name, mission, vision, values, goals, industry, contact details, etc.",
    parameters: [
      {
        name: "brand_name",
        type: "string",
        description: "The brand/trading name of the organisation",
        required: false,
      },
      {
        name: "legal_name",
        type: "string",
        description: "The legal registered name of the organisation",
        required: false,
      },
      {
        name: "mission",
        type: "string",
        description: "The organisation's mission statement",
        required: false,
      },
      {
        name: "vision",
        type: "string",
        description: "The organisation's vision statement",
        required: false,
      },
      {
        name: "description",
        type: "string",
        description: "A description of the organisation",
        required: false,
      },
      {
        name: "industry",
        type: "string",
        description: "The industry the organisation operates in",
        required: false,
      },
      {
        name: "company_size",
        type: "string",
        description: "The size of the company (e.g., '1-10', '11-50', '51-200', '201-500', '500+')",
        required: false,
      },
      {
        name: "values",
        type: "string[]",
        description: "Array of core values",
        required: false,
      },
      {
        name: "goals",
        type: "string[]",
        description: "Array of organisational goals",
        required: false,
      },
      {
        name: "websites",
        type: "string[]",
        description: "Array of website URLs",
        required: false,
      },
      {
        name: "phones",
        type: "string[]",
        description: "Array of phone numbers",
        required: false,
      },
      {
        name: "emails",
        type: "string[]",
        description: "Array of email addresses",
        required: false,
      },
    ],
    handler: async (params: any) => {
      if (!canEdit) {
        throw new Error("You don't have permission to edit the organisation profile");
      }

      try {
        // Get current values
        const currentValues = getValues();
        const previousProfile = { ...currentValues };

        // Update form values with provided parameters
        const updates: Partial<VaultProfile> = {};
        Object.keys(params).forEach((key) => {
          if (params[key] !== undefined) {
            setValue(key as keyof VaultProfile, params[key], { shouldDirty: true });
            updates[key as keyof VaultProfile] = params[key];
          }
        });

        // Get updated values
        const updatedValues = getValues();

        // Save to API
        await updateVaultProfile(resolvedParams.vaultId, updatedValues);

        // Reload profile
        await loadProfile();

        // Log the action
        await logAgentAction(
          'update',
          'vault_profile',
          resolvedParams.vaultId,
          previousProfile,
          updates,
          { source: 'ai_assistant', fields_updated: Object.keys(updates) }
        );

        return `Organisation profile updated successfully. Updated fields: ${Object.keys(updates).join(', ')}`;
      } catch (error) {
        console.error('Error updating profile via AI:', error);
        throw new Error('Failed to update organisation profile');
      }
    },
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Organisation Profile</h1>
        {canEdit && !editing && (
          <Button
            onClick={() => setEditing(true)}
            variant="outline"
            size="sm"
            aria-label="Edit profile"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
        {editing && (
          <Button
            onClick={() => {
              setEditing(false);
              loadProfile(); // Reset form
            }}
            variant="ghost"
            size="sm"
          >
            Cancel
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Identity Section */}
        <SectionCard title="Identity">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="brand_name">Brand Name</Label>
              {editing ? (
                <Input
                  id="brand_name"
                  {...register('brand_name')}
                  placeholder="Your brand name"
                />
              ) : (
                <Controller
                  control={control}
                  name="brand_name"
                  render={({ field }) => <p className="text-sm mt-1">{field.value || '—'}</p>}
                />
              )}
            </div>
            <div>
              <Label htmlFor="legal_name">Legal Name</Label>
              {editing ? (
                <Input
                  id="legal_name"
                  {...register('legal_name')}
                  placeholder="Legal entity name"
                />
              ) : (
                <Controller
                  control={control}
                  name="legal_name"
                  render={({ field }) => <p className="text-sm mt-1">{field.value || '—'}</p>}
                />
              )}
            </div>
            <div>
              <Label htmlFor="industry">Industry</Label>
              {editing ? (
                <Input
                  id="industry"
                  {...register('industry')}
                  placeholder="e.g., Technology, Healthcare"
                />
              ) : (
                <Controller
                  control={control}
                  name="industry"
                  render={({ field }) => <p className="text-sm mt-1">{field.value || '—'}</p>}
                />
              )}
            </div>
            <div>
              <Label htmlFor="company_size">Company Size</Label>
              {editing ? (
                <Input
                  id="company_size"
                  {...register('company_size')}
                  placeholder="e.g., 1-10, 11-50"
                />
              ) : (
                <Controller
                  control={control}
                  name="company_size"
                  render={({ field }) => <p className="text-sm mt-1">{field.value || '—'}</p>}
                />
              )}
            </div>
            <div>
              <Label htmlFor="incorporation_date">Incorporation Date</Label>
              {editing ? (
                <Input
                  id="incorporation_date"
                  type="date"
                  {...register('incorporation_date')}
                />
              ) : (
                <Controller
                  control={control}
                  name="incorporation_date"
                  render={({ field }) => <p className="text-sm mt-1">{field.value || '—'}</p>}
                />
              )}
            </div>
            <div>
              <Label htmlFor="registration_number">Registration Number</Label>
              {editing ? (
                <Input
                  id="registration_number"
                  {...register('registration_number')}
                  placeholder="Company registration number"
                />
              ) : (
                <Controller
                  control={control}
                  name="registration_number"
                  render={({ field }) => <p className="text-sm mt-1">{field.value || '—'}</p>}
                />
              )}
            </div>
            <div>
              <Label htmlFor="tax_id">Tax ID</Label>
              {editing ? (
                <Input
                  id="tax_id"
                  {...register('tax_id')}
                  placeholder="Tax identification number"
                />
              ) : (
                <Controller
                  control={control}
                  name="tax_id"
                  render={({ field }) => <p className="text-sm mt-1">{field.value || '—'}</p>}
                />
              )}
            </div>
          </div>
        </SectionCard>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SectionCard title="Mission">
            {editing ? (
              <textarea
                {...register('mission')}
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                placeholder="Our mission statement..."
              />
            ) : (
              <Controller
                control={control}
                name="mission"
                render={({ field }) => <p className="text-sm">{field.value || '—'}</p>}
              />
            )}
          </SectionCard>

          <SectionCard title="Vision">
            {editing ? (
              <textarea
                {...register('vision')}
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                placeholder="Our vision statement..."
              />
            ) : (
              <Controller
                control={control}
                name="vision"
                render={({ field }) => <p className="text-sm">{field.value || '—'}</p>}
              />
            )}
          </SectionCard>
        </div>

        {/* Values */}
        <SectionCard title="Values">
          <div className="space-y-3">
            {valueFields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  {editing ? (
                    <>
                      <Input
                        {...register(`values.${index}.label` as const)}
                        placeholder="Value label"
                      />
                      <Input
                        {...register(`values.${index}.description` as const)}
                        placeholder="Description (optional)"
                      />
                    </>
                  ) : (
                    <div className="rounded-lg border border-border p-3">
                      <h4 className="font-medium text-sm">{field.label}</h4>
                      {field.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {field.description}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {editing && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeValue(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {editing && valueFields.length < 12 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendValue({ label: '', description: '' })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Value
              </Button>
            )}
          </div>
        </SectionCard>

        {/* Goals */}
        <SectionCard title="Goals">
          <div className="space-y-3">
            {goalFields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  {editing ? (
                    <>
                      <Input
                        {...register(`goals.${index}.title` as const)}
                        placeholder="Goal title"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Input
                          {...register(`goals.${index}.timeframe` as const)}
                          placeholder="Timeframe (e.g., Q1 2025)"
                        />
                        <select
                          {...register(`goals.${index}.status` as const)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <option value="">Status...</option>
                          <option value="not_started">Not Started</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="on_hold">On Hold</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-lg border border-border p-3">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-sm">{field.title}</h4>
                        {field.status && (
                          <Badge variant="outline" className="text-xs">
                            {field.status.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                      {field.timeframe && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {field.timeframe}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {editing && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeGoal(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {editing && goalFields.length < 20 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendGoal({ title: '', timeframe: '', status: undefined })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Goal
              </Button>
            )}
          </div>
        </SectionCard>

        {/* Websites & Socials */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SectionCard title="Websites">
            <div className="space-y-3">
              {websiteFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <div className="flex-1 space-y-2">
                    {editing ? (
                      <>
                        <Input
                          {...register(`websites.${index}.label` as const)}
                          placeholder="Label (e.g., Main Site)"
                        />
                        <Input
                          {...register(`websites.${index}.url` as const)}
                          placeholder="https://example.com"
                          type="url"
                        />
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{field.label}:</span>
                        <a
                          href={field.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          {field.url}
                        </a>
                      </div>
                    )}
                  </div>
                  {editing && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeWebsite(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {editing && websiteFields.length < 10 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendWebsite({ label: '', url: '' })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Website
                </Button>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Social Media">
            <div className="space-y-3">
              {socialFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <div className="flex-1 space-y-2">
                    {editing ? (
                      <>
                        <Input
                          {...register(`socials.${index}.platform` as const)}
                          placeholder="Platform (e.g., LinkedIn)"
                        />
                        <Input
                          {...register(`socials.${index}.url` as const)}
                          placeholder="https://..."
                          type="url"
                        />
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{field.platform}:</span>
                        <a
                          href={field.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          {field.url}
                        </a>
                      </div>
                    )}
                  </div>
                  {editing && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSocial(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {editing && socialFields.length < 15 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendSocial({ platform: '', url: '' })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Social
                </Button>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SectionCard title="Phone Numbers">
            <div className="space-y-3">
              {phoneFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <div className="flex-1 space-y-2">
                    {editing ? (
                      <>
                        <Input
                          {...register(`phones.${index}.label` as const)}
                          placeholder="Label (e.g., Main)"
                        />
                        <Input
                          {...register(`phones.${index}.number` as const)}
                          placeholder="+1 234 567 8900"
                          type="tel"
                        />
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{field.label}:</span>
                        <span className="text-sm">{field.number}</span>
                      </div>
                    )}
                  </div>
                  {editing && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePhone(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {editing && phoneFields.length < 10 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendPhone({ label: '', number: '' })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Phone
                </Button>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Email Addresses">
            <div className="space-y-3">
              {emailFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <div className="flex-1 space-y-2">
                    {editing ? (
                      <>
                        <Input
                          {...register(`emails.${index}.label` as const)}
                          placeholder="Label (e.g., General)"
                        />
                        <Input
                          {...register(`emails.${index}.email` as const)}
                          placeholder="contact@example.com"
                          type="email"
                        />
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{field.label}:</span>
                        <a
                          href={`mailto:${field.email}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {field.email}
                        </a>
                      </div>
                    )}
                  </div>
                  {editing && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEmail(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {editing && emailFields.length < 10 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendEmail({ label: '', email: '' })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Email
                </Button>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Key Contacts */}
        <SectionCard title="Key Contacts">
          <div className="space-y-3">
            {contactFields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  {editing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        {...register(`key_contacts.${index}.name` as const)}
                        placeholder="Name"
                      />
                      <Input
                        {...register(`key_contacts.${index}.role` as const)}
                        placeholder="Role/Title"
                      />
                      <Input
                        {...register(`key_contacts.${index}.email` as const)}
                        placeholder="Email (optional)"
                        type="email"
                      />
                      <Input
                        {...register(`key_contacts.${index}.phone` as const)}
                        placeholder="Phone (optional)"
                        type="tel"
                      />
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border p-3">
                      <h4 className="font-medium text-sm">{field.name}</h4>
                      <p className="text-xs text-muted-foreground">{field.role}</p>
                      {field.email && (
                        <a
                          href={`mailto:${field.email}`}
                          className="text-xs text-primary hover:underline block mt-1"
                        >
                          {field.email}
                        </a>
                      )}
                      {field.phone && (
                        <p className="text-xs text-muted-foreground mt-1">{field.phone}</p>
                      )}
                    </div>
                  )}
                </div>
                {editing && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeContact(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {editing && contactFields.length < 20 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendContact({ name: '', role: '', email: '', phone: '' })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            )}
          </div>
        </SectionCard>

        {/* Addresses & Maps */}
        <SectionCard title="Addresses">
          <div className="space-y-4">
            {addresses.map((address: any) => (
              <div key={address.id} className="border border-border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      {address.label || 'Address'}
                      {address.is_primary && (
                        <Badge variant="default" className="text-xs">
                          Primary
                        </Badge>
                      )}
                    </h4>
                    <p className="text-sm mt-1">
                      {address.address_line1}
                      {address.address_line2 && <>, {address.address_line2}</>}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {address.city}
                      {address.region && `, ${address.region}`} {address.postal_code}
                    </p>
                    <p className="text-sm text-muted-foreground">{address.country}</p>
                  </div>
                  {canEdit && editing && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (confirm('Delete this address?')) {
                          await deleteAddress(resolvedParams.vaultId, address.id);
                          await loadProfile();
                        }
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {(address.latitude && address.longitude) || address.google_place_id ? (
                  <div className="mt-3">
                    <MapEmbed
                      lat={address.latitude}
                      lng={address.longitude}
                      placeId={address.google_place_id}
                    />
                  </div>
                ) : null}
              </div>
            ))}
            {editing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  // TODO: Open address dialog
                  alert('Address dialog would open here. Feature coming soon!');
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Address
              </Button>
            )}
          </div>
        </SectionCard>

        {/* Description */}
        <SectionCard title="About">
          {editing ? (
            <textarea
              {...register('description')}
              rows={6}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              placeholder="Detailed description of your organization..."
            />
          ) : (
            <Controller
              control={control}
              name="description"
              render={({ field }) => <p className="text-sm whitespace-pre-wrap">{field.value || '—'}</p>}
            />
          )}
        </SectionCard>

        {/* Save Button */}
        {editing && (
          <div className="sticky bottom-4 flex justify-end">
            <Button
              type="submit"
              disabled={!isDirty || saving}
              size="lg"
              className="shadow-lg"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Profile
                </>
              )}
            </Button>
          </div>
        )}
      </form>

      {/* Note: Additional sections (Goals, Contacts, Websites, Socials, Addresses)
          would follow the same pattern as Values above. Due to length constraints,
          showing the core structure. Each section uses useFieldArray with similar
          add/remove/edit patterns. */}
    </div>
  );
}
