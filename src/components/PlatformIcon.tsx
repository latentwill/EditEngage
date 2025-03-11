
import React from "react";
import { Platform } from "@/types/post";
import { Twitter, Linkedin, Facebook, Instagram, Video, Globe } from "lucide-react";

interface PlatformIconProps {
  platform: Platform;
  className?: string;
  size?: number;
}

const PlatformIcon: React.FC<PlatformIconProps> = ({ platform, className, size = 16 }) => {
  const getIcon = () => {
    switch (platform) {
      case "twitter":
        return <Twitter size={size} className="text-[#1DA1F2]" />;
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
