<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Footer from '../../components/Footer.vue'
import NavBar from '../../components/NavBar.vue'
import RichTextEditor from '../../components/RichTextEditor.vue'
import GaleriaImagenes from '../../components/GaleriaImagenes.vue'
import AnunciosPersonajePanel from '../../components/AnunciosPersonajePanel.vue'
import ImageCropModal from '../../components/ImageCropModal.vue'
import api from '../../services/api'
import { enfocarPrimerError } from '../../composables/useFocoPrimerError'
import defaultAvatar from '../../assets/img/AVATAR.png'

const BASE_URL = import.meta.env.VITE_API_URL

const route = useRoute()
const router = useRouter()
const personajeId = Number(route.params.id)

const errores = reactive<Record<string, string>>({})
const errorGeneral = ref('')
const formRef = ref<HTMLFormElement | null>(null)
const enviando = ref(false)
const cargando = ref(true)
const errorCarga = ref('')
const noEncontrado = ref(false)
const avatarPreview = ref('')
const archivoParaRecortar = ref<File | null>(null)
const mostrarCropper = ref(false)

const personaje = reactive({
  nombre: '',
  genero_personaje: '',
  edad_personaje: null as number | null,
  avatar: null as File | null,
  avatarActual: '',
  trasfondo: '',
  raza: '',
  clase: '',
})

const nombreArchivo = computed(() => personaje.avatar?.name ?? '')

const avatarMostrado = computed(() => {
  if (avatarPreview.value) return avatarPreview.value
  if (!personaje.avatarActual || personaje.avatarActual.includes('AVATAR.png')) return defaultAvatar
  if (personaje.avatarActual.startsWith('http')) return personaje.avatarActual
  return BASE_URL + personaje.avatarActual
})

function limpiarErrores() {
  Object.keys(errores).forEach((clave) => delete errores[clave])
  errorGeneral.value = ''
}

// En cuanto el usuario corrige un campo, su error deja de aplicar: se retira
// el mensaje y el borde rojo sin esperar a un nuevo envio.
function limpiarError(campo: string) {
  delete errores[campo]
}

function onTrasfondo(valor: string) {
  personaje.trasfondo = valor
  limpiarError('trasfondo')
}

function liberarPreview() {
  if (avatarPreview.value) URL.revokeObjectURL(avatarPreview.value)
  avatarPreview.value = ''
}

async function cargar() {
  cargando.value = true
  errorCarga.value = ''
  noEncontrado.value = false

  if (!Number.isFinite(personajeId) || personajeId <= 0) {
    noEncontrado.value = true
    cargando.value = false
    return
  }

  try {
    const { data } = await api.get(`/personajes/${personajeId}`)
    personaje.nombre = data.nombre ?? ''
    personaje.genero_personaje = data.genero ?? ''
    personaje.edad_personaje = data.edadPersonaje ?? null
    personaje.trasfondo = data.trasfondo ?? ''
    personaje.raza = data.raza ?? ''
    personaje.clase = data.clase ?? ''
    personaje.avatarActual = data.avatar ?? ''
  } catch (error: any) {
    if (error?.response?.status === 404) {
      noEncontrado.value = true
    } else {
      errorCarga.value =
        'No pudimos cargar el personaje. Revisa tu conexión e inténtalo de nuevo.'
    }
  } finally {
    cargando.value = false
  }
}

function handleAvatarUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  archivoParaRecortar.value = file
  mostrarCropper.value = true
  input.value = ''
}

function onAvatarRecortado(file: File) {
  liberarPreview()
  personaje.avatar = file
  avatarPreview.value = URL.createObjectURL(file)
  mostrarCropper.value = false
  archivoParaRecortar.value = null
  delete errores.avatarFile
}

function cancelarRecorte() {
  mostrarCropper.value = false
  archivoParaRecortar.value = null
}

