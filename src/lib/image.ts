// =====================================================================
//  Procesado de imágenes en el cliente (sin Firebase Storage)
//  Recorta a cuadrado, redimensiona y comprime a JPEG (data URL).
// =====================================================================

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen"));
    };
    img.src = url;
  });
}

/**
 * Convierte un archivo de imagen en un data URL JPEG cuadrado y comprimido,
 * apto para guardarse como avatar dentro de un documento de Firestore.
 */
export async function fileToAvatarDataUrl(
  file: File,
  size = 360,
  quality = 0.8
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("El archivo no es una imagen");
  }
  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");

  // Recorte central cuadrado (cover)
  const s = Math.min(img.width, img.height);
  const sx = (img.width - s) / 2;
  const sy = (img.height - s) / 2;
  ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);

  return canvas.toDataURL("image/jpeg", quality);
}
