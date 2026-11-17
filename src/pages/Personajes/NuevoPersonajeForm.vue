<script setup lang="ts">
import { computed, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import Footer from '../../components/Footer.vue'
import NavBar from '../../components/NavBar.vue'
import RichTextEditor from '../../components/RichTextEditor.vue'
import api from '../../services/api'
import { userStore } from '../../store/userStore'
import { enfocarPrimerError } from '../../composables/useFocoPrimerError'

const router = useRouter()
const errores = reactive<Record<string, string>>({})
const errorGeneral = ref('')
const formRef = ref<HTMLFormElement | null>(null)
const enviando = ref(false)
const avatarPreview = ref('')

const personaje = reactive({
  nombre: '',
  genero_personaje: '',
  edad_personaje: null as number | null,
  avatar: null as File | null,
  trasfondo: '',
  raza: '',
  clase: '',
})

const nombreArchivo = computed(() => personaje.avatar?.name ?? '')

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

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  liberarPreview()
  if (!file) {
    personaje.avatar = null
    return
  }

  personaje.avatar = file
  avatarPreview.value = URL.createObjectURL(file)
  delete errores.avatarFile
}

// Espejo de las restricciones del backend: evita un viaje de ida y vuelta
// para errores que se pueden explicar al instante.
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

async function crearPersonaje() {
  if (enviando.value) return

  if (!validar()) {
    await enfocarPrimerError(formRef.value)
    return
  }

  if (!userStore.usuario?.value) {
    errorGeneral.value = 'No se ha detectado una sesión activa. Vuelve a iniciar sesión.'
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
            userId: userStore.usuario.value.id,
          }),
        ],
        { type: 'application/json' }
      )
    )
    if (personaje.avatar) formData.append('avatarFile', personaje.avatar)

    await api.post('/personajes', formData)
    liberarPreview()
    router.push({ path: '/personajes', query: { creacion: 'ok' } })
  } catch (error: any) {
    const data = error?.response?.data
    if (error?.response?.status === 400 && data && typeof data === 'object' && !data.error) {
      Object.assign(errores, data)
      await enfocarPrimerError(formRef.value)
    } else {
      errorGeneral.value =
        data?.error || data?.message || 'No pudimos crear el personaje. Inténtalo de nuevo.'
    }
  } finally {
    enviando.value = false
  }
}

onUnmounted(liberarPreview)
</script>

<template>
  <NavBar :logeado="true" />

  <main class="pl-page">
    <div class="container">
      <header class="pl-page-header">
        <span class="pl-kicker">Personajes</span>
        <h1 class="pl-title">Crear nuevo personaje</h1>
        <p class="pl-lead">
          Cuéntanos quién es tu personaje: su identidad, su apariencia y su historia.
        </p>
      </header>

      <form
        ref="formRef"
        class="form-personaje"
        novalidate
        :aria-busy="enviando || undefined"
        @submit.prevent="crearPersonaje"
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
              placeholder="Cómo se llama tu personaje"
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
                  placeholder="Elfo, humana, androide…"
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
                  placeholder="Exploradora, mago, piloto…"
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
            Una imagen ayuda a los demás a imaginarlo. Puedes añadir más en su galería después.
          </p>

          <div class="avatar-campo">
            <img
              v-if="avatarPreview"
              :src="avatarPreview"
              class="avatar-preview"
              alt="Vista previa del avatar elegido"
            />
            <span v-else class="avatar-preview avatar-preview--vacio" aria-hidden="true">
              <i class="bi bi-person"></i>
            </span>

            <div class="avatar-campo__control">
              <label class="form-label" for="avatar">Avatar</label>
              <input
                id="avatar"
                type="file"
                class="form-control"
                accept="image/jpeg,image/png,image/webp,image/gif"
                :aria-invalid="errores.avatarFile ? 'true' : undefined"
                :aria-describedby="errores.avatarFile ? 'avatar-hint avatar-error' : 'avatar-hint'"
                @change="onFileChange"
              />
              <p id="avatar-hint" class="pl-field__hint">
                JPG, PNG, WEBP o GIF. Máx. 400x400 px.
                <template v-if="nombreArchivo"> · {{ nombreArchivo }}</template>
              </p>
              <p v-if="errores.avatarFile" id="avatar-error" class="pl-field__error">
                <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>{{ errores.avatarFile }}
              </p>
            </div>
          </div>
        </section>

        <section class="pl-form-seccion" aria-labelledby="seccion-historia">
          <h2 id="seccion-historia" class="pl-form-seccion__titulo">
            <span class="pl-form-seccion__numero" aria-hidden="true">3</span>
            Historia
          </h2>
          <p class="pl-form-seccion__ayuda">
            Su pasado, sus motivaciones y lo que le hace único. Puedes editarlo cuando quieras.
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
            <i v-else class="bi bi-plus-lg" aria-hidden="true"></i>
            {{ enviando ? 'Creando…' : 'Crear personaje' }}
          </button>
        </div>
      </form>
    </div>
  </main>

  <Footer />
</template>

<style scoped>
.form-personaje {
  max-width: 860px;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 96px;
  flex-shrink: 0;
  border-radius: var(--pl-radius-lg);
  object-fit: cover;
  background: var(--pl-surface-soft);
  box-shadow: inset 0 0 0 1px var(--pl-border);
  color: var(--pl-muted);
  font-size: 2rem;
}

@media (max-width: 575.98px) {
  .avatar-campo {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
