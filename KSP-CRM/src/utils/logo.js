// TaxBucket logo ko PDF ke liye PNG me badalna (jsPDF .webp nahi leta). Ek baar load hokar yaad rehta hai.
let logoCache = null;

export const loadLogo = () => {
  if (logoCache) return Promise.resolve(logoCache);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        logoCache = { dataUrl: canvas.toDataURL('image/png'), ratio: img.naturalWidth / img.naturalHeight };
        resolve(logoCache);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null); // logo na mile toh PDF bina logo ke ban jaye
    img.src = '/taxbucket-logo.webp';
  });
};

// PDF ke header me likhne ke liye company ki jaankari
export const COMPANY = {
  brand: 'TaxBucket',
  legalName: 'SkyEdge TaxBucket India Private Limited',
  tagline: 'Tax | Accounting | Compliance | Business Advisory',
  contact: 'www.TaxBucket.in  |  011-4646-6266'
};
