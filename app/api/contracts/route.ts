import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { pdfFontBase64 } from '@/lib/pdf-font';
import { getEmailSettings, renderTemplate, sendEmail } from '@/lib/email';

const schema = z
  .object({
    customerName: z
      .string()
      .trim()
      .min(3, 'Lütfen ad ve soyadınızı yazın.')
      .max(120),
    phone: z
      .string()
      .trim()
      .min(10, 'Telefon numarası en az 10 rakam olmalıdır.')
      .max(20, 'Telefon numarası çok uzun.'),
    email: z.string().email('Geçerli bir e-posta adresi yazın.'),
    productName: z.string().trim().min(2, 'Lütfen bir ürün seçin.').max(160),
    productColor: z.string().trim().min(1, 'Lütfen bir renk seçin.').max(80),
    rentalStart: z.string().date('Teslim tarihini seçin.'),
    rentalEnd: z.string().date('İade tarihini seçin.'),
    depositNote: z
      .string()
      .max(300, 'Not alanı en fazla 300 karakter olabilir.')
      .optional(),
    contractText: z.string().min(100, 'Sözleşme metni eksik.').max(15000),
    signature: z
      .string()
      .startsWith('data:image/png;base64,', 'İmza kaydı geçersiz.')
      .max(500000, 'İmza kaydı çok büyük.'),
    consent: z.literal(true, { error: 'Sözleşmeyi kabul etmeniz gerekiyor.' }),
  })
  .refine((x) => x.rentalEnd >= x.rentalStart, {
    message: 'İade tarihi teslim tarihinden önce olamaz.',
  });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || '';
    return NextResponse.json(
      {
        error: message.startsWith('Invalid input')
          ? 'Lütfen tüm zorunlu alanları eksiksiz doldurun.'
          : message || 'Lütfen bilgilerinizi kontrol edin.',
      },
      { status: 400 },
    );
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    return NextResponse.json(
      { error: 'Sözleşme sistemi henüz veritabanına bağlanmadı.' },
      { status: 503 },
    );
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const x = parsed.data,
    storedProductName = `${x.productName} · ${x.productColor}`;
  const [
    { data: conflicts, error: availabilityError },
    { data: operations },
    { data: product },
  ] =
    await Promise.all([
      sb
        .from('rental_contracts')
        .select('id')
        .in('product_name', [x.productName, storedProductName])
        .in('status', ['signed', 'confirmed', 'active'])
        .lte('rental_start', x.rentalEnd)
        .gte('rental_end', x.rentalStart),
      sb
        .from('site_content')
        .select('content')
        .eq('section', 'rental_sales_operations')
        .maybeSingle(),
      sb
        .from('products')
        .select('id,stock_quantity')
        .eq('name', x.productName)
        .eq('rental_enabled', true)
        .is('deleted_at', null)
        .maybeSingle(),
    ]);
  if (availabilityError)
    return NextResponse.json(
      { error: 'Tarih uygunluğu kontrol edilemedi. Lütfen tekrar deneyin.' },
      { status: 500 },
    );
  if (!product || Number(product.stock_quantity || 0) < 1)
    return NextResponse.json(
      { error: 'Bu ürünün kiralama stoğu bulunmuyor.' },
      { status: 409 },
    );
  const adminConflictCount =
    Array.isArray(operations?.content?.rentals) &&
    operations.content.rentals.filter(
      (item: any) =>
        item.status !== 'cancelled' &&
        (item.product_id === product.id || item.product_name === x.productName) &&
        (!item.color || item.color === x.productColor) &&
        x.rentalStart <= item.end_date &&
        x.rentalEnd >= item.start_date,
    ).length;
  if ((conflicts?.length || 0) + Number(adminConflictCount || 0) >= Number(product.stock_quantity))
    return NextResponse.json(
      {
        error: `Seçtiğiniz tarihte ${x.productColor} renk için kiralama stoğu dolu. Lütfen başka bir renk veya tarih seçin.`,
      },
      { status: 409 },
    );
  const { data, error } = await sb
    .from('rental_contracts')
    .insert({
      customer_name: x.customerName,
      phone: x.phone,
      email: x.email,
      product_name: storedProductName,
      rental_start: x.rentalStart,
      rental_end: x.rentalEnd,
      deposit_note: x.depositNote || null,
      contract_text: x.contractText,
      signature_data_url: x.signature,
      contract_version: '1.0',
      status: 'signed',
    })
    .select('id,contract_code,consent_at')
    .single();
  if (error)
    return NextResponse.json(
      {
        error: error.message.includes('rental_contracts')
          ? 'Sözleşme tablosu henüz kurulmadı. Veritabanı güncellemesini uygulayın.'
          : 'Sözleşme kaydedilemedi.',
      },
      { status: 500 },
    );
  try {
    const pdf = await createContractPdf(
      request,
      x,
      data.contract_code,
      data.consent_at,
    );
    await sb.storage.createBucket('rental-contracts', {
      public: false,
      fileSizeLimit: 5000000,
      allowedMimeTypes: ['application/pdf'],
    });
    const path = `${new Date().getFullYear()}/${data.id}.pdf`;
    const uploaded = await sb.storage
      .from('rental-contracts')
      .upload(path, pdf, { contentType: 'application/pdf', upsert: true });
    if (uploaded.error) throw uploaded.error;
    await sb
      .from('rental_contracts')
      .update({ pdf_path: path })
      .eq('id', data.id);
    const settings = await getEmailSettings(sb);
    const template =
      settings?.rentalTemplate ||
      'Merhaba {{name}},\n\n{{product}} için {{startDate}} – {{endDate}} tarihleri arasındaki kiralama talebiniz alındı.\nSözleşme numaranız: {{code}}';
    const values = {
      name: x.customerName,
      product: storedProductName,
      startDate: x.rentalStart,
      endDate: x.rentalEnd,
      code: data.contract_code,
    };
    const email = await sendEmail(
      settings,
      x.email,
      renderTemplate(
        settings?.rentalSubject || 'Kiralama talebiniz alındı · {{code}}',
        values,
      ),
      renderTemplate(template, values),
      `rental-${data.id}`,
    );
    if (!email.sent)
      console.error('Rental confirmation email error', email.reason, email.error || '');
    return NextResponse.json({ ...data, pdfReady: true, emailSent: email.sent });
  } catch (e) {
    console.error('Rental contract PDF error', e);
    await sb.from('rental_contracts').delete().eq('id', data.id);
    return NextResponse.json(
      { error: 'İmzalı PDF oluşturulamadı. Lütfen tekrar deneyin.' },
      { status: 500 },
    );
  }
}

