import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { errMsg } from '@/lib/utils';
import { Button, Input } from '@/components/ui';
import { Seo } from '@/components/Seo';
const schema = z.object({ email: z.string().email('Enter a valid email'), password: z.string().min(1, 'Enter your password') });
export const GoogleIcon = () => (<svg viewBox="0 0 48 48" className="size-5" aria-hidden><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z"/></svg>);
export default function Login() {
    const { user, login, loginWithGoogle } = useAuth();
    const nav = useNavigate();
    const toast = useToast();
    const from = useLocation().state?.from ?? '/';
    const [busy, setBusy] = useState(false);
    const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });
    if (user)
        return <Navigate to={from} replace/>;
    return (<>
      <Seo title="Sign in" noindex/>
      <h1 className="text-2xl font-bold">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">Sign in to see your orders, wishlist and saved addresses.</p>
      <form className="mt-6 space-y-4" noValidate onSubmit={handleSubmit(async (v) => {
            setBusy(true);
            try {
                await login(v.email, v.password);
                nav(from, { replace: true });
            }
            catch (e) {
                toast.error(/invalid-credential|wrong-password|user-not-found/.test(String(e.message)) ? 'Email or password is incorrect.' : errMsg(e));
            }
            finally {
                setBusy(false);
            }
        })}>
        <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')}/>
        <Input label="Password" type="password" autoComplete="current-password" error={errors.password?.message} {...register('password')}/>
        <div className="text-right"><Link to="/forgot-password" className="text-sm font-semibold text-brand hover:underline">Forgot password?</Link></div>
        <Button type="submit" className="w-full" loading={busy}>Sign in</Button>
      </form>
      <div className="my-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-border"/>or<span className="h-px flex-1 bg-border"/></div>
      <Button variant="outline" className="w-full" onClick={async () => { try {
        await loginWithGoogle();
        nav(from, { replace: true });
    }
    catch (e) {
        toast.error(errMsg(e));
    } }}><GoogleIcon />Continue with Google</Button>
      <p className="mt-6 text-center text-sm text-muted">New to Vellore? <Link to="/register" className="font-semibold text-brand hover:underline">Create an account</Link></p>
    </>);
}
