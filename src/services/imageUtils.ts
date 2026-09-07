/**
 * Rasmlarni brauzerda avtomatik siqish va optimallashtirish (Canvas orqali)
 * Katta (3-10 MB) rasmlarni 100-200 KB gacha ixchamlashtiradi.
 */
export const compressImageFile = (
  file: File,
  maxWidth: number = 1280,
  maxHeight: number = 1280,
  quality: number = 0.75
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // O'lchamlarni proporsional kichraytirish
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        // Rasm chizish
        ctx.drawImage(img, 0, 0, width, height);

        // JPEG formatda siqilgan Base64 olish
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };

      img.onerror = () => {
        resolve(event.target?.result as string);
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};
