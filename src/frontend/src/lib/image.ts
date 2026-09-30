const LADO_MAXIMO = 900;
const CALIDAD = 0.72;

/**
 * Reduce y comprime una foto a JPEG para que quepa en el almacenamiento
 * local del dispositivo. Devuelve un data URL.
 */
export async function comprimirFoto(archivo: File): Promise<string> {
  const dataUrl = await leerArchivo(archivo);
  const imagen = await cargarImagen(dataUrl);

  const escala = Math.min(
    1,
    LADO_MAXIMO / Math.max(imagen.width, imagen.height),
  );
  const ancho = Math.max(1, Math.round(imagen.width * escala));
  const alto = Math.max(1, Math.round(imagen.height * escala));

  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(imagen, 0, 0, ancho, alto);
  return lienzo.toDataURL("image/jpeg", CALIDAD);
}

function leerArchivo(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result));
    lector.onerror = () => reject(new Error("No se pudo leer la foto."));
    lector.readAsDataURL(archivo);
  });
}

function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const imagen = new Image();
    imagen.onload = () => resolve(imagen);
    imagen.onerror = () => reject(new Error("La foto no es válida."));
    imagen.src = src;
  });
}
