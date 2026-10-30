import { useEffect, useState } from 'react';
import { MailCheck, MailWarning, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { errMsg } from '@/lib/utils';
import { Badge, Button, Checkbox, Input, Modal, Tabs } from '@/components/ui';
import { AddressForm } from '@/components/AddressForm';
import { Seo } from '@/components/Seo';
export default function Profile() {
    const { user, profile, updateProfileData, saveAddresses, resendVerification, resetPassword, refreshUser } = useAuth();
    const toast = useToast();
    const [tab, setTab] = useState('profile');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [news, setNews] = useState(false);
    const [busy, setBusy] = useState(false);
    const [editing, setEditing] = useState(null);
    useEffect(() => { if (profile) {
        setName(profile.displayName ?? '');
        setPhone(profile.phone ?? '');
        setNews(!!profile.newsletter);
    } }, [profile?.uid]); // eslint-disable-line
    const addresses = profile?.addresses ?? [];
    const saveAddress = async (v) => {
        setBusy(true);
        try {
            let list = [...addresses];
            const entry = { ...v, id: editing && editing !== 'new' ? editing.id : crypto.randomUUID(), isDefault: !!v.isDefault || (list.length === 0 && editing === 'new') };
            list = editing === 'new' || !editing ? [...list, entry] : list.map((a) => (a.id === entry.id ? entry : a));
            if (entry.isDefault)
                list = list.map((a) => ({ ...a, isDefault: a.id === entry.id }));
            await saveAddresses(list);
            toast.success('Address saved');
            setEditing(null);
        }
        catch (e) {
            toast.error(errMsg(e));
        }
        finally {
            setBusy(false);
        }
    };
    return (<div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Seo title="My profile" noindex/>
      <h1 className="mb-6 text-3xl font-bold">My profile</h1>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'profile', label: 'Details' }, { id: 'addresses', label: 'Addresses' }, { id: 'security', label: 'Security' }]}/>
      <div className="mt-6">
        {tab === 'profile' && (<form className="max-w-md space-y-4" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try {
            await updateProfileData({ displayName: name.trim(), phone: phone.trim(), newsletter: news });
            toast.success('Profile updated');
        }
        catch (err) {
            toast.error(errMsg(err));
        }
        finally {
            setBusy(false);
        } }}>
            <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={60}/>
            <Input label="Email" value={user?.email ?? ''} disabled hint="Your sign-in email cannot be changed here."/>
            <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03XX XXXXXXX"/>
            <Checkbox label="Send me new arrivals and offers" checked={news} onChange={(e) => setNews(e.target.checked)}/>
            <Button type="submit" loading={busy}>Save changes</Button>
          </form>)}
        {tab === 'addresses' && (<div className="space-y-3">
            {addresses.length === 0 && <p className="text-sm text-muted">You have no saved addresses yet.</p>}
            {addresses.map((a) => (<div key={a.id} className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-surface p-4 text-sm">
                <div><p className="font-semibold">{a.label} {a.isDefault && <Badge tone="info" className="ml-1">Default</Badge>}</p><p className="mt-1 text-muted">{a.fullName}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.province}<br />{a.phone}</p></div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" aria-label="Edit address" onClick={() => setEditing(a)}><Pencil className="size-4"/></Button>
                  <Button size="sm" variant="ghost" aria-label="Delete address" onClick={async () => { await saveAddresses(addresses.filter((x) => x.id !== a.id)); toast.info('Address removed'); }}><Trash2 className="size-4"/></Button>
                </div>
              </div>))}
            <Button variant="outline" onClick={() => setEditing('new')}><Plus className="size-4"/>Add address</Button>
            <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New address' : 'Edit address'} size="md">
              {editing && <AddressForm key={editing === 'new' ? 'n' : editing.id} defaults={editing === 'new' ? { fullName: profile?.displayName, phone: profile?.phone } : editing} loading={busy} onSubmit={saveAddress} onCancel={() => setEditing(null)}/>}
            </Modal>
          </div>)}
        {tab === 'security' && (<div className="max-w-md space-y-6">
            <div className="rounded-2xl border border-border p-4 text-sm">
              {user?.emailVerified ? <p className="flex items-center gap-2 font-semibold text-success"><MailCheck className="size-5"/>Your email is verified</p> : (<div className="space-y-3"><p className="flex items-center gap-2 font-semibold text-warning"><MailWarning className="size-5"/>Email not verified</p><p className="text-muted">Verify {user?.email} to place orders.</p>
                  <div className="flex gap-2"><Button size="sm" variant="outline" onClick={async () => { await resendVerification(); toast.success('Verification email sent'); }}>Resend email</Button><Button size="sm" onClick={async () => { await refreshUser(); toast.info('Status refreshed'); }}>I have verified</Button></div></div>)}
            </div>
            <div className="rounded-2xl border border-border p-4 text-sm"><p className="font-semibold">Password</p><p className="mb-3 mt-1 text-muted">We will email you a secure link to set a new password.</p><Button size="sm" variant="outline" onClick={async () => { if (user?.email) {
            await resetPassword(user.email);
            toast.success('Reset link sent');
        } }}>Send reset link</Button></div>
          </div>)}
      </div>
    </div>);
}
