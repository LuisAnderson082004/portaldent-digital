import { 
    getTreatmentsCatalog, 
    insertTreatmentInCatalog, 
    updateTreatmentInCatalog, 
    deleteTreatmentFromCatalog 
} from '../utils/storage.js';
import { toggleModal } from '../utils/ui-helper.js';


export async function renderTarifarioList(appState) {
    const tbody = document.getElementById('tarifario-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    try {
        appState.treatmentsCatalog = await getTreatmentsCatalog();
    } catch (err) {
        console.error("Error fetching treatments catalog:", err.message);
    }

    appState.treatmentsCatalog.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="badge badge-info">${item.categoria}</span></td>
            <td><strong>${item.nombre}</strong></td>
            <td>S/ ${parseFloat(item.precio_soles).toFixed(2)}</td>
            <td>
                <button class="btn btn-outline btn-sm mr-1" onclick="openTarifarioModal('${item.id}')"><i class="fa-solid fa-pen"></i> Editar</button>
                <button class="btn btn-danger-outline btn-sm" onclick="deleteTarifarioCatalogItem('${item.id}')"><i class="fa-solid fa-trash"></i> Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

export function openTarifarioModal(itemId, appState) {
    const modal = document.getElementById('tarifario-modal');
    const form = document.getElementById('tarifario-form');
    if (!form || !modal) return;
    form.reset();
    
    if (itemId) {
        document.getElementById('tarifario-modal-title').innerText = "Editar Procedimiento";
        const item = appState.treatmentsCatalog.find(t => t.id === itemId);
        if (item) {
            document.getElementById('tarifario-item-id').value = item.id;
            document.getElementById('tarifario-nombre').value = item.nombre;
            document.getElementById('tarifario-categoria').value = item.categoria;
            document.getElementById('tarifario-precio-soles').value = item.precio_soles;
            document.getElementById('tarifario-precio-dolares').value = item.precio_dolares || 0;
        }
    } else {
        document.getElementById('tarifario-modal-title').innerText = "Nuevo Procedimiento";
        document.getElementById('tarifario-item-id').value = '';
        document.getElementById('tarifario-precio-dolares').value = 0;
    }
    
    toggleModal('tarifario-modal', true);
}

export function closeTarifarioModal() {
    toggleModal('tarifario-modal', false);
}

export async function deleteTarifarioCatalogItem(id, appState) {
    if (confirm("¿Está seguro que desea eliminar este procedimiento del catálogo?")) {
        try {
            await deleteTreatmentFromCatalog(id);
            await renderTarifarioList(appState);
        } catch (err) {
            alert("Error al eliminar del catálogo: " + err.message);
        }
    }
}

export function setupTarifario(appState) {
    const form = document.getElementById('tarifario-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('tarifario-item-id').value;
        const nombre = document.getElementById('tarifario-nombre').value.trim();
        const categoria = document.getElementById('tarifario-categoria').value;
        const precio_soles = parseFloat(document.getElementById('tarifario-precio-soles').value);
        const precio_dolares = parseFloat(document.getElementById('tarifario-precio-dolares').value) || 0;

        const itemData = { nombre, categoria, precio_soles, precio_dolares };

        try {
            if (id) {
                await updateTreatmentInCatalog(id, itemData);
            } else {
                await insertTreatmentInCatalog(itemData);
            }
            closeTarifarioModal();
            await renderTarifarioList(appState);
        } catch (err) {
            alert("Error al guardar en catálogo: " + err.message);
        }
    });
}
