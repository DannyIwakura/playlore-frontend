<script setup lang="ts">
import { ref } from 'vue'
import { Modal } from 'bootstrap'
import axios from 'axios'

const emit = defineEmits(['creada'])

const nombre = ref('')
const descripcion = ref('')
const tipo = ref('GENERO')
const error = ref('')
const cargando = ref(false)

const resetForm = () => {
  nombre.value = ''
  descripcion.value = ''
  tipo.value = 'GENERO'
  error.value = ''
}

const crearCategoria = async () => {
  error.value = ''
  cargando.value = true
  try {
    await axios.post(`${import.meta.env.VITE_API_URL}/categorias`, {
      nombre: nombre.value,
      descripcion: descripcion.value,
      tipo: tipo.value
    }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })

    resetForm()
    //Cerrar modal forzado
    const modalEl = document.getElementById('modalNuevaCategoria')
    if (modalEl) {
      const bsModal = Modal.getOrCreateInstance(modalEl)
      bsModal.hide()
      
      // Limpieza manual de seguridad por si Bootstrap falla en eliminar el backdrop
      setTimeout(() => {
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove())
        document.body.style.overflow = 'auto'
        document.body.style.paddingRight = '0'
      }, 300)
    }

    emit('creada')
  } catch (e) {
    error.value = 'Error al crear la categoría.'
  } finally {
    cargando.value = false
  }
}
</script>

<template>
  <!-- Botón que abre el modal -->
  <button
    class="btn btn-primary mb-4"
    data-bs-toggle="modal"
    data-bs-target="#modalNuevaCategoria"
  >
    Nueva categoría
  </button>

  <!-- Modal -->
  <div class="modal fade" id="modalNuevaCategoria" tabindex="-1" aria-labelledby="modalNuevaCategoriaLabel" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content">

        <div class="modal-header">
          <h5 class="modal-title" id="modalNuevaCategoriaLabel">Nueva categoría</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar" @click="resetForm"></button>
        </div>

        <div class="modal-body">
          <div v-if="error" class="alert alert-danger">{{ error }}</div>

          <div class="mb-3">
            <label class="form-label">Nombre</label>
            <input
              v-model="nombre"
              type="text"
              class="form-control"
              placeholder="Nombre de la categoría"
            />
          </div>

          <div class="mb-3">
            <label class="form-label">Descripción</label>
            <textarea
              v-model="descripcion"
              class="form-control"
              rows="3"
              placeholder="Descripción de la categoría"
            ></textarea>
          </div>

          <div class="mb-3">
            <label class="form-label">Tipo</label>
            <select v-model="tipo" class="form-select">
                <option value="GENERO">Género</option>
                <option value="FANDOM">Fandom</option>
                <option value="SOBRE_EL_PERSONAJE">Sobre el personaje</option>
                <option value="TIPO_DE_ESCRITURA">Tipo de escritura</option>
                <option value="TIPO_DE_TRAMA">Tipo de trama</option>
            </select>
          </div>
        </div>

        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-secondary"
            data-bs-dismiss="modal"
            @click="resetForm"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="cargando || !nombre"
            @click="crearCategoria"
          >
            {{ cargando ? 'Creando...' : 'Crear categoría' }}
          </button>
        </div>

      </div>
    </div>
  </div>
</template>