export const categories=[
 {name:'Kiralık Abiyeler',slug:'kiralik-abiyeler',children:['Nişan Elbiseleri','Kına Elbiseleri','Düğün ve Davet','Mezuniyet Elbiseleri','Tesettür Abiye','Büyük Beden Abiye','Uzun Abiye','Midi ve Kısa Abiye']},
 {name:'Satılık Abiyeler',slug:'satilik-abiyeler',children:[]},{name:'Özel Dikim',slug:'ozel-dikim',children:[]},{name:'Yeni Gelenler',slug:'yeni-gelenler',children:[]},{name:'Çok Tercih Edilenler',slug:'cok-tercih-edilenler',children:[]},{name:'Sezon Koleksiyonu',slug:'sezon-koleksiyonu',children:[]},{name:'İndirimli Ürünler',slug:'indirimli-urunler',children:[]}
];
export const products=[
 {id:1,slug:'livia-pudra-dantel-abiye',name:'Livia Pudra Dantel Abiye',code:'HC-2601',category:'Nişan Elbiseleri',type:'Kiralık',color:'Pudra',sizes:['36','38','40','42'],style:'Romantik',event:'Nişan',fabric:'Dantel',sleeve:'Uzun Kol',neck:'Hakim Yaka',price:'₺7.500',priceVisible:false,new:true,featured:true,image:'',gallery:[]},
 {id:2,slug:'alessa-buz-mavisi-pelerinli-abiye',name:'Alessa Buz Mavisi Pelerinli Abiye',code:'HC-2602',category:'Düğün ve Davet',type:'Kiralık · Satılık',color:'Buz Mavisi',sizes:['36','38','40','42'],style:'Işıltılı',event:'Davet',fabric:'İşlemeli Tül',sleeve:'Pelerin Kol',neck:'Hakim Yaka',price:'₺12.900',priceVisible:false,new:true,featured:true,image:'',gallery:[]},
 {id:3,slug:'selene-pudra-pelerinli-abiye',name:'Selene Pudra Pelerinli Abiye',code:'HC-2603',category:'Tesettür Abiye',type:'Kiralık · Satılık',color:'Pudra',sizes:['38','40','42','44'],style:'Zamansız',event:'Düğün',fabric:'Fransız Dantel',sleeve:'Uzun Kol',neck:'Hakim Yaka',price:'₺9.800',priceVisible:false,new:false,featured:true,image:'',gallery:[]},
 {id:4,slug:'bianca-gumus-pelerinli-abiye',name:'Bianca Gümüş Pelerinli Abiye',code:'HC-2604',category:'Düğün ve Davet',type:'Satılık',color:'Gümüş',sizes:['34','36','38','40'],style:'Glamour',event:'Düğün',fabric:'İşlemeli Tül',sleeve:'Pelerin',neck:'Madonna Yaka',price:'₺18.900',priceVisible:false,new:true,featured:true,image:'',gallery:[]}
];
export type Product=typeof products[number];
