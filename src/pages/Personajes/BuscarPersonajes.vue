<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import NavBar from '../../components/NavBar.vue'
import Footer from '../../components/Footer.vue'
import PaginadorComponent from '../../components/PaginadorComponent.vue'
import api from '../../services/api'

const BASE_URL = 'http://localhost:8080/api'
const AVATAR_DEFECTO = 'http://localhost:8080/api/images/AVATAR.png'
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
  if (!avatar || avatar.includes('AVATAR.png')) return AVATAR_DEFECTO
  if (avatar.startsWith('http')) return avatar
  return BASE_URL + avatar
}

const verPerfil = (id: number) => router.push(`/personaje/${id}`)
</script>

<template>
  <NavBar :logeado="true" />

  <div class="buscar-page">
    <div class="buscar-header">
      <div class="container">
        <h1 class="buscar-titulo"><i class="bi bi-search me-2"></i>Buscar Personajes</h1>
        <p class="buscar-subtitulo">Explora los personajes creados por la comunidad</p>
      </div>
    </div>

    <div class="container buscar-contenido">

      <!-- FILTROS -->
      <div class="filtros-panel mb-4">
        <button class="filtros-toggle" @click="filtrosAbiertos = !filtrosAbiertos">
          <i class="bi" :class="filtrosAbiertos ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
          {{ filtrosAbiertos ? 'Ocultar filtros' : 'Mostrar filtros' }}
        </button>

        <div class="filtros-body" v-show="filtrosAbiertos">
          <div class="row g-3">

            <div class="col-md-4">
              <label class="filtro-label">Nombre del personaje</label>
              <input v-model="filtros.nombre" type="text" class="form-control filtro-input"
                placeholder="Ej: Aelin, Geralt..." @keyup.enter="buscar()" />
            </div>

            <div class="col-md-4">
              <label class="filtro-label">Género</label>
              <select v-model="filtros.genero" class="form-select filtro-input">
                <option value="">Cualquiera</option>
                <option v-for="g in opcionesGenero" :key="g" :value="g">{{ g }}</option>
              </select>
            </div>

            <div class="col-md-4" v-if="categorias.length > 0">
              <label class="filtro-label">Categoría</label>
              <select v-model="filtros.categoriaId" class="form-select filtro-input">
                <option :value="null">Cualquiera</option>
                <option v-for="cat in categorias" :key="cat.idCategoria" :value="cat.idCategoria">
                  {{ cat.nombre }}
                </option>
              </select>
            </div>

            <div class="col-md-4">
              <label class="filtro-label">Raza</label>
              <input v-model="filtros.raza" type="text" class="form-control filtro-input"
                placeholder="Ej: Elfo, Humano..." />
            </div>

            <div class="col-md-4">
              <label class="filtro-label">Clase</label>
              <input v-model="filtros.clase" type="text" class="form-control filtro-input"
                placeholder="Ej: Mago, Guerrero..." />
            </div>

            <div class="col-md-4">
              <label class="filtro-label">Rango de edad</label>
              <div class="d-flex gap-2 align-items-center">
                <input v-model.number="filtros.edadMin" type="number" class="form-control filtro-input"
                  placeholder="Mín" min="0" />
                <span class="text-muted">—</span>
                <input v-model.number="filtros.edadMax" type="number" class="form-control filtro-input"
                  placeholder="Máx" min="0" />
              </div>
            </div>

          </div>

          <div class="filtros-acciones mt-3">
            <button class="btn btn-buscar" @click="buscar()" :disabled="cargando">
              <span v-if="cargando" class="spinner-border spinner-border-sm me-2"></span>
              <i v-else class="bi bi-search me-2"></i>
              {{ cargando ? 'Buscando...' : 'Buscar' }}
            </button>
            <button class="btn btn-limpiar ms-2" @click="limpiarFiltros" :disabled="cargando">
              <i class="bi bi-x-circle me-1"></i>Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      <div v-if="error" class="alert alert-danger">{{ error }}</div>

      <div v-if="!buscado && !cargando" class="estado-inicial text-center py-5">
        <i class="bi bi-people icono-grande"></i>
        <p class="mt-3 text-muted">Usa los filtros de arriba para explorar personajes</p>
      </div>

      <div v-else-if="buscado && !cargando && personajes.length === 0" class="alert alert-info text-center">
        <i class="bi bi-emoji-frown me-2"></i>No se encontraron personajes con esos criterios.
      </div>

      <template v-else-if="personajes.length > 0">
        <p class="resultados-count mb-3">
          {{ totalElementos }} personaje{{ totalElementos !== 1 ? 's' : '' }} encontrado{{ totalElementos !== 1 ? 's' : '' }}
        </p>

        <div class="row g-4">
          <div class="col-md-4" v-for="p in personajes" :key="p.idPersonaje">
            <div class="personaje-card" @click="verPerfil(p.idPersonaje)">
              <div class="personaje-avatar-wrap">
                <img :src="avatarUrl(p.avatar)" :alt="p.nombre" class="personaje-avatar" />
              </div>
              <div class="personaje-info">
                <h5 class="personaje-nombre">{{ p.nombre }}</h5>
                <div class="personaje-tags">
                  <span v-if="p.raza"  class="tag tag-raza"><i class="bi bi-star-fill me-1"></i>{{ p.raza }}</span>
                  <span v-if="p.clase" class="tag tag-clase"><i class="bi bi-shield-fill me-1"></i>{{ p.clase }}</span>
                  <span v-if="p.genero" class="tag tag-genero">{{ p.genero }}</span>
                  <span v-if="p.edadPersonaje !== null" class="tag tag-edad">{{ p.edadPersonaje }} años</span>
                </div>
                <div v-if="p.trasfondo" class="personaje-trasfondo" v-html="p.trasfondo"></div>
                <button class="btn btn-ver-perfil mt-auto">Ver perfil completo</button>
              </div>
            </div>
          </div>
        </div>

        <PaginadorComponent :paginaActual="paginaActual" :totalPaginas="totalPaginas"
          @cambiar="buscar" class="mt-4" />
      </template>

    </div>
  </div>
  <Footer />
