
import React from "react";
import { Platform } from "@/types/post";
import { Linkedin, Facebook, Instagram, Video, Globe, MessageCircle } from "lucide-react";

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
        return <Linkedin size={size} className="text-[#0077B5]" />;
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
