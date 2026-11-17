<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import NavBar from '../../components/NavBar.vue'
import Footer from '../../components/Footer.vue'
import PaginadorComponent from '../../components/PaginadorComponent.vue'
import TarjetaPersonaje from '../../components/TarjetaPersonaje.vue'
import api from '../../services/api'

interface Categoria {
  idCategoria: number
  nombre: string
  tipo: string
}

interface Personaje {
  idPersonaje: number
  nombre: string
  genero: string | null
  raza: string | null
  clase: string | null
  edadPersonaje: number | null
  avatar: string | null
  trasfondo: string | null
}

interface Filtros {
  nombre: string
  genero: string
  raza: string
  clase: string
  // v-model.number devuelve '' al vaciar el campo, no null.
  edadMin: number | string | null
  edadMax: number | string | null
  categoriaId: number | null
}

const TAMANIO_PAGINA = 9
const filtrosVacios = (): Filtros => ({
  nombre: '',
  genero: '',
  raza: '',
  clase: '',
  edadMin: null,
  edadMax: null,
  categoriaId: null,
})

const filtros = ref<Filtros>(filtrosVacios())
const filtrosAbiertos = ref(true)
const categorias = ref<Categoria[]>([])
const errorCategorias = ref<string | null>(null)

const personajes = ref<Personaje[]>([])
const paginaActual = ref(0)
const totalPaginas = ref(0)
const totalElementos = ref(0)
const cargando = ref(false)
const buscado = ref(false)
const error = ref<string | null>(null)
const errorEdad = ref<string | null>(null)

const edadMinRef = ref<HTMLInputElement | null>(null)
const resultadosRef = ref<HTMLElement | null>(null)

const opcionesGenero = ['Masculino', 'Femenino', 'No binario', 'Otro']

const filtrosActivos = computed(() => {
  let total = 0
  if (filtros.value.nombre.trim()) total++
  if (filtros.value.genero) total++
  if (filtros.value.raza.trim()) total++
  if (filtros.value.clase.trim()) total++
  if (edadNumero(filtros.value.edadMin) !== null) total++
  if (edadNumero(filtros.value.edadMax) !== null) total++
  if (filtros.value.categoriaId !== null) total++
  return total
})

const textoResultados = computed(() =>
  totalElementos.value === 1
    ? '1 personaje encontrado'
    : `${totalElementos.value} personajes encontrados`
)

const anuncio = computed(() => {
  if (cargando.value) return 'Buscando personajes…'
  if (error.value || !buscado.value) return ''
  if (personajes.value.length === 0) return 'No se encontraron personajes con esos criterios.'
  return `${textoResultados.value}.`
})

onMounted(async () => {
  try {
    const { data } = await api.get('/categorias', { params: { page: 0, size: 100 } })
    categorias.value = data.content ?? []
  } catch {
    errorCategorias.value = 'No pudimos cargar las categorías. Puedes buscar con el resto de filtros.'
  }
})

function edadNumero(valor: number | string | null): number | null {
  if (valor === null || valor === '') return null
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : null
}

function validarEdad(): boolean {
  const min = edadNumero(filtros.value.edadMin)
  const max = edadNumero(filtros.value.edadMax)

  if ((min !== null && min < 0) || (max !== null && max < 0)) {
    errorEdad.value = 'La edad no puede ser negativa.'
    return false
  }

  if (min !== null && max !== null && min > max) {
    errorEdad.value = 'La edad mínima no puede ser mayor que la edad máxima.'
    return false
  }

  errorEdad.value = null
  return true
}

