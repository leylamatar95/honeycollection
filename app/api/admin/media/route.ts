import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request, [
      'super_admin',
      'content_manager',
      'product_manager',
    ]);
    if ('error' in auth) return auth.error;
    const form = await request.formData(),
      file = form.get('file');
    if (!(file instanceof File))
      return NextResponse.json({ error: 'Dosya seçilmedi.' }, { status: 400 });
    if (!file.type.startsWith('image/') && file.type !== 'video/mp4')
      return NextResponse.json(
        { error: 'Yalnızca JPG, PNG, WebP, GIF veya MP4 yüklenebilir.' },
        { status: 400 },
      );
    if (file.size > 12 * 1024 * 1024)
      return NextResponse.json(
        { error: 'Dosya en fazla 12 MB olabilir.' },
        { status: 400 },
      );
    const ext =
        file.name
          .split('.')
          .pop()
          ?.replace(/[^a-z0-9]/gi, '') || 'bin',
      path = `site/${Date.now()}-${crypto.randomUUID()}.${ext}`,
      buffer = await file.arrayBuffer();
    const { error } = await auth.sb.storage
      .from('site-media')
      .upload(path, buffer, { contentType: file.type, upsert: false });
    if (error)
      return NextResponse.json(
        { error: `Fotoğraf yüklenemedi: ${error.message}` },
        { status: 500 },
      );
    const { data } = auth.sb.storage.from('site-media').getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message === 'fetch failed'
            ? 'Fotoğraf servisine bağlanılamadı. Lütfen birkaç saniye sonra tekrar deneyin.'
            : error?.message || 'Fotoğraf yüklenemedi.',
      },
      { status: 503 },
    );
  }
}
