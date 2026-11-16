<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import NavBar from '../../components/NavBar.vue'
import Footer from '../../components/Footer.vue'
import PaginadorComponent from '../../components/PaginadorComponent.vue'
import api from '../../services/api'

const API_URL = import.meta.env.VITE_API_URL
const AVATAR_DEFECTO = `${API_URL}/images/AVATAR.png`
const router = useRouter()

const filtros = ref({
  nombre: '',
  genero: '',
  raza: '',
  clase: '',
  edadMin: null as number | null,
  edadMax: null as number | null,
  categoriaId: null as number | null,
})
const filtrosAbiertos = ref(true)

interface Categoria { idCategoria: number; nombre: string; tipo: string }
const categorias = ref<Categoria[]>([])

interface Personaje {
  idPersonaje: number; nombre: string; genero: string | null
  raza: string | null; clase: string | null
  edadPersonaje: number | null; avatar: string | null; trasfondo: string | null
}

const personajes     = ref<Personaje[]>([])
const paginaActual   = ref(0)
const totalPaginas   = ref(0)
const totalElementos = ref(0)
const TAMANIO_PAGINA = 9
const cargando = ref(false)
const buscado  = ref(false)
const error    = ref<string | null>(null)

const opcionesGenero = ['Masculino', 'Femenino', 'No binario', 'Otro']

onMounted(async () => {
  try {
    const { data } = await api.get('/categorias')
    categorias.value = data
  } catch (_) {}
})

const buscar = async (pagina = 0) => {
  cargando.value = true
  error.value    = null
  buscado.value  = true

  try {
    const params: Record<string, any> = { page: pagina, size: TAMANIO_PAGINA }

    if (filtros.value.nombre.trim())        params.nombre      = filtros.value.nombre.trim()
    if (filtros.value.genero)               params.genero      = filtros.value.genero
    if (filtros.value.raza.trim())          params.raza        = filtros.value.raza.trim()
    if (filtros.value.clase.trim())         params.clase       = filtros.value.clase.trim()
    if (filtros.value.edadMin !== null)     params.edadMin     = filtros.value.edadMin
    if (filtros.value.edadMax !== null)     params.edadMax     = filtros.value.edadMax
    if (filtros.value.categoriaId !== null) params.categoriaId = filtros.value.categoriaId

    const { data } = await api.get('/personajes/buscar', { params })
    personajes.value     = data.content
    totalPaginas.value   = data.totalPages
    totalElementos.value = data.totalElements
    paginaActual.value   = pagina
  } catch (e) {
    error.value = 'Error al buscar personajes. Inténtalo de nuevo.'
  } finally {
    cargando.value = false
  }
}

const limpiarFiltros = () => {
  filtros.value = { nombre: '', genero: '', raza: '', clase: '', edadMin: null, edadMax: null, categoriaId: null }
  personajes.value = []
  buscado.value = false
  totalElementos.value = 0
}

function avatarUrl(avatar: string | null | undefined): string {
  if (!avatar || avatar.includes('AVATAR.png')) {
    return AVATAR_DEFECTO
  }

  if (avatar.startsWith('http')) {
    return avatar
  }

  return `${API_URL}${avatar}`
}
const verPerfil = (id: number) => router.push(`/personaje/${id}`)
</script>

