import type {Metadata} from 'next';import {ProductDetail} from '@/components/product-detail';
export async function generateMetadata():Promise<Metadata>{return{title:'Ürün Detayı',description:'Honey Collection ürün detayları.'}}
export default async function Page({params}:{params:Promise<{slug:string}>}){const{slug}=await params;let decoded=slug;try{decoded=decodeURIComponent(slug)}catch{}return <ProductDetail slug={decoded}/>}
