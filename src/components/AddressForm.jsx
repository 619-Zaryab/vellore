import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PROVINCES } from '@/lib/constants';
import { Button, Checkbox, Input, Select } from './ui';
export const addressSchema = z.object({
    label: z.string().min(1, 'Add a label').max(30),
    fullName: z.string().min(2, 'Enter the recipient name').max(80),
    phone: z.string().regex(/^(\+92|0)?3\d{9}$|^[\d\s+()-]{7,16}$/, 'Enter a valid phone number'),
    line1: z.string().min(5, 'Enter the street address').max(200),
    line2: z.string().max(200).optional(),
    city: z.string().min(2, 'Enter the city').max(80),
    province: z.string().min(2, 'Select a province'),
    postalCode: z.string().max(12).optional(),
    isDefault: z.boolean().optional(),
});
export function AddressForm({ defaults, onSubmit, submitLabel = 'Save address', loading, showLabel = true, showDefault = true, onCancel }) {
    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: zodResolver(addressSchema),
        defaultValues: { label: 'Home', province: 'Punjab', ...defaults },
    });
    return (<form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
      {showLabel && <Input label="Label" placeholder="Home, Office..." error={errors.label?.message} {...register('label')}/>}
      <Input label="Full name" autoComplete="name" error={errors.fullName?.message} {...register('fullName')}/>
      <Input label="Phone" type="tel" autoComplete="tel" placeholder="03XX XXXXXXX" error={errors.phone?.message} {...register('phone')}/>
      <Input className="" label="Street address" autoComplete="address-line1" error={errors.line1?.message} {...register('line1')}/>
      <Input label="Apartment, suite (optional)" autoComplete="address-line2" {...register('line2')}/>
      <Input label="City" autoComplete="address-level2" error={errors.city?.message} {...register('city')}/>
      <Select label="Province" error={errors.province?.message} {...register('province')}>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</Select>
      <Input label="Postal code (optional)" autoComplete="postal-code" {...register('postalCode')}/>
      {showDefault && <div className="sm:col-span-2"><Checkbox label="Use as my default address" {...register('isDefault')}/></div>}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" loading={loading}>{submitLabel}</Button>
        {onCancel && <Button variant="outline" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>);
}