<template>
  <NavBar :logeado="true" />

  <section class="buscar-hero">
    <div class="container">
      <span class="pl-kicker pl-kicker--light">Explorar</span>
      <h1 class="pl-title">Buscar Personajes</h1>
      <p class="pl-lead">Explora los personajes creados por la comunidad</p>
    </div>
  </section>

  <main class="pl-page">
    <div class="container">

      <!-- FILTROS -->
      <div class="card filtros-panel mb-4">
        <button type="button" class="filtros-toggle" @click="filtrosAbiertos = !filtrosAbiertos">
          <i class="bi" :class="filtrosAbiertos ? 'bi-chevron-up' : 'bi-chevron-down'" aria-hidden="true"></i>
          {{ filtrosAbiertos ? 'Ocultar filtros' : 'Mostrar filtros' }}
        </button>

        <div class="filtros-body" v-show="filtrosAbiertos">
          <div class="row g-3">

            <div class="col-md-4">
              <label class="filtro-label" for="filtro-nombre">Nombre del personaje</label>
              <input id="filtro-nombre" v-model="filtros.nombre" type="text" class="form-control filtro-input"
                placeholder="Ej: Aelin, Geralt..." @keyup.enter="buscar()" />
            </div>

            <div class="col-md-4">
              <label class="filtro-label" for="filtro-genero">Género</label>
              <select id="filtro-genero" v-model="filtros.genero" class="form-select filtro-input">
                <option value="">Cualquiera</option>
                <option v-for="g in opcionesGenero" :key="g" :value="g">{{ g }}</option>
              </select>
            </div>

            <div class="col-md-4" v-if="categorias.length > 0">
              <label class="filtro-label" for="filtro-categoria">Categoría</label>
              <select id="filtro-categoria" v-model="filtros.categoriaId" class="form-select filtro-input">
                <option :value="null">Cualquiera</option>
                <option v-for="cat in categorias" :key="cat.idCategoria" :value="cat.idCategoria">
                  {{ cat.nombre }}
                </option>
              </select>
            </div>

            <div class="col-md-4">
              <label class="filtro-label" for="filtro-raza">Raza</label>
              <input id="filtro-raza" v-model="filtros.raza" type="text" class="form-control filtro-input"
                placeholder="Ej: Elfo, Humano..." />
            </div>

            <div class="col-md-4">
              <label class="filtro-label" for="filtro-clase">Clase</label>
              <input id="filtro-clase" v-model="filtros.clase" type="text" class="form-control filtro-input"
                placeholder="Ej: Mago, Guerrero..." />
            </div>

            <div class="col-md-4">
              <label class="filtro-label" for="filtro-edad-min">Rango de edad</label>
              <div class="d-flex gap-2 align-items-center">
                <input id="filtro-edad-min" v-model.number="filtros.edadMin" type="number" class="form-control filtro-input"
                  placeholder="Mín" min="0" />
                <span class="text-muted" aria-hidden="true">—</span>
                <input v-model.number="filtros.edadMax" type="number" class="form-control filtro-input"
                  placeholder="Máx" min="0" />
              </div>
            </div>

          </div>

          <div class="filtros-acciones mt-3">
            <button type="button" class="pl-btn pl-btn--primary" @click="buscar()" :disabled="cargando">
              <span v-if="cargando" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              <i v-else class="bi bi-search me-2" aria-hidden="true"></i>
              {{ cargando ? 'Buscando...' : 'Buscar' }}
            </button>
            <button type="button" class="pl-btn pl-btn--ghost ms-2" @click="limpiarFiltros" :disabled="cargando">
              <i class="bi bi-x-circle me-1" aria-hidden="true"></i>Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      <div v-if="error" class="pl-alert pl-alert--danger">
        <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>{{ error }}
      </div>

      <div v-if="!buscado && !cargando" class="pl-empty-state">
        <span class="pl-empty-state__icon" aria-hidden="true">
          <i class="bi bi-people"></i>
        </span>
        <p>Usa los filtros de arriba para explorar personajes</p>
      </div>

      <div v-else-if="buscado && !cargando && personajes.length === 0" class="pl-empty-state">
        <span class="pl-empty-state__icon" aria-hidden="true">
          <i class="bi bi-emoji-frown"></i>
        </span>
        <p>No se encontraron personajes con esos criterios.</p>
      </div>

      <template v-else-if="personajes.length > 0">
        <p class="resultados-count mb-3">
          {{ totalElementos }} personaje{{ totalElementos !== 1 ? 's' : '' }} encontrado{{ totalElementos !== 1 ? 's' : '' }}
        </p>

        <div class="row g-4">
          <div class="col-md-6 col-lg-4" v-for="p in personajes" :key="p.idPersonaje">
            <article class="card persona-card h-100" @click="verPerfil(p.idPersonaje)" role="button">
              <div class="persona-card__media">
                <img :src="avatarUrl(p.avatar)" :alt="p.nombre" />
              </div>
              <div class="card-body d-flex flex-column">
                <h5 class="persona-card__nombre">{{ p.nombre }}</h5>
                <div class="personaje-tags">
                  <span v-if="p.raza"  class="tag tag-raza"><i class="bi bi-star-fill me-1" aria-hidden="true"></i>{{ p.raza }}</span>
                  <span v-if="p.clase" class="tag tag-clase"><i class="bi bi-shield-fill me-1" aria-hidden="true"></i>{{ p.clase }}</span>
                  <span v-if="p.genero" class="tag tag-genero">{{ p.genero }}</span>
                  <span v-if="p.edadPersonaje !== null" class="tag tag-edad">{{ p.edadPersonaje }} años</span>
                </div>
                <div v-if="p.trasfondo" class="personaje-trasfondo" v-sanitize="p.trasfondo"></div>
                <button type="button" class="pl-btn pl-btn--primary mt-auto">
                  Ver perfil completo
                </button>
              </div>
            </article>
          </div>
        </div>

        <PaginadorComponent :paginaActual="paginaActual" :totalPaginas="totalPaginas"
          @cambiar="buscar" class="mt-4" />
      </template>

    </div>
  </main>
  <Footer />
