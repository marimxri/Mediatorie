import React from 'react';
import {
  Gift as GiftIcon,
  CupSoda,
  Book,
  BookOpen,
  Smartphone,
  Mouse,
  PenTool,
  Umbrella,
  CircleDot,
  Pencil,
  Sun,
  StickyNote,
  Package,
  Boxes,
  Heart
} from 'lucide-react';

interface IconHelperProps {
  iconName: string;
  className?: string;
}

export const IconHelper: React.FC<IconHelperProps> = ({ iconName, className = "w-5 h-5" }) => {
  switch (iconName) {
    case 'fa-bottle-water':
      return <CupSoda className={className} />;
    case 'fa-book':
      return <Book className={className} />;
    case 'fa-book-open':
      return <BookOpen className={className} />;
    case 'fa-mobile-screen-button':
      return <Smartphone className={className} />;
    case 'fa-computer-mouse':
      return <Mouse className={className} />;
    case 'fa-pen-nib':
      return <PenTool className={className} />;
    case 'fa-umbrella':
      return <Umbrella className={className} />;
    case 'fa-circle-dot':
      return <CircleDot className={className} />;
    case 'fa-pencil':
      return <Pencil className={className} />;
    case 'fa-umbrella-beach':
      return <Sun className={className} />;
    case 'fa-note-sticky':
      return <StickyNote className={className} />;
    case 'fa-boxes-packing':
      return <Boxes className={className} />;
    case 'fa-heart':
      return <Heart className={className} />;
    case 'fa-gift':
    default:
      return <GiftIcon className={className} />;
  }
};
