
import React from "react";
import { Platform } from "@/types/post";
import { Facebook, Instagram, Video, Globe, MessageCircle } from "lucide-react";

interface PlatformIconProps {
  platform: Platform;
  className?: string;
  size?: number;
}

const PlatformIcon: React.FC<PlatformIconProps> = ({ platform, className, size = 24 }) => {
  const getIcon = () => {
    switch (platform) {
      case "twitter":
        // Use X icon for Twitter
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="text-black">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        );
      case "linkedin":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" height={size} viewBox="0 0 72 72" width={size} fill="#0A66C2">
            <path d="M64,0H8C3.6,0,0,3.6,0,8v56c0,4.4,3.6,8,8,8h56c4.4,0,8-3.6,8-8V8C72,3.6,68.4,0,64,0z M21.8,62H11V27.3h10.7V62z M16.3,22.8c-3.5,0-6.3-2.9-6.3-6.4c0-3.5,2.8-6.4,6.3-6.4s6.3,2.9,6.3,6.4C22.7,19.9,19.9,22.8,16.3,22.8z M62,62H51.3V43.8c0-5-1.9-7.8-5.8-7.8c-4.3,0-6.5,2.9-6.5,7.8V62H28.6V27.3h10.3v4.7c0,0,3.1-5.7,10.5-5.7c7.4,0,12.6,4.5,12.6,13.8V62z"/>
          </svg>
        );
      case "facebook":
        return <Facebook size={size} className="text-[#1877F2]" />;
      case "instagram":
        return <Instagram size={size} className="text-[#E4405F]" />;
      case "tiktok":
        return <Video size={size} className="text-[#000000]" />;
      case "bluesky":
        return <Globe size={size} className="text-[#0081FF]" />;
      case "threads":
        return <MessageCircle size={size} className="text-[#000000]" />;
      default:
        return <Globe size={size} />;
    }
  };

  return (
    <div className={className}>
      {getIcon()}
    </div>
  );
};

export default PlatformIcon;
