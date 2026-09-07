import { NextResponse } from 'next/server';
import { requireAdmin, type AdminRole } from '@/lib/admin-auth';
import { getEmailSettings, sendEmail } from '@/lib/email';
const all: AdminRole[] = [
  'super_admin',
  'content_manager',
  'product_manager',
  'appointment_staff',
];

export async function GET(request: Request) {
  const auth = await requireAdmin(request, all);
  if ('error' in auth) return auth.error;
  const { sb, role } = auth;
  const url = new URL(request.url),
    view = url.searchParams.get('view') || 'dashboard';
  if (view === 'dashboard') {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const todayStart = new Date(`${today}T00:00:00+03:00`);
    const tomorrowStart = new Date(todayStart.getTime() + 86400000);
    const activeStatuses = ['new', 'confirmed', 'contacted', 'arrived'];
    const [
      { data: appointments },
      { data: products },
      { count: todayCount },
      { count: upcomingCount },
      { count: newCount },
      { count: completedCount },
      { count: cancelledCount },
      { data: operations },
    ] =
      await Promise.all([
        sb
          .from('appointments')
          .select(
            'id,appointment_code,starts_at,status,notes,customers(first_name,last_name),services(name),staff(full_name)',
          )
          .is('archived_at', null)
          .order('starts_at', { ascending: true })
          .limit(200),
        sb
          .from('products')
          .select('id,name,status,view_count,appointment_count,featured')
          .is('deleted_at', null)
          .order('view_count', { ascending: false })
          .limit(8),
        sb.from('appointments').select('id', { count: 'exact', head: true }).is('archived_at', null).in('status', activeStatuses).gte('starts_at', todayStart.toISOString()).lt('starts_at', tomorrowStart.toISOString()),
        sb.from('appointments').select('id', { count: 'exact', head: true }).is('archived_at', null).in('status', ['new', 'confirmed', 'contacted']).gt('starts_at', new Date().toISOString()),
        sb.from('appointments').select('id', { count: 'exact', head: true }).is('archived_at', null).eq('status', 'new'),
        sb.from('appointments').select('id', { count: 'exact', head: true }).is('archived_at', null).eq('status', 'completed'),
        sb.from('appointments').select('id', { count: 'exact', head: true }).is('archived_at', null).eq('status', 'cancelled'),
        sb
          .from('site_content')
          .select('content')
          .eq('section', 'rental_sales_operations')
          .maybeSingle(),
      ]);
    const appts = appointments || [];
    const rentals = Array.isArray(operations?.content?.rentals)
      ? operations.content.rentals
      : [];
    const activeRentals = rentals.filter(
      (item: any) => !['cancelled', 'completed'].includes(item.status),
    );
    return NextResponse.json({
      role,
      today,
      appointments: appts,
      products: products || [],
      metrics: {
        today: todayCount || 0,
        upcoming: upcomingCount || 0,
        new: newCount || 0,
        completed: completedCount || 0,
        cancelled: cancelledCount || 0,
        rentedToday: activeRentals.filter(
          (item: any) => item.start_date <= today && item.end_date >= today,
        ).length,
        returnsToday: activeRentals.filter(
          (item: any) => item.end_date === today,
        ).length,
      },
    });
  }
  if (view === 'appointments') {
    const [{ data, error }, { data: services }] = await Promise.all([
      sb
        .from('appointments')
        .select(
          '*,customers(*),services(name,duration_minutes),staff(full_name)',
        )
        .is('archived_at', null)
        .order('starts_at', { ascending: true })
        .limit(500),
      sb
        .from('services')
        .select('id,name,duration_minutes,capacity')
        .eq('active', true)
        .order('name'),
    ]);
    return NextResponse.json({
      role,
      items: data || [],
      services: services || [],
      error: error?.message,
    });
  }
  if (view === 'services') {
    const [{ data, error }, { data: settings }, { data: store }] =
      await Promise.all([
        sb
          .from('services')
          .select('*')
          .order('active', { ascending: false })
          .order('name'),
        sb
          .from('site_content')
          .select('content')
          .eq('section', 'appointmentSettings')
          .maybeSingle(),
        sb
          .from('stores')
          .select('id')
          .eq('active', true)
          .limit(1)
          .maybeSingle(),
      ]);
    const [{ data: workingHours }, { data: blockedDays }] = store
      ? await Promise.all([
          sb
            .from('working_hours')
            .select('weekday,opens_at,closes_at')
            .eq('store_id', store.id)
            .order('weekday'),
          sb
            .from('blocked_times')
            .select('starts_at')
            .eq('store_id', store.id)
            .eq('reason', 'ADMIN_CLOSED_DAY')
            .gte('ends_at', new Date().toISOString())
            .order('starts_at'),
        ])
      : [{ data: [] }, { data: [] }];
    return NextResponse.json({
      role,
      items: data || [],
      appointmentTimes: settings?.content?.times || [
        '10:00',
        '11:30',
        '13:00',
        '14:30',
        '16:00',
        '17:30',
      ],
      workingHours: workingHours || [],
      closedDates: (blockedDays || []).map((item: any) =>
        new Date(item.starts_at).toLocaleDateString('en-CA', {
          timeZone: 'Europe/Istanbul',
        }),
      ),
      error: error?.message,
    });
  }
  if (view === 'notifications') {
    const { data, error } = await sb
      .from('notifications')
      .select('id,kind,title,body,read_at,created_at')
      .order('created_at', { ascending: false })
      .limit(30);
    return NextResponse.json({
      role,
      items: data || [],
      error: error?.message,
    });
  }
  if (view === 'products') {
    const [{ data }, { data: categories }] = await Promise.all([
      sb
        .from('products')
        .select(
          '*,product_media(*),product_categories(category_id,categories(id,name,slug))',
        )
        .is('deleted_at', null)
        .order('updated_at', { ascending: false }),
      sb.from('categories').select('*').order('sort_order').order('name'),
    ]);
    return NextResponse.json({
      role,
      items: data || [],
      categories: categories || [],
    });
  }
  if (view === 'categories') {
    const [{ data: categories }, { data: showcase }] = await Promise.all([
      sb.from('categories').select('*').order('sort_order').order('name'),
      sb
        .from('site_content')
        .select('content')
        .eq('section', 'category_showcase')
        .maybeSingle(),
    ]);
    return NextResponse.json({
      role,
      items: categories || [],
      showcase: showcase?.content?.items || [],
    });
  }
  if (view === 'content') {
    const { data, error } = await sb
      .from('site_content')
      .select('section,content,updated_at')
      .order('section');
    return NextResponse.json({
      role,
      items: data || [],
      error: error?.message,
    });
  }
  if (view === 'contracts') {
    const [{ data, error }, { data: content }] = await Promise.all([
      sb.from('rental_contracts').select('id,contract_code,customer_name,phone,email,product_name,rental_start,rental_end,status,consent_at,created_at,pdf_path').is('archived_at', null).order('created_at', { ascending: false }).limit(500),
      sb.from('site_content').select('section,content').eq('section', 'rentalContract'),
    ]);
    const items = await Promise.all(
      (data || []).map(async (x) => {
        if (!x.pdf_path) return x;
        const { data: signed } = await sb.storage
          .from('rental-contracts')
          .createSignedUrl(x.pdf_path, 3600);
        return { ...x, pdf_url: signed?.signedUrl };
      }),
    );
    return NextResponse.json({ role, items, content: content || [], error: error?.message });
  }
  if (view === 'operations') {
    const [{ data: operations, error }, { data: products }] = await Promise.all(
      [
        sb
          .from('site_content')
          .select('content,updated_at')
          .eq('section', 'rental_sales_operations')
          .maybeSingle(),
        sb
          .from('products')
          .select(
            'id,code,name,description,colors,sizes,stock_quantity,rental_enabled,sale_enabled,product_media(path,is_cover,sort_order)',
          )
          .is('deleted_at', null)
          .neq('status', 'archived')
          .order('name'),
      ],
    );
    return NextResponse.json({
      role,
      items: operations?.content || { rentals: [], sales: [] },
      products: (products || []).map((product: any) => {
        let details: any = {};
        try {
          details = JSON.parse(product.description || '{}');
        } catch {}
        const variants = details.color_variants?.length
          ? details.color_variants
          : (product.colors || []).map((name: string) => ({ name }));
        return {
          ...product,
          color_variants: variants.length
            ? variants
            : [{ name: details.color || 'Renk' }],
        };
      }),
      error: error?.message,
    });
  }
  if (view === 'users') {
    if (role !== 'super_admin')
      return NextResponse.json(
        { error: 'Sadece Süper Yönetici kullanıcıları görüntüleyebilir.' },
        { status: 403 },
      );
    const [{ data: authUsers, error }, { data: profiles }, { data: roles }] =
      await Promise.all([
        sb.auth.admin.listUsers({ page: 1, perPage: 100 }),
        sb.from('profiles').select('id,full_name'),
        sb.from('user_roles').select('user_id,role'),
      ]);
    const profileMap = new Map(
      (profiles || []).map((x) => [x.id, x.full_name]),
    );
    const roleMap = new Map((roles || []).map((x) => [x.user_id, x.role]));
    return NextResponse.json({
      role,
      items: (authUsers?.users || []).map((user) => ({
        id: user.id,
        email: user.email,
        full_name:
          profileMap.get(user.id) || user.user_metadata?.full_name || '',
        role: roleMap.get(user.id) || '',
        active: roleMap.has(user.id),
        invited_at: user.invited_at,
        last_sign_in_at: user.last_sign_in_at,
        created_at: user.created_at,
      })),
      error: error?.message,
    });
  }
  if (view === 'settings') {
    const [
      { data: stores },
      { data: services },
      { data: staff },
      { data: content },
    ] = await Promise.all([
      sb.from('stores').select('*'),
      sb.from('services').select('*'),
      sb.from('staff').select('*'),
      sb.from('site_content').select('*'),
    ]);
    return NextResponse.json({
      role,
      stores: stores || [],
      services: services || [],
      staff: staff || [],
      content: content || [],
      emailProviderConfigured: Boolean(process.env.RESEND_API_KEY),
    });
  }
  return NextResponse.json({ error: 'Geçersiz görünüm.' }, { status: 400 });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (body.action === 'update_service' || body.action === 'delete_service') {
    const auth = await requireAdmin(request, ['super_admin', 'appointment_staff']);
    if ('error' in auth) return auth.error;
    const id = String(body.id || '');
    if (!id) return NextResponse.json({ error: 'Hizmet seçilmedi.' }, { status: 400 });
    if (body.action === 'delete_service') {
      const { count } = await auth.sb.from('appointments').select('id', { count: 'exact', head: true }).eq('service_id', id);
      if (count) {
        const { error } = await auth.sb.from('services').update({ active: false }).eq('id', id);
        return NextResponse.json({ ok: !error, deactivated: true, error: error?.message }, { status: error ? 409 : 200 });
      }
      const { error } = await auth.sb.from('services').delete().eq('id', id);
      return NextResponse.json({ ok: !error, error: error?.message }, { status: error ? 409 : 200 });
    }
    const name = String(body.name || '').trim();
    const duration = Number(body.duration_minutes);
    if (name.length < 2 || !Number.isFinite(duration) || duration < 15 || duration > 480)
      return NextResponse.json({ error: 'Geçerli bir hizmet adı ve süre girin.' }, { status: 400 });
    const { data, error } = await auth.sb.from('services').update({ name, duration_minutes: duration }).eq('id', id).select().single();
    return NextResponse.json({ data, error: error?.message }, { status: error ? 409 : 200 });
  }
  if (body.action === 'send_test_email') {
    const auth = await requireAdmin(request, ['super_admin']);
    if ('error' in auth) return auth.error;
    if (!process.env.RESEND_API_KEY)
      return NextResponse.json(
        { error: 'RESEND_API_KEY sunucu ayarlarında tanımlı değil.' },
        { status: 503 },
      );
    const settings = await getEmailSettings(auth.sb);
    const recipient = String(
      body.email || settings?.notificationEmail || settings?.replyTo || '',
    ).trim();
    if (!settings?.fromEmail || !recipient)
      return NextResponse.json(
        { error: 'Gönderen ve test alıcı e-posta adreslerini doldurun.' },
        { status: 400 },
      );
    const result = await sendEmail(
      settings,
      recipient,
      'Honey Collection test e-postası',
      'E-posta gönderim ayarlarınız doğru çalışıyor.',
      `email-test-${Date.now()}`,
    );
    if (!result.sent)
      return NextResponse.json(
        {
          error:
            result.reason === 'provider_error'
              ? 'E-posta sağlayıcısı gönderimi reddetti. Gönderen alan adının doğrulandığını kontrol edin.'
              : 'E-posta gönderimi yapılandırılmamış.',
        },
        { status: 502 },
      );
    return NextResponse.json({ message: `Test e-postası ${recipient} adresine gönderildi.` });
  }
  if (body.action === 'create_service') {
    const auth = await requireAdmin(request, [
      'super_admin',
      'appointment_staff',
    ]);
    if ('error' in auth) return auth.error;
    const name = String(body.name || '').trim();
    const hours = String(body.hours || '').trim();
    const duration = hours ? Math.round(Number(hours) * 60) : 60;
    if (name.length < 2)
      return NextResponse.json(
        { error: 'Hizmet adını yazın.' },
        { status: 400 },
      );
    if (!Number.isFinite(duration) || duration < 15 || duration > 480)
      return NextResponse.json(
        { error: 'Süre 15 dakika ile 8 saat arasında olmalıdır.' },
        { status: 400 },
      );
    const { data, error } = await auth.sb
      .from('services')
      .insert({
        name,
        duration_minutes: duration,
        buffer_minutes: 0,
        capacity: 1,
        active: true,
      })
      .select()
      .single();
    return NextResponse.json(
      { data, error: error?.message },
      { status: error ? 409 : 201 },
    );
  }
  if (body.action === 'create_appointment') {
    const auth = await requireAdmin(request, [
      'super_admin',
      'appointment_staff',
    ]);
    if ('error' in auth) return auth.error;
    const record = body.record || {};
    const required = [
      'first_name',
      'last_name',
      'phone',
      'email',
      'service_id',
      'date',
      'time',
    ];
    if (required.some((key) => !String(record[key] || '').trim()))
      return NextResponse.json(
        { error: 'Lütfen tüm zorunlu alanları doldurun.' },
        { status: 400 },
      );
    const [{ data: service }, { data: store }] = await Promise.all([
      auth.sb
        .from('services')
        .select('id,duration_minutes,capacity')
        .eq('id', record.service_id)
        .eq('active', true)
        .maybeSingle(),
      auth.sb
        .from('stores')
        .select('id')
        .eq('active', true)
        .limit(1)
        .maybeSingle(),
    ]);
    if (!service || !store)
      return NextResponse.json(
        { error: 'Aktif hizmet veya mağaza bulunamadı.' },
        { status: 409 },
      );
    const startsAt = new Date(`${record.date}T${record.time}:00+03:00`);
    if (Number.isNaN(startsAt.getTime()))
      return NextResponse.json(
        { error: 'Geçerli bir tarih ve saat seçin.' },
        { status: 400 },
      );
    const startsIso = startsAt.toISOString();
    const endsIso = new Date(
      startsAt.getTime() + service.duration_minutes * 60000,
    ).toISOString();
    const { count } = await auth.sb
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', store.id)
      .eq('starts_at', startsIso)
      .is('archived_at', null)
      .not('status', 'in', '(cancelled,no_show)');
    if ((count || 0) >= service.capacity)
      return NextResponse.json(
        { error: 'Bu saat için randevu kapasitesi dolu.' },
        { status: 409 },
      );
    const { data: customer, error: customerError } = await auth.sb
      .from('customers')
      .insert({
        first_name: String(record.first_name).trim(),
        last_name: String(record.last_name).trim(),
        phone: String(record.phone).trim(),
        email: String(record.email).trim(),
        consent_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (customerError || !customer)
      return NextResponse.json(
        { error: customerError?.message || 'Müşteri kaydedilemedi.' },
        { status: 409 },
      );
    const { data, error } = await auth.sb
      .from('appointments')
      .insert({
        customer_id: customer.id,
        store_id: store.id,
        service_id: service.id,
        starts_at: startsIso,
        ends_at: endsIso,
        status: 'new',
        notes: String(record.notes || '').trim() || null,
      })
      .select('appointment_code')
      .single();
    if (error) {
      await auth.sb.from('customers').delete().eq('id', customer.id);
      return NextResponse.json(
        { error: error.message || 'Randevu oluşturulamadı.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ data }, { status: 201 });
  }
  if (body.action === 'invite_admin') {
    const auth = await requireAdmin(request, ['super_admin']);
    if ('error' in auth) return auth.error;
    const email = String(body.email || '')
      .trim()
      .toLocaleLowerCase('tr-TR');
    const fullName = String(body.full_name || '').trim();
    const allowedRoles: AdminRole[] = [
      'super_admin',
      'content_manager',
      'product_manager',
      'appointment_staff',
    ];
    const invitedRole = body.role as AdminRole;
    if (!email || !email.includes('@') || !allowedRoles.includes(invitedRole))
      return NextResponse.json(
        { error: 'Geçerli bir e-posta ve yetki seçin.' },
        { status: 400 },
      );
    const configuredUrl = String(
      process.env.NEXT_PUBLIC_SITE_URL || '',
    ).replace(/\/$/, '');
    const requestOrigin = new URL(request.url).origin;
    const siteUrl =
      configuredUrl &&
      !/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(configuredUrl)
        ? configuredUrl
        : requestOrigin;
    const { data: invited, error } = await auth.sb.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${siteUrl}/admin/sifre-olustur`,
        data: { full_name: fullName },
      },
    );
    if (error || !invited.user)
      return NextResponse.json(
        { error: error?.message || 'Davet gönderilemedi.' },
        { status: 409 },
      );
    const userId = invited.user.id;
    const [{ error: profileError }, { error: roleError }] = await Promise.all([
      auth.sb
        .from('profiles')
        .upsert({ id: userId, full_name: fullName }, { onConflict: 'id' }),
      auth.sb
        .from('user_roles')
        .upsert(
          { user_id: userId, role: invitedRole },
          { onConflict: 'user_id,role' },
        ),
    ]);
    if (profileError || roleError) {
      await auth.sb.auth.admin.deleteUser(userId);
      return NextResponse.json(
        {
          error:
            profileError?.message || roleError?.message || 'Yetki atanamadı.',
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { data: { id: userId, email, full_name: fullName, role: invitedRole } },
      { status: 201 },
    );
  }
  if (body.action === 'create_operation') {
    const auth = await requireAdmin(request, [
      'super_admin',
      'product_manager',
      'appointment_staff',
    ]);
    if ('error' in auth) return auth.error;
    const kind = body.kind === 'sale' ? 'sale' : 'rental';
    const record = body.record || {};
    const required =
      kind === 'rental'
        ? [
            'product_id',
            'customer_name',
            'phone',
            'color',
            'start_date',
            'end_date',
          ]
        : ['product_id', 'customer_name', 'color', 'size', 'sold_at'];
    if (required.some((key) => !String(record[key] || '').trim()))
      return NextResponse.json(
        { error: 'Lütfen zorunlu alanları doldurun.' },
        { status: 400 },
      );
    if (kind === 'rental' && record.end_date < record.start_date)
      return NextResponse.json(
        { error: 'Teslim alma tarihi kiralama tarihinden önce olamaz.' },
        { status: 400 },
      );
    const [{ data: stored }, { data: product }] = await Promise.all([
      auth.sb
        .from('site_content')
        .select('content')
        .eq('section', 'rental_sales_operations')
        .maybeSingle(),
      auth.sb
        .from('products')
        .select(
          'id,code,name,stock_quantity,rental_enabled,sale_enabled,product_media(path,is_cover,sort_order)',
        )
        .eq('id', record.product_id)
        .is('deleted_at', null)
        .maybeSingle(),
    ]);
    if (!product)
      return NextResponse.json({ error: 'Ürün bulunamadı.' }, { status: 404 });
    if (kind === 'rental' && !product.rental_enabled)
      return NextResponse.json(
        { error: 'Bu ürün kiralamaya açık değil.' },
        { status: 409 },
      );
    if (kind === 'sale' && !product.sale_enabled)
      return NextResponse.json(
        { error: 'Bu ürün satışa açık değil.' },
        { status: 409 },
      );
    if (kind === 'sale' && Number(product.stock_quantity || 0) < 1)
      return NextResponse.json({ error: 'Bu ürünün stoğu tükenmiş.' }, { status: 409 });
    const content: any = stored?.content || { rentals: [], sales: [] };
    content.rentals = Array.isArray(content.rentals) ? content.rentals : [];
    content.sales = Array.isArray(content.sales) ? content.sales : [];
    const overlappingRentalCount = content.rentals.filter(
      (item: any) =>
        item.product_id === record.product_id &&
        (!item.color || item.color === record.color) &&
        item.status !== 'cancelled' &&
        record.start_date <= item.end_date &&
        record.end_date >= item.start_date,
    ).length;
    if (kind === 'rental' && overlappingRentalCount >= Number(product.stock_quantity || 0))
      return NextResponse.json(
        { error: 'Bu ürünün seçilen tarihlerdeki kiralama stoğu dolu.' },
        { status: 409 },
      );
    const media = Array.isArray(product.product_media)
      ? [...product.product_media].sort(
          (a: any, b: any) =>
            Number(b.is_cover) - Number(a.is_cover) ||
            Number(a.sort_order || 0) - Number(b.sort_order || 0),
        )
      : [];
    const item = {
      id: crypto.randomUUID(),
      ...record,
      product_name: product.name,
      product_code: product.code,
      product_image: media[0]?.path || '',
      status: kind === 'rental' ? 'reserved' : 'sold',
      created_at: new Date().toISOString(),
    };
    if (kind === 'rental') content.rentals.unshift(item);
    else content.sales.unshift(item);
    const { error } = await auth.sb.from('site_content').upsert(
      {
        section: 'rental_sales_operations',
        content,
        updated_at: new Date().toISOString(),
        updated_by: auth.user.id,
      },
      { onConflict: 'section' },
    );
    if (error)
      return NextResponse.json({ error: error.message }, { status: 409 });
    if (kind === 'sale' && Number(product.stock_quantity || 0) > 0)
      await auth.sb
        .from('products')
        .update({
          stock_quantity: Math.max(0, Number(product.stock_quantity) - 1),
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id);
    return NextResponse.json({ data: item }, { status: 201 });
  }
  const auth = await requireAdmin(request, ['super_admin', 'product_manager']);
  if ('error' in auth) return auth.error;
  const p = body.product || {};
  if (body.action === 'create_category') {
    const name = String(body.name || '').trim(),
      slug = String(body.slug || '').trim();
    if (!name || !slug)
      return NextResponse.json(
        { error: 'Kategori adı zorunludur.' },
        { status: 400 },
      );
    const { data, error } = await auth.sb
      .from('categories')
      .insert({
        name,
        slug,
        visible: true,
        sort_order: Number(body.sort_order || 0),
      })
      .select()
      .single();
    return NextResponse.json(
      { data, error: error?.message },
      { status: error ? 409 : 201 },
    );
  }
  if (body.action === 'update_category') {
    const id = String(body.id || ''),
      name = String(body.name || '').trim(),
      slug = String(body.slug || '').trim();
    if (!id || !name || !slug)
      return NextResponse.json(
        { error: 'Kategori adı zorunludur.' },
        { status: 400 },
      );
    const { data, error } = await auth.sb
      .from('categories')
      .update({ name, slug })
      .eq('id', id)
      .select()
      .single();
    return NextResponse.json(
      { data, error: error?.message },
      { status: error ? 409 : 200 },
    );
  }
  if (body.action === 'set_category_visibility') {
    const id = String(body.id || '');
    const { data, error } = await auth.sb
      .from('categories')
      .update({ visible: !!body.visible })
      .eq('id', id)
      .select()
      .single();
    return NextResponse.json(
      { data, error: error?.message },
      { status: error ? 409 : 200 },
    );
  }
  if (!p.name?.trim() || !p.code?.trim())
    return NextResponse.json(
      { error: 'Ürün adı ve ürün kodu zorunludur.' },
      { status: 400 },
    );
  if (!Number.isInteger(Number(p.stock_quantity)) || Number(p.stock_quantity) < 0)
    return NextResponse.json({ error: 'Stok adedi sıfır veya daha büyük bir tam sayı olmalıdır.' }, { status: 400 });
  const slugify = (value: string) =>
    value
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
  const baseSlug = slugify(String(p.name)),
    { data: slugMatch } = await auth.sb
      .from('products')
      .select('id')
      .eq('slug', baseSlug)
      .maybeSingle();
  p.slug = slugMatch ? `${baseSlug}-${slugify(String(p.code))}` : baseSlug;
  const allowed = [
    'code',
    'name',
    'slug',
    'description',
    'rental_price',
    'sale_price',
    'price_visible',
    'rental_enabled',
    'sale_enabled',
    'sizes',
    'colors',
    'stock_quantity',
    'featured',
    'new_arrival',
    'seo_title',
    'seo_description',
    'status',
  ];
  const row: any = {};
  for (const k of allowed) if (k in p) row[k] = p[k];
  row.description = JSON.stringify({
    version: 1,
    description: p.description || '',
    color: p.color || '',
    color_variants: p.color_variants || [],
    delivery_shipping_enabled: p.delivery_shipping_enabled !== false,
    delivery_shipping_fee: Number(p.delivery_shipping_fee ?? 300),
    delivery_store_enabled: p.delivery_store_enabled !== false,
  });
  row.rental_price = row.rental_price === '' ? null : row.rental_price;
  row.sale_price = row.sale_price === '' ? null : row.sale_price;
  row.stock_quantity = Number(row.stock_quantity);
  const { data, error } = await auth.sb
    .from('products')
    .insert(row)
    .select()
    .single();
  if (!error && data) {
    const requestedMedia = Array.isArray(p.media)
      ? p.media
      : (p.gallery || []).map((path: string) => ({ path }));
    if (requestedMedia.length) {
      const media = requestedMedia.map((item: any, index: number) => ({
        product_id: data.id,
        path: item.path,
        alt_text: JSON.stringify({
          name: p.name,
          color: item.color || '',
          hex: item.hex || '',
        }),
        sort_order: index,
        is_cover: index === 0,
      }));
      const { error: mediaError } = await auth.sb
        .from('product_media')
        .insert(media);
      if (mediaError)
        return NextResponse.json(
          { error: mediaError.message },
          { status: 409 },
        );
    }
    if (p.category_id) {
      const { error: categoryError } = await auth.sb
        .from('product_categories')
        .insert({ product_id: data.id, category_id: p.category_id });
      if (categoryError)
        return NextResponse.json(
          { error: categoryError.message },
          { status: 409 },
        );
    }
  }
  return NextResponse.json(
    { data, error: error?.message },
    { status: error ? 409 : 201 },
  );
}

export async function PUT(request: Request) {
  const auth = await requireAdmin(request, ['super_admin', 'product_manager']);
  if ('error' in auth) return auth.error;
  const body = await request.json(),
    p = body.product || {},
    id = String(body.id || '');
  if (!id || !p.name?.trim() || !p.code?.trim())
    return NextResponse.json(
      { error: 'Ürün adı ve kodu zorunludur.' },
      { status: 400 },
    );
  if (!Number.isInteger(Number(p.stock_quantity)) || Number(p.stock_quantity) < 0)
    return NextResponse.json({ error: 'Stok adedi sıfır veya daha büyük bir tam sayı olmalıdır.' }, { status: 400 });
  const row: any = { updated_at: new Date().toISOString() };
  for (const k of [
    'code',
    'name',
    'rental_price',
    'sale_price',
    'price_visible',
    'rental_enabled',
    'sale_enabled',
    'sizes',
    'colors',
    'stock_quantity',
    'featured',
    'new_arrival',
    'seo_title',
    'seo_description',
    'status',
  ])
    if (k in p) row[k] = p[k];
  row.rental_price = row.rental_price === '' ? null : row.rental_price;
  row.sale_price = row.sale_price === '' ? null : row.sale_price;
  row.stock_quantity = Number(row.stock_quantity);
  row.description = JSON.stringify({
    version: 1,
    description: p.description || '',
    color: p.color || '',
    color_variants: p.color_variants || [],
    delivery_shipping_enabled: p.delivery_shipping_enabled !== false,
    delivery_shipping_fee: Number(p.delivery_shipping_fee ?? 300),
    delivery_store_enabled: p.delivery_store_enabled !== false,
  });
  const { data, error } = await auth.sb
    .from('products')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 409 });
  await Promise.all([
    auth.sb.from('product_media').delete().eq('product_id', id),
    auth.sb.from('product_categories').delete().eq('product_id', id),
  ]);
  if (Array.isArray(p.media) && p.media.length) {
    const media = p.media.map((item: any, index: number) => ({
      product_id: id,
      path: item.path,
      alt_text: JSON.stringify({
        name: p.name,
        color: item.color || '',
        hex: item.hex || '',
      }),
      sort_order: index,
      is_cover: index === 0,
    }));
    const { error: e } = await auth.sb.from('product_media').insert(media);
    if (e) return NextResponse.json({ error: e.message }, { status: 409 });
  }
  if (p.category_id) {
    const { error: e } = await auth.sb
      .from('product_categories')
      .insert({ product_id: id, category_id: p.category_id });
    if (e) return NextResponse.json({ error: e.message }, { status: 409 });
  }
  return NextResponse.json({ data });
}

export async function DELETE(request: Request) {
  const requestUrl = new URL(request.url);
  const area = requestUrl.searchParams.get('area');
  const auth = await requireAdmin(
    request,
    area === 'operation' || area === 'contract' || area === 'appointment'
      ? ['super_admin', 'product_manager', 'appointment_staff']
      : ['super_admin', 'product_manager'],
  );
  if ('error' in auth) return auth.error;
  const id = requestUrl.searchParams.get('id');
  if (!id)
    return NextResponse.json(
      {
        error:
          area === 'operation'
            ? requestUrl.searchParams.get('kind') === 'sale'
              ? 'Satış kaydı seçilmedi.'
              : 'Kiralama kaydı seçilmedi.'
            : area === 'contract'
              ? 'Sözleşme seçilmedi.'
              : area === 'appointment'
                ? 'Randevu seçilmedi.'
                : 'Ürün seçilmedi.',
      },
      { status: 400 },
    );
  if (area === 'operation') {
    const kind = requestUrl.searchParams.get('kind') === 'sale' ? 'sale' : 'rental';
    const { data: stored } = await auth.sb
      .from('site_content')
      .select('content')
      .eq('section', 'rental_sales_operations')
      .maybeSingle();
    const content: any = stored?.content || { rentals: [], sales: [] };
    const rentals = Array.isArray(content.rentals) ? content.rentals : [];
    const sales = Array.isArray(content.sales) ? content.sales : [];
    const records = kind === 'sale' ? sales : rentals;
    const deletedRecord = records.find((item: any) => item.id === id);
    if (!deletedRecord)
      return NextResponse.json(
        { error: kind === 'sale' ? 'Satış kaydı bulunamadı.' : 'Kiralama kaydı bulunamadı.' },
        { status: 404 },
      );
    if (kind === 'sale')
      content.sales = sales.filter((item: any) => item.id !== id);
    else content.rentals = rentals.filter((item: any) => item.id !== id);
    const { error } = await auth.sb
      .from('site_content')
      .upsert(
        {
          section: 'rental_sales_operations',
          content,
          updated_at: new Date().toISOString(),
          updated_by: auth.user.id,
        },
        { onConflict: 'section' },
      );
    if (error)
      return NextResponse.json({ ok: false, error: error.message }, { status: 409 });
    if (kind === 'sale' && deletedRecord.product_id) {
      const { data: product } = await auth.sb
        .from('products')
        .select('stock_quantity')
        .eq('id', deletedRecord.product_id)
        .maybeSingle();
      if (product)
        await auth.sb
          .from('products')
          .update({
            stock_quantity: Number(product.stock_quantity || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', deletedRecord.product_id);
    }
    return NextResponse.json({ ok: true });
  }
  if (area === 'appointment') {
    const { data, error } = await auth.sb
      .from('appointments')
      .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .is('archived_at', null)
      .select('id')
      .maybeSingle();
    if (error)
      return NextResponse.json({ error: 'Randevu silinemedi.' }, { status: 409 });
    if (!data)
      return NextResponse.json({ error: 'Randevu bulunamadı.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  }
  if (area === 'contract') {
    const { data: contract } = await auth.sb.from('rental_contracts').select('pdf_path').eq('id', id).maybeSingle();
    if (!contract) return NextResponse.json({ error: 'Sözleşme bulunamadı.' }, { status: 404 });
    if (contract.pdf_path) await auth.sb.storage.from('rental-contracts').remove([contract.pdf_path]);
    const { error } = await auth.sb.from('rental_contracts').update({ archived_at: new Date().toISOString() }).eq('id', id);
    return NextResponse.json({ ok: !error, error: error?.message }, { status: error ? 409 : 200 });
  }
  const { error } = await auth.sb
    .from('products')
    .update({ deleted_at: new Date().toISOString(), status: 'archived' })
    .eq('id', id);
  return NextResponse.json(
    { ok: !error, error: error?.message },
    { status: error ? 409 : 200 },
  );
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const area = body.area as string;
  const roles: AdminRole[] =
    area === 'users'
      ? ['super_admin']
      : area === 'products' || area === 'categories'
        ? ['super_admin', 'product_manager']
        : area === 'operations'
          ? ['super_admin', 'product_manager', 'appointment_staff']
          : area === 'content'
            ? ['super_admin', 'content_manager']
            : area === 'appointment_settings' ||
                area === 'appointment_schedule' ||
                area === 'notifications'
              ? ['super_admin', 'appointment_staff']
              : area === 'settings'
                ? ['super_admin']
                : ['super_admin', 'appointment_staff'];
  const auth = await requireAdmin(request, roles);
  if ('error' in auth) return auth.error;
  const { sb, user } = auth;
  if (area === 'users') {
    if (auth.role !== 'super_admin')
      return NextResponse.json(
        { error: 'Sadece Süper Yönetici kullanıcıları yönetebilir.' },
        { status: 403 },
      );
    const userId = String(body.id || '');
    if (!userId)
      return NextResponse.json(
        { error: 'Kullanıcı seçilmedi.' },
        { status: 400 },
      );
    if (userId === user.id && body.action === 'revoke')
      return NextResponse.json(
        { error: 'Kendi yönetici erişiminizi kaldıramazsınız.' },
        { status: 409 },
      );
    if (body.action === 'revoke') {
      const { error } = await sb
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      return NextResponse.json(
        { ok: !error, error: error?.message },
        { status: error ? 409 : 200 },
      );
    }
    const allowedRoles: AdminRole[] = [
      'super_admin',
      'content_manager',
      'product_manager',
      'appointment_staff',
    ];
    const nextRole = body.role as AdminRole;
    if (!allowedRoles.includes(nextRole))
      return NextResponse.json({ error: 'Geçersiz yetki.' }, { status: 400 });
    const { error: deleteError } = await sb
      .from('user_roles')
      .delete()
      .eq('user_id', userId);
    if (deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 409 });
    const { error } = await sb
      .from('user_roles')
      .insert({ user_id: userId, role: nextRole });
    return NextResponse.json(
      { ok: !error, error: error?.message },
      { status: error ? 409 : 200 },
    );
  }
  if (area === 'operations') {
    const allowedStatuses = [
      'reserved',
      'confirmed',
      'delivered',
      'completed',
      'postponed',
      'cancelled',
    ];
    const id = String(body.id || '');
    const next = body.patch || {};
    if (!id)
      return NextResponse.json(
        { error: 'Kiralama kaydı seçilmedi.' },
        { status: 400 },
      );
    if (next.status && !allowedStatuses.includes(next.status))
      return NextResponse.json(
        { error: 'Geçersiz kiralama durumu.' },
        { status: 400 },
      );
    if (next.start_date && next.end_date && next.end_date < next.start_date)
      return NextResponse.json(
        { error: 'Teslim tarihi kiralama tarihinden önce olamaz.' },
        { status: 400 },
      );
    const { data: stored } = await sb
      .from('site_content')
      .select('content')
      .eq('section', 'rental_sales_operations')
      .maybeSingle();
    const content: any = stored?.content || { rentals: [], sales: [] };
    content.rentals = Array.isArray(content.rentals) ? content.rentals : [];
    const index = content.rentals.findIndex((item: any) => item.id === id);
    if (index < 0)
      return NextResponse.json(
        { error: 'Kiralama kaydı bulunamadı.' },
        { status: 404 },
      );
    const current = content.rentals[index];
    const updated = { ...current };
    for (const key of ['status', 'start_date', 'end_date', 'notes'])
      if (key in next) updated[key] = next[key];
    if (
      updated.status !== 'cancelled' &&
      content.rentals.some(
        (item: any, itemIndex: number) =>
          itemIndex !== index &&
          item.product_id === updated.product_id &&
          (!item.color || item.color === updated.color) &&
          item.status !== 'cancelled' &&
          updated.start_date <= item.end_date &&
          updated.end_date >= item.start_date,
      )
    )
      return NextResponse.json(
        {
          error:
            'Bu ürün ve renk yeni tarihlerde başka bir kiralamayla çakışıyor.',
        },
        { status: 409 },
      );
    updated.updated_at = new Date().toISOString();
    content.rentals[index] = updated;
    const { error } = await sb
      .from('site_content')
      .upsert(
        {
          section: 'rental_sales_operations',
          content,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        },
        { onConflict: 'section' },
      );
    return NextResponse.json(
      { data: updated, error: error?.message },
      { status: error ? 409 : 200 },
    );
  }
  if (area === 'appointments') {
    const patch: any = { updated_at: new Date().toISOString() };
    for (const k of [
      'status',
      'starts_at',
      'ends_at',
      'staff_id',
      'notes',
      'archived_at',
    ])
      if (k in body.patch) patch[k] = body.patch[k];
    const { data, error } = await sb
      .from('appointments')
      .update(patch)
      .eq('id', body.id)
      .select()
      .single();
    return NextResponse.json(
      { data, error: error?.message },
      { status: error ? 409 : 200 },
    );
  }
  if (area === 'products') {
    const allowed = [
      'code',
      'name',
      'slug',
      'description',
      'category',
      'rental_price',
      'sale_price',
      'price_visible',
      'rental_enabled',
      'sale_enabled',
      'sizes',
      'colors',
      'color',
      'stock_quantity',
      'featured',
      'new_arrival',
      'style',
      'event',
      'fabric',
      'sleeve',
      'neck',
      'fit',
      'lining',
      'care_instructions',
      'rental_terms',
      'image_url',
      'gallery',
      'seo_title',
      'seo_description',
      'status',
      'deleted_at',
    ];
    const patch: any = { updated_at: new Date().toISOString() };
    for (const k of allowed) if (k in body.patch) patch[k] = body.patch[k];
    const { data, error } = await sb
      .from('products')
      .update(patch)
      .eq('id', body.id)
      .select()
      .single();
    return NextResponse.json(
      { data, error: error?.message },
      { status: error ? 409 : 200 },
    );
  }
  if (area === 'categories') {
    const { data, error } = await sb
      .from('site_content')
      .upsert(
        {
          section: 'category_showcase',
          content: { items: body.items || [] },
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        },
        { onConflict: 'section' },
      )
      .select()
      .single();
    return NextResponse.json(
      { data, error: error?.message },
      { status: error ? 409 : 200 },
    );
  }
  if (area === 'appointment_settings') {
    const times = Array.isArray(body.times)
      ? [
          ...new Set(
            body.times
              .map((time: unknown) => String(time))
              .filter((time: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time)),
          ),
        ].sort()
      : [];
    if (!times.length)
      return NextResponse.json(
        { error: 'En az bir geçerli randevu saati ekleyin.' },
        { status: 400 },
      );
    const { data, error } = await sb
      .from('site_content')
      .upsert(
        {
          section: 'appointmentSettings',
          content: { times },
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        },
        { onConflict: 'section' },
      )
      .select()
      .single();
    return NextResponse.json(
      { data, error: error?.message },
      { status: error ? 409 : 200 },
    );
  }
  if (area === 'appointment_schedule') {
    const { data: store } = await sb
      .from('stores')
      .select('id')
      .eq('active', true)
      .limit(1)
      .maybeSingle();
    if (!store)
      return NextResponse.json(
        { error: 'Aktif mağaza bulunamadı.' },
        { status: 409 },
      );
    const days = Array.isArray(body.days)
      ? body.days.filter(
          (day: any) =>
            Number.isInteger(day.weekday) &&
            day.weekday >= 0 &&
            day.weekday <= 6 &&
            /^\d{2}:\d{2}$/.test(day.opensAt) &&
            /^\d{2}:\d{2}$/.test(day.closesAt) &&
            day.opensAt < day.closesAt,
        )
      : [];
    const closedDates: string[] = Array.isArray(body.closedDates)
      ? [
          ...new Set<string>(
            body.closedDates
              .map((date: unknown) => String(date))
              .filter((date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date)),
          ),
        ]
      : [];
    const { error: deleteHoursError } = await sb
      .from('working_hours')
      .delete()
      .eq('store_id', store.id);
    if (deleteHoursError)
      return NextResponse.json(
        { error: deleteHoursError.message },
        { status: 409 },
      );
    if (days.length) {
      const { error } = await sb
        .from('working_hours')
        .insert(
          days.map((day: any) => ({
            store_id: store.id,
            weekday: day.weekday,
            opens_at: day.opensAt,
            closes_at: day.closesAt,
          })),
        );
      if (error)
        return NextResponse.json({ error: error.message }, { status: 409 });
    }
    await sb
      .from('blocked_times')
      .delete()
      .eq('store_id', store.id)
      .eq('reason', 'ADMIN_CLOSED_DAY');
    if (closedDates.length) {
      const { error } = await sb
        .from('blocked_times')
        .insert(
          closedDates.map((date: string) => ({
            store_id: store.id,
            starts_at: new Date(`${date}T00:00:00+03:00`).toISOString(),
            ends_at: new Date(`${date}T23:59:59+03:00`).toISOString(),
            reason: 'ADMIN_CLOSED_DAY',
          })),
        );
      if (error)
        return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  }
  if (area === 'notifications') {
    const { error } = await sb
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .is('read_at', null);
    return NextResponse.json(
      { ok: !error, error: error?.message },
      { status: error ? 409 : 200 },
    );
  }
  if (area === 'content') {
    const { data, error } = await sb
      .from('site_content')
      .upsert(
        {
          section: body.section,
          content: body.content,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        },
        { onConflict: 'section' },
      )
      .select()
      .single();
    return NextResponse.json(
      { data, error: error?.message },
      { status: error ? 400 : 200 },
    );
  }
  return NextResponse.json({ error: 'Geçersiz işlem.' }, { status: 400 });
}
