import { PageCard } from '@/components/ui/PageCard';

export const StockItemsPage = () => <PageCard title="Stock Items">Item master CRUD (drug/supply, prices, reorder level).</PageCard>;
export const StockPurchasesPage = () => <PageCard title="Stock Purchases">Purchase entry creates stock batches with batch+expiry.</PageCard>;
export const StockExpiryPage = () => <PageCard title="Stock Expiry Alerts">Low stock + expiring in X days report.</PageCard>;
