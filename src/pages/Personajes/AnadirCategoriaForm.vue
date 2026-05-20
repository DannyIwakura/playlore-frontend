<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import api from '../../services/api';

const props = defineProps<{ idPersonaje: number }>();
const emit = defineEmits(['close', 'success']);

const todasLasCategorias = ref<any[]>([]);
const categoriasActuales = ref<any[]>([]);
const categoriaSeleccionada = ref('');

// Cargamos los datos al abrir el modal
onMounted(async () => {
    try {
        const resGlobal = await api.get('/categorias', { params: { page: 0, size: 100 } });
        todasLasCategorias.value = resGlobal.data.content;

        const resRelacion = await api.get(`/personaje-categorias/personaje/${props.idPersonaje}`);
        
        // IMPORTANTE: Guardamos el 'id' (de la relación) para poder borrarla
        categoriasActuales.value = resRelacion.data.map((pc: any) => ({
            idRelacion: pc.id, // El ID de la tabla intermedia
            idCategoria: pc.idCategoria,
            nombre: pc.nombreCategoria 
        }));
    } catch (error) {
        console.error("Error cargando categorías:", error);
    }
});

const categoriasDisponibles = computed(() => {
    return todasLasCategorias.value.filter(cat => {
        return !categoriasActuales.value.some(actual => 
            actual && actual.idCategoria === cat.idCategoria
        );
    });
});

const guardarCategorias = async () => {
    try {
        const idCatSeleccionada = parseInt(categoriaSeleccionada.value);
        const payload = {
            idPersonaje: props.idPersonaje,
            idCategoria: idCatSeleccionada
        };

        // Al guardar, el backend debería devolvernos el objeto creado con su nuevo ID
        const response = await api.post('/personaje-categorias', payload);
        const nuevaRelacion = response.data;

        categoriasActuales.value.push({
            idRelacion: nuevaRelacion.id,
            idCategoria: nuevaRelacion.idCategoria,
            nombre: nuevaRelacion.nombreCategoria 
        });

        categoriaSeleccionada.value = '';
        emit('success');
    } catch (error) {
        alert("Error al asignar la categoría.");
    }
};

const eliminarCategoria = async (idRelacion: number) => {
    try {
        await api.delete(`/personaje-categorias/${idRelacion}`);
        
        // Filtramos el array reactivo para que desaparezca de la vista
        categoriasActuales.value = categoriasActuales.value.filter(
            cat => cat.idRelacion !== idRelacion
        );
        
        emit('success');
    } catch (error) {
        console.error("Error al eliminar:", error);
        alert("No se pudo eliminar la categoría.");
    }
};
</script>

<template>
  <div class="modal-backdrop fade show"></div>
  <div class="modal fade show d-block" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-dialog-centered" role="document">
      <div class="modal-content shadow-lg">
        <div class="modal-header">
          <h5 class="modal-title">Gestionar Categorías</h5>
          <button type="button" class="btn-close" @click="$emit('close')"></button>
        </div>
        
        <div class="modal-body">
          <p class="text-muted">ID Personaje: {{ idPersonaje }}</p>

          <div class="mb-3">
            <h6>Categorías actuales:</h6>
            <div class="d-flex flex-wrap gap-2">
              <span 
              v-for="cat in categoriasActuales"
              :key="cat.idCategoria"
              class="badge bg-primary px-3 py-2">
                {{ cat.nombre }}
            <button class="btn-eliminar" @click="eliminarCategoria(cat.idRelacion)">
                &times;
            </button>
              </span>
              <span v-if="categoriasActuales.length === 0" class="text-muted small">Sin categorías asignadas</span>
            </div>
          </div>

          <hr />

          <form @submit.prevent="guardarCategorias">
            <div class="mb-3">
              <label class="form-label font-weight-bold">Añadir Nueva Categoría</label>
              <select class="form-select" v-model="categoriaSeleccionada" required>
                <option value="" disabled>Selecciona una categoría...</option>
                <option v-for="cat in categoriasDisponibles" :key="cat.idCategoria" :value="cat.idCategoria">
                  {{ cat.nombre }}
                </option>
              </select>
            </div>
            
            <div class="modal-footer px-0 pb-0">
              <button type="button" class="btn btn-secondary" @click="$emit('close')">Cerrar</button>
              <button type="submit" class="btn btn-success" :disabled="!categoriaSeleccionada">
                Asignar Categoría
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.btn-eliminar-pildora {
    background: none;
    border: none;
    color: white;
    font-size: 18px;
    font-weight: bold;
    margin-left: 8px;
    cursor: pointer;
    line-height: 1;
    padding: 0;
    opacity: 0.7;
    transition: opacity 0.2s;
}

.btn-eliminar-pildora:hover {
    opacity: 1;
    color: #ff4d4d;
}

.badge {
    display: inline-flex;
    align-items: center;
}
</style>