<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import NavBar from '../../components/NavBar.vue'
import Footer from '../../components/Footer.vue'
import ModalAviso from '../../components/ModalAviso.vue'
import ModalFormulario from '../../components/ModalFormulario.vue'
import { userStore } from '../../store/userStore'
import api from '../../services/api'
import { enfocarPrimerError } from '../../composables/useFocoPrimerError'

const AVATAR_DEFECTO = `${import.meta.env.VITE_API_URL}/images/AVATAR.png`

interface UsuarioDTO {
  userId: number
  nombre: string
  email: string
  avatar: string
  rol: string
  fechaRegistro: string
  ultimaConexion: string
}

const route = useRoute()
const perfil = ref<UsuarioDTO | null>(null)
const cargando = ref(true)
const error = ref<string | null>(null)

const aviso = ref<string | null>(null)

// Manejo de solicitud amistad
const solicitudEnviada = ref(false)
const esAmigo = ref(false)
const enviandoSolicitud = ref(false)

const userId = () => userStore.usuario.value?.id

const esPropioUsuario = computed(() => userId() === perfil.value?.userId)
const esModerador = computed(() => {
  const rol = userStore.usuario.value?.role
  return rol === 'ADMIN' || rol === 'MOD'
})

function avatarUrl(avatar: string | null | undefined): string {
  if (!avatar || avatar.includes('AVATAR.png') || avatar.includes('default.png')) {
    return AVATAR_DEFECTO
  }

  if (avatar.startsWith('http')) return avatar

  return `${import.meta.env.VITE_API_URL}${avatar}`
}

function formatFecha(fecha: string | null | undefined): string {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

async function cargarPerfil() {
  const id = route.params.id
  cargando.value = true
  error.value = null
  solicitudEnviada.value = false
  esAmigo.value = false
  try {
    const { data } = await api.get<UsuarioDTO>(`/usuarios/${id}`)
    perfil.value = data

    // El estado de amistad es informativo: si falla, el perfil sigue visible.
    const miId = userId()
    if (miId && data.userId !== miId) {
      try {
        const [resSolicitud, resAmigos] = await Promise.all([
          api.get<boolean>(`/amistades/comprobar-existencia/${miId}/${data.userId}`),
          api.get<any[]>(`/usuarios/${miId}/amigos`),
        ])
        solicitudEnviada.value = resSolicitud.data
        esAmigo.value = resAmigos.data.some((a: any) => a.id === data.userId)
      } catch {
        // Se mantiene el estado por defecto de los botones de amistad.
      }
    }
  } catch {
    perfil.value = null
    error.value = 'No se pudo cargar el perfil.'
  } finally {
    cargando.value = false
  }
}

async function enviarSolicitudAmistad() {
  const miId = userId()
  if (!miId || !perfil.value) return
  enviandoSolicitud.value = true
  try {
    await api.post('/amistades', {
      emisorId: miId,
      receptorId: perfil.value.userId,
    })
    solicitudEnviada.value = true
  } catch {
    aviso.value = 'No se pudo enviar la solicitud.'
  } finally {
    enviandoSolicitud.value = false
  }
}

// --- Denunciar perfil ---
const modalDenuncia = ref(false)
const denuncia = ref({ motivo: '', detalle: '' })
const erroresDenuncia = reactive<Record<string, string>>({})
const enviandoDenuncia = ref(false)
const formDenuncia = ref<HTMLFormElement | null>(null)

function limpiarErroresDenuncia() {
  Object.keys(erroresDenuncia).forEach((clave) => delete erroresDenuncia[clave])
}

function abrirDenuncia() {
  denuncia.value = { motivo: '', detalle: '' }
  limpiarErroresDenuncia()
  modalDenuncia.value = true
}

function onMotivoEditado() {
  delete erroresDenuncia.motivo
  delete erroresDenuncia.general
}

function cerrarDenuncia() {
  modalDenuncia.value = false
  limpiarErroresDenuncia()
}

async function enviarDenuncia() {
  if (!perfil.value) return
  limpiarErroresDenuncia()

  if (!denuncia.value.motivo.trim()) {
    erroresDenuncia.motivo = 'El motivo es obligatorio para enviar la denuncia.'
    await enfocarPrimerError(formDenuncia.value)
    return
  }

  enviandoDenuncia.value = true
  try {
    await api.post('/denuncias', {
      tipo: 'USUARIO',
      tipoId: perfil.value.userId,
      motivo: denuncia.value.motivo.trim(),
      detalle: denuncia.value.detalle.trim() || null,
    })
    cerrarDenuncia()
    aviso.value = 'Denuncia enviada. Gracias por ayudar a mantener la comunidad segura.'
  } catch (e: any) {
    const data = e?.response?.data
    erroresDenuncia.general = data?.error || data?.message || data?.mensaje || 'Error al enviar la denuncia.'
  } finally {
    enviandoDenuncia.value = false
  }
}

// --- Banear usuario (solo ADMIN/MOD) ---
const modalBaneo = ref(false)
const baneo = ref({ duracion: 'PERMANENTE', motivo: '' })
const errorBaneo = ref('')
const baneando = ref(false)

const opcionesDuracion = [
  { value: '1H', label: '1 hora' },
  { value: '24H', label: '24 horas' },
  { value: '7D', label: '7 días' },
  { value: 'PERMANENTE', label: 'Permanente' },
]

function abrirBaneo() {
  baneo.value = { duracion: 'PERMANENTE', motivo: '' }
  errorBaneo.value = ''
  modalBaneo.value = true
}

function cerrarBaneo() {
  modalBaneo.value = false
  errorBaneo.value = ''
}

async function banearUsuario() {
  if (!perfil.value) return
  const dur = baneo.value.duracion
  errorBaneo.value = ''
  baneando.value = true
  try {
    await api.post('/moderacion/baneos', {
      tipo: 'USUARIO',
      id: perfil.value.userId,
      duracion: baneo.value.duracion,
      motivo: baneo.value.motivo.trim() || null,
    })
    cerrarBaneo()
    aviso.value = `Usuario baneado${dur !== 'PERMANENTE' ? ' temporalmente' : ''}.`
  } catch (e: any) {
    const data = e?.response?.data
    errorBaneo.value = data?.error || data?.message || data?.mensaje || 'Error al banear al usuario.'
  } finally {
    baneando.value = false
  }
}

onMounted(async () => {
  await userStore.cargarDesdeToken()
  await cargarPerfil()
})

watch(
  () => route.params.id,
  (nuevo, anterior) => {
    if (nuevo && nuevo !== anterior) cargarPerfil()
  }
)
</script>

<template>
  <NavBar :logeado="true" />

  <main class="pl-page">
    <div class="container perfil">
      <div v-if="cargando" class="pl-empty-state pl-empty-state--compact" role="status">
        <div class="spinner-border text-primary" aria-hidden="true"></div>
        <span>Cargando perfil...</span>
      </div>

      <div v-else-if="error" class="pl-alert pl-alert--danger" role="alert">
        <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ error }}
      </div>

      <template v-else-if="perfil">
        <header class="pl-page-header">
          <span class="pl-kicker">Perfil de la comunidad</span>
          <h1 class="pl-page-title">{{ perfil.nombre }}</h1>
          <p class="pl-lead">Consulta sus datos y conecta con esta persona.</p>
        </header>

        <article class="pl-card perfil-card">
          <div class="perfil-cabecera">
            <img
              :src="avatarUrl(perfil.avatar)"
              class="pl-avatar perfil-avatar"
              width="112"
              height="112"
              :alt="`Avatar de ${perfil.nombre}`"
            />
            <div class="perfil-identidad">
              <h2 class="perfil-nombre">{{ perfil.nombre }}</h2>
              <div class="perfil-pildoras">
                <span class="pl-status-pill pl-status-pill--neutral">
                  <i class="bi bi-shield-check" aria-hidden="true"></i>{{ perfil.rol }}
                </span>
                <span v-if="esAmigo" class="pl-status-pill">
                  <i class="bi bi-person-check" aria-hidden="true"></i>Amigo
                </span>
                <span v-if="esPropioUsuario" class="pl-status-pill pl-status-pill--neutral">
                  <i class="bi bi-person" aria-hidden="true"></i>Tu perfil
                </span>
              </div>
            </div>
          </div>

          <div v-if="!esPropioUsuario" class="perfil-acciones">
            <router-link to="/chat" target="_blank" rel="noopener" class="pl-btn pl-btn--primary">
              <i class="bi bi-chat-dots" aria-hidden="true"></i>Chatear
            </router-link>

            <button
              v-if="!esAmigo"
              type="button"
              class="pl-btn pl-btn--secondary"
              :disabled="solicitudEnviada || enviandoSolicitud"
              @click="enviarSolicitudAmistad"
            >
              <span v-if="enviandoSolicitud" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
              <i v-else-if="solicitudEnviada" class="bi bi-check2" aria-hidden="true"></i>
              <i v-else class="bi bi-person-plus" aria-hidden="true"></i>
              {{ solicitudEnviada ? 'Solicitud enviada' : 'Solicitud de amistad' }}
            </button>

            <button type="button" class="pl-btn pl-btn--danger-ghost" @click="abrirDenuncia">
              <i class="bi bi-flag" aria-hidden="true"></i>Denunciar
            </button>

            <button v-if="esModerador" type="button" class="pl-btn pl-btn--danger" @click="abrirBaneo">
              <i class="bi bi-hammer" aria-hidden="true"></i>Banear
            </button>
          </div>

          <dl class="perfil-datos">
            <div class="perfil-dato">
              <dt>Nombre</dt>
              <dd>{{ perfil.nombre }}</dd>
            </div>
            <div class="perfil-dato">
              <dt>Email</dt>
              <dd>{{ perfil.email }}</dd>
            </div>
            <div class="perfil-dato">
              <dt>Miembro desde</dt>
              <dd>{{ formatFecha(perfil.fechaRegistro) }}</dd>
            </div>
            <div class="perfil-dato">
              <dt>Última conexión</dt>
              <dd>{{ formatFecha(perfil.ultimaConexion) }}</dd>
            </div>
          </dl>
        </article>
      </template>

      <div v-else class="pl-empty-state">
        <span class="pl-empty-state__icon"><i class="bi bi-person-x" aria-hidden="true"></i></span>
        <p class="mb-0">No se encontró este perfil.</p>
      </div>
    </div>
  </main>

  <ModalFormulario
    v-if="modalDenuncia"
    :titulo="`Denunciar a ${perfil?.nombre ?? ''}`"
    @cerrar="cerrarDenuncia"
  >
    <form ref="formDenuncia" novalidate @submit.prevent="enviarDenuncia">
      <div class="pl-field">
        <label class="form-label" for="denuncia-motivo">
          Motivo <span class="text-danger" aria-hidden="true">*</span>
        </label>
        <input
          id="denuncia-motivo"
          v-model="denuncia.motivo"
          type="text"
          class="form-control"
          maxlength="200"
          required
          placeholder="¿Por qué lo denuncias?"
          :aria-invalid="erroresDenuncia.motivo ? 'true' : undefined"
          :aria-describedby="erroresDenuncia.motivo ? 'denuncia-motivo-error' : undefined"
          @input="onMotivoEditado"
        />
        <p v-if="erroresDenuncia.motivo" id="denuncia-motivo-error" class="pl-field__error">
          <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ erroresDenuncia.motivo }}
        </p>
      </div>

      <div class="pl-field">
        <label class="form-label" for="denuncia-detalle">Detalle (opcional)</label>
        <textarea
          id="denuncia-detalle"
          v-model="denuncia.detalle"
          class="form-control"
          rows="4"
          maxlength="2000"
          placeholder="Amplía la información si lo necesitas..."
          aria-describedby="denuncia-detalle-contador"
        ></textarea>
        <p id="denuncia-detalle-contador" class="pl-field__hint text-end">
          {{ denuncia.detalle.length }}/2000
        </p>
      </div>

      <p v-if="erroresDenuncia.general" class="pl-alert pl-alert--danger mb-0" role="alert">
        <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ erroresDenuncia.general }}
      </p>

      <div class="perfil-form__acciones">
        <button type="button" class="pl-btn pl-btn--secondary" @click="cerrarDenuncia">Cancelar</button>
        <button type="submit" class="pl-btn pl-btn--danger-ghost" :disabled="enviandoDenuncia">
          <span v-if="enviandoDenuncia" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
          <i v-else class="bi bi-flag" aria-hidden="true"></i>
          {{ enviandoDenuncia ? 'Enviando…' : 'Enviar denuncia' }}
        </button>
      </div>
    </form>
  </ModalFormulario>

  <ModalFormulario
    v-if="modalBaneo"
    :titulo="`Banear a ${perfil?.nombre ?? ''}`"
    @cerrar="cerrarBaneo"
  >
    <form @submit.prevent="banearUsuario">
      <div class="pl-field">
        <label class="form-label" for="baneo-duracion">Duración</label>
        <select id="baneo-duracion" v-model="baneo.duracion" class="form-select">
          <option v-for="op in opcionesDuracion" :key="op.value" :value="op.value">
            {{ op.label }}
          </option>
        </select>
      </div>

      <div class="pl-field">
        <label class="form-label" for="baneo-motivo">Motivo (opcional)</label>
        <input
          id="baneo-motivo"
          v-model="baneo.motivo"
          type="text"
          class="form-control"
          maxlength="300"
          placeholder="Motivo del baneo"
        />
      </div>

      <p v-if="errorBaneo" class="pl-alert pl-alert--danger mb-0" role="alert">
        <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errorBaneo }}
      </p>

      <div class="perfil-form__acciones">
        <button type="button" class="pl-btn pl-btn--secondary" @click="cerrarBaneo">Cancelar</button>
        <button type="submit" class="pl-btn pl-btn--danger" :disabled="baneando">
          <span v-if="baneando" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
          <i v-else class="bi bi-hammer" aria-hidden="true"></i>
          {{ baneando ? 'Baneando…' : 'Banear' }}
        </button>
      </div>
    </form>
  </ModalFormulario>

  <Footer />

  <ModalAviso v-if="aviso" :mensaje="aviso" @cerrar="aviso = null" />