function validar(): boolean {
  limpiarErrores()

  const nombre = personaje.nombre.trim()
  if (!nombre) {
    errores.nombre = 'El nombre es obligatorio.'
  } else if (nombre.length < 3 || nombre.length > 50) {
    errores.nombre = 'El nombre debe tener entre 3 y 50 caracteres.'
  }

  if (!personaje.genero_personaje) {
    errores.genero = 'Elige un género.'
  }

  if (personaje.edad_personaje != null && Number(personaje.edad_personaje) <= 0) {
    errores.edadPersonaje = 'La edad debe ser un número positivo.'
  }

  if (personaje.raza.length > 10000) {
    errores.raza = 'La raza no puede superar los 10000 caracteres.'
  }

  if (personaje.clase.length > 50) {
    errores.clase = 'La clase no puede superar los 50 caracteres.'
  }

  if (personaje.trasfondo.length > 10000) {
    errores.trasfondo = 'El trasfondo no puede superar los 10000 caracteres.'
  }

  return Object.keys(errores).length === 0
}

async function actualizarPersonaje() {
  if (enviando.value) return

  if (!validar()) {
    await enfocarPrimerError(formRef.value)
    return
  }

  enviando.value = true
  try {
    const formData = new FormData()
    formData.append(
      'personaje',
      new Blob(
        [
          JSON.stringify({
            nombre: personaje.nombre.trim(),
            genero: personaje.genero_personaje,
            edadPersonaje: personaje.edad_personaje,
            trasfondo: personaje.trasfondo,
            raza: personaje.raza,
            clase: personaje.clase,
          }),
        ],
        { type: 'application/json' }
      )
    )
    if (personaje.avatar) formData.append('avatarFile', personaje.avatar)

    await api.put(`/personajes/${personajeId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    liberarPreview()
    router.push('/personajes')
  } catch (error: any) {
    const data = error?.response?.data
    if (error?.response?.status === 400 && data && typeof data === 'object' && !data.error) {
      Object.assign(errores, data)
      await enfocarPrimerError(formRef.value)
    } else {
      errorGeneral.value =
        data?.error || data?.message || 'No pudimos guardar los cambios. Inténtalo de nuevo.'
    }
  } finally {
    enviando.value = false
  }
}

onMounted(cargar)
onUnmounted(liberarPreview)
</script>

<template>
  <NavBar :logeado="true" />

  <main class="pl-page">
    <div class="container">
      <header class="pl-page-header">
        <span class="pl-kicker">Personajes</span>
        <h1 class="pl-title">Editar personaje</h1>
        <p class="pl-lead">Actualiza sus datos, su imagen y su galería sin salir de esta página.</p>
      </header>

      <div class="form-personaje">
        <p v-if="cargando" class="form-estado" role="status">
          <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
          Cargando el personaje…
        </p>

        <div v-else-if="noEncontrado" class="pl-empty-state">
          <span class="pl-empty-state__icon" aria-hidden="true">
            <i class="bi bi-person-x"></i>
          </span>
          <h2 class="form-vacio__titulo">Personaje no encontrado</h2>
          <p>Puede que se haya eliminado o que el enlace esté mal.</p>
          <router-link to="/personajes" class="pl-btn pl-btn--primary">
            <i class="bi bi-arrow-left" aria-hidden="true"></i>
            Volver a mis personajes
          </router-link>
        </div>

        <div v-else-if="errorCarga" class="pl-alert pl-alert--danger" role="alert">
          <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
          <span class="flex-grow-1">{{ errorCarga }}</span>
          <button type="button" class="pl-btn pl-btn--secondary pl-btn--sm" @click="cargar()">
            Reintentar
          </button>
        </div>

        <template v-else>
          <form
            ref="formRef"
            novalidate
            :aria-busy="enviando || undefined"
            @submit.prevent="actualizarPersonaje"
          >
            <p v-if="errorGeneral" class="pl-alert pl-alert--danger" role="alert">
              <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
              <span>{{ errorGeneral }}</span>
            </p>

            <section class="pl-form-seccion" aria-labelledby="seccion-identidad">
              <h2 id="seccion-identidad" class="pl-form-seccion__titulo">
                <span class="pl-form-seccion__numero" aria-hidden="true">1</span>
                Identidad
              </h2>
              <p class="pl-form-seccion__ayuda">Lo esencial para reconocer a tu personaje.</p>

              <div class="pl-field">
                <label class="form-label" for="nombre">
                  Nombre <span class="text-danger" aria-hidden="true">*</span>
                </label>
                <input
                  id="nombre"
                  v-model="personaje.nombre"
                  type="text"
                  class="form-control"
                  maxlength="50"
                  autocomplete="off"
                  :aria-invalid="errores.nombre ? 'true' : undefined"
                  :aria-describedby="errores.nombre ? 'nombre-error' : 'nombre-ayuda'"
                  @input="limpiarError('nombre')"
                />
                <p v-if="errores.nombre" id="nombre-error" class="pl-field__error">
                  <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errores.nombre }}
                </p>
                <p v-else id="nombre-ayuda" class="pl-field__hint">Entre 3 y 50 caracteres.</p>
              </div>

              <div class="row g-3">
                <div class="col-sm-6">
                  <div class="pl-field mb-0">
                    <label class="form-label" for="raza">Raza</label>
                    <input
                      id="raza"
                      v-model="personaje.raza"
                      type="text"
                      class="form-control"
                      maxlength="50"
                      :aria-invalid="errores.raza ? 'true' : undefined"
                      :aria-describedby="errores.raza ? 'raza-error' : undefined"
                      @input="limpiarError('raza')"
                    />
                    <p v-if="errores.raza" id="raza-error" class="pl-field__error">
                      <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errores.raza }}
                    </p>
                  </div>
                </div>

                <div class="col-sm-6">
                  <div class="pl-field mb-0">
                    <label class="form-label" for="clase">Clase</label>
                    <input
                      id="clase"
                      v-model="personaje.clase"
                      type="text"
                      class="form-control"
                      maxlength="50"
                      :aria-invalid="errores.clase ? 'true' : undefined"
                      :aria-describedby="errores.clase ? 'clase-error' : undefined"
                      @input="limpiarError('clase')"
                    />
                    <p v-if="errores.clase" id="clase-error" class="pl-field__error">
                      <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errores.clase }}
                    </p>
                  </div>
                </div>

                <div class="col-sm-6">
                  <div class="pl-field mb-0">
                    <label class="form-label" for="genero">
                      Género <span class="text-danger" aria-hidden="true">*</span>
                    </label>
                    <select
                      id="genero"
                      v-model="personaje.genero_personaje"
                      class="form-select"
                      :aria-invalid="errores.genero ? 'true' : undefined"
                      :aria-describedby="errores.genero ? 'genero-error' : undefined"
                      @change="limpiarError('genero')"
                    >
                      <option disabled value="">Selecciona una opción</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                    </select>
                    <p v-if="errores.genero" id="genero-error" class="pl-field__error">
                      <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errores.genero }}
                    </p>
                  </div>
                </div>

                <div class="col-sm-6">
                  <div class="pl-field mb-0">
                    <label class="form-label" for="edad">Edad</label>
                    <div class="input-group">
                      <input
                        id="edad"
                        v-model.number="personaje.edad_personaje"
                        type="number"
                        class="form-control"
                        min="1"
                        inputmode="numeric"
                        placeholder="Opcional"
                        :aria-invalid="errores.edadPersonaje ? 'true' : undefined"
                        :aria-describedby="errores.edadPersonaje ? 'edad-error' : undefined"
                        @input="limpiarError('edadPersonaje')"
                      />
                      <span class="input-group-text">años</span>
                    </div>
                    <p v-if="errores.edadPersonaje" id="edad-error" class="pl-field__error">
                      <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errores.edadPersonaje }}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section class="pl-form-seccion" aria-labelledby="seccion-apariencia">
              <h2 id="seccion-apariencia" class="pl-form-seccion__titulo">
                <span class="pl-form-seccion__numero" aria-hidden="true">2</span>
                Apariencia
              </h2>
              <p class="pl-form-seccion__ayuda">
                Cambia el avatar cuando quieras. Las imágenes de la galería se gestionan aparte.
              </p>

              <div class="avatar-campo">
                <img
                  :src="avatarMostrado"
                  class="avatar-preview"
                  :alt="`Avatar de ${personaje.nombre || 'tu personaje'}`"
                  width="96"
                  height="96"
                />

                <div class="avatar-campo__control">
                  <label class="form-label" for="avatar">Avatar</label>
                  <input
                    id="avatar"
                    type="file"
                    class="form-control"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    :aria-invalid="errores.avatarFile ? 'true' : undefined"
                    :aria-describedby="errores.avatarFile ? 'avatar-hint avatar-error' : 'avatar-hint'"
                    @change="handleAvatarUpload"
                  />
                  <p id="avatar-hint" class="pl-field__hint">
                    JPG, PNG o WEBP. Recorte 1:1 antes de guardar. Máx. 300 KB.
                    <template v-if="nombreArchivo"> · {{ nombreArchivo }}</template>
                  </p>
                  <p v-if="errores.avatarFile" id="avatar-error" class="pl-field__error">
                    <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errores.avatarFile }}
                  </p>
                </div>
              </div>

              <ImageCropModal
                v-if="mostrarCropper && archivoParaRecortar"
                :archivo="archivoParaRecortar"
                :aspect-ratio="1"
                :max-width="400"
                :max-height="400"
                :max-bytes="300 * 1024"
                titulo="Ajustar avatar del personaje"
                @confirmar="onAvatarRecortado"
                @cancelar="cancelarRecorte"
              />
            </section>

            <section class="pl-form-seccion" aria-labelledby="seccion-historia">
              <h2 id="seccion-historia" class="pl-form-seccion__titulo">
                <span class="pl-form-seccion__numero" aria-hidden="true">3</span>
                Historia
              </h2>
              <p class="pl-form-seccion__ayuda">
                Su pasado, sus motivaciones y lo que le hace único.
              </p>

              <div class="pl-field mb-0">
                <span class="form-label">Trasfondo</span>
                <RichTextEditor
                  id="trasfondo"
                  etiqueta="Trasfondo"
                  :model-value="personaje.trasfondo"
                  @update:model-value="onTrasfondo"
                />
                <p v-if="errores.trasfondo" id="trasfondo-error" class="pl-field__error">
                  <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errores.trasfondo }}
                </p>
              </div>
            </section>

            <div class="pl-form-acciones">
              <router-link to="/personajes" class="pl-btn pl-btn--secondary">Cancelar</router-link>
              <button type="submit" class="pl-btn pl-btn--primary" :disabled="enviando">
                <span v-if="enviando" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                <i v-else class="bi bi-check-lg" aria-hidden="true"></i>
                {{ enviando ? 'Guardando…' : 'Guardar cambios' }}
              </button>
            </div>
          </form>

          <section class="galeria-seccion" aria-labelledby="seccion-galeria">
            <h2 id="seccion-galeria" class="galeria-seccion__titulo">
              <i class="bi bi-images" aria-hidden="true"></i>
              Galería de imágenes
            </h2>
            <p class="galeria-seccion__ayuda">
              Sube hasta 30 imágenes. La primera se usa como portada en el buscador.
            </p>
            <GaleriaImagenes :personaje-id="personajeId" :es-propietario="true" />
          </section>

          <section class="anuncios-seccion" aria-labelledby="seccion-anuncios">
            <h2 id="seccion-anuncios" class="galeria-seccion__titulo">
              <i class="bi bi-megaphone" aria-hidden="true"></i>
              Anuncios RP
            </h2>
            <p class="galeria-seccion__ayuda">
              Crea y edita los anuncios de este personaje. Nacen inactivos y puedes tener hasta tres activos.
            </p>
            <AnunciosPersonajePanel :personaje-id="personajeId" :es-propietario="true" />
          </section>
        </template>
      </div>
    </div>
  </main>

  <Footer />
</template>

<style scoped>
.form-personaje {
  max-width: 860px;
}

.form-estado {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  padding: 2rem 0;
  color: var(--pl-muted);
  font-size: 0.9rem;
}

.form-vacio__titulo {
  margin: 0 0 0.35rem;
  color: var(--pl-ink);
  font-size: 1.2rem;
  font-weight: 850;
}

.avatar-campo {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.avatar-campo__control {
  min-width: 0;
  flex: 1;
}

.avatar-preview {
  display: block;
  width: 96px;
  /* Sin height auto el atributo HTML height gana al cuadrado. */
  height: auto;
  aspect-ratio: 1;
  flex-shrink: 0;
  border-radius: var(--pl-radius-lg);
  object-fit: cover;
  background: var(--pl-surface-soft);
  box-shadow: inset 0 0 0 1px var(--pl-border);
}

.galeria-seccion,
.anuncios-seccion {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--pl-border);
}

.galeria-seccion__titulo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.25rem;
  color: var(--pl-ink);
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.galeria-seccion__ayuda {
  margin: 0 0 1rem;
  color: var(--pl-muted);
  font-size: 0.86rem;
}

@media (max-width: 575.98px) {
  .avatar-campo {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