</template>

<style scoped>
.buscar-hero {
  padding: 3.5rem 0 3rem;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%);
}

.buscar-hero .pl-kicker--light {
  color: rgba(255, 255, 255, 0.75);
}

.buscar-hero .pl-title {
  margin: 0.35rem 0 0.5rem;
  color: #fff;
}

.buscar-hero .pl-lead {
  max-width: 640px;
  margin: 0;
  color: rgba(255, 255, 255, 0.68);
}

.filtros-panel {
  overflow: hidden;
  border-radius: var(--pl-radius-lg);
}

.filtros-toggle {
  width: 100%;
  padding: 1rem 1.25rem;
  border: 0;
  border-bottom: 1px solid var(--pl-border);
  background: none;
  color: var(--pl-ink);
  font-weight: 700;
  font-size: 0.95rem;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.15s ease;
}

.filtros-toggle:hover {
  background: var(--pl-surface-soft);
}

.filtros-body {
  padding: 1.25rem;
}

.filtro-label {
  display: block;
  margin-bottom: 0.35rem;
  color: var(--pl-muted);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.filtro-input {
  border-radius: var(--pl-radius-md);
  font-size: 0.92rem;
}

.resultados-count {
  color: var(--pl-muted);
  font-size: 0.88rem;
  font-weight: 600;
}

.persona-card {
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.persona-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--pl-shadow-lg);
}

.persona-card__media {
  height: 180px;
  overflow: hidden;
  background: var(--pl-surface-soft);
}

.persona-card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.persona-card:hover .persona-card__media img {
  transform: scale(1.05);
}

.persona-card__nombre {
  margin-bottom: 0.6rem;
  color: var(--pl-ink);
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.personaje-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 0.75rem;
}

.tag {
  padding: 3px 9px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 700;
}

.tag-raza   { background: #e8f4fd; color: #1565c0; }
.tag-clase  { background: #fde8f4; color: #880e4f; }
.tag-genero { background: #e8fdf0; color: #1b5e20; }
.tag-edad   { background: #fdf4e8; color: #e65100; }

.personaje-trasfondo {
  position: relative;
  max-height: 80px;
  margin-bottom: 0.75rem;
  overflow: hidden;
  color: var(--pl-muted);
  font-size: 0.82rem;
  line-height: 1.4;
}

.personaje-trasfondo::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 30px;
  background: linear-gradient(to bottom, transparent, white);
}
</style>