<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import NavBar from '../../components/NavBar.vue'
import Footer from '../../components/Footer.vue'
import TarjetaAnuncio from '../../components/TarjetaAnuncio.vue'
import RichTextEditor from '../../components/RichTextEditor.vue'
import ModalAviso from '../../components/ModalAviso.vue'
import ModalConfirmacion from '../../components/ModalConfirmacion.vue'
import ModalFormulario from '../../components/ModalFormulario.vue'
import PerfilPersonajeView from '../Personajes/PerfilPersonajeView.vue'
import api from '../../services/api'
import { userStore } from '../../store/userStore'
import { enfocarPrimerError } from '../../composables/useFocoPrimerError'
import {
  combinarLoteAnuncios,
  edadInvalida,
  edadNumero,
  filtrosAnunciosVacios,
  idsExcluidos,
  mensajeErrorApi,
  type AnuncioDTO,
  type FiltrosAnuncios,
} from './anuncios'
import { anunciosApi } from '../../services/anunciosApi'
import { useGestionAnuncios } from './useGestionAnuncios'

interface PersonajePropio {
  idPersonaje: number
  nombre: string
}

const router = useRouter()
const opcionesGenero = ['Masculino', 'Femenino', 'No binario', 'Otro']

const filtros = ref<FiltrosAnuncios>(filtrosAnunciosVacios())
const filtrosAbiertos = ref(true)
const filtrosFormRef = ref<HTMLFormElement | null>(null)
const resultadosRef = ref<HTMLElement | null>(null)
const errorEdad = ref<string | null>(null)

const anuncios = ref<AnuncioDTO[]>([])
const hayMas = ref(false)
const cargando = ref(false)
const cargandoMas = ref(false)
const buscado = ref(false)
const error = ref<string | null>(null)

const misAnuncios = ref<AnuncioDTO[]>([])
const personajesPropios = ref<PersonajePropio[]>([])
const personajeSeleccionadoId = ref<number | null>(null)
const cargandoMisAnuncios = ref(false)
const errorMisAnuncios = ref<string | null>(null)

const perfilPersonajeId = ref<number | null>(null)
const perfilModalRef = ref<HTMLElement | null>(null)

const {
  categoriasDisponibles,
  errorCategorias,
  modalEditor,
  editor,
  errorEditor,
  guardando,
  confirmacionEliminar,
  aviso,
  abrirEditor,
  cerrarEditor,
  guardar,
  cambiarActivo,
  pedirEliminar,
  confirmarEliminar,
  cargarCategorias,
} = useGestionAnuncios({ recargar })

const filtrosActivos = computed(() => {
  const actuales = filtros.value
  let total = 0
  if (actuales.nombre.trim()) total++
  if (actuales.genero) total++
  if (actuales.raza.trim()) total++
  if (actuales.clase.trim()) total++
  if (edadNumero(actuales.edadMin) !== null) total++
  if (edadNumero(actuales.edadMax) !== null) total++
  total += actuales.categoriaIds.length
  if (actuales.soloOnline) total++
  return total
})

const textoResultados = computed(() =>
  anuncios.value.length === 1
    ? '1 anuncio'
    : `${anuncios.value.length} anuncios`,
)

const anuncioResultados = computed(() => {
  if (cargando.value) return 'Cargando anuncios…'
  if (error.value || !buscado.value) return ''
  if (anuncios.value.length === 0) return 'No se encontraron anuncios con esos criterios.'
  return `${textoResultados.value} mostrados.${hayMas.value ? ' Hay más anuncios disponibles.' : ''}`
})

const misAnunciosFiltrados = computed(() =>
  misAnuncios.value.filter((anuncio) => anuncio.personajeId === personajeSeleccionadoId.value),
)

function validarEdad(): boolean {
  const min = edadNumero(filtros.value.edadMin)
  const max = edadNumero(filtros.value.edadMax)

  if (edadInvalida(filtros.value.edadMin) || edadInvalida(filtros.value.edadMax)) {
    errorEdad.value = 'Introduce edades enteras y no negativas.'
    return false
  }
  if (min !== null && max !== null && min > max) {
    errorEdad.value = 'La edad mínima no puede ser mayor que la edad máxima.'
    return false
  }

  errorEdad.value = null
  return true
}

