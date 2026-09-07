import {SiteHeader,SiteFooter} from '@/components/site-shell';
import {RentalContractForm} from '@/components/rental-contract-form';
import '../contract.css';

export const metadata={title:'Kiralama Sözleşmesi | Honey Collection'};
export default function ContractPage(){return <><SiteHeader/><main className="contract-page"><header><p>HONEY COLLECTION</p><h1>Kiralama Sözleşmesi</h1><span>Bilgilerinizi doldurun, sözleşmeyi okuyun ve imzanızı güvenle tamamlayın.</span></header><RentalContractForm/></main><SiteFooter/></>}