const buscar = async (pagina = 0) => {
  if (!validarEdad()) {
    filtrosAbiertos.value = true
    await nextTick()
    edadMinRef.value?.focus()
    return
  }

  cargando.value = true
  error.value = null
  buscado.value = true

  try {
    const params: Record<string, string | number> = { page: pagina, size: TAMANIO_PAGINA }
    const min = edadNumero(filtros.value.edadMin)
    const max = edadNumero(filtros.value.edadMax)

    if (filtros.value.nombre.trim()) params.nombre = filtros.value.nombre.trim()
    if (filtros.value.genero) params.genero = filtros.value.genero
    if (filtros.value.raza.trim()) params.raza = filtros.value.raza.trim()
    if (filtros.value.clase.trim()) params.clase = filtros.value.clase.trim()
    if (min !== null) params.edadMin = min
    if (max !== null) params.edadMax = max
    if (filtros.value.categoriaId !== null) params.categoriaId = filtros.value.categoriaId

    const { data } = await api.get('/personajes/buscar', { params })
    personajes.value = data.content ?? []
    totalPaginas.value = data.totalPages ?? 0
    totalElementos.value = data.totalElements ?? personajes.value.length
    paginaActual.value = pagina
    await revelarResultados(pagina)
  } catch {
    personajes.value = []
    totalPaginas.value = 0
    totalElementos.value = 0
    error.value = 'No pudimos completar la búsqueda. Revisa tu conexión e inténtalo de nuevo.'
  } finally {
    cargando.value = false
  }
}

async function revelarResultados(pagina: number) {
  await nextTick()
  const el = resultadosRef.value
  if (!el) return

  // Al paginar siempre subimos; en la primera busqueda solo si los resultados quedan fuera de pantalla.
  if (pagina > 0 || el.getBoundingClientRect().top > window.innerHeight) {
    el.scrollIntoView({ block: 'start' })
  }
}

const limpiarFiltros = () => {
  filtros.value = filtrosVacios()
  personajes.value = []
  buscado.value = false
  totalElementos.value = 0
  totalPaginas.value = 0
  paginaActual.value = 0
  error.value = null
  errorEdad.value = null
}
</script>

