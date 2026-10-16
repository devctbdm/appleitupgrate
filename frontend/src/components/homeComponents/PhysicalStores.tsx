import { MapPin, Search } from "lucide-react";
import Link from "next/link";

const PhysicalStores = () => {
  return (
    <div className="bg-linear-to-r from-slate-900 to-slate-700 py-12 my-12 rounded-lg px-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <MapPin className="text-white" size={50} />
          <div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white">30+ Physical Stores</h2>
            <p className="text-white">Visit Our Store & Get Your Desired IT Product!</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/physical-stores"
            className="flex gap-x-4 items-center text-white font-extrabold hover:scale-105 transition-transform px-8 py-4 rounded-full bg-linear-to-r from-violet-600 to-indigo-600"
          >
            Find Our Stores <Search size={20} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PhysicalStores;