async function revelarResultados() {
  await nextTick()
  const el = resultadosRef.value
  if (el && el.getBoundingClientRect().top > window.innerHeight) {
    el.scrollIntoView({ block: 'start' })
  }
}

/** Carga el primer lote: cualquier búsqueda reinicia los ids ya vistos. */
async function cargarAnuncios(revelar = false) {
  cargando.value = true
  error.value = null
  buscado.value = true
  anuncios.value = []
  hayMas.value = false

  try {
    const { data } = await anunciosApi.listar(filtros.value)
    anuncios.value = Array.isArray(data?.anuncios) ? [...data.anuncios] : []
    hayMas.value = data?.hayMas === true
    if (revelar) await revelarResultados()
  } catch {
    error.value = 'No pudimos completar la búsqueda. Revisa tu conexión e inténtalo de nuevo.'
  } finally {
    cargando.value = false
  }
}

async function buscar() {
  if (!validarEdad()) {
    filtrosAbiertos.value = true
    await enfocarPrimerError(filtrosFormRef.value)
    return
  }
  await cargarAnuncios(true)
}

async function cargarMas() {
  if (!hayMas.value || cargandoMas.value) return
  cargandoMas.value = true
  error.value = null

  try {
    const { data } = await anunciosApi.listar(filtros.value, idsExcluidos(anuncios.value))
    const lote = Array.isArray(data?.anuncios) ? data.anuncios : []
    const combinado = combinarLoteAnuncios(anuncios.value, lote, data?.hayMas === true)
    anuncios.value = combinado.anuncios
    hayMas.value = combinado.hayMas
  } catch (e) {
    error.value = mensajeErrorApi(e, 'No pudimos cargar más anuncios. Inténtalo de nuevo.')
  } finally {
    cargandoMas.value = false
  }
}

function limpiarFiltros() {
  filtros.value = filtrosAnunciosVacios()
  errorEdad.value = null
  void buscar()
}

async function cargarMisAnuncios() {
  cargandoMisAnuncios.value = true
  errorMisAnuncios.value = null
  try {
    const { data } = await anunciosApi.mios()
    misAnuncios.value = Array.isArray(data) ? [...data] : []
  } catch {
    misAnuncios.value = []
    errorMisAnuncios.value = 'No pudimos cargar tus anuncios. Inténtalo de nuevo.'
  } finally {
    cargandoMisAnuncios.value = false
  }
}

async function cargarPersonajesPropios() {
  const userId = userStore.usuario.value?.id
  if (!userId) return

  try {
    const { data } = await api.get<unknown>(`/personajes/usuario/${userId}`, {
      params: { size: 100 },
    })
    const lista = data && typeof data === 'object' && 'content' in data
      ? (data as { content: unknown }).content
      : data
    personajesPropios.value = Array.isArray(lista)
      ? (lista as PersonajePropio[]).map((personaje) => ({
          idPersonaje: Number(personaje.idPersonaje),
          nombre: String(personaje.nombre ?? ''),
        }))
      : []
    if (!personajesPropios.value.some((p) => p.idPersonaje === personajeSeleccionadoId.value)) {
      personajeSeleccionadoId.value = personajesPropios.value[0]?.idPersonaje ?? null
    }
  } catch {
    errorMisAnuncios.value = 'No pudimos cargar tus personajes.'
  }
}

/** Recarga guiada por el composable de edición tras crear/editar/activar/borrar. */
async function recargar() {
  await Promise.all([cargarMisAnuncios(), cargarAnuncios()])
}

function abrirEditorDesdePanel(anuncio: AnuncioDTO | null = null) {
  const personajeId = anuncio?.personajeId ?? personajeSeleccionadoId.value
  if (personajeId === null) {
    aviso.value = 'Selecciona un personaje antes de crear el anuncio.'
    return
  }
  abrirEditor(personajeId, anuncio)
}

function activarDesdePanel(anuncio: AnuncioDTO, activo: boolean) {
  void cambiarActivo(anuncio, activo, misAnuncios.value)
}

function verPerfil(personajeId: number) {
  perfilPersonajeId.value = personajeId
  void nextTick(() => perfilModalRef.value?.focus())
}

function enviarMp(personajeId: number) {
  void router.push({ path: '/chat', query: { dm: String(personajeId) } })
}

