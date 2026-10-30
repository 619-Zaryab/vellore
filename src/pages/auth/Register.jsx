import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { errMsg } from '@/lib/utils';
import { Button, Input } from '@/components/ui';
import { Seo } from '@/components/Seo';
import { GoogleIcon } from './Login';
const schema = z.object({
    name: z.string().min(2, 'Enter your name').max(60),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'Use at least 8 characters').regex(/[A-Za-z]/, 'Include a letter').regex(/\d/, 'Include a number'),
    confirm: z.string(),
}).refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });
export default function Register() {
    const { user, register: signUp, loginWithGoogle } = useAuth();
    const nav = useNavigate();
    const toast = useToast();
    const [busy, setBusy] = useState(false);
    const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });
    if (user && !busy)
        return <Navigate to="/" replace/>;
    return (<>
      <Seo title="Create account" noindex/>
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="mt-1 text-sm text-muted">We will email you a link to verify your address.</p>
      <form className="mt-6 space-y-4" noValidate onSubmit={handleSubmit(async (v) => {
            setBusy(true);
            try {
                await signUp(v.name, v.email, v.password);
                toast.success('Account created. Check your inbox to verify your email.');
                nav('/', { replace: true });
            }
            catch (e) {
                toast.error(/email-already-in-use/.test(String(e.message)) ? 'An account with this email already exists.' : errMsg(e));
            }
            finally {
                setBusy(false);
            }
        })}>
        <Input label="Full name" autoComplete="name" error={errors.name?.message} {...register('name')}/>
        <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')}/>
        <Input label="Password" type="password" autoComplete="new-password" hint="At least 8 characters with a letter and a number." error={errors.password?.message} {...register('password')}/>
        <Input label="Confirm password" type="password" autoComplete="new-password" error={errors.confirm?.message} {...register('confirm')}/>
        <Button type="submit" className="w-full" loading={busy}>Create account</Button>
      </form>
      <div className="my-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-border"/>or<span className="h-px flex-1 bg-border"/></div>
      <Button variant="outline" className="w-full" onClick={async () => { try {
        await loginWithGoogle();
        nav('/', { replace: true });
    }
    catch (e) {
        toast.error(errMsg(e));
    } }}><GoogleIcon />Sign up with Google</Button>
      <p className="mt-6 text-center text-sm text-muted">Already registered? <Link to="/login" className="font-semibold text-brand hover:underline">Sign in</Link></p>
    </>);
}