<template>
  <NavBar :logeado="true" />

  <main class="pl-page">
    <div class="container">
      <header class="pl-page-header">
        <span class="pl-kicker">Explorar</span>
        <h1 class="pl-title">Buscar personajes</h1>
        <p class="pl-lead">
          Encuentra personajes de la comunidad por nombre, raza, clase, edad o categoría.
        </p>
      </header>

      <section class="pl-card filtros-panel" aria-labelledby="filtros-titulo">
        <h2 id="filtros-titulo" class="visually-hidden">Filtros de búsqueda</h2>

        <button
          type="button"
          class="filtros-toggle"
          :aria-expanded="filtrosAbiertos"
          aria-controls="filtros-campos"
          @click="filtrosAbiertos = !filtrosAbiertos"
        >
          <span class="filtros-toggle__titulo">
            <i class="bi bi-funnel" aria-hidden="true"></i>
            Filtros
          </span>
          <span class="filtros-toggle__meta">
            <span v-if="filtrosActivos > 0" class="pl-status-pill pl-status-pill--neutral">
              {{ filtrosActivos }} {{ filtrosActivos === 1 ? 'activo' : 'activos' }}
            </span>
            <span>{{ filtrosAbiertos ? 'Ocultar' : 'Mostrar' }}</span>
            <i
              class="bi"
              :class="filtrosAbiertos ? 'bi-chevron-up' : 'bi-chevron-down'"
              aria-hidden="true"
            ></i>
          </span>
        </button>

        <form
          v-show="filtrosAbiertos"
          id="filtros-campos"
          class="filtros-body"
          novalidate
          @submit.prevent="buscar(0)"
        >
          <div class="filtros-grid">
            <div class="filtro">
              <label class="form-label" for="filtro-nombre">Nombre del personaje</label>
              <input
                id="filtro-nombre"
                v-model="filtros.nombre"
                type="search"
                class="form-control"
                placeholder="Ej.: Aelin, Geralt…"
                autocomplete="off"
                enterkeyhint="search"
              />
            </div>

            <div class="filtro">
              <label class="form-label" for="filtro-genero">Género</label>
              <select id="filtro-genero" v-model="filtros.genero" class="form-select">
                <option value="">Cualquiera</option>
                <option v-for="genero in opcionesGenero" :key="genero" :value="genero">
                  {{ genero }}
                </option>
              </select>
            </div>

            <div v-if="categorias.length > 0" class="filtro">
              <label class="form-label" for="filtro-categoria">Categoría</label>
              <select id="filtro-categoria" v-model="filtros.categoriaId" class="form-select">
                <option :value="null">Cualquiera</option>
                <option v-for="categoria in categorias" :key="categoria.idCategoria" :value="categoria.idCategoria">
                  {{ categoria.nombre }}
                </option>
              </select>
            </div>

            <div class="filtro">
              <label class="form-label" for="filtro-raza">Raza</label>
              <input
                id="filtro-raza"
                v-model="filtros.raza"
                type="text"
                class="form-control"
                placeholder="Ej.: Elfo, Humano…"
                autocomplete="off"
              />
            </div>

            <div class="filtro">
              <label class="form-label" for="filtro-clase">Clase</label>
              <input
                id="filtro-clase"
                v-model="filtros.clase"
                type="text"
                class="form-control"
                placeholder="Ej.: Mago, Guerrero…"
                autocomplete="off"
              />
            </div>

            <div class="filtro">
              <span id="filtro-edad-label" class="form-label d-block">Rango de edad</span>
              <div class="filtro-edad" role="group" aria-labelledby="filtro-edad-label">
                <div>
                  <label for="filtro-edad-min" class="visually-hidden">Edad mínima</label>
                  <input
                    id="filtro-edad-min"
                    ref="edadMinRef"
                    v-model.number="filtros.edadMin"
                    type="number"
                    class="form-control"
                    placeholder="Mín"
                    min="0"
                    inputmode="numeric"
                    :aria-invalid="errorEdad ? 'true' : undefined"
                    :aria-describedby="errorEdad ? 'filtro-edad-error' : undefined"
                    @input="errorEdad = null"
                  />
                </div>
                <span class="filtro-edad__separador" aria-hidden="true">—</span>
                <div>
                  <label for="filtro-edad-max" class="visually-hidden">Edad máxima</label>
                  <input
                    id="filtro-edad-max"
                    v-model.number="filtros.edadMax"
                    type="number"
                    class="form-control"
                    placeholder="Máx"
                    min="0"
                    inputmode="numeric"
                    :aria-invalid="errorEdad ? 'true' : undefined"
                    :aria-describedby="errorEdad ? 'filtro-edad-error' : undefined"
                    @input="errorEdad = null"
                  />
                </div>
              </div>
              <p v-if="errorEdad" id="filtro-edad-error" class="pl-field__error" role="alert">
                <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
                {{ errorEdad }}
              </p>
            </div>
          </div>

          <p v-if="errorCategorias" class="filtros-nota">
            <i class="bi bi-info-circle" aria-hidden="true"></i>
            {{ errorCategorias }}
          </p>

          <div class="filtros-acciones">
            <button type="submit" class="pl-btn pl-btn--primary" :disabled="cargando">
              <span v-if="cargando" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
              <i v-else class="bi bi-search" aria-hidden="true"></i>
              {{ cargando ? 'Buscando…' : 'Buscar' }}
            </button>
            <button type="button" class="pl-btn pl-btn--ghost" :disabled="cargando" @click="limpiarFiltros">
              <i class="bi bi-x-circle" aria-hidden="true"></i>
              Limpiar filtros
            </button>
          </div>
        </form>
      </section>

      <div ref="resultadosRef" class="buscar-resultados">
        <p class="visually-hidden" role="status">{{ anuncio }}</p>

        <div v-if="error" class="pl-alert pl-alert--danger" role="alert">
          <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
          <span>{{ error }}</span>
          <button type="button" class="pl-btn pl-btn--secondary pl-btn--sm" @click="buscar(paginaActual)">
            Reintentar
          </button>
        </div>

        <div v-else-if="cargando" class="buscar-grid" aria-hidden="true">
          <div v-for="n in 6" :key="n" class="buscar-esqueleto"></div>
        </div>

        <div v-else-if="!buscado" class="pl-empty-state">
          <span class="pl-empty-state__icon" aria-hidden="true">
            <i class="bi bi-compass"></i>
          </span>
          <h2 class="pl-empty-state__title">Empieza tu búsqueda</h2>
          <p>Filtra por nombre, raza, clase o categoría para encontrar personajes de la comunidad.</p>
        </div>

        <div v-else-if="personajes.length === 0" class="pl-empty-state">
          <span class="pl-empty-state__icon" aria-hidden="true">
            <i class="bi bi-search"></i>
          </span>
          <h2 class="pl-empty-state__title">Sin resultados</h2>
          <p>No hay personajes que coincidan con esos filtros. Prueba con menos criterios.</p>
          <button type="button" class="pl-btn pl-btn--secondary" @click="limpiarFiltros">
            <i class="bi bi-x-circle" aria-hidden="true"></i>
            Limpiar filtros
          </button>
        </div>

        <template v-else>
          <p class="resultados-count">{{ textoResultados }}</p>

          <div class="buscar-grid">
            <TarjetaPersonaje
              v-for="personaje in personajes"
              :key="personaje.idPersonaje"
              :personaje="personaje"
            />
          </div>

          <PaginadorComponent
            :paginaActual="paginaActual"
            :totalPaginas="totalPaginas"
            @cambiar="buscar"
          />
        </template>
      </div>
    </div>
  </main>

  <Footer />
