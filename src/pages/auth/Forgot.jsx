import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { errMsg } from '@/lib/utils';
import { Button, Input } from '@/components/ui';
import { Seo } from '@/components/Seo';
export default function Forgot() {
    const { resetPassword } = useAuth();
    const toast = useToast();
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [busy, setBusy] = useState(false);
    return (<>
      <Seo title="Reset password" noindex/>
      {sent ? (<div className="text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-success/10 text-success"><MailCheck className="size-7"/></div>
          <h1 className="text-xl font-bold">Check your inbox</h1>
          <p className="mt-2 text-sm text-muted">If an account exists for {email}, a reset link is on its way.</p>
          <Link to="/login"><Button variant="outline" className="mt-6 w-full">Back to sign in</Button></Link>
        </div>) : (<>
          <h1 className="text-2xl font-bold">Reset your password</h1>
          <p className="mt-1 text-sm text-muted">Enter your email and we will send a reset link.</p>
          <form className="mt-6 space-y-4" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try {
            await resetPassword(email.trim());
            setSent(true);
        }
        catch (err) {
            toast.error(errMsg(err));
        }
        finally {
            setBusy(false);
        } }}>
            <Input label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}/>
            <Button type="submit" className="w-full" loading={busy}>Send reset link</Button>
          </form>
          <p className="mt-6 text-center text-sm"><Link to="/login" className="font-semibold text-brand hover:underline">Back to sign in</Link></p>
        </>)}
    </>);
}
