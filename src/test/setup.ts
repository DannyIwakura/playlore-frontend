if (!('scrollIntoView' in window.HTMLElement.prototype)) {
  window.HTMLElement.prototype.scrollIntoView = () => {}
}

// jsdom define window.scrollTo pero lanza "Not implemented" al navegar con
// vue-router; el scroll no aporta nada en los tests.
window.scrollTo = (() => {}) as typeof window.scrollTo

// Node reserva el global localStorage (--experimental-webstorage) y lo deja
// indefinido en este entorno, asi que jsdom no llega a exponerlo. Los tests que
// tocan el token necesitan un Storage real: se usa el de jsdom si existe y, si
// no, uno en memoria con la misma interfaz.
if (!globalThis.localStorage) {
  const almacen = new Map<string, string>()
  const memoria: Storage = {
    get length() {
      return almacen.size
    },
    clear() {
      almacen.clear()
    },
    getItem(clave: string) {
      return almacen.get(clave) ?? null
    },
    key(indice: number) {
      return Array.from(almacen.keys())[indice] ?? null
    },
    removeItem(clave: string) {
      almacen.delete(clave)
    },
    setItem(clave: string, valor: string) {
      almacen.set(clave, String(valor))
    },
  }
  const disponible = window.localStorage ?? memoria
  Object.defineProperty(globalThis, 'localStorage', { value: disponible, configurable: true })
}

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList
}
