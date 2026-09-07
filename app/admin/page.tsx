'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Archive,
  Banknote,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Download,
  FileSignature,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ShoppingBag,
  PanelLeftClose,
  Search,
  Settings,
  Users,
  UserCog,
  X,
  Bell,
  CheckCircle2,
  Clock3,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Tags,
} from 'lucide-react';
import './admin.css';
import { defaultSiteContent } from '@/lib/site-content';
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
type View =
  | 'dashboard'
  | 'appointments'
  | 'services'
  | 'contracts'
  | 'operations'
  | 'users'
  | 'products'
  | 'categories'
  | 'content'
  | 'settings';
const nav = [
  ['dashboard', 'Genel Bakış', LayoutDashboard],
  ['appointments', 'Randevular', CalendarDays],
  ['services', 'Hizmetler', Clock3],
  ['contracts', 'Sözleşmeler', FileSignature],
  ['operations', 'Kiralama & Satış', ShoppingBag],
  ['users', 'Kullanıcılar', UserCog],
  ['products', 'Ürünler', Package],
  ['categories', 'Kategoriler', Tags],
  ['content', 'İçerik', ClipboardList],
  ['settings', 'Ayarlar', Settings],
] as const;
const allowed: Record<string, View[]> = {
  super_admin: [
    'dashboard',
    'appointments',
    'services',
    'contracts',
    'operations',
    'users',
    'products',
    'categories',
    'content',
    'settings',
  ],
  content_manager: ['dashboard', 'content'],
  product_manager: ['dashboard', 'products', 'categories', 'operations'],
  appointment_staff: [
    'dashboard',
    'appointments',
    'services',
    'contracts',
    'operations',
  ],
};
export default function Admin() {
  const loadVersion = useRef(0);
  const [view, setView] = useState<View>('dashboard'),
    [data, setData] = useState<any>(null),
    [role, setRole] = useState(''),
    [loading, setLoading] = useState(true),
    [menu, setMenu] = useState(false),
    [query, setQuery] = useState(''),
    [notice, setNotice] = useState(''),
    [notificationOpen, setNotificationOpen] = useState(false),
    [notifications, setNotifications] = useState<any[]>([]);
  const loadNotifications = async (markRead = false) => {
    const {
      data: { session },
    } = await sb.auth.getSession();
    if (!session) return;
    const response = await fetch('/api/admin?view=notifications', {
      headers: { 'x-supabase-token': session.access_token },
    });
    const result = await response.json();
    if (response.ok) setNotifications(result.items || []);
    if (markRead && (result.items || []).some((item: any) => !item.read_at)) {
      await fetch('/api/admin', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'x-supabase-token': session.access_token,
        },
        body: JSON.stringify({ area: 'notifications' }),
      });
      setNotifications((items) =>
        items.map((item) => ({
          ...item,
          read_at: item.read_at || new Date().toISOString(),
        })),
      );
    }
  };
  const load = async (v = view) => {
    const requestVersion = ++loadVersion.current;
    setLoading(true);
    const {
      data: { session },
    } = await sb.auth.getSession();
    if (!session) {
      location.href = '/admin/giris';
      return;
    }
    const r = await fetch(`/api/admin?view=${v}`, {
      headers: { 'x-supabase-token': session.access_token },
    });
    const d = await r.json();
    if (requestVersion !== loadVersion.current) return;
    if (r.status === 401) {
      await sb.auth.signOut();
      location.href = '/admin/giris';
      return;
    }
    if (r.status === 403) {
      setNotice(d.error || 'Bu panel için yetkiniz yok.');
      setLoading(false);
      return;
    }
    setData(d);
    setRole(d.role || role);
    setLoading(false);
  };
  useEffect(() => {
    load();
    loadNotifications();
    const channel = sb
      .channel('admin-appointments')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'appointments' },
        () => {
          setNotice('Yeni bir randevu alındı');
          loadNotifications();
          load(view);
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [view]);
  const logout = async () => {
    await sb.auth.signOut();
    location.href = '/admin/giris';
  };
  const update = async (area: string, id: string, patch: any) => {
    const {
      data: { session },
    } = await sb.auth.getSession();
    const r = await fetch('/api/admin', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-supabase-token': session?.access_token || '',
      },
      body: JSON.stringify({ area, id, patch }),
    });
    const d = await r.json();
    setNotice(r.ok ? 'Değişiklik kaydedildi' : d.error || 'İşlem başarısız');
    load();
  };
  const visibleNav = nav.filter((n) => !role || allowed[role]?.includes(n[0]));
  return (
    <main className="admin-shell">
      <aside className={menu ? 'open' : ''}>
        <div className="admin-logo">
          <img src="/logo.png" />
          <span>
            <b>HONEY</b>
            <small>ADMIN</small>
          </span>
          <button onClick={() => setMenu(false)}>
            <X />
          </button>
        </div>
        <nav>
          {visibleNav.map(([id, label, Icon]) => (
            <button
              key={id}
              className={view === id ? 'active' : ''}
              onClick={() => {
                setLoading(true);
                setData(null);
                setView(id);
                setMenu(false);
              }}
            >
              <Icon />
              {label}
              <ChevronRight />
            </button>
          ))}
        </nav>
        <div className="admin-user">
          <span>HC</span>
          <div>
            <b>Honey Yönetici</b>
            <small>{role.replace('_', ' ') || 'Yükleniyor'}</small>
          </div>
          <button onClick={logout} aria-label="Çıkış">
            <LogOut />
          </button>
        </div>
      </aside>
      <section className="admin-main">
        <header>
          <button className="admin-menu" onClick={() => setMenu(true)}>
            <Menu />
          </button>
          <div>
            <p className="admin-kicker">HONEY COLLECTION</p>
            <h1>{nav.find((n) => n[0] === view)?.[1]}</h1>
          </div>
          <div className="admin-tools">
            <label>
              <Search />
              <input
                placeholder="Ara..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <button
              aria-label="Bildirimler"
              aria-expanded={notificationOpen}
              onClick={() => {
                const next = !notificationOpen;
                setNotificationOpen(next);
                if (next) loadNotifications(true);
              }}
            >
              <Bell />
              {notifications.some((item) => !item.read_at) && <i />}
            </button>
            {notificationOpen && (
              <div className="notification-panel">
                <header>
                  <b>Bildirimler</b>
                  <small>{notifications.length} bildirim</small>
                </header>
                <div>
                  {!notifications.length && <p>Henüz bildirim yok.</p>}
                  {notifications.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setNotificationOpen(false);
                        if (item.kind === 'appointment')
                          setView('appointments');
                      }}
                    >
                      <span className={!item.read_at ? 'unread' : ''}>
                        <Bell />
                      </span>
                      <span>
                        <b>{item.title}</b>
                        <small>{item.body || 'Yeni kayıt'}</small>
                        <time>
                          {new Date(item.created_at).toLocaleString('tr-TR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </time>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>
        {loading ? (
          <div className="admin-loading">
            <RefreshCw /> Veriler hazırlanıyor…
          </div>
        ) : (
          <>
            {view === 'dashboard' && <Dashboard data={data} />}{' '}
            {view === 'appointments' && (
              <Appointments
                data={data || { items: [], categories: [] }}
                query={query}
                update={update}
                reload={() => load('appointments')}
                notify={setNotice}
              />
            )}{' '}
            {view === 'services' && (
              <ServicesPage
                data={data}
                reload={() => load('services')}
                notify={setNotice}
              />
            )}{' '}
            {view === 'contracts' && <Contracts data={data} query={query} reload={() => load('contracts')} notify={setNotice} />}{' '}
            {view === 'operations' && (
              <RentalSales
                data={data}
                query={query}
                reload={() => load('operations')}
                notify={setNotice}
              />
            )}{' '}
            {view === 'users' && (
              <AdminUsers
                data={data}
                reload={() => load('users')}
                notify={setNotice}
              />
            )}{' '}
            {view === 'products' && (
              <Products
                data={data}
                query={query}
                update={update}
                reload={() => load()}
                notify={setNotice}
              />
            )}{' '}
            {view === 'categories' && (
              <CategoriesPage
                data={data}
                reload={() => load()}
                notify={setNotice}
              />
            )}{' '}
            {view === 'content' && <Content data={data} />}{' '}
            {view === 'settings' && <AdminSettings data={data} />}
          </>
        )}
        {notice && (
          <button className="admin-toast" onClick={() => setNotice('')}>
            <CheckCircle2 />
            {notice}
            <X />
          </button>
        )}
      </section>
    </main>
  );
}
function Dashboard({ data }: { data: any }) {
  const a = data.appointments || [],
    today = data.today;
  const localDate = (value: string) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(value));
  const todayA = a.filter(
    (x: any) =>
      localDate(x.starts_at) === today &&
      !['cancelled', 'no_show'].includes(x.status),
  );
  const metrics = data.metrics || {};
  return (
    <div className="dashboard">
      <div className="metric-grid">
        {[
          [metrics.today || 0, 'Bugünkü randevu', 'Bugün', CalendarDays],
          [metrics.upcoming || 0, 'Yaklaşan', 'Planlandı', Clock3],
          [metrics.new || 0, 'Yeni randevu', 'İşlem bekliyor', Bell],
          [metrics.completed || 0, 'Tamamlanan', `${metrics.cancelled || 0} iptal`, CheckCircle2],
          [metrics.rentedToday || 0, 'Bugün kirada', 'Aktif elbise', ShoppingBag],
          [metrics.returnsToday || 0, 'Bugün iade', 'Teslim alınacak', Archive],
        ].map(([v, l, s, I]: any) => (
          <article key={String(l)}>
            <div>
              <p>{l}</p>
              <strong>{v}</strong>
              <small>{s}</small>
            </div>
            <I />
          </article>
        ))}
      </div>
      <div className="dash-grid">
        <article className="occupancy">
          <p className="admin-kicker">DOLULUK ORANI</p>
          <div
            className="ring"
            style={
              {
                '--p': `${Math.min(100, Math.round((todayA.length / 6) * 100))}%`,
              } as any
            }
          >
            <strong>
              {Math.min(100, Math.round((todayA.length / 6) * 100))}%
            </strong>
          </div>
          <p>Bugünkü 6 randevu kapasitesine göre</p>
        </article>
      </div>
      <div className="dash-grid lower">
        <article className="table-card">
          <div className="card-head">
            <div>
              <p className="admin-kicker">BUGÜN</p>
              <h2>Randevu akışı</h2>
            </div>
          </div>
          <AppointmentRows items={todayA.slice(0, 5)} />
        </article>
      </div>
    </div>
  );
}
function AppointmentRows({
  items,
  update,
  remove,
}: {
  items: any[];
  update?: (a: string, id: string, p: any) => void;
  remove?: (item: any) => void;
}) {
  return (
    <div className="admin-table">
      {!items.length && <div className="empty">Henüz randevu yok.</div>}
      {items.map((x) => (
        <div className="appointment-row" key={x.id}>
          <time>
            {new Date(x.starts_at).toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </time>
          <span>
            <b>
              {x.customers?.first_name} {x.customers?.last_name}
            </b>
            <small>
              {x.services?.name} ·{' '}
              {new Date(x.starts_at).toLocaleDateString('tr-TR')}
            </small>
          </span>
          <em className={`status ${x.status}`}>{x.status}</em>
          {update && (
            <select
              value={x.status}
              onChange={(e) =>
                update('appointments', x.id, { status: e.target.value })
              }
            >
              <option value="new">Yeni</option>
              <option value="confirmed">Onaylandı</option>
              <option value="contacted">İletişime geçildi</option>
              <option value="arrived">Geldi</option>
              <option value="completed">Tamamlandı</option>
              <option value="cancelled">İptal</option>
              <option value="no_show">Gelmedi</option>
            </select>
          )}
          {remove && (
            <button type="button" className="outline" onClick={() => remove(x)}>
              Sil
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
function Appointments({
  data,
  query,
  update,
  reload,
  notify,
}: {
  data: any;
  query: string;
  update: any;
  reload: () => void;
  notify: (message: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState('');
  const [service, setService] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth()}`;
  });
  const allItems = Array.isArray(data?.items) ? data.items : [];
  const services = Array.isArray(data?.services) ? data.services : [];
  const items = allItems.filter(
    (x: any) =>
      `${x.customers?.first_name} ${x.customers?.last_name} ${x.services?.name}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (!status || x.status === status) &&
      (!service || x.service_id === service),
  );
  const monthlyItems = items.filter((item: any) => {
    const date = new Date(item.starts_at);
    return `${date.getFullYear()}-${date.getMonth()}` === calendarMonth;
  });
  const downloadCsv = () => {
    const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = [
      ['Ad Soyad', 'Telefon', 'E-posta', 'Hizmet', 'Tarih', 'Saat', 'Durum'],
      ...items.map((item: any) => {
        const startsAt = new Date(item.starts_at);
        return [
          `${item.customers?.first_name || ''} ${item.customers?.last_name || ''}`.trim(),
          item.customers?.phone || '',
          item.customers?.email || '',
          item.services?.name || '',
          startsAt.toLocaleDateString('tr-TR'),
          startsAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          item.status,
        ];
      }),
    ];
    const blob = new Blob([`\uFEFF${rows.map((row) => row.map(escape).join(';')).join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `randevular-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const removeAppointment = async (item: any) => {
    const customer = `${item.customers?.first_name || ''} ${item.customers?.last_name || ''}`.trim();
    if (!confirm(`${customer || 'Bu müşteriye ait'} randevu listeden silinsin mi?`)) return;
    const { data: { session } } = await sb.auth.getSession();
    const response = await fetch(`/api/admin?area=appointment&id=${encodeURIComponent(item.id)}`, {
      method: 'DELETE',
      headers: { 'x-supabase-token': session?.access_token || '' },
    });
    const result = await response.json();
    if (!response.ok) return notify(result.error || 'Randevu silinemedi.');
    notify('Randevu listeden silindi.');
    reload();
  };
  return (
    <div className="manager-page">
      <div className="toolbar">
        <div>
          <p className="admin-kicker">AYLIK GÖRÜNÜM</p>
          <h2>Randevu takvimi</h2>
        </div>
        <div>
          <button className="outline" onClick={downloadCsv}>
            <Download /> CSV
          </button>
          <button className="primary" onClick={() => setCreating(true)}>
            <Plus /> Randevu oluştur
          </button>
        </div>
      </div>
      <div className="filter-row">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tüm durumlar</option>
          <option value="new">Yeni</option>
          <option value="confirmed">Onaylandı</option>
          <option value="contacted">İletişime geçildi</option>
          <option value="arrived">Geldi</option>
          <option value="completed">Tamamlandı</option>
          <option value="cancelled">İptal</option>
          <option value="no_show">Gelmedi</option>
        </select>
        <select value={service} onChange={(e) => setService(e.target.value)}>
          <option value="">Tüm hizmetler</option>
          {services.map((x: any) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </div>
      <CalendarView items={items} onMonthChange={setCalendarMonth} />
      <article className="table-card appointment-list-card">
        <div className="card-head">
          <div>
            <p className="admin-kicker">LİSTE GÖRÜNÜMÜ</p>
            <h2>Randevu listesi</h2>
          </div>
          <small>{monthlyItems.length} randevu</small>
        </div>
        <AppointmentRows
          items={[...monthlyItems].sort(
            (a: any, b: any) =>
              new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
          )}
          update={update}
          remove={removeAppointment}
        />
      </article>
      {creating && (
        <AppointmentCreateForm
          services={Array.isArray(data?.services) ? data.services : []}
          close={() => setCreating(false)}
          reload={reload}
          notify={notify}
        />
      )}
    </div>
  );
}

function ServicesPage({
  data,
  reload,
  notify,
}: {
  data: any;
  reload: () => void;
  notify: (message: string) => void;
}) {
  const items = Array.isArray(data?.items) ? data.items : [];
  const [name, setName] = useState('');
  const [hours, setHours] = useState('');
  const [saving, setSaving] = useState(false);
  const [appointmentTimes, setAppointmentTimes] = useState<string[]>(
    Array.isArray(data?.appointmentTimes) ? data.appointmentTimes : [],
  );
  const [newTime, setNewTime] = useState('');
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const {
      data: { session },
    } = await sb.auth.getSession();
    const response = await fetch('/api/admin', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-supabase-token': session?.access_token || '',
      },
      body: JSON.stringify({ action: 'create_service', name, hours }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) return notify(result.error || 'Hizmet kaydedilemedi.');
    setName('');
    setHours('');
    notify('Hizmet eklendi');
    reload();
  };
  const saveTimes = async (times: string[]) => {
    setSaving(true);
    const {
      data: { session },
    } = await sb.auth.getSession();
    const response = await fetch('/api/admin', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-supabase-token': session?.access_token || '',
      },
      body: JSON.stringify({ area: 'appointment_settings', times }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok)
      return notify(result.error || 'Randevu saatleri kaydedilemedi.');
    setAppointmentTimes(times);
    notify('Randevu saatleri yayınlandı.');
  };
  const addTime = () => {
    if (!newTime || appointmentTimes.includes(newTime)) return;
    const next = [...appointmentTimes, newTime].sort();
    setNewTime('');
    saveTimes(next);
  };
  const removeTime = (time: string) => {
    if (appointmentTimes.length === 1)
      return notify('En az bir randevu saati kalmalıdır.');
    saveTimes(appointmentTimes.filter((item) => item !== time));
  };
  const changeService = async (action: 'update_service' | 'delete_service', item: any) => {
    const nextName = action === 'update_service' ? prompt('Hizmet adı', item.name) : item.name;
    if (action === 'update_service' && !nextName?.trim()) return;
    const nextMinutes = action === 'update_service'
      ? Number(prompt('Hizmet süresi (dakika)', String(item.duration_minutes)))
      : item.duration_minutes;
    if (action === 'update_service' && (!Number.isFinite(nextMinutes) || nextMinutes < 15))
      return notify('Süre en az 15 dakika olmalıdır.');
    if (action === 'delete_service' && !confirm(`${item.name} hizmeti silinsin mi?`)) return;
    const { data: { session } } = await sb.auth.getSession();
    const response = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-supabase-token': session?.access_token || '' },
      body: JSON.stringify({ action, id: item.id, name: nextName, duration_minutes: nextMinutes }),
    });
    const result = await response.json();
    if (!response.ok) return notify(result.error || 'Hizmet güncellenemedi.');
    notify(action === 'delete_service' ? 'Hizmet silindi.' : 'Hizmet güncellendi.');
    reload();
  };
  return (
    <div className="services-page">
      <ScheduleAdmin
        initialHours={data?.workingHours || []}
        initialClosedDates={data?.closedDates || []}
        notify={notify}
      />
      <section className="appointment-time-card">
        <div>
          <p className="admin-kicker">RANDEVU AYARLARI</p>
          <h2>Randevu saatleri</h2>
          <small>
            Eklediğiniz saatler müşterilerin randevu formunda anında görünür.
          </small>
        </div>
        <div className="appointment-time-add">
          <input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
          />
          <button
            type="button"
            className="primary"
            disabled={!newTime || saving}
            onClick={addTime}
          >
            <Plus /> Saat ekle
          </button>
        </div>
        <div className="appointment-time-list">
          {appointmentTimes.map((time) => (
            <span key={time}>
              {time}
              <button
                type="button"
                disabled={saving}
                onClick={() => removeTime(time)}
                aria-label={`${time} saatini kaldır`}
              >
                <X />
              </button>
            </span>
          ))}
        </div>
      </section>
      <form className="service-create-card" onSubmit={save}>
        <div>
          <p className="admin-kicker">YENİ HİZMET</p>
          <h2>Hizmet ekle</h2>
          <small>Süreyi boş bırakırsanız sistem 1 saat olarak kaydeder.</small>
        </div>
        <label>
          Hizmet adı
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Örn. Abiye provası"
          />
        </label>
        <label>
          Süre (saat) — isteğe bağlı
          <input
            type="number"
            min="0.25"
            max="8"
            step="0.25"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="1"
          />
        </label>
        <button className="primary" disabled={saving}>
          {saving ? 'Ekleniyor…' : 'Hizmet ekle'}
        </button>
      </form>
      <article className="table-card service-list">
        <div className="card-head">
          <h2>Hizmetler</h2>
          <small>{items.length} hizmet</small>
        </div>
        {!items.length && <div className="empty">Henüz hizmet eklenmedi.</div>}
        {items.map((item: any) => (
          <div className="service-row" key={item.id}>
            <span>
              <b>{item.name}</b>
              <small>{item.duration_minutes / 60} saat</small>
            </span>
            <em className={`status ${item.active ? 'completed' : 'cancelled'}`}>
              {item.active ? 'Aktif' : 'Pasif'}
            </em>
            <div className="admin-actions">
              <button type="button" className="edit-button" onClick={() => changeService('update_service', item)}>Düzenle</button>
              <button type="button" className="delete-button" onClick={() => changeService('delete_service', item)}>Sil</button>
            </div>
          </div>
        ))}
      </article>
    </div>
  );
}

function ScheduleAdmin({
  initialHours,
  initialClosedDates,
  notify,
}: {
  initialHours: any[];
  initialClosedDates: string[];
  notify: (message: string) => void;
}) {
  const names = [
    'Pazar',
    'Pazartesi',
    'Salı',
    'Çarşamba',
    'Perşembe',
    'Cuma',
    'Cumartesi',
  ];
  const [days, setDays] = useState(() =>
    names.map((name, weekday) => {
      const saved = initialHours.find((item: any) => item.weekday === weekday);
      return {
        name,
        weekday,
        active: !!saved,
        opensAt: String(saved?.opens_at || '10:00').slice(0, 5),
        closesAt: String(saved?.closes_at || '19:00').slice(0, 5),
      };
    }),
  );
  const [closedDates, setClosedDates] = useState<string[]>(initialClosedDates),
    [newDate, setNewDate] = useState(''),
    [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const {
      data: { session },
    } = await sb.auth.getSession();
    const response = await fetch('/api/admin', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-supabase-token': session?.access_token || '',
      },
      body: JSON.stringify({
        area: 'appointment_schedule',
        days: days.filter((day) => day.active),
        closedDates,
      }),
    });
    const result = await response.json();
    setSaving(false);
    notify(
      response.ok
        ? 'Çalışma takvimi yayınlandı.'
        : result.error || 'Takvim kaydedilemedi.',
    );
  };
  return (
    <section className="schedule-card">
      <header>
        <div>
          <p className="admin-kicker">ÇALIŞMA TAKVİMİ</p>
          <h2>Açık ve kapalı günler</h2>
          <small>Kapalı günlerde müşteriler randevu oluşturamaz.</small>
        </div>
        <button className="primary" disabled={saving} onClick={save}>
          {saving ? 'Kaydediliyor…' : 'Takvimi kaydet'}
        </button>
      </header>
      <div className="schedule-days">
        {days.map((day, index) => (
          <label key={day.weekday}>
            <span>
              <input
                type="checkbox"
                checked={day.active}
                onChange={(event) =>
                  setDays((current) =>
                    current.map((item, i) =>
                      i === index
                        ? { ...item, active: event.target.checked }
                        : item,
                    ),
                  )
                }
              />
              <b>{day.name}</b>
            </span>
            {day.active ? (
              <span>
                <input
                  type="time"
                  value={day.opensAt}
                  onChange={(event) =>
                    setDays((current) =>
                      current.map((item, i) =>
                        i === index
                          ? { ...item, opensAt: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
                <em>–</em>
                <input
                  type="time"
                  value={day.closesAt}
                  onChange={(event) =>
                    setDays((current) =>
                      current.map((item, i) =>
                        i === index
                          ? { ...item, closesAt: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </span>
            ) : (
              <small>Kapalı</small>
            )}
          </label>
        ))}
      </div>
      <div className="closed-date-admin">
        <div>
          <b>Özel kapalı tarihler</b>
          <small>Tatil, bakım veya özel durumlar için tam gün kapatın.</small>
        </div>
        <span>
          <input
            type="date"
            min={new Date().toISOString().slice(0, 10)}
            value={newDate}
            onChange={(event) => setNewDate(event.target.value)}
          />
          <button
            className="outline"
            type="button"
            onClick={() => {
              if (newDate && !closedDates.includes(newDate)) {
                setClosedDates([...closedDates, newDate].sort());
                setNewDate('');
              }
            }}
          >
            Tarih ekle
          </button>
        </span>
        <div>
          {closedDates.map((date) => (
            <span key={date}>
              {new Date(`${date}T12:00:00`).toLocaleDateString('tr-TR')}
              <button
                onClick={() =>
                  setClosedDates(closedDates.filter((item) => item !== date))
                }
                aria-label={`${date} tarihini aç`}
              >
                <X />
              </button>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function AppointmentCreateForm({
  services,
  close,
  reload,
  notify,
}: {
  services: any[];
  close: () => void;
  reload: () => void;
  notify: (message: string) => void;
}) {
  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Europe/Istanbul',
  });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    service_id: services[0]?.id || '',
    date: today,
    time: '12:00',
    notes: '',
  });
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const {
      data: { session },
    } = await sb.auth.getSession();
    const response = await fetch('/api/admin', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-supabase-token': session?.access_token || '',
      },
      body: JSON.stringify({ action: 'create_appointment', record: form }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) {
      notify(result.error || 'Randevu oluşturulamadı.');
      return;
    }
    notify(`Randevu oluşturuldu: ${result.data?.appointment_code || ''}`);
    close();
    reload();
  };
  return (
    <div
      className="operation-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="appointment-create-title"
    >
      <form onSubmit={submit}>
        <header>
          <div>
            <p className="admin-kicker">YENİ RANDEVU</p>
            <h2 id="appointment-create-title">Randevu oluştur</h2>
          </div>
          <button type="button" onClick={close} aria-label="Kapat">
            <X />
          </button>
        </header>
        <div className="operation-fields">
          <label>
            Ad
            <input
              required
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            />
          </label>
          <label>
            Soyad
            <input
              required
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            />
          </label>
          <label>
            Telefon
            <input
              required
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
          <label>
            E-posta
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="wide">
            Hizmet
            <select
              required
              value={form.service_id}
              onChange={(e) => setForm({ ...form, service_id: e.target.value })}
            >
              <option value="">Hizmet seçin</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} · {service.duration_minutes} dk.
                </option>
              ))}
            </select>
          </label>
          <label>
            Tarih
            <input
              required
              type="date"
              min={today}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </label>
          <label>
            Saat
            <input
              required
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
            />
          </label>
          <label className="wide">
            Not
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
        </div>
        <footer>
          <button type="button" className="outline" onClick={close}>
            Vazgeç
          </button>
          <button className="primary" disabled={saving || !services.length}>
            {saving ? 'Oluşturuluyor…' : 'Randevuyu oluştur'}
          </button>
        </footer>
      </form>
    </div>
  );
}
function Contracts({ data, query, reload, notify }: { data: any; query: string; reload: () => void; notify: (message: string) => void }) {
  const items = (Array.isArray(data?.items) ? data.items : []).filter(
    (x: any) =>
      `${x.contract_code} ${x.customer_name} ${x.product_name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const storedContract = (data?.content || []).find((item: any) => item.section === 'rentalContract')?.content?.text || defaultSiteContent.rentalContract.text;
  const [contractText, setContractText] = useState(storedContract);
  const saveContractText = async () => {
    const { data: { session } } = await sb.auth.getSession();
    const response = await fetch('/api/admin', { method: 'PATCH', headers: { 'content-type': 'application/json', 'x-supabase-token': session?.access_token || '' }, body: JSON.stringify({ area: 'content', section: 'rentalContract', content: { text: contractText } }) });
    const result = await response.json();
    notify(response.ok ? 'Sözleşme metni kaydedildi.' : result.error || 'Sözleşme metni kaydedilemedi.');
  };
  const removeContract = async (item: any) => {
    if (!confirm(`${item.contract_code} numaralı sözleşme silinsin mi?`)) return;
    const { data: { session } } = await sb.auth.getSession();
    const response = await fetch(`/api/admin?area=contract&id=${encodeURIComponent(item.id)}`, { method: 'DELETE', headers: { 'x-supabase-token': session?.access_token || '' } });
    const result = await response.json();
    if (!response.ok) return notify(result.error || 'Sözleşme silinemedi.');
    notify('Sözleşme silindi.');
    reload();
  };
  return (
    <div className="manager-page contracts-page">
      <div className="toolbar">
        <div>
          <p className="admin-kicker">İMZALI PDF BELGELER</p>
          <h2>Kiralama sözleşmeleri</h2>
        </div>
        <a className="primary" href="/kiralama-sozlesmesi" target="_blank">
          <Plus /> Yeni sözleşme
        </a>
      </div>
      <section className="cms-card contract-editor-card">
        <header><div><p className="admin-kicker">SÖZLEŞME İÇERİĞİ</p><h2>Kiralama sözleşmesi metni</h2></div><button className="primary" onClick={saveContractText}>Metni kaydet</button></header>
        <textarea value={contractText} onChange={(event) => setContractText(event.target.value)} rows={14} placeholder="Müşterinin okuyup imzalayacağı sözleşme metni" />
      </section>
      <article className="table-card contract-list-card">
        <div className="admin-table">
          {!items.length && (
            <div className="empty">Henüz imzalanmış sözleşme yok.</div>
          )}
          {items.map((x: any) => (
            <div className="contract-row" key={x.id}>
              <FileSignature />
              <span>
                <b>{x.customer_name}</b>
                <small>
                  {x.contract_code} · {x.product_name}
                </small>
              </span>
              <span>
                <b>
                  {new Date(x.rental_start).toLocaleDateString('tr-TR')} –{' '}
                  {new Date(x.rental_end).toLocaleDateString('tr-TR')}
                </b>
                <small>
                  {x.phone} · {x.email}
                </small>
              </span>
              <div className="contract-actions">
              {x.pdf_url ? (
                <a
                  className="outline"
                  href={x.pdf_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  PDF'i Görüntüle
                </a>
              ) : (
                <em>PDF hazırlanamadı</em>
              )}
              <em className="status completed">İmzalandı</em>
              <button type="button" className="delete-button" onClick={() => removeContract(x)}>Sil</button>
              </div>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
function RentalSales({
  data,
  query,
  reload,
  notify,
}: {
  data: any;
  query: string;
  reload: () => void;
  notify: (message: string) => void;
}) {
  const [tab, setTab] = useState<'calendar' | 'rentals' | 'sales'>('calendar');
  const [form, setForm] = useState<'rental' | 'sale' | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [editingRental, setEditingRental] = useState<any>(null);
  const [cursor, setCursor] = useState(() => new Date());
  const rentals = (data?.items?.rentals || []).filter((x: any) =>
    `${x.product_name} ${x.product_code} ${x.customer_name} ${x.phone}`
      .toLocaleLowerCase('tr-TR')
      .includes(query.toLocaleLowerCase('tr-TR')),
  );
  const sales = (data?.items?.sales || []).filter((x: any) =>
    `${x.product_name} ${x.product_code} ${x.customer_name} ${x.phone || ''}`
      .toLocaleLowerCase('tr-TR')
      .includes(query.toLocaleLowerCase('tr-TR')),
  );
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const last = new Date(
    cursor.getFullYear(),
    cursor.getMonth() + 1,
    0,
  ).getDate();
  const dayCount = Math.ceil((offset + last) / 7) * 7;
  const days = Array.from(
    { length: dayCount },
    (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i - offset + 1),
  );
  const key = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const updateRental = async (id: string, patch: any) => {
    const {
      data: { session },
    } = await sb.auth.getSession();
    const response = await fetch('/api/admin', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-supabase-token': session?.access_token || '',
      },
      body: JSON.stringify({ area: 'operations', id, patch }),
    });
    const result = await response.json();
    if (!response.ok) {
      notify(result.error || 'Kiralama güncellenemedi.');
      return false;
    }
    notify('Kiralama durumu güncellendi.');
    reload();
    return true;
  };
  const deleteRental = async (item: any) => {
    if (
      !confirm(
        `${item.product_name} için ${item.customer_name} adına oluşturulan kiralama kaydı kalıcı olarak silinsin mi?`,
      )
    )
      return false;
    const {
      data: { session },
    } = await sb.auth.getSession();
    const response = await fetch(
      `/api/admin?area=operation&id=${encodeURIComponent(item.id)}`,
      {
        method: 'DELETE',
        headers: { 'x-supabase-token': session?.access_token || '' },
      },
    );
    const result = await response.json();
    if (!response.ok) {
      notify(result.error || 'Kiralama kaydı silinemedi.');
      return false;
    }
    notify('Kiralama kaydı silindi.');
    reload();
    return true;
  };
  const deleteSale = async (item: any) => {
    if (!confirm(`${item.product_name} için oluşturulan satış kaydı silinsin mi? Ürün stoğa geri eklenecek.`))
      return;
    const {
      data: { session },
    } = await sb.auth.getSession();
    const response = await fetch(
      `/api/admin?area=operation&kind=sale&id=${encodeURIComponent(item.id)}`,
      {
        method: 'DELETE',
        headers: { 'x-supabase-token': session?.access_token || '' },
      },
    );
    const result = await response.json();
    if (!response.ok) return notify(result.error || 'Satış kaydı silinemedi.');
    notify('Satış kaydı silindi ve ürün stoğa geri eklendi.');
    reload();
  };
  return (
    <div className="manager-page operations-page">
      <div className="operations-summary">
        <article>
          <CalendarDays />
          <span>
            <strong>
              {rentals.filter((x: any) => x.status !== 'cancelled').length}
            </strong>
            <small>Kiralanmış ürün</small>
          </span>
        </article>
        <article>
          <Banknote />
          <span>
            <strong>{sales.length}</strong>
            <small>Satılmış ürün</small>
          </span>
        </article>
        <article>
          <Clock3 />
          <span>
            <strong>
              {
                rentals.filter(
                  (x: any) =>
                    x.start_date <= key(new Date()) &&
                    x.end_date >= key(new Date()) &&
                    x.status !== 'cancelled',
                ).length
              }
            </strong>
            <small>Bugün kirada</small>
          </span>
        </article>
      </div>
      <div className="toolbar operations-toolbar">
        <div className="segmented">
          {[
            ['calendar', 'Takvim'],
            ['rentals', 'Kiralanmış Ürünler'],
            ['sales', 'Satılmış Ürünler'],
          ].map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? 'active' : ''}
              onClick={() => setTab(id as any)}
            >
              {label}
            </button>
          ))}
        </div>
        <div>
          <button className="outline" onClick={() => setForm('sale')}>
            <Banknote /> Satış kaydet
          </button>
          <button className="primary" onClick={() => setForm('rental')}>
            <Plus /> Kiralama oluştur
          </button>
        </div>
      </div>
      {tab === 'calendar' && (
        <article className="calendar-view rental-calendar">
          <div className="calendar-title">
            <button
              onClick={() =>
                setCursor(
                  new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1),
                )
              }
            >
              ‹
            </button>
            <h2>
              {cursor.toLocaleDateString('tr-TR', {
                month: 'long',
                year: 'numeric',
              })}
            </h2>
            <button
              onClick={() =>
                setCursor(
                  new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1),
                )
              }
            >
              ›
            </button>
          </div>
          <div className="calendar-jump">
            <button onClick={() => setCursor(new Date())}>Bugün</button>
            <small>
              Bir kiralama, başlangıç ve bitiş arasındaki her günde görünür.
            </small>
          </div>
          <div className="calendar-weekdays">
            {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((x) => (
              <b key={x}>{x}</b>
            ))}
          </div>
          <div className="calendar-grid">
            {days.map((day) => {
              const date = key(day);
              const dayRentals = rentals.filter(
                (x: any) =>
                  x.status !== 'cancelled' &&
                  x.start_date <= date &&
                  x.end_date >= date,
              );
              return (
                <div
                  className={`day ${day.getMonth() !== cursor.getMonth() ? 'outside' : ''} ${date === key(new Date()) ? 'today' : ''} ${dayRentals.length ? 'has-rentals' : ''}`}
                  key={date}
                >
                  <b>{day.getDate()}</b>
                  {dayRentals.length > 0 && (
                    <button
                      className="day-rentals-button"
                      onClick={() => setSelectedDay(date)}
                      aria-label={`${day.toLocaleDateString('tr-TR')} tarihindeki ${dayRentals.length} kiralamayı göster`}
                    >
                      {dayRentals.slice(0, 3).map((x: any) => (
                        <span key={x.id}>
                          <strong>{x.product_name}</strong>
                          <small>
                            {x.color ? `${x.color} · ` : ''}
                            {x.customer_name}
                          </small>
                        </span>
                      ))}
                      {dayRentals.length > 3 && (
                        <em className="more-rentals">
                          +{dayRentals.length - 3} ürün daha
                        </em>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </article>
      )}
      {tab === 'rentals' && (
        <OperationList
          items={rentals}
          kind="rental"
          onEdit={setEditingRental}
        />
      )}
      {tab === 'sales' && <OperationList items={sales} kind="sale" onDelete={deleteSale} />}
      {form && (
        <OperationForm
          kind={form}
          products={data?.products || []}
          close={() => setForm(null)}
          done={() => {
            setForm(null);
            notify(
              form === 'rental'
                ? 'Kiralama oluşturuldu ve takvime eklendi.'
                : 'Satış kaydedildi.',
            );
            reload();
          }}
          notify={notify}
        />
      )}
      {selectedDay && (
        <RentalDayModal
          date={selectedDay}
          items={rentals.filter(
            (x: any) =>
              x.status !== 'cancelled' &&
              x.start_date <= selectedDay &&
              x.end_date >= selectedDay,
          )}
          close={() => setSelectedDay(null)}
          edit={(item) => {
            setSelectedDay(null);
            setEditingRental(item);
          }}
        />
      )}
      {editingRental && (
        <RentalEditForm
          item={editingRental}
          close={() => setEditingRental(null)}
          save={async (patch) => {
            if (await updateRental(editingRental.id, patch))
              setEditingRental(null);
          }}
          remove={async () => {
            if (await deleteRental(editingRental)) setEditingRental(null);
          }}
        />
      )}
    </div>
  );
}
const roleLabels: Record<string, string> = {
  super_admin: 'Süper Yönetici',
  product_manager: 'Ürün Sorumlusu',
  appointment_staff: 'Kiralama / Randevu',
  content_manager: 'İçerik Sorumlusu',
};
function AdminUsers({
  data,
  reload,
  notify,
}: {
  data: any;
  reload: () => void;
  notify: (message: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [inviteRole, setInviteRole] = useState('appointment_staff');
  const [busy, setBusy] = useState(false);
  const request = async (payload: any, method = 'PATCH') => {
    setBusy(true);
    const {
      data: { session },
    } = await sb.auth.getSession();
    const response = await fetch('/api/admin', {
      method,
      headers: {
        'content-type': 'application/json',
        'x-supabase-token': session?.access_token || '',
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      notify(result.error || 'İşlem tamamlanamadı.');
      return false;
    }
    reload();
    return true;
  };
  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    const ok = await request(
      { action: 'invite_admin', email, full_name: fullName, role: inviteRole },
      'POST',
    );
    if (ok) {
      notify('Davet e-postası gönderildi.');
      setEmail('');
      setFullName('');
    }
  };
  return (
    <div className="users-page">
      <section className="invite-user-card">
        <div>
          <p className="admin-kicker">YENİ YÖNETİCİ</p>
          <h2>E-posta ile davet et</h2>
          <span>Kullanıcı bağlantıdan kendi şifresini belirler.</span>
        </div>
        <form onSubmit={invite}>
          <label>
            Ad soyad
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Örn. Ayşe Yılmaz"
            />
          </label>
          <label>
            E-posta
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="personel@ornek.com"
            />
          </label>
          <label>
            Yetki
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
            >
              {Object.entries(roleLabels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button className="primary" disabled={busy}>
            <Plus /> {busy ? 'Gönderiliyor…' : 'Davet gönder'}
          </button>
        </form>
      </section>
      <section className="table-card admin-users-list">
        <div className="card-head">
          <div>
            <p className="admin-kicker">EKİP ERİŞİMİ</p>
            <h2>Admin kullanıcıları</h2>
          </div>
          <small>
            {(data?.items || []).filter((x: any) => x.active).length} aktif
            kullanıcı
          </small>
        </div>
        {(data?.items || []).map((item: any) => (
          <div className="admin-user-row" key={item.id}>
            <span className="user-avatar">
              {String(item.full_name || item.email || '?')
                .slice(0, 2)
                .toLocaleUpperCase('tr-TR')}
            </span>
            <span>
              <b>{item.full_name || 'İsim belirtilmedi'}</b>
              <small>{item.email}</small>
            </span>
            <span>
              <b>
                {item.last_sign_in_at
                  ? new Date(item.last_sign_in_at).toLocaleDateString('tr-TR')
                  : 'Henüz giriş yapmadı'}
              </b>
              <small>Son giriş</small>
            </span>
            {item.active ? (
              <select
                value={item.role}
                disabled={busy}
                onChange={async (e) => {
                  if (
                    await request({
                      area: 'users',
                      id: item.id,
                      role: e.target.value,
                    })
                  )
                    notify('Kullanıcı yetkisi güncellendi.');
                }}
              >
                {Object.entries(roleLabels).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            ) : (
              <em className="status archived">Erişimi yok</em>
            )}
            {item.active && (
              <button
                className="revoke-user"
                disabled={busy}
                onClick={async () => {
                  if (
                    !confirm(`${item.email} için admin erişimi kaldırılsın mı?`)
                  )
                    return;
                  if (
                    await request({
                      area: 'users',
                      id: item.id,
                      action: 'revoke',
                    })
                  )
                    notify('Kullanıcının admin erişimi kaldırıldı.');
                }}
              >
                Erişimi kaldır
              </button>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
function OperationList({
  items,
  kind,
  onEdit,
  onDelete,
}: {
  items: any[];
  kind: 'rental' | 'sale';
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
}) {
  return (
    <article className="table-card operation-list">
      {!items.length && (
        <div className="empty">
          Henüz {kind === 'rental' ? 'kiralama' : 'satış'} kaydı yok.
        </div>
      )}
      {items.map((x) => (
        <div className="operation-row" key={x.id}>
          <div className="operation-image">
            {x.product_image ? (
              <img src={x.product_image} alt="" />
            ) : (
              <Package />
            )}
          </div>
          <span>
            <b>{x.product_name}</b>
            <small>
              {x.product_code}
              {x.color ? ` · ${x.color}` : ''}
              {x.size ? ` · ${x.size} beden` : ''}
            </small>
          </span>
          <span>
            <b>{x.customer_name}</b>
            <small>{x.phone || 'Telefon belirtilmedi'}</small>
          </span>
          <span>
            <b>
              {new Date(
                `${kind === 'rental' ? x.start_date : x.sold_at}T12:00:00`,
              ).toLocaleDateString('tr-TR')}
            </b>
            <small>
              {kind === 'rental'
                ? `${new Date(`${x.end_date}T12:00:00`).toLocaleDateString('tr-TR')} tarihinde teslim`
                : 'Satış tarihi'}
            </small>
          </span>
          <div className="operation-actions">
            <em
              className={`status ${kind === 'sale' ? 'completed' : x.status || 'confirmed'}`}
            >
              {kind === 'sale'
                ? 'Satıldı'
                : rentalStatusLabels[x.status] || 'Rezerve'}
            </em>
            {kind === 'rental' && onEdit && (
              <button className="outline" onClick={() => onEdit(x)}>
                <MoreHorizontal /> Yönet
              </button>
            )}
            {kind === 'sale' && onDelete && (
              <button className="delete-button" onClick={() => onDelete(x)}>
                Sil
              </button>
            )}
          </div>
        </div>
      ))}
    </article>
  );
}
const rentalStatusLabels: Record<string, string> = {
  reserved: 'Rezerve',
  confirmed: 'Onaylandı',
  delivered: 'Teslim edildi',
  completed: 'Tamamlandı',
  postponed: 'Ertelendi',
  cancelled: 'İptal edildi',
};
function RentalDayModal({
  date,
  items,
  close,
  edit,
}: {
  date: string;
  items: any[];
  close: () => void;
  edit: (item: any) => void;
}) {
  return (
    <div
      className="operation-modal rental-day-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rental-day-title"
    >
      <section>
        <header>
          <div>
            <p className="admin-kicker">GÜNLÜK KİRALAMALAR</p>
            <h2 id="rental-day-title">
              {new Date(`${date}T12:00:00`).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </h2>
          </div>
          <button onClick={close} aria-label="Kapat">
            <X />
          </button>
        </header>
        <div className="rental-day-list">
          {items.map((item) => (
            <article key={item.id}>
              <div className="operation-image">
                {item.product_image ? (
                  <img src={item.product_image} alt="" />
                ) : (
                  <Package />
                )}
              </div>
              <span>
                <b>{item.product_name}</b>
                <small>
                  {item.product_code} · {item.color || 'Renk belirtilmedi'}
                  {item.size ? ` · ${item.size} beden` : ''}
                </small>
              </span>
              <span>
                <b>{item.customer_name}</b>
                <small>{item.phone || 'Telefon belirtilmedi'}</small>
              </span>
              <button className="outline" onClick={() => edit(item)}>
                Yönet
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
function RentalEditForm({
  item,
  close,
  save,
  remove,
}: {
  item: any;
  close: () => void;
  save: (patch: any) => Promise<void>;
  remove: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    status: item.status || 'reserved',
    start_date: item.start_date,
    end_date: item.end_date,
    notes: item.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    await save(form);
    setSaving(false);
  };
  return (
    <div
      className="operation-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rental-edit-title"
    >
      <form onSubmit={submit}>
        <header>
          <div>
            <p className="admin-kicker">KİRALAMA YÖNETİMİ</p>
            <h2 id="rental-edit-title">{item.product_name}</h2>
            <small>
              {item.color || 'Renk belirtilmedi'} · {item.customer_name}
            </small>
          </div>
          <button type="button" onClick={close} aria-label="Kapat">
            <X />
          </button>
        </header>
        <div className="operation-fields">
          <label className="wide">
            Durum
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {Object.entries(rentalStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Başlangıç tarihi
            <input
              required
              type="date"
              value={form.start_date}
              onChange={(e) =>
                setForm({
                  ...form,
                  start_date: e.target.value,
                  end_date:
                    form.end_date < e.target.value
                      ? e.target.value
                      : form.end_date,
                })
              }
            />
          </label>
          <label>
            Teslim tarihi
            <input
              required
              type="date"
              min={form.start_date}
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            />
          </label>
          <label className="wide">
            Not
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
        </div>
        <footer>
          <button
            type="button"
            className="danger-button"
            disabled={saving}
            onClick={remove}
          >
            Kaydı sil
          </button>
          <span className="footer-spacer" />
          <button type="button" className="outline" onClick={close}>
            Vazgeç
          </button>
          <button className="primary" disabled={saving}>
            {saving ? 'Kaydediliyor…' : 'Güncelle'}
          </button>
        </footer>
      </form>
    </div>
  );
}
function OperationForm({
  kind,
  products,
  close,
  done,
  notify,
}: {
  kind: 'rental' | 'sale';
  products: any[];
  close: () => void;
  done: () => void;
  notify: (message: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [saving, setSaving] = useState(false);
  const [record, setRecord] = useState<any>({
    product_id: '',
    customer_name: '',
    phone: '',
    color: '',
    size: '',
    start_date: today,
    end_date: today,
    sold_at: today,
    notes: '',
  });
  const available = products.filter((x) =>
    kind === 'rental' ? x.rental_enabled : x.sale_enabled && Number(x.stock_quantity || 0) > 0,
  );
  const selected = available.find((x) => x.id === record.product_id);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const {
      data: { session },
    } = await sb.auth.getSession();
    const r = await fetch('/api/admin', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-supabase-token': session?.access_token || '',
      },
      body: JSON.stringify({ action: 'create_operation', kind, record }),
    });
    const result = await r.json();
    setSaving(false);
    if (!r.ok) return notify(result.error || 'Kayıt oluşturulamadı.');
    done();
  };
  return (
    <div
      className="operation-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="operation-title"
    >
      <form onSubmit={save}>
        <header>
          <div>
            <p className="admin-kicker">
              {kind === 'rental' ? 'YENİ KİRALAMA' : 'YENİ SATIŞ'}
            </p>
            <h2 id="operation-title">
              {kind === 'rental' ? 'Kiralama oluştur' : 'Satış kaydet'}
            </h2>
          </div>
          <button type="button" onClick={close} aria-label="Kapat">
            <X />
          </button>
        </header>
        <div className="operation-fields">
          <label className="wide">
            Ürün *
            <select
              required
              value={record.product_id}
              onChange={(e) =>
                setRecord({
                  ...record,
                  product_id: e.target.value,
                  color: '',
                  size: '',
                })
              }
            >
              <option value="">Bir ürün seçin</option>
              {available.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} · {x.code} · Stok: {x.stock_quantity || 0}
                </option>
              ))}
            </select>
          </label>
          <label>
            Müşteri adı *
            <input
              required
              value={record.customer_name}
              onChange={(e) =>
                setRecord({ ...record, customer_name: e.target.value })
              }
            />
          </label>
          <label>
            Telefon {kind === 'rental' && '*'}
            <input
              required={kind === 'rental'}
              type="tel"
              value={record.phone}
              onChange={(e) => setRecord({ ...record, phone: e.target.value })}
            />
          </label>
          {kind === 'rental' && (
            <>
              <label>
                Renk *
                <select
                  required
                  value={record.color}
                  onChange={(e) =>
                    setRecord({ ...record, color: e.target.value })
                  }
                >
                  <option value="">Renk seçin</option>
                  {(selected?.color_variants || []).map((x: any) => (
                    <option key={x.name} value={x.name}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Beden
                <select
                  value={record.size}
                  onChange={(e) =>
                    setRecord({ ...record, size: e.target.value })
                  }
                >
                  <option value="">Beden seçin</option>
                  {(selected?.sizes || []).map((x: string) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                Kiralama tarihi *
                <input
                  required
                  type="date"
                  value={record.start_date}
                  onChange={(e) =>
                    setRecord({ ...record, start_date: e.target.value })
                  }
                />
              </label>
              <label>
                Teslim alma tarihi *
                <input
                  required
                  type="date"
                  min={record.start_date}
                  value={record.end_date}
                  onChange={(e) =>
                    setRecord({ ...record, end_date: e.target.value })
                  }
                />
              </label>
            </>
          )}
          {kind === 'sale' && (
            <>
              <label>
                Renk *
                <select required value={record.color} onChange={(e) => setRecord({ ...record, color: e.target.value })}>
                  <option value="">Renk seçin</option>
                  {(selected?.color_variants || []).map((x: any) => <option key={x.name} value={x.name}>{x.name}</option>)}
                </select>
              </label>
              <label>
                Beden *
                <select required value={record.size} onChange={(e) => setRecord({ ...record, size: e.target.value })}>
                  <option value="">Beden seçin</option>
                  {(selected?.sizes || []).map((x: string) => <option key={x}>{x}</option>)}
                </select>
              </label>
              <label>
                Satış tarihi *
                <input required type="date" value={record.sold_at} onChange={(e) => setRecord({ ...record, sold_at: e.target.value })} />
              </label>
            </>
          )}
          <label className="wide">
            Not
            <textarea
              value={record.notes}
              onChange={(e) => setRecord({ ...record, notes: e.target.value })}
              placeholder="Ödeme, teslim veya özel ölçü notu"
            />
          </label>
        </div>
        <footer>
          <button type="button" className="outline" onClick={close}>
            Vazgeç
          </button>
          <button className="primary" disabled={saving}>
            {saving
              ? 'Kaydediliyor…'
              : kind === 'rental'
                ? 'Kiralama oluştur'
                : 'Satışı kaydet'}
          </button>
        </footer>
      </form>
    </div>
  );
}
function CalendarView({ items, onMonthChange }: { items: any[]; onMonthChange?: (month: string) => void }) {
  const upcoming = [...items]
    .filter((x) => new Date(x.starts_at) >= new Date())
    .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  const [cursor, setCursor] = useState(() => {
    const d = upcoming[0]?.starts_at
      ? new Date(upcoming[0].starts_at)
      : new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  });
  const [selected, setSelected] = useState<{ date: Date; items: any[] } | null>(
    null,
  );
  useEffect(() => {
    onMonthChange?.(`${cursor.getFullYear()}-${cursor.getMonth()}`);
  }, [cursor, onMonthChange]);
  const dateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const appointmentMonths = Array.from(
    new Map(
      items.map((x) => {
        const d = new Date(x.starts_at),
          key = `${d.getFullYear()}-${d.getMonth()}`;
        return [key, new Date(d.getFullYear(), d.getMonth(), 1)];
      }),
    ).values(),
  ).sort((a, b) => +a - +b);
  const move = (direction: number) =>
    setCursor((d) => {
      const n = new Date(d);
      n.setMonth(n.getMonth() + direction);
      return n;
    });
  let days: Date[] = [];
  {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1),
      offset = (first.getDay() + 6) % 7,
      last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate(),
      count = Math.ceil((offset + last) / 7) * 7;
    days = Array.from(
      { length: count },
      (_, i) =>
        new Date(cursor.getFullYear(), cursor.getMonth(), i - offset + 1),
    );
  }
  const title = cursor.toLocaleDateString('tr-TR', {
    month: 'long',
    year: 'numeric',
  });
  return (
    <article className="calendar-view">
      <div className="calendar-title">
        <button onClick={() => move(-1)}>‹</button>
        <h2>{title}</h2>
        <button onClick={() => move(1)}>›</button>
      </div>
      <div className="calendar-jump">
        <button onClick={() => setCursor(new Date())}>Bugün</button>
        {appointmentMonths.length > 0 && (
          <label>
            Randevu bulunan aya git
            <select
              value={`${cursor.getFullYear()}-${cursor.getMonth()}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split('-').map(Number);
                setCursor(new Date(y, m, 1));
              }}
            >
              <option value={`${cursor.getFullYear()}-${cursor.getMonth()}`}>
                {cursor.toLocaleDateString('tr-TR', {
                  month: 'long',
                  year: 'numeric',
                })}
              </option>
              {appointmentMonths
                .filter(
                  (d) =>
                    d.getFullYear() !== cursor.getFullYear() ||
                    d.getMonth() !== cursor.getMonth(),
                )
                .map((d) => (
                  <option
                    key={`${d.getFullYear()}-${d.getMonth()}`}
                    value={`${d.getFullYear()}-${d.getMonth()}`}
                  >
                    {d.toLocaleDateString('tr-TR', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </option>
                ))}
            </select>
          </label>
        )}
      </div>
      <div className="calendar-weekdays">
        {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((x) => (
          <b key={x}>{x}</b>
        ))}
      </div>
      <div className="calendar-grid">
        {days.map((day) => {
          const dayItems = items.filter(
              (x: any) => dateKey(new Date(x.starts_at)) === dateKey(day),
            ),
            outside = day.getMonth() !== cursor.getMonth();
          return (
            <button
              type="button"
              className={`day ${outside ? 'outside' : ''} ${dateKey(day) === dateKey(new Date()) ? 'today' : ''}`}
              key={dateKey(day)}
              onClick={() => setSelected({ date: day, items: dayItems })}
            >
              <b>{day.getDate()}</b>
              {dayItems.slice(0, 3).map((x: any) => (
                <span key={x.id}>
                  <strong>
                    {new Date(x.starts_at).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </strong>{' '}
                  {x.customers?.first_name} {x.customers?.last_name}
                  <small>{x.services?.name}</small>
                </span>
              ))}
              {dayItems.length > 3 && <em>+{dayItems.length - 3} randevu</em>}
            </button>
          );
        })}
      </div>
      {selected && (
        <AppointmentDayModal
          date={selected.date}
          items={selected.items}
          close={() => setSelected(null)}
        />
      )}
    </article>
  );
}
function AppointmentDayModal({
  date,
  items,
  close,
}: {
  date: Date;
  items: any[];
  close: () => void;
}) {
  return (
    <div
      className="operation-modal appointment-day-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="appointment-day-title"
    >
      <section>
        <header>
          <div>
            <p className="admin-kicker">GÜNLÜK RANDEVULAR</p>
            <h2 id="appointment-day-title">
              {date.toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </h2>
          </div>
          <button onClick={close} aria-label="Kapat">
            <X />
          </button>
        </header>
        <div className="appointment-day-list">
          {!items.length && (
            <div className="empty">Bu tarihte randevu yok.</div>
          )}
          {items.map((item: any) => (
            <article key={item.id}>
              <span className="appointment-time">
                {new Date(item.starts_at).toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span>
                <b>
                  {item.customers?.first_name} {item.customers?.last_name}
                </b>
                <small>
                  {item.customers?.phone} · {item.customers?.email}
                </small>
              </span>
              <span>
                <b>{item.services?.name}</b>
                <small>
                  {item.staff?.full_name || 'Personel atanmamış'}
                  {item.notes ? ` · ${item.notes}` : ''}
                </small>
              </span>
              <em className={`status ${item.status}`}>
                {item.status === 'confirmed'
                  ? 'Onaylandı'
                  : item.status === 'completed'
                    ? 'Tamamlandı'
                    : item.status === 'cancelled'
                      ? 'İptal'
                      : item.status === 'arrived'
                        ? 'Geldi'
                        : item.status === 'contacted'
                          ? 'İletişime geçildi'
                          : item.status === 'no_show'
                            ? 'Gelmedi'
                            : 'Yeni'}
              </em>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
function Products({
  data,
  query,
  update,
  reload,
  notify,
}: {
  data: any;
  query: string;
  update: any;
  reload: () => void;
  notify: (message: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [editing, setEditing] = useState<any>(null),
    [filter, setFilter] = useState('all');
  const items = (Array.isArray(data?.items) ? data.items : []).filter(
    (x: any) =>
      String(x?.name || '')
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === 'all' || x.status === filter),
  );
  const remove = async (item: any) => {
    if (!confirm(`“${item.name}” ürününü silmek istediğinize emin misiniz?`))
      return;
    const {
      data: { session },
    } = await sb.auth.getSession();
    const r = await fetch(`/api/admin?id=${item.id}`, {
        method: 'DELETE',
        headers: { 'x-supabase-token': session?.access_token || '' },
      }),
      d = await r.json();
    notify(r.ok ? 'Ürün silindi.' : d.error || 'Ürün silinemedi');
    if (r.ok) reload();
  };
  return (
    <div className="manager-page">
      <div className="toolbar">
        <div className="segmented">
          {[
            ['all', 'Tümü'],
            ['draft', 'Taslak'],
            ['published', 'Yayında'],
            ['archived', 'Arşiv'],
          ].map(([id, label]) => (
            <button
              key={id}
              className={filter === id ? 'active' : ''}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div>
          <button className="primary" onClick={() => setOpen(true)}>
            <Plus /> Yeni ürün
          </button>
        </div>
      </div>
      <div className="product-admin-grid">
        {!items.length && (
          <div className="empty large">Henüz ürün eklenmemiş.</div>
        )}
        {items.map((x: any) => {
          const media = Array.isArray(x.product_media)
            ? [...x.product_media].sort(
                (a: any, b: any) =>
                  Number(a.sort_order || 0) - Number(b.sort_order || 0),
              )
            : [];
          return (
            <article key={x.id} className="product-list-row">
              <div className="product-placeholder">
                {media[0]?.path ? (
                  <img src={media[0].path} alt={x.name || 'Ürün'} />
                ) : (
                  <Package />
                )}
              </div>
              <div className="product-list-info">
                <span className={`status ${x.status}`}>{x.status}</span>
                <h3>{x.name}</h3>
                <p>
                  {x.product_categories?.[0]?.categories?.name || 'Kategorisiz'}{' '}
                  · {x.rental_enabled ? 'Kiralık' : ''}{' '}
                  {x.sale_enabled ? '· Satılık' : ''}
                </p>
                <b>Ürün kodu: {x.code}</b>
                {media.length > 1 && (
                  <div className="product-mini-gallery">
                    {media.slice(1, 5).map((m: any) => (
                      <img key={m.id} src={m.path} alt="" />
                    ))}
                  </div>
                )}
              </div>
              <div className="product-list-actions">
                <small>
                  {x.stock_quantity || 0} stok · {x.view_count || 0}{' '}
                  görüntülenme
                </small>
                <button
                  className="feature-button"
                  onClick={() =>
                    update('products', x.id, { featured: !x.featured })
                  }
                >
                  {x.featured ? 'Öne çıkandan kaldır' : 'Öne çıkar'}
                </button>
                <button className="edit-button" onClick={() => setEditing(x)}>
                  Düzenle
                </button>
                <button className="delete-button" onClick={() => remove(x)}>
                  Sil
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {open && (
        <ProductForm
          categories={data.categories || []}
          close={() => setOpen(false)}
          done={() => {
            setOpen(false);
            notify('Ürün başarıyla kaydedildi.');
            reload();
          }}
          notify={notify}
        />
      )}
      {editing && (
        <ProductForm
          initial={editing}
          categories={data.categories || []}
          close={() => setEditing(null)}
          done={() => {
            setEditing(null);
            notify('Ürün güncellendi.');
            reload();
          }}
          notify={notify}
        />
      )}
    </div>
  );
}

const productInitial: any = {
  name: '',
  code: '',
  slug: '',
  category_id: '',
  description: '',
  rental_price: '',
  sale_price: '',
  rental_enabled: true,
  sale_enabled: false,
  price_visible: false,
  sizes: '',
  colors: '',
  color: '',
  stock_quantity: 0,
  style: '',
  event: '',
  fabric: '',
  sleeve: '',
  neck: '',
  fit: 'Standart kalıp',
  lining: 'Tam astarlı',
  care_instructions: 'Kuru temizleme önerilir.',
  rental_terms: 'Kiralama tarih uygunluğu randevu sırasında teyit edilir.',
  delivery_shipping_enabled: true,
  delivery_shipping_fee: 300,
  delivery_store_enabled: true,
  seo_title: '',
  seo_description: '',
  featured: false,
  new_arrival: true,
  status: 'published',
};
function ProductForm({
  initial,
  categories,
  close,
  done,
  notify,
}: {
  initial?: any;
  categories: any[];
  close: () => void;
  done: () => void;
  notify: (x: string) => void;
}) {
  let details: any = {};
  try {
    const parsed = JSON.parse(initial?.description || '{}');
    details =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed
        : { description: String(parsed || '') };
  } catch {
    details = { description: initial?.description || '' };
  }
  const initialValue = initial
    ? {
        ...productInitial,
        ...initial,
        ...details,
        sizes: Array.isArray(initial.sizes)
          ? initial.sizes.join(', ')
          : String(initial.sizes || ''),
        colors: Array.isArray(initial.colors)
          ? initial.colors.join(', ')
          : String(initial.colors || ''),
        category_id: initial.product_categories?.[0]?.category_id || '',
      }
    : productInitial;
  const existingVariants = initial
    ? (details.color_variants?.length
        ? details.color_variants
        : [
            {
              name: details.color || initial.colors?.[0] || 'Ana renk',
              hex: '#d8d0c5',
            },
          ]
      ).map((v: any) => ({
        ...v,
        files: [],
        existing: (Array.isArray(initial.product_media)
          ? initial.product_media
          : []
        )
          .filter((m: any) => {
            try {
              return JSON.parse(m.alt_text || '{}').color === v.name;
            } catch {
              return true;
            }
          })
          .map((m: any) => m.path),
      }))
    : [{ name: '', hex: '#d8d0c5', files: [], existing: [] }];
  const [p, setP] = useState(initialValue),
    [variants, setVariants] = useState<any[]>(existingVariants),
    [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setP((x: any) => ({ ...x, [k]: v }));
  const slugify = (v: string) =>
    v
      .toLocaleLowerCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ş/g, 's')
      .replace(/ç/g, 'c')
      .replace(/ö/g, 'o')
      .replace(/ü/g, 'u')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  const submit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    try {
      const {
        data: { session },
      } = await sb.auth.getSession();
      const media: any[] = [];
      for (const variant of variants) {
        for (const path of variant.existing || [])
          media.push({ path, color: variant.name, hex: variant.hex });
        for (const file of variant.files || []) {
          const form = new FormData();
          form.append('file', file);
          const r = await fetch('/api/admin/media', {
              method: 'POST',
              headers: { 'x-supabase-token': session?.access_token || '' },
              body: form,
            }),
            d = await r.json();
          if (!r.ok) throw new Error(d.error || 'Görsel yüklenemedi');
          media.push({ path: d.url, color: variant.name, hex: variant.hex });
        }
      }
      const product = {
        ...p,
        slug: p.slug || slugify(p.name),
        sizes: String(p.sizes || '')
          .split(',')
          .map((x: string) => x.trim())
          .filter(Boolean),
        colors: variants.map((v) => v.name).filter(Boolean),
        color: variants[0]?.name || '',
        color_variants: variants.map((v) => ({ name: v.name, hex: v.hex })),
        media,
      };
      const r = await fetch('/api/admin', {
          method: initial ? 'PUT' : 'POST',
          headers: {
            'content-type': 'application/json',
            'x-supabase-token': session?.access_token || '',
          },
          body: JSON.stringify({ product, id: initial?.id }),
        }),
        d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Ürün kaydedilemedi');
      done();
    } catch (error: any) {
      notify(error.message);
    } finally {
      setSaving(false);
    }
  };
  const fields = [
    ['Ürün adı *', 'name'],
    ['Ürün kodu *', 'code'],
    ['Stok adedi *', 'stock_quantity', 'number'],
    ['Kiralama fiyatı', 'rental_price', 'number'],
    ['Satış fiyatı', 'sale_price', 'number'],
  ];
  return (
    <div className="product-modal" role="dialog" aria-modal="true">
      <form onSubmit={submit}>
        <header>
          <div>
            <p className="admin-kicker">ÜRÜN YÖNETİMİ</p>
            <h2>{initial ? 'Ürünü düzenle' : 'Yeni ürün ekle'}</h2>
          </div>
          <button type="button" onClick={close}>
            <X />
          </button>
        </header>
        <div className="product-form-grid">
          {fields.map(([label, key, type]) => (
            <Field
              key={key}
              label={label}
              type={type}
              value={p[key]}
              onChange={(v: string) => {
                set(
                  key,
                  type === 'number' && key === 'stock_quantity' ? Number(v) : v,
                );
                if (key === 'name' && !p.slug) set('slug', slugify(v));
              }}
            />
          ))}
          <div className="wide delivery-admin-fields">
            <div>
              <b>Teslimat yöntemleri</b>
              <small>
                Ürün sayfasında müşteriye gösterilecek seçenekleri belirleyin.
              </small>
            </div>
            <label>
              <input
                type="checkbox"
                checked={!!p.delivery_shipping_enabled}
                onChange={(e) =>
                  set('delivery_shipping_enabled', e.target.checked)
                }
              />
              Kargo ile teslimat
            </label>
            <label>
              Kargo ücreti (TL)
              <input
                type="number"
                min="0"
                value={p.delivery_shipping_fee}
                onChange={(e) =>
                  set('delivery_shipping_fee', Number(e.target.value))
                }
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={!!p.delivery_store_enabled}
                onChange={(e) =>
                  set('delivery_store_enabled', e.target.checked)
                }
              />
              Mağazadan teslim / iade
            </label>
          </div>
          <label>
            Kategori *
            <select
              required
              value={p.category_id}
              onChange={(e) => set('category_id', e.target.value)}
            >
              <option value="">Kategori seçin</option>
              {categories
                .filter((x) => x.visible)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
            </select>
          </label>
          <div className="wide variant-editor">
            <div className="variant-title">
              <b>Renkler ve fotoğrafları</b>
              <button
                type="button"
                className="outline"
                onClick={() =>
                  setVariants((v) => [
                    ...v,
                    { name: '', hex: '#d8d0c5', files: [], existing: [] },
                  ])
                }
              >
                <Plus /> Renk ekle
              </button>
            </div>
            {variants.map((variant, index) => (
              <section key={index} className="variant-row">
                <label>
                  Renk adı
                  <input
                    required
                    value={variant.name}
                    onChange={(e) =>
                      setVariants((v) =>
                        v.map((x, i) =>
                          i === index ? { ...x, name: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Renk paleti
                  <input
                    type="color"
                    value={variant.hex}
                    onChange={(e) =>
                      setVariants((v) =>
                        v.map((x, i) =>
                          i === index ? { ...x, hex: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Bu renge ait fotoğraflar
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    required={
                      !initial &&
                      !variant.existing?.length &&
                      !variant.files?.length
                    }
                    onChange={(e) =>
                      setVariants((v) =>
                        v.map((x, i) =>
                          i === index
                            ? {
                                ...x,
                                files: [
                                  ...x.files,
                                  ...Array.from(e.target.files || []),
                                ],
                              }
                            : x,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  className="variant-remove"
                  onClick={() =>
                    setVariants((v) => v.filter((_, i) => i !== index))
                  }
                >
                  Rengi kaldır
                </button>
                <div className="image-preview-grid">
                  {(variant.existing || []).map((url: string, i: number) => (
                    <figure key={url}>
                      <img src={url} alt="" />
                      <button
                        type="button"
                        onClick={() =>
                          setVariants((v) =>
                            v.map((x, j) =>
                              j === index
                                ? {
                                    ...x,
                                    existing: x.existing.filter(
                                      (_: string, k: number) => k !== i,
                                    ),
                                  }
                                : x,
                            ),
                          )
                        }
                      >
                        <X />
                      </button>
                    </figure>
                  ))}
                  {(variant.files || []).map((file: File, i: number) => (
                    <figure key={`${file.name}-${i}`}>
                      <img src={URL.createObjectURL(file)} alt="" />
                      <button
                        type="button"
                        onClick={() =>
                          setVariants((v) =>
                            v.map((x, j) =>
                              j === index
                                ? {
                                    ...x,
                                    files: x.files.filter(
                                      (_: File, k: number) => k !== i,
                                    ),
                                  }
                                : x,
                            ),
                          )
                        }
                      >
                        <X />
                      </button>
                    </figure>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <label className="wide">
            Açıklama
            <textarea
              value={p.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </label>
        </div>
        <div className="product-options">
          {[
            ['rental_enabled', 'Kiralık'],
            ['sale_enabled', 'Satılık'],
            ['price_visible', 'Fiyatı göster'],
            ['new_arrival', 'Yeni gelen'],
            ['featured', 'Öne çıkan'],
          ].map(([key, label]) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={p[key]}
                onChange={(e) => set(key, e.target.checked)}
              />
              {label}
            </label>
          ))}
          <label>
            Durum
            <select
              value={p.status}
              onChange={(e) => set('status', e.target.value)}
            >
              <option value="published">Yayında</option>
              <option value="draft">Taslak</option>
              <option value="archived">Arşiv</option>
            </select>
          </label>
        </div>
        <footer>
          <button type="button" className="outline" onClick={close}>
            Vazgeç
          </button>
          <button className="primary" disabled={saving}>
            {saving
              ? 'Fotoğraflar yükleniyor…'
              : initial
                ? 'Değişiklikleri kaydet'
                : 'Ürünü kaydet'}
          </button>
        </footer>
      </form>
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: any;
  onChange: (x: string) => void;
  type?: string;
}) {
  return (
    <label>
      {label}
      <input
        required={label.includes('*')}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function CategoriesPage({
  data,
  reload,
  notify,
}: {
  data: any;
  reload: () => void;
  notify: (x: string) => void;
}) {
  const [manage, setManage] = useState(false),
    [items, setItems] = useState<any[]>(() => {
      const config = data.showcase || [];
      return (data.items || []).map((c: any) => ({
        ...c,
        image: config.find((x: any) => x.id === c.id)?.image || '',
        show: !!config.find((x: any) => x.id === c.id)?.show,
        description: config.find((x: any) => x.id === c.id)?.description || '',
        sort: config.find((x: any) => x.id === c.id)?.sort ?? c.sort_order ?? 0,
      }));
    }),
    [saving, setSaving] = useState(false);
  const patchItem = (id: string, patch: any) =>
    setItems((v) => v.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const upload = async (id: string, file?: File) => {
    if (!file) return;
    setSaving(true);
    try {
      const {
          data: { session },
        } = await sb.auth.getSession(),
        form = new FormData();
      form.append('file', file);
      const r = await fetch('/api/admin/media', {
          method: 'POST',
          headers: { 'x-supabase-token': session?.access_token || '' },
          body: form,
        }),
        d = await r.json();
      setSaving(false);
      if (r.ok) {
        patchItem(id, { image: d.url });
        notify(
          'Kategori fotoğrafı yüklendi. Kaydet ve yayınla düğmesine basın.',
        );
      } else notify(d.error || 'Fotoğraf yüklenemedi');
    } catch (error: any) {
      notify(
        error?.message === 'Failed to fetch' ||
          error?.message === 'fetch failed'
          ? 'Sunucuya bağlanılamadı. Sayfayı yenileyip tekrar deneyin.'
          : error?.message || 'Fotoğraf yüklenemedi.',
      );
    } finally {
      setSaving(false);
    }
  };
  const save = async () => {
    setSaving(true);
    const {
      data: { session },
    } = await sb.auth.getSession();
    const payload = items.map(
      ({ id, image, show, description, sort }: any) => ({
        id,
        image,
        show,
        description,
        sort: Number(sort) || 0,
      }),
    );
    const r = await fetch('/api/admin', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'x-supabase-token': session?.access_token || '',
        },
        body: JSON.stringify({ area: 'categories', items: payload }),
      }),
      d = await r.json();
    setSaving(false);
    notify(
      r.ok
        ? 'Kategori vitrin ayarları yayınlandı.'
        : d.error || 'Kaydedilemedi',
    );
  };
  return (
    <div className="category-page">
      <div className="toolbar">
        <div>
          <p className="admin-kicker">ANA SAYFA KATEGORİLERİ</p>
          <h2>Kategori vitrini</h2>
        </div>
        <div>
          <button className="outline" onClick={() => setManage(true)}>
            Kategori adlarını düzenle
          </button>
          <button className="primary" onClick={save} disabled={saving}>
            {saving ? 'Kaydediliyor…' : 'Kaydet ve yayınla'}
          </button>
        </div>
      </div>
      <p className="category-page-help">
        “Geceniz için üç özel yol” bölümünde göstermek istediğiniz kategoriyi
        seçin, kapak fotoğrafını yükleyin ve sırasını belirleyin.
      </p>
      <div className="category-showcase-admin">
        {items.map((x: any) => (
          <article key={x.id}>
            <div className="category-cover">
              {x.image ? <img src={x.image} alt={x.name} /> : <Package />}
              <label>
                Fotoğraf seç
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => upload(x.id, e.target.files?.[0])}
                />
              </label>
            </div>
            <div>
              <h3>{x.name}</h3>
              <label className="show-toggle">
                <input
                  type="checkbox"
                  checked={x.show}
                  onChange={(e) => patchItem(x.id, { show: e.target.checked })}
                />{' '}
                Ana sayfadaki kategori bölümünde göster
              </label>
              <label>
                Kısa açıklama
                <input
                  value={x.description}
                  onChange={(e) =>
                    patchItem(x.id, { description: e.target.value })
                  }
                  placeholder="Kategori açıklaması"
                />
              </label>
              <label>
                Sıra
                <input
                  type="number"
                  value={x.sort}
                  onChange={(e) => patchItem(x.id, { sort: e.target.value })}
                />
              </label>
            </div>
          </article>
        ))}
      </div>
      {manage && (
        <CategoryManager
          categories={data.items || []}
          close={() => setManage(false)}
          done={() => {
            setManage(false);
            reload();
          }}
          notify={notify}
        />
      )}
    </div>
  );
}
function CategoryManager({
  categories,
  close,
  done,
  notify,
}: {
  categories: any[];
  close: () => void;
  done: () => void;
  notify: (x: string) => void;
}) {
  const [name, setName] = useState(''),
    [editingId, setEditingId] = useState(''),
    [editName, setEditName] = useState(''),
    [saving, setSaving] = useState(false);
  const slugify = (v: string) =>
    v
      .toLocaleLowerCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ş/g, 's')
      .replace(/ç/g, 'c')
      .replace(/ö/g, 'o')
      .replace(/ü/g, 'u')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  const save = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    const {
      data: { session },
    } = await sb.auth.getSession();
    const r = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-supabase-token': session?.access_token || '',
        },
        body: JSON.stringify({
          action: 'create_category',
          name,
          slug: slugify(name),
        }),
      }),
      d = await r.json();
    setSaving(false);
    if (!r.ok) return notify(d.error || 'Kategori eklenemedi');
    setName('');
    notify('Kategori eklendi.');
    done();
  };
  const categoryAction = async (action: string, payload: any) => {
    setSaving(true);
    const {
      data: { session },
    } = await sb.auth.getSession();
    const r = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-supabase-token': session?.access_token || '',
        },
        body: JSON.stringify({ action, ...payload }),
      }),
      d = await r.json();
    setSaving(false);
    if (!r.ok) return notify(d.error || 'Kategori güncellenemedi');
    setEditingId('');
    notify(
      action === 'update_category'
        ? 'Kategori güncellendi.'
        : payload.visible
          ? 'Kategori etkinleştirildi.'
          : 'Kategori gizlendi.',
    );
    done();
  };
  return (
    <div className="product-modal">
      <form className="category-form" onSubmit={save}>
        <header>
          <div>
            <p className="admin-kicker">KATALOG</p>
            <h2>Kategoriler</h2>
          </div>
          <button type="button" onClick={close}>
            <X />
          </button>
        </header>
        <div className="category-body">
          <label>
            Yeni kategori adı
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn. Nişan Elbiseleri"
            />
          </label>
          <button className="primary" disabled={saving}>
            <Plus />
            {saving ? 'Ekleniyor…' : 'Kategori ekle'}
          </button>
          <div className="category-list">
            {!categories.length && <p>Henüz kategori oluşturulmamış.</p>}
            {categories.map((x) => (
              <span key={x.id}>
                {editingId === x.id ? (
                  <div className="category-edit">
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <button
                      type="button"
                      className="primary"
                      disabled={saving}
                      onClick={() =>
                        categoryAction('update_category', {
                          id: x.id,
                          name: editName,
                          slug: slugify(editName),
                        })
                      }
                    >
                      Kaydet
                    </button>
                    <button
                      type="button"
                      className="outline"
                      onClick={() => setEditingId('')}
                    >
                      Vazgeç
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <b>{x.name}</b>
                      <small>/{x.slug}</small>
                      {!x.visible && <em>Gizli</em>}
                    </div>
                    <div className="category-actions">
                      <button
                        type="button"
                        className="edit-button"
                        onClick={() => {
                          setEditingId(x.id);
                          setEditName(x.name);
                        }}
                      >
                        Düzenle
                      </button>
                      <button
                        type="button"
                        className={x.visible ? 'delete-button' : 'outline'}
                        disabled={saving}
                        onClick={() =>
                          categoryAction('set_category_visibility', {
                            id: x.id,
                            visible: !x.visible,
                          })
                        }
                      >
                        {x.visible ? 'Gizle' : 'Etkinleştir'}
                      </button>
                    </div>
                  </>
                )}
              </span>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
function Content({ data }: { data: any }) {
  const sections = [
      'branding',
      'hero',
      'customTailoring',
      'contact',
      'legal',
      'social',
      'footer',
      'home',
    ],
    labels: any = {
      branding: 'Logo ve Marka',
      hero: 'Ana Sayfa Hero',
      customTailoring: 'Özel Dikim Sayfası',
      contact: 'İletişim Bilgileri',
      legal: 'Yasal İşletme Bilgileri',
      social: 'Sosyal Medya',
      footer: 'Footer',
      home: 'Ana Sayfa Metinleri',
    };
  const existing = Object.fromEntries(
    (data.items || []).map((x: any) => [x.section, x.content]),
  );
  return (
    <div className="cms-editor">
      <FaqAdmin initial={existing.faq || defaultSiteContent.faq} />
      <CustomerGalleryAdmin
        initial={existing.customerGallery || defaultSiteContent.customerGallery}
      />
      {sections.map((section) => (
        <CmsSection
          key={section}
          section={section}
          title={labels[section]}
          initial={
            existing[section] || (defaultSiteContent as any)[section] || {}
          }
        />
      ))}
    </div>
  );
}

function FaqAdmin({ initial }: { initial: any }) {
  const [value, setValue] = useState(initial), [saving, setSaving] = useState(false), [message, setMessage] = useState('');
  const save = async () => {
    setSaving(true);
    const { data: { session } } = await sb.auth.getSession();
    const response = await fetch('/api/admin', { method: 'PATCH', headers: { 'content-type': 'application/json', 'x-supabase-token': session?.access_token || '' }, body: JSON.stringify({ area: 'content', section: 'faq', content: value }) });
    const result = await response.json();
    setSaving(false);
    setMessage(response.ok ? 'SSS sayfası yayınlandı.' : result.error || 'Kaydedilemedi.');
  };
  const updateItem = (index: number, patch: any) => setValue({ ...value, items: value.items.map((item: any, itemIndex: number) => itemIndex === index ? { ...item, ...patch } : item) });
  return <section className="cms-card faq-admin">
    <header><div><p className="admin-kicker">SSS SAYFASI</p><h2>Sorular ve cevaplar</h2></div><button className="primary" onClick={save} disabled={saving}>{saving ? 'Kaydediliyor…' : 'Kaydet ve yayınla'}</button></header>
    <div className="cms-fields"><label>Üst başlık<input value={value.eyebrow || ''} onChange={(e) => setValue({ ...value, eyebrow: e.target.value })}/></label><label>Sayfa başlığı<input value={value.title || ''} onChange={(e) => setValue({ ...value, title: e.target.value })}/></label><label>Açıklama<input value={value.description || ''} onChange={(e) => setValue({ ...value, description: e.target.value })}/></label></div>
    <div className="faq-admin-list">{(value.items || []).map((item: any, index: number) => <article key={index}><label>Soru<input value={item.question || ''} onChange={(e) => updateItem(index, { question: e.target.value })}/></label><label>Cevap<textarea value={item.answer || ''} onChange={(e) => updateItem(index, { answer: e.target.value })}/></label><button type="button" className="delete-button" onClick={() => setValue({ ...value, items: value.items.filter((_: any, itemIndex: number) => itemIndex !== index) })}>Soruyu sil</button></article>)}</div>
    <button type="button" className="outline" onClick={() => setValue({ ...value, items: [...(value.items || []), { question: '', answer: '' }] })}><Plus/> Yeni soru ekle</button>{message && <small>{message}</small>}
  </section>;
}

function CustomerGalleryAdmin({ initial }: { initial: any }) {
  const [value, setValue] = useState(initial),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setMessage('');
    const {
      data: { session },
    } = await sb.auth.getSession();
    const added: any[] = [];
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append('file', file);
      const response = await fetch('/api/admin/media', {
        method: 'POST',
        headers: { 'x-supabase-token': session?.access_token || '' },
        body: form,
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error || 'Fotoğraf yüklenemedi');
        continue;
      }
      added.push({
        url: result.url,
        alt: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
      });
    }
    setValue((current: any) => ({
      ...current,
      items: [...(current.items || []), ...added],
    }));
    setBusy(false);
  };
  const save = async () => {
    setBusy(true);
    setMessage('');
    const {
      data: { session },
    } = await sb.auth.getSession();
    const response = await fetch('/api/admin', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-supabase-token': session?.access_token || '',
      },
      body: JSON.stringify({
        area: 'content',
        section: 'customerGallery',
        content: value,
      }),
    });
    const result = await response.json();
    setBusy(false);
    setMessage(
      response.ok ? 'Galeri yayınlandı' : result.error || 'Kaydedilemedi',
    );
  };
  const move = (index: number, direction: number) =>
    setValue((current: any) => {
      const items = [...current.items],
        target = index + direction;
      if (target < 0 || target >= items.length) return current;
      [items[index], items[target]] = [items[target], items[index]];
      return { ...current, items };
    });
  return (
    <section className="cms-card customer-gallery-admin">
      <header>
        <div>
          <p className="admin-kicker">HAKKIMIZDA SAYFASI</p>
          <h2>Müşteri Memnuniyeti</h2>
        </div>
        <button className="primary" onClick={save} disabled={busy}>
          {busy ? 'İşleniyor…' : 'Kaydet ve yayınla'}
        </button>
      </header>
      <div className="cms-fields gallery-copy-fields">
        <label>
          Üst başlık
          <input
            value={value.eyebrow || ''}
            onChange={(e) => setValue({ ...value, eyebrow: e.target.value })}
          />
        </label>
        <label>
          Başlık
          <input
            value={value.title || ''}
            onChange={(e) => setValue({ ...value, title: e.target.value })}
          />
        </label>
        <label>
          Açıklama
          <input
            value={value.description || ''}
            onChange={(e) =>
              setValue({ ...value, description: e.target.value })
            }
          />
        </label>
        <label className="gallery-upload">
          Fotoğraf ekle
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => upload(e.target.files)}
            disabled={busy}
          />
        </label>
      </div>
      <div className="gallery-admin-list">
        {(value.items || []).map((item: any, index: number) => (
          <article key={`${item.url}-${index}`}>
            <img src={item.url} alt="" />
            <label>
              Fotoğraf açıklaması
              <input
                value={item.alt || ''}
                onChange={(e) =>
                  setValue({
                    ...value,
                    items: value.items.map((x: any, i: number) =>
                      i === index ? { ...x, alt: e.target.value } : x,
                    ),
                  })
                }
              />
            </label>
            <div>
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === value.items.length - 1}
              >
                →
              </button>
              <button
                type="button"
                className="delete-button"
                onClick={() =>
                  setValue({
                    ...value,
                    items: value.items.filter(
                      (_: any, i: number) => i !== index,
                    ),
                  })
                }
              >
                Kaldır
              </button>
            </div>
          </article>
        ))}
        {!(value.items || []).length && (
          <p className="gallery-admin-empty">
            Henüz fotoğraf eklenmedi. Birden fazla fotoğrafı aynı anda
            seçebilirsiniz.
          </p>
        )}
      </div>
      {message && <small>{message}</small>}
    </section>
  );
}
function CmsSection({
  section,
  title,
  initial,
}: {
  section: string;
  title: string;
  initial: any;
}) {
  const [value, setValue] = useState<Record<string, string>>(initial),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState('');
  const fields: any = {
    branding: [
      ['logo', 'Logo', 'image'],
      ['siteName', 'Site adı'],
    ],
    hero: [
      ['image', 'Hero görseli', 'image'],
      ['eyebrow', 'Üst başlık'],
      ['titleBefore', 'Başlık ilk satır'],
      ['titleAccent', 'Vurgulu başlık'],
      ['titleAfter', 'Başlık sonu'],
      ['description', 'Açıklama'],
    ],
    contact: [
      ['phone', 'Telefon görünümü'],
      ['phoneHref', 'Telefon bağlantısı'],
      ['whatsapp', 'WhatsApp numarası'],
      ['email', 'E-posta'],
      ['address', 'Adres'],
      ['hours', 'Çalışma saatleri'],
      ['mapsUrl', 'Harita bağlantısı'],
    ],
    legal: [
      ['officialName', 'Resmî işletme unvanı'],
      ['dataController', 'Veri sorumlusu unvanı'],
      ['registeredAddress', 'Tebligata açık resmî adres'],
      ['contactEmail', 'KVKK başvuru e-postası'],
    ],
    social: [
      ['instagram', 'Instagram bağlantısı'],
      ['instagramUser', 'Instagram kullanıcı adı'],
      ['facebook', 'Facebook bağlantısı'],
      ['tiktok', 'TikTok bağlantısı'],
    ],
    footer: [
      ['description', 'Footer açıklaması'],
      ['copyright', 'Telif yazısı'],
    ],
    home: [
      ['servicesEyebrow', 'Hizmetler üst başlık'],
      ['servicesTitle', 'Hizmetler başlığı'],
      ['featuredEyebrow', 'Ürünler üst başlık'],
      ['featuredTitle', 'Ürünler başlığı'],
      ['appointmentEyebrow', 'Randevu üst başlık'],
      ['appointmentTitle', 'Randevu başlığı'],
      ['appointmentText', 'Randevu açıklaması'],
      ['instagramTitle', 'Instagram başlığı'],
    ],
    customTailoring: [
      ['heroEyebrow', 'Sayfa üst başlığı'],
      ['heroTitle', 'Sayfa başlığı'],
      ['heroText', 'Sayfa açıklaması'],
      ['image', 'Ana fotoğraf', 'image'],
      ['sectionEyebrow', 'İçerik üst başlığı'],
      ['sectionTitle', 'İçerik başlığı'],
      ['step1Title', '1. adım başlığı'],
      ['step1Text', '1. adım açıklaması'],
      ['step2Title', '2. adım başlığı'],
      ['step2Text', '2. adım açıklaması'],
      ['step3Title', '3. adım başlığı'],
      ['step3Text', '3. adım açıklaması'],
      ['step4Title', '4. adım başlığı'],
      ['step4Text', '4. adım açıklaması'],
      ['buttonText', 'Randevu butonu yazısı'],
    ],
  };
  const save = async () => {
    setSaving(true);
    const {
      data: { session },
    } = await sb.auth.getSession();
    const r = await fetch('/api/admin', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-supabase-token': session?.access_token || '',
      },
      body: JSON.stringify({ area: 'content', section, content: value }),
    });
    setSaving(false);
    setMessage(r.ok ? 'Yayınlandı' : 'Kaydedilemedi');
  };
  const upload = async (key: string, file?: File) => {
    if (!file) return;
    setSaving(true);
    const {
        data: { session },
      } = await sb.auth.getSession(),
      form = new FormData();
    form.append('file', file);
    const r = await fetch('/api/admin/media', {
        method: 'POST',
        headers: { 'x-supabase-token': session?.access_token || '' },
        body: form,
      }),
      d = await r.json();
    setSaving(false);
    if (r.ok) setValue((v) => ({ ...v, [key]: d.url }));
    else setMessage(d.error || 'Yüklenemedi');
  };
  return (
    <section className="cms-card">
      <header>
        <div>
          <p className="admin-kicker">İÇERİK YÖNETİMİ</p>
          <h2>{title}</h2>
        </div>
        <button className="primary" onClick={save} disabled={saving}>
          {saving ? 'Kaydediliyor…' : 'Kaydet ve yayınla'}
        </button>
      </header>
      <div className="cms-fields">
        {fields[section].map(([key, label, type]: string[]) => (
          <label key={key}>
            {label}
            {type === 'image' ? (
              <>
                <input
                  value={value[key] || ''}
                  onChange={(e) =>
                    setValue({ ...value, [key]: e.target.value })
                  }
                  placeholder="Görsel URL"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => upload(key, e.target.files?.[0])}
                />
                {value[key] && <img src={value[key]} alt="Önizleme" />}
              </>
            ) : (
              <input
                value={value[key] || ''}
                onChange={(e) => setValue({ ...value, [key]: e.target.value })}
              />
            )}
          </label>
        ))}
      </div>
      {message && <small>{message}</small>}
    </section>
  );
}
function AdminSettings({ data }: { data: any }) {
  const stored = (data.content || []).find(
    (item: any) => item.section === 'emailSettings',
  )?.content;
  const saved = { ...defaultSiteContent.emailSettings, ...(stored || {}) };
  const [value, setValue] = useState<any>(saved),
    [saving, setSaving] = useState(false),
    [testing, setTesting] = useState(false),
    [message, setMessage] = useState('');
  const save = async () => {
    setSaving(true);
    const {
      data: { session },
    } = await sb.auth.getSession();
    const response = await fetch('/api/admin', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-supabase-token': session?.access_token || '',
      },
      body: JSON.stringify({
        area: 'content',
        section: 'emailSettings',
        content: value,
      }),
    });
    const result = await response.json();
    setSaving(false);
    setMessage(
      response.ok
        ? 'E-posta ayarları kaydedildi.'
        : result.error || 'Kaydedilemedi.',
    );
  };
  const sendTest = async () => {
    setTesting(true);
    setMessage('');
    const {
      data: { session },
    } = await sb.auth.getSession();
    const response = await fetch('/api/admin', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-supabase-token': session?.access_token || '',
      },
      body: JSON.stringify({
        action: 'send_test_email',
        email: value.notificationEmail || value.replyTo,
      }),
    });
    const result = await response.json();
    setTesting(false);
    setMessage(result.message || result.error || 'Test tamamlanamadı.');
  };
  const field = (
    key: string,
    label: string,
    type: 'input' | 'textarea' = 'input',
  ) => (
    <label key={key}>
      {label}
      {type === 'textarea' ? (
        <textarea
          value={value[key] || ''}
          onChange={(event) =>
            setValue({ ...value, [key]: event.target.value })
          }
        />
      ) : (
        <input
          value={value[key] || ''}
          onChange={(event) =>
            setValue({ ...value, [key]: event.target.value })
          }
        />
      )}
    </label>
  );
  return (
    <div className="email-settings">
      <section className="cms-card">
        <header>
          <div>
            <p className="admin-kicker">E-POSTA AYARLARI</p>
            <h2>Gönderim adresi ve şablonlar</h2>
            <small>
              Gönderen adresinin Resend hesabınızda doğrulanmış alan adına ait
              olması gerekir.
            </small>
            <small className={data.emailProviderConfigured ? 'status-ok' : 'status-warning'}>
              {data.emailProviderConfigured
                ? 'E-posta sağlayıcısı sunucuda bağlı.'
                : 'E-posta sağlayıcısı bağlı değil: sunucuya RESEND_API_KEY eklenmeli.'}
            </small>
          </div>
          <div className="admin-actions">
            <button disabled={testing || !data.emailProviderConfigured} onClick={sendTest}>
              {testing ? 'Gönderiliyor…' : 'Test maili gönder'}
            </button>
            <button className="primary" disabled={saving} onClick={save}>
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </header>
        <div className="cms-fields">
          {field('fromName', 'Gönderen adı')}
          {field('fromEmail', 'Gönderen e-posta')}
          {field('replyTo', 'Yanıtların geleceği e-posta')}
          {field(
            'notificationEmail',
            'Yeni mesaj bildirimlerinin gönderileceği e-posta',
          )}
          {field('appointmentSubject', 'Randevu teyit konusu')}
          {field('appointmentTemplate', 'Randevu teyit metni', 'textarea')}
          {field('reminderSubject', 'Hatırlatma konusu')}
          {field('reminderTemplate', 'Hatırlatma metni', 'textarea')}
          {field('contactReceiptSubject', 'Mesaj alındı konusu')}
          {field('contactReceiptTemplate', 'Mesaj alındı metni', 'textarea')}
          {field('rentalSubject', 'Kiralama teyit konusu')}
          {field('rentalTemplate', 'Kiralama teyit metni', 'textarea')}
        </div>
        <p className="email-template-help">
          Kullanılabilir alanlar: {'{{firstName}}'}, {'{{lastName}}'},{' '}
          {'{{service}}'}, {'{{date}}'}, {'{{time}}'}, {'{{code}}'},{' '}
          {'{{phone}}'}, {'{{name}}'}
          , {'{{product}}'}, {'{{startDate}}'}, {'{{endDate}}'}
        </p>
        {message && <small>{message}</small>}
      </section>
    </div>
  );
}
