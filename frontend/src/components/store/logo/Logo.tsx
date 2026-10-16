"use client";

import Image from "next/image";
import Link from "next/link";

const Logo = () => {
  return (
    <div>
      <Link href="/" className="flex items-center gap-2">
        <div className="relative w-10 h-10">
          <Image
          src="/Apple.svg"
          alt="Apple IT Zone"
          fill
          priority
          className="object-contain"
          sizes="40px"
        />
        </div>

        <div className="relative w-32 h-12">
          <Image
          src="/LText.svg"
          alt="Apple IT Zone"
          fill
          priority
          className="object-contain"
          sizes="128px"
        />
        </div>
      </Link>
    </div>
  );
};

export default Logo;