onMounted(async () => {
  await userStore.cargarDesdeToken()
  await Promise.all([
    cargarCategorias(),
    cargarPersonajesPropios(),
    cargarMisAnuncios(),
    cargarAnuncios(),
  ])
})
</script>

<template>
  <NavBar :logeado="true" />

  <main class="pl-page">
    <div class="container">
      <header class="pl-page-header">
        <span class="pl-kicker">Comunidad</span>
        <h1 class="pl-title">Anuncios RP</h1>
        <p class="pl-lead">
          Encuentra personajes para tu próxima historia por nombre, raza, clase, edad o categoría.
        </p>
      </header>

      <section class="pl-card filtros-panel" aria-labelledby="filtros-titulo">
        <h2 id="filtros-titulo" class="visually-hidden">Filtros de anuncios</h2>

        <button
          type="button"
          class="filtros-toggle"
          :aria-expanded="filtrosAbiertos"
          aria-controls="anuncios-filtros-campos"
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
          ref="filtrosFormRef"
          id="anuncios-filtros-campos"
          class="filtros-body"
          novalidate
          @submit.prevent="buscar()"
        >
          <div class="filtros-grid">
            <div class="filtro">
              <label class="form-label" for="anuncio-filtro-nombre">Nombre del personaje</label>
              <input
                id="anuncio-filtro-nombre"
                v-model="filtros.nombre"
                type="search"
                class="form-control"
                placeholder="Ej.: Aelin, Geralt…"
                autocomplete="off"
                enterkeyhint="search"
              />
            </div>

            <div class="filtro">
              <label class="form-label" for="anuncio-filtro-genero">Género</label>
              <select id="anuncio-filtro-genero" v-model="filtros.genero" class="form-select">
                <option value="">Cualquiera</option>
                <option v-for="genero in opcionesGenero" :key="genero" :value="genero">
                  {{ genero }}
                </option>
              </select>
            </div>

            <div class="filtro">
              <label class="form-label" for="anuncio-filtro-raza">Raza</label>
              <input
                id="anuncio-filtro-raza"
                v-model="filtros.raza"
                type="text"
                class="form-control"
                placeholder="Ej.: Elfo, Humano…"
                autocomplete="off"
              />
            </div>

            <div class="filtro">
              <label class="form-label" for="anuncio-filtro-clase">Clase</label>
              <input
                id="anuncio-filtro-clase"
                v-model="filtros.clase"
                type="text"
                class="form-control"
                placeholder="Ej.: Mago, Guerrero…"
                autocomplete="off"
              />
            </div>

            <div class="filtro">
              <span id="anuncio-filtro-edad-label" class="form-label d-block">Rango de edad</span>
              <div class="filtro-edad" role="group" aria-labelledby="anuncio-filtro-edad-label">
                <div>
                  <label for="anuncio-filtro-edad-min" class="visually-hidden">Edad mínima</label>
                  <input
                    id="anuncio-filtro-edad-min"
                    v-model.number="filtros.edadMin"
                    type="number"
                    class="form-control"
                    placeholder="Mín"
                    min="0"
                    inputmode="numeric"
                    :aria-invalid="errorEdad ? 'true' : undefined"
                    :aria-describedby="errorEdad ? 'anuncio-filtro-edad-error' : undefined"
                    @input="errorEdad = null"
                  />
                </div>
                <span class="filtro-edad__separador" aria-hidden="true">—</span>
                <div>
                  <label for="anuncio-filtro-edad-max" class="visually-hidden">Edad máxima</label>
                  <input
                    id="anuncio-filtro-edad-max"
                    v-model.number="filtros.edadMax"
                    type="number"
                    class="form-control"
                    placeholder="Máx"
                    min="0"
                    inputmode="numeric"
                    :aria-invalid="errorEdad ? 'true' : undefined"
                    :aria-describedby="errorEdad ? 'anuncio-filtro-edad-error' : undefined"
                    @input="errorEdad = null"
                  />
                </div>
              </div>
              <p v-if="errorEdad" id="anuncio-filtro-edad-error" class="pl-field__error" role="alert">
                <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
                {{ errorEdad }}
              </p>
            </div>

            <fieldset v-if="categoriasDisponibles.length > 0" class="filtro filtro-categorias">
              <legend class="form-label">Categorías del anuncio</legend>
              <p id="anuncio-categorias-hint" class="pl-field__hint">
                Selecciona varias: basta con que el anuncio tenga una de ellas.
              </p>
              <div class="filtro-categorias__lista" aria-describedby="anuncio-categorias-hint">
                <div v-for="categoria in categoriasDisponibles" :key="categoria.idCategoria">
                  <input
                    :id="`anuncio-filtro-categoria-${categoria.idCategoria}`"
                    v-model="filtros.categoriaIds"
                    type="checkbox"
                    :value="categoria.idCategoria"
                  />
                  <label :for="`anuncio-filtro-categoria-${categoria.idCategoria}`">
                    {{ categoria.nombre }}
                  </label>
                </div>
              </div>
            </fieldset>

            <div class="filtro">
              <span class="form-label d-block">Presencia</span>
              <div class="form-check form-switch">
                <input
                  id="anuncio-filtro-solo-online"
                  v-model="filtros.soloOnline"
                  class="form-check-input"
                  type="checkbox"
                  role="switch"
                />
                <label class="form-check-label" for="anuncio-filtro-solo-online">
                  Solo conectados
                </label>
              </div>
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

      <div ref="resultadosRef" class="anuncios-resultados">
        <p class="visually-hidden" role="status" aria-live="polite">{{ anuncioResultados }}</p>

        <div v-if="error" class="pl-alert pl-alert--danger" role="alert">
          <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
          <span>{{ error }}</span>
          <button type="button" class="pl-btn pl-btn--secondary pl-btn--sm" @click="buscar()">
            Reintentar
          </button>
        </div>

        <div v-else-if="cargando" class="anuncios-grid" aria-hidden="true">
          <div v-for="n in 9" :key="n" class="anuncio-esqueleto"></div>
        </div>

        <div v-else-if="!buscado" class="pl-empty-state">
          <span class="pl-empty-state__icon" aria-hidden="true"><i class="bi bi-megaphone"></i></span>
          <h2 class="pl-empty-state__title">Explora los anuncios</h2>
          <p>Ajusta los filtros para encontrar personajes con ganas de rolear.</p>
        </div>

        <div v-else-if="anuncios.length === 0" class="pl-empty-state">
          <span class="pl-empty-state__icon" aria-hidden="true"><i class="bi bi-search"></i></span>
          <h2 class="pl-empty-state__title">Sin anuncios</h2>
          <p>No hay anuncios que coincidan con esos filtros. Prueba con menos criterios.</p>
          <button type="button" class="pl-btn pl-btn--secondary" @click="limpiarFiltros">
            <i class="bi bi-x-circle" aria-hidden="true"></i>
            Limpiar filtros
          </button>
        </div>

        <template v-else>
          <p class="resultados-count">{{ textoResultados }}</p>
          <div class="anuncios-grid">
            <TarjetaAnuncio
              v-for="anuncio in anuncios"
              :key="anuncio.idAnuncio"
              :anuncio="anuncio"
              @ver-perfil="verPerfil"
              @enviar-mp="enviarMp"
              @editar="abrirEditorDesdePanel($event)"
              @cambiar-activo="activarDesdePanel"
              @eliminar="pedirEliminar"
            />
          </div>

          <div v-if="hayMas" class="anuncios-mas">
            <button
              type="button"
              class="pl-btn pl-btn--secondary"
              :disabled="cargandoMas"
              @click="cargarMas()"
            >
              <span v-if="cargandoMas" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
              <i v-else class="bi bi-arrow-down-circle" aria-hidden="true"></i>
              {{ cargandoMas ? 'Cargando…' : 'Ver más anuncios' }}
            </button>
          </div>
        </template>
      </div>

      <section class="pl-card anuncios-mios" aria-labelledby="mis-anuncios-titulo">
        <div class="anuncios-mios__cabecera">
          <div>
            <span class="pl-kicker">Tu contenido</span>
            <h2 id="mis-anuncios-titulo" class="pl-page-title pl-page-title--small">Mis anuncios</h2>
            <p class="pl-lead">Publica hasta 3 anuncios activos en total, repartidos entre tus personajes.</p>
          </div>
        </div>

        <div v-if="cargandoMisAnuncios" class="pl-empty-state pl-empty-state--compact" role="status">
          <div class="spinner-border text-primary" aria-hidden="true"></div>
          <span>Cargando tus anuncios…</span>
        </div>

        <div v-else-if="errorMisAnuncios" class="pl-alert pl-alert--danger" role="alert">
          <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>
          <span>{{ errorMisAnuncios }}</span>
          <button type="button" class="pl-btn pl-btn--secondary pl-btn--sm" @click="cargarMisAnuncios()">
            Reintentar
          </button>
        </div>

        <template v-else>
          <div class="anuncios-mios__barra">
            <div class="pl-field">
              <label class="form-label" for="mis-anuncios-personaje">Personaje</label>
              <select
                id="mis-anuncios-personaje"
                v-model.number="personajeSeleccionadoId"
                class="form-select"
              >
                <option v-if="personajesPropios.length === 0" :value="null">Sin personajes</option>
                <option
                  v-for="personaje in personajesPropios"
                  :key="personaje.idPersonaje"
                  :value="personaje.idPersonaje"
                >
                  {{ personaje.nombre }}
                </option>
              </select>
            </div>
            <button
              type="button"
              class="pl-btn pl-btn--primary"
              :disabled="personajeSeleccionadoId === null"
              @click="abrirEditorDesdePanel()"
            >
              <i class="bi bi-plus-circle" aria-hidden="true"></i>
              Nuevo anuncio
            </button>
          </div>

          <p class="pl-field__hint">
            Los anuncios nuevos se crean inactivos. Actívalos aquí o desde el perfil del personaje.
          </p>

          <div v-if="misAnunciosFiltrados.length === 0" class="pl-empty-state pl-empty-state--compact">
            <span class="pl-empty-state__icon" aria-hidden="true"><i class="bi bi-megaphone"></i></span>
            <p class="mb-0">Este personaje todavía no tiene anuncios.</p>
          </div>

          <div v-else class="anuncios-grid">
            <TarjetaAnuncio
              v-for="anuncio in misAnunciosFiltrados"
              :key="anuncio.idAnuncio"
              :anuncio="anuncio"
              :acciones-publicas="false"
              @editar="abrirEditorDesdePanel($event)"
              @cambiar-activo="activarDesdePanel"
              @eliminar="pedirEliminar"
            />
          </div>
        </template>
      </section>
    </div>
  </main>

  <Footer />

  <!-- Perfil en modal, con el mismo patrón que el chat -->
  <div
    v-if="perfilPersonajeId"
    ref="perfilModalRef"
    class="modal-backdrop-custom perfil-modal-full"
    role="dialog"
    aria-modal="true"
    aria-label="Perfil del personaje"
    tabindex="-1"
    @click.self="perfilPersonajeId = null"
    @keydown.esc="perfilPersonajeId = null"
  >
    <div class="perfil-modal-container">
      <PerfilPersonajeView
        :personaje-id="perfilPersonajeId"
        :modo-modal="true"
        @cerrar="perfilPersonajeId = null"
      />
    </div>
  </div>

  <ModalFormulario
    v-if="modalEditor"
    :titulo="modalEditor.anuncioId === null ? 'Nuevo anuncio' : 'Editar anuncio'"
    ancho="md"
    @cerrar="cerrarEditor"
  >
    <form novalidate @submit.prevent="guardar()">
      <div class="pl-field">
        <span class="form-label">Contenido <span class="text-danger" aria-hidden="true">*</span></span>
        <RichTextEditor
          v-model="editor.contenido"
          id="anuncio-editor-contenido"
          etiqueta="Contenido del anuncio"
        />
      </div>

      <fieldset class="pl-field">
        <legend class="form-label">Categorías (opcional)</legend>
        <p id="anuncio-editor-categorias-hint" class="pl-field__hint">
          Selecciona las que describan tu anuncio.
        </p>
        <div class="editor-categorias" aria-describedby="anuncio-editor-categorias-hint">
          <div v-for="categoria in categoriasDisponibles" :key="categoria.idCategoria">
            <input
              :id="`anuncio-editor-categoria-${categoria.idCategoria}`"
              v-model="editor.categoriaIds"
              type="checkbox"
              :value="categoria.idCategoria"
            />
            <label :for="`anuncio-editor-categoria-${categoria.idCategoria}`">
              {{ categoria.nombre }}
            </label>
          </div>
        </div>
      </fieldset>

      <p v-if="errorEditor" class="pl-alert pl-alert--danger mb-0" role="alert">
        <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errorEditor }}
      </p>

      <div class="pl-form-acciones">
        <button type="button" class="pl-btn pl-btn--secondary" @click="cerrarEditor">Cancelar</button>
        <button type="submit" class="pl-btn pl-btn--primary" :disabled="guardando">
          <span v-if="guardando" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
          {{ guardando ? 'Guardando…' : 'Guardar anuncio' }}
        </button>
      </div>
    </form>
  </ModalFormulario>

  <ModalConfirmacion
    v-if="confirmacionEliminar"
    titulo="Eliminar anuncio"
    :mensaje="`¿Eliminar el anuncio de «${confirmacionEliminar.nombrePersonaje}»? Esta acción no se puede deshacer.`"
    boton-confirmar="Eliminar"
    :peligro="true"
    @confirmar="confirmarEliminar()"
    @cancelar="confirmacionEliminar = null"
  />

  <ModalAviso v-if="aviso" :mensaje="aviso" @cerrar="aviso = null" />
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

