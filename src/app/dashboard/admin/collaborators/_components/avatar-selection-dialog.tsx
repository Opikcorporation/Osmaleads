
'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';

interface AvatarSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

export function AvatarSelectionDialog({ isOpen, onClose, onSelect }: AvatarSelectionDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Sélectionner un Avatar</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 p-4">
            {PlaceHolderImages.map((img) => (
              <div
                key={img.id}
                className="relative aspect-square cursor-pointer overflow-hidden rounded-lg transition-transform hover:scale-105"
                onClick={() => onSelect(img.imageUrl)}
              >
                <Image
                  src={img.imageUrl}
                  alt={img.description}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 33vw, 20vw"
                  data-ai-hint={img.imageHint}
                />
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
