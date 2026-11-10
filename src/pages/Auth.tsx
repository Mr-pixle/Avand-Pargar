import { useState } from 'react'
import { CheckCircle2, LogIn, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getRemote, useStore } from '@/lib/store'
import { api, ApiError, SERVER_MODE } from '@/lib/remote'
import { Logo, Segmented } from '@/components/common'
import { USERNAME_RE } from '@/components/Profile'
import { ThemeToggle } from '@/components/TopBar'


/** Server-authenticated sign in and registration. */
export function Auth() {
  const { state, dispatch } = useStore()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [login, setLogin] = useState({ username: '', password: '' })
  const [err, setErr] = useState('')
  const [reg, setReg] = useState({ name: '', username: '', password: '', again: '' })
  const [regErr, setRegErr] = useState('')
  const [done, setDone] = useState<string | null>(null)

  const [busy, setBusy] = useState(false)
  const doLogin = (username: string, password: string) => {
    if (SERVER_MODE) {
      // the server checks the password (scrypt hash) and opens an HttpOnly session
      setBusy(true)
      getRemote().login(username.trim().toLowerCase(), password)
        .then(() => { setErr(''); toast.success('خوش آمدید') })
        .catch((e) => setErr(e instanceof ApiError ? e.message : 'اتصال به سرور برقرار نشد.'))
        .finally(() => setBusy(false))
      return
    }
    const u = state.users.find((x) => x.username === username.trim().toLowerCase())
    if (!u || u.password !== password) { setErr('نام کاربری یا رمز عبور درست نیست.'); return }
    if (u.status === 'pending') { setErr('حساب شما ساخته شده ولی هنوز تأیید نشده است. پس از تأیید مدیر یا کنترل پروژه می‌توانید وارد شوید.'); return }
    if (u.status === 'rejected') { setErr('درخواست عضویت شما رد شده است. با مدیر یا کنترل پروژه تماس بگیرید.'); return }
    if (u.status === 'disabled') { setErr('این حساب غیرفعال شده است.'); return }
    setErr('')
    dispatch({ type: 'login', id: u.id })
    toast.success(`خوش آمدید، ${u.name}`)
  }
  const doRegister = () => {
    const username = reg.username.trim().toLowerCase()
    if (!reg.name.trim()) return setRegErr('نام کامل را وارد کنید.')
    if (!USERNAME_RE.test(username)) return setRegErr('نام کاربری باید ۳ تا ۲۴ نویسه از حروف انگلیسی کوچک، عدد، نقطه، خط تیره یا زیرخط باشد؛ مثل s.ahmadi')
    if (state.users.some((x) => x.username === username)) return setRegErr(`نام کاربری ${username} قبلاً گرفته شده است.`)
    if (reg.password.length < 6) return setRegErr('رمز عبور باید دست‌کم ۶ نویسه باشد.')
    if (reg.password !== reg.again) return setRegErr('تکرار رمز عبور با خودش یکی نیست.')
    setRegErr('')
    if (SERVER_MODE) {
      setBusy(true)
      api('/api/auth/register', { name: reg.name.trim(), username, password: reg.password })
        .then(() => { setDone(username); setReg({ name: '', username: '', password: '', again: '' }) })
        .catch((e) => setRegErr(e instanceof ApiError ? e.message : 'اتصال به سرور برقرار نشد.'))
        .finally(() => setBusy(false))
      return
    }
    dispatch({ type: 'register', user: { id: `u-new-${Date.now().toString(36)}`, name: reg.name.trim(), username, password: reg.password, teamId: '', role: 'member', capacity: 8, status: 'pending', createdAt: new Date().toISOString() } })
    setDone(username)
    setReg({ name: '', username: '', password: '', again: '' })
  }

  return (<div className="min-h-screen flex items-center justify-center p-5"><main className="w-full max-w-[460px]">
        <div className="glass-card glass-login w-full max-w-[460px] rounded-[24px] p-5 sm:p-8">
          <div className="mb-6 flex justify-center"><Logo className="h-20 w-20" /></div>
          <div className="flex items-center justify-between gap-2">
            <Segmented value={mode} onChange={(v) => { setMode(v); setErr(''); setRegErr(''); setDone(null) }} options={[
              { value: 'login', label: 'ورود', icon: <LogIn className="h-3.5 w-3.5" /> },
              { value: 'register', label: 'ایجاد حساب', icon: <UserPlus className="h-3.5 w-3.5" /> },
            ]} />
            <ThemeToggle />
          </div>

          {mode === 'login' ? (
            <form className="mt-5 flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); doLogin(login.username, login.password) }}>
              <h2 className="text-[20px] font-bold">ورود به سامانه</h2>
              <div><Label htmlFor="li-user" className="eyebrow">نام کاربری (ID)</Label><Input id="li-user" dir="ltr" autoComplete="username" aria-invalid={!!err} className="mono mt-1 h-10" value={login.username} onChange={(e) => setLogin({ ...login, username: e.target.value })} placeholder="n.rahimi" /></div>
              <div><Label htmlFor="li-pass" className="eyebrow">رمز عبور</Label><Input id="li-pass" type="password" autoComplete="current-password" aria-invalid={!!err} className="mt-1 h-10" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} /></div>
              {err && <div role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-[12.5px] text-destructive">{err}</div>}
              <Button type="submit" className="h-10" disabled={busy} aria-busy={busy}>ورود</Button>
              <p className="text-[12px] text-muted-foreground">حساب ندارید؟ <button type="button" className="text-azure hover:underline" onClick={() => setMode('register')}>ایجاد حساب</button> — بدون نیاز به ایمیل، با تأیید مدیر یا کنترل پروژه.</p>
            </form>
          ) : done ? (
            <div className="mt-5 rounded-xl border bg-background/45 p-5">
              <CheckCircle2 className="h-7 w-7 text-leaf" />
              <h2 className="mt-2 text-[18px] font-bold">درخواست شما ثبت شد</h2>
              <p className="mt-1 text-[13px] leading-6 text-muted-foreground">حساب <bdi className="mono text-foreground">@{done}</bdi> ساخته شد و در انتظار تأیید است. بعد از اینکه مدیر یا کنترل پروژه تیم و نقش شما را تعیین و تأیید کند، می‌توانید وارد شوید.</p>
              <p className="mt-3 text-[12px] text-muted-foreground">مدیرعامل یا کنترل پروژه می‌تواند درخواست را از «مدیریت › کاربران و درخواست‌ها» تأیید کند.</p>
              <Button variant="outline" className="mt-4" onClick={() => { setMode('login'); setDone(null); setLogin({ username: done, password: '' }) }}>بازگشت به ورود</Button>
            </div>
          ) : (
            <form className="mt-5 flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); doRegister() }}>
              <h2 className="text-[20px] font-bold">ایجاد حساب کاربری</h2>
              <div><Label htmlFor="rg-name" className="eyebrow">نام کامل (Full Name)</Label><Input id="rg-name" autoComplete="name" className="mt-1 h-10" value={reg.name} onChange={(e) => setReg({ ...reg, name: e.target.value })} placeholder="مثلاً: سپیده احمدی" /></div>
              <div><Label htmlFor="rg-user" className="eyebrow">نام کاربری (Username)</Label><Input id="rg-user" dir="ltr" autoComplete="username" className="mono mt-1 h-10" value={reg.username} onChange={(e) => setReg({ ...reg, username: e.target.value })} placeholder="s.ahmadi" /><p className="mt-1 text-[11.5px] text-muted-foreground">همین ID برای تگ کردن شما با @ در کامنت‌ها و چت استفاده می‌شود.</p></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label htmlFor="rg-pass" className="eyebrow">رمز عبور</Label><Input id="rg-pass" type="password" autoComplete="new-password" className="mt-1 h-10" value={reg.password} onChange={(e) => setReg({ ...reg, password: e.target.value })} /></div>
                <div><Label htmlFor="rg-again" className="eyebrow">تکرار رمز</Label><Input id="rg-again" type="password" autoComplete="new-password" className="mt-1 h-10" value={reg.again} onChange={(e) => setReg({ ...reg, again: e.target.value })} /></div>
              </div>
              {regErr && <div role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-[12.5px] text-destructive">{regErr}</div>}
              <Button type="submit" className="h-10" disabled={busy} aria-busy={busy}>ارسال درخواست عضویت</Button>
              <p className="text-[12px] text-muted-foreground">ایمیل لازم نیست. دسترسی بعد از تأیید مدیر یا کنترل پروژه فعال می‌شود.</p>
            </form>
          )}

          
          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">{SERVER_MODE
            ? 'رمزها فقط به‌صورت هش (scrypt) روی سرور نگه داشته می‌شوند و نشست شما در کوکی HttpOnly است.'
            : 'نسخه‌ی نمایشی: حساب‌ها و رمزها فقط در حافظه‌ی همین صفحه نگه داشته می‌شوند. در نسخه‌ی سروری، رمزها روی سرور با scrypt هش می‌شوند.'}</p>
        </div>
      </main>
    </div>
  )
}