async function createContractPdf(
  request: Request,
  x: z.infer<typeof schema>,
  code: string,
  signedAt: string,
) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fontBytes = Uint8Array.from(atob(pdfFontBase64), (c) =>
    c.charCodeAt(0),
  );
  const font = await pdf.embedFont(fontBytes, { subset: true });
  const signatureBytes = Uint8Array.from(atob(x.signature.split(',')[1]), (c) =>
    c.charCodeAt(0),
  );
  const signature = await pdf.embedPng(signatureBytes);
  const width = 595,
    height = 842,
    margin = 52,
    line = 15;
  let page = pdf.addPage([width, height]),
    y = height - 55,
    pageNo = 1;
  const text = (value: string, size = 10, color = rgb(0.15, 0.14, 0.12)) => {
    page.drawText(value, { x: margin, y, size, font, color });
    y -= line;
  };
  const newPage = () => {
    page.drawText(`Honey Collection · ${code} · Sayfa ${pageNo}`, {
      x: margin,
      y: 24,
      size: 7,
      font,
      color: rgb(0.45, 0.42, 0.38),
    });
    page = pdf.addPage([width, height]);
    pageNo++;
    y = height - 55;
  };
  const wrap = (value: string, max = 78) => {
    const words = value.split(/\s+/),
      rows: string[] = [];
    let row = '';
    for (const word of words) {
      if ((row + ' ' + word).trim().length > max) {
        rows.push(row);
        row = word;
      } else row = (row + ' ' + word).trim();
    }
    if (row) rows.push(row);
    return rows;
  };
  page.drawText('HONEY COLLECTION', {
    x: margin,
    y,
    size: 10,
    font,
    color: rgb(0.66, 0.49, 0.16),
  });
  y -= 28;
  page.drawText('ABIYE KIRALAMA SOZLESMESI', {
    x: margin,
    y,
    size: 22,
    font,
    color: rgb(0.08, 0.08, 0.07),
  });
  y -= 34;
  [
    ['Sözleşme No', code],
    ['Müşteri', x.customerName],
    ['Telefon', x.phone],
    ['E-posta', x.email],
    ['Ürün', x.productName],
    ['Renk', x.productColor],
    ['Teslim Tarihi', x.rentalStart],
    ['İade Tarihi', x.rentalEnd],
    ['Depozito / Not', x.depositNote || '-'],
  ].forEach(([a, b]) => {
    page.drawText(`${a}:`, {
      x: margin,
      y,
      size: 9,
      font,
      color: rgb(0.42, 0.35, 0.22),
    });
    page.drawText(b, { x: 155, y, size: 9, font });
    y -= 18;
  });
  y -= 8;
  for (const paragraph of x.contractText.split('\n')) {
    if (!paragraph.trim()) {
      y -= 8;
      continue;
    }
    for (const row of wrap(paragraph)) {
      if (y < 70) newPage();
      text(row, 9);
    }
    y -= 4;
  }
  if (y < 220) newPage();
  y -= 8;
  page.drawText('MUSTERI ONAYI VE IMZASI', {
    x: margin,
    y,
    size: 11,
    font,
    color: rgb(0.66, 0.49, 0.16),
  });
  y -= 23;
  wrap(
    'Müşteri, sözleşmenin tamamını okuduğunu, anladığını ve belirtilen tarihte kendi iradesiyle onayladığını kabul eder.',
    80,
  ).forEach((r) => text(r, 9));
  y -= 8;
  page.drawText(`İmzalayan: ${x.customerName}`, {
    x: margin,
    y,
    size: 9,
    font,
  });
  y -= 17;
  page.drawText(`Onay zamanı: ${new Date(signedAt).toLocaleString('tr-TR')}`, {
    x: margin,
    y,
    size: 9,
    font,
  });
  y -= 92;
  const scaled = signature.scaleToFit(210, 72);
  page.drawImage(signature, {
    x: margin,
    y,
    width: scaled.width,
    height: scaled.height,
  });
  page.drawLine({
    start: { x: margin, y: y - 5 },
    end: { x: margin + 230, y: y - 5 },
    thickness: 0.7,
    color: rgb(0.35, 0.32, 0.28),
  });
  page.drawText(`Honey Collection · ${code} · Sayfa ${pageNo}`, {
    x: margin,
    y: 24,
    size: 7,
    font,
    color: rgb(0.45, 0.42, 0.38),
  });
  pdf.setTitle(`Honey Collection Kiralama Sözleşmesi ${code}`);
  pdf.setAuthor('Honey Collection');
  pdf.setCreationDate(new Date(signedAt));
  return await pdf.save();
}