</template>

<style scoped>
.perfil {
  max-width: 860px;
}

.perfil-card {
  overflow: hidden;
}

.perfil-cabecera {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.5rem;
  border-bottom: 1px solid var(--pl-border);
  background: linear-gradient(180deg, rgba(var(--pl-primary-rgb), 0.05), transparent);
}

.perfil-avatar {
  width: 112px;
  height: 112px;
  flex-shrink: 0;
  box-shadow: 0 0 0 4px #fff, 0 0 0 5px var(--pl-border);
}

.perfil-identidad {
  min-width: 0;
}

.perfil-nombre {
  margin-bottom: 0.5rem;
  color: var(--pl-ink);
  font-size: clamp(1.4rem, 3vw, 1.9rem);
  font-weight: 850;
  letter-spacing: -0.03em;
  overflow-wrap: anywhere;
}

.perfil-pildoras {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.perfil-acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--pl-border);
}

.perfil-datos {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0;
}

.perfil-dato {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--pl-border);
}

.perfil-dato:nth-child(odd) {
  border-right: 1px solid var(--pl-border);
}

.perfil-dato:nth-last-child(-n + 2) {
  border-bottom: 0;
}

.perfil-dato dt {
  margin-bottom: 0.2rem;
  color: var(--pl-muted);
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.perfil-dato dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.perfil-form__acciones {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.25rem;
}

@media (max-width: 575.98px) {
  .perfil-cabecera {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
    padding: 1.25rem;
  }

  .perfil-avatar {
    width: 88px;
    height: 88px;
  }

  .perfil-acciones {
    padding: 1rem 1.25rem;
  }

  .perfil-acciones .pl-btn {
    width: 100%;
  }

  .perfil-datos {
    grid-template-columns: 1fr;
  }

  .perfil-dato,
  .perfil-dato:nth-child(odd),
  .perfil-dato:nth-last-child(-n + 2) {
    padding: 1rem 1.25rem;
    border-right: 0;
    border-bottom: 1px solid var(--pl-border);
  }

  .perfil-dato:last-child {
    border-bottom: 0;
  }

  .perfil-form__acciones {
    flex-direction: column-reverse;
  }

  .perfil-form__acciones .pl-btn {
    width: 100%;
  }
}
</style>
