import { nextTick } from 'vue'

/**
 * Lleva el foco al primer campo marcado como inválido dentro del formulario.
 *
 * Se usa tras un fallo del backend: como los campos tienen `aria-describedby`
 * apuntando a su mensaje de error, al recibir el foco el lector de pantalla
 * anuncia el campo y su error sin necesidad de una región `aria-live` por campo.
 */
export async function enfocarPrimerError(contenedor: HTMLElement | null | undefined) {
  await nextTick()
  const campo = contenedor?.querySelector<HTMLElement>('[aria-invalid="true"]')
  campo?.focus()
}
