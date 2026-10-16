'use client';
import { CategoryNav } from '@/components/store/layout/CategoryNav';
import Footer from '@/components/store/layout/Footer';
import TopNav from '@/components/store/layout/TopNav';
import StoreQuickActions from '@/components/store/layout/StoreQuickActions';
import MobileBottomNav from '@/components/store/layout/MobileBottomNav';
import { MaintenanceGuard } from '@/components/MaintenanceGuard';
import PopupOfferDialog from '@/components/store/PopupOfferDialog';

const StoreLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <MaintenanceGuard>
      <div>
        <div className="print:hidden">
          <TopNav />
          <CategoryNav />
          <StoreQuickActions />
        </div>
        <div className="pt-32 lg:pt-40">{children}</div>
        <div className="print:hidden">
          <Footer />
        </div>
        <div className="print:hidden">
          <MobileBottomNav />
        </div>
        <PopupOfferDialog />
      </div>
    </MaintenanceGuard>
  );
};

export default StoreLayout;