</template>

<style scoped>
.buscar-page { min-height: 100vh; background: #f4f6f9; }
.buscar-header {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%);
  padding: 2.5rem 0 2rem;
}
.buscar-titulo { color: #fff; font-size: 2rem; font-weight: 700; margin-bottom: .4rem; }
.buscar-subtitulo { color: rgba(255,255,255,.65); margin: 0; font-size: .95rem; }
.buscar-contenido { padding-top: 2rem; padding-bottom: 3rem; }

.filtros-panel { background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,.08); overflow: hidden; }
.filtros-toggle {
  width: 100%; background: none; border: none; padding: 1rem 1.25rem;
  font-weight: 600; font-size: .95rem; color: #333; text-align: left;
  cursor: pointer; display: flex; align-items: center; gap: 8px;
  border-bottom: 1px solid #eee; transition: background .15s;
}
.filtros-toggle:hover { background: #f8f9fa; }
.filtros-body { padding: 1.25rem; }
.filtro-label {
  display: block; font-size: .82rem; font-weight: 600; color: #555;
  text-transform: uppercase; letter-spacing: .04em; margin-bottom: .35rem;
}
.filtro-input { border-radius: 8px; border: 1.5px solid #dee2e6; font-size: .9rem; transition: border-color .2s, box-shadow .2s; }
.filtro-input:focus { border-color: #6c63ff; box-shadow: 0 0 0 3px rgba(108,99,255,.12); }
.filtros-acciones { display: flex; align-items: center; }

.btn-buscar {
  background: linear-gradient(135deg, #6c63ff, #4facfe); color: #fff; border: none;
  padding: .55rem 1.6rem; border-radius: 8px; font-weight: 600; transition: opacity .2s, transform .1s;
}
.btn-buscar:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); color: #fff; }
.btn-buscar:disabled { opacity: .65; }
.btn-limpiar {
  background: #f1f3f5; color: #555; border: none;
  padding: .55rem 1.2rem; border-radius: 8px; transition: background .15s;
}
.btn-limpiar:hover:not(:disabled) { background: #e9ecef; }

.estado-inicial .icono-grande { font-size: 4rem; color: #ccc; display: block; }
.resultados-count { font-size: .88rem; color: #666; font-weight: 500; }

.personaje-card {
  background: #fff; border-radius: 14px; box-shadow: 0 2px 12px rgba(0,0,0,.07);
  overflow: hidden; cursor: pointer; transition: transform .18s, box-shadow .18s;
  display: flex; flex-direction: column; height: 100%;
}
.personaje-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,.13); }
.personaje-avatar-wrap { width: 100%; height: 180px; overflow: hidden; background: #e9ecef; }
.personaje-avatar { width: 100%; height: 100%; object-fit: cover; }
.personaje-info { padding: 1rem 1.1rem 1.1rem; display: flex; flex-direction: column; flex: 1; }
.personaje-nombre { font-size: 1.05rem; font-weight: 700; color: #1a1a2e; margin-bottom: .6rem; }

.personaje-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: .75rem; }
.tag { font-size: .72rem; padding: 3px 9px; border-radius: 20px; font-weight: 600; }
.tag-raza   { background: #e8f4fd; color: #1565c0; }
.tag-clase  { background: #fde8f4; color: #880e4f; }
.tag-genero { background: #e8fdf0; color: #1b5e20; }
.tag-edad   { background: #fdf4e8; color: #e65100; }

.personaje-trasfondo {
  max-height: 80px; overflow: hidden; position: relative;
  font-size: .82rem; color: #555; line-height: 1.4; margin-bottom: .75rem;
}
.personaje-trasfondo::after {
  content: ''; position: absolute; bottom: 0; left: 0; right: 0;
  height: 30px; background: linear-gradient(to bottom, transparent, white);
}
.btn-ver-perfil {
  background: linear-gradient(135deg, #6c63ff, #4facfe);
  color: #fff; border: none; padding: .45rem 1rem;
  border-radius: 8px; font-size: .85rem; font-weight: 600; width: 100%;
}
.btn-ver-perfil:hover { opacity: .88; color: #fff; }
</style>