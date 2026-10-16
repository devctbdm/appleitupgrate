import FeaturedCategory from '@/components/homeComponents/FeaturedCategory';
import FeaturedProducts from '@/components/homeComponents/FeaturedProducts';
import HomeSlider from '@/components/homeComponents/HomeSlider';
import NotifidText from '@/components/homeComponents/NotifidText';
import PhysicalStores from '@/components/homeComponents/PhysicalStores';
import ServiceBox from '@/components/homeComponents/ServiceBox';
import HomeContentDisplay from '@/components/HomeContentDisplay';

const HomePage = () => {
  return (
    <div className="max-w-7xl mx-auto">
      <HomeSlider />

      <NotifidText />

      <ServiceBox />

      <FeaturedCategory />

      <PhysicalStores />

      <FeaturedProducts />

      <HomeContentDisplay />
    </div>
  );
};

export default HomePage;