</template>

<style scoped>
.filtros-panel {
  margin-bottom: 1.5rem;
  overflow: hidden;
}

.filtros-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  min-height: 52px;
  padding: 0.85rem 1.15rem;
  border: 0;
  background: none;
  color: var(--pl-ink);
  font-size: 0.95rem;
  font-weight: 750;
  text-align: left;
  cursor: pointer;
  transition: background var(--pl-duration-fast) var(--pl-ease-standard);
}

.filtros-toggle:hover {
  background: var(--pl-surface-soft);
}

.filtros-toggle__titulo,
.filtros-toggle__meta {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.filtros-toggle__titulo i {
  color: var(--pl-primary-ink);
}

.filtros-toggle__meta {
  color: var(--pl-muted);
  font-size: 0.82rem;
  font-weight: 650;
}

.filtros-body {
  padding: 0 1.15rem 1.15rem;
  border-top: 1px solid var(--pl-border);
}

.filtros-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr));
  gap: 1rem 1.25rem;
  padding-top: 1.15rem;
}

.filtro .form-label {
  margin-bottom: 0.35rem;
  font-size: 0.85rem;
  font-weight: 700;
}

.filtro-edad {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filtro-edad > div {
  flex: 1 1 0;
  min-width: 0;
}

.filtro-edad__separador {
  color: var(--pl-muted);
}

.filtros-nota {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  margin: 0.9rem 0 0;
  color: var(--pl-muted);
  font-size: 0.84rem;
}

.filtros-acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 1.25rem;
}

.buscar-resultados {
  scroll-margin-top: 88px;
}

.resultados-count {
  margin: 0 0 1rem;
  color: var(--pl-muted);
  font-size: 0.9rem;
  font-weight: 650;
}

.buscar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  gap: 1.25rem;
  align-items: stretch;
}

.buscar-esqueleto {
  min-height: 380px;
  border-radius: var(--pl-radius-lg);
  background: linear-gradient(
    100deg,
    var(--pl-surface-soft) 30%,
    var(--pl-surface) 50%,
    var(--pl-surface-soft) 70%
  );
  background-size: 200% 100%;
  box-shadow: inset 0 0 0 1px var(--pl-border);
  animation: buscar-esqueleto 1.4s ease-in-out infinite;
}

@keyframes buscar-esqueleto {
  to {
    background-position: -200% 0;
  }
}

/* Sin movimiento: el esqueleto se queda como bloque estatico con el mismo tinte. */
@media (prefers-reduced-motion: reduce) {
  .buscar-esqueleto {
    animation: none;
  }
}

.pl-empty-state__title {
  margin: 0 0 0.35rem;
  color: var(--pl-ink);
  font-size: 1.15rem;
  font-weight: 800;
}

.pl-empty-state p {
  max-width: 46ch;
  margin-bottom: 1.1rem;
}

.pl-alert button {
  margin-left: auto;
}

@media (max-width: 575.98px) {
  .filtros-toggle__meta > span:not(.pl-status-pill) {
    display: none;
  }

  .filtros-acciones {
    flex-direction: column;
  }

  .filtros-acciones .pl-btn {
    width: 100%;
  }
}
</style>