.filtro .form-label,
.filtro legend.form-label {
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

.filtro-categorias {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.filtro-categorias legend {
  float: none;
  width: 100%;
}

.filtro-categorias__lista,
.editor-categorias {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.85rem;
  max-height: 12rem;
  overflow-y: auto;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--pl-border);
  border-radius: var(--pl-radius-md);
  background: var(--pl-surface-soft);
}

.filtro-categorias__lista > div,
.editor-categorias > div {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 24px;
  font-size: 0.85rem;
}

.filtro-categorias__lista label,
.editor-categorias label {
  margin: 0;
  color: var(--pl-ink);
  cursor: pointer;
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

.anuncios-resultados {
  scroll-margin-top: 88px;
}

.resultados-count {
  margin: 0 0 1rem;
  color: var(--pl-muted);
  font-size: 0.9rem;
  font-weight: 650;
}

.anuncios-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
  gap: 1.25rem;
  align-items: stretch;
}

.anuncio-esqueleto {
  min-height: 260px;
  border-radius: var(--pl-radius-lg);
  background: linear-gradient(
    100deg,
    var(--pl-surface-soft) 30%,
    var(--pl-surface) 50%,
    var(--pl-surface-soft) 70%
  );
  background-size: 200% 100%;
  box-shadow: inset 0 0 0 1px var(--pl-border);
  animation: anuncio-esqueleto 1.4s ease-in-out infinite;
}

@keyframes anuncio-esqueleto {
  to {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .anuncio-esqueleto {
    animation: none;
  }
}

.anuncios-mas {
  display: flex;
  justify-content: center;
  margin-top: 1.5rem;
}

.anuncios-mios {
  margin-top: 2.5rem;
  padding: 1.35rem;
}

.anuncios-mios__cabecera {
  margin-bottom: 1rem;
}

.anuncios-mios__cabecera .pl-page-title {
  margin-bottom: 0.35rem;
}

.anuncios-mios__barra {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 0.85rem;
  margin-bottom: 0.4rem;
}

.anuncios-mios__barra .pl-field {
  flex: 1 1 240px;
  margin-bottom: 0;
}

.anuncios-mios .pl-alert {
  align-items: center;
}

.anuncios-mios .pl-alert button {
  margin-left: auto;
}

.perfil-modal-full {
  position: fixed;
  z-index: 1080;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.perfil-modal-container {
  display: flex;
  flex-direction: column;
  width: min(100%, 1100px);
  max-height: calc(100vh - 3rem);
  overflow: hidden;
  border-radius: var(--pl-radius-lg);
  background: var(--pl-surface);
  box-shadow: var(--pl-shadow-lg);
}

@media (max-width: 575.98px) {
  .filtros-acciones {
    flex-direction: column;
  }

  .filtros-acciones .pl-btn {
    width: 100%;
  }

  .perfil-modal-full {
    padding: 0;
  }

  .perfil-modal-container {
    max-height: 100vh;
    border-radius: 0;
  }
}
</style>
