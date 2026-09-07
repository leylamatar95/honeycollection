import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export type AdminRole='super_admin'|'content_manager'|'product_manager'|'appointment_staff';
export async function requireAdmin(request:Request,allowed:AdminRole[]){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token=request.headers.get('x-supabase-token')||request.headers.get('authorization')?.replace(/^Bearer\s+/,'');
  if(!url||!key||!anon||!token)return {error:NextResponse.json({error:'Oturum gerekli.'},{status:401})};
  const sb=createClient(url,key,{auth:{persistSession:false}});
  const authClient=createClient(url,anon,{auth:{persistSession:false}});
  const {data:{user}}=await authClient.auth.getUser(token);
  if(!user)return {error:NextResponse.json({error:'Oturum geçersiz.'},{status:401})};
  const {data:roles}=await sb.from('user_roles').select('role').eq('user_id',user.id);
  const role=(roles?.map(x=>x.role).find(x=>allowed.includes(x as AdminRole))) as AdminRole|undefined;
  if(!role)return {error:NextResponse.json({error:'Bu işlem için yetkiniz yok.'},{status:403})};
  return {sb,user,role};
}
