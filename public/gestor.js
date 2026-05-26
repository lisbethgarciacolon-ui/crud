const API = ""; // Usar rutas relativas para que funcione desde el mismo servidor

function mostrarApp(usuario) {
    document.getElementById("login").style.display = "none";
    document.getElementById("app").style.display = "block";
    document.getElementById("usuarioNombre").textContent = usuario;
    cargarTareas();
}

function logout() {
    fetch(API + "/auth/logout", {
        method: "POST",
        credentials: "same-origin"
    }).finally(() => {
        localStorage.removeItem("usuario");
        location.reload();
    });
}

async function crearTarea() {
    const titulo = document.getElementById("titulo").value;
    if (!titulo.trim()) {
        alert("Escribe un título");
        return;
    }

    const res = await fetch(API + "/tareas", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo })
    });

    if (!res.ok) {
        if (res.status === 401) {
            logout();
            return;
        }
        const data = await res.json();
        alert(data.error || "Error al crear la tarea");
        return;
    }

    document.getElementById("titulo").value = "";
    cargarTareas();
}

async function cargarTareas() {
    try {
        const res = await fetch(API + "/tareas", {
            credentials: "same-origin"
        });

        if (!res.ok) {
            if (res.status === 401) {
                logout();
                return;
            }
            const data = await res.json();
            alert(data.error || "Error al cargar tareas");
            return;
        }

        const tareas = await res.json();
        const lista = document.getElementById("lista");
        lista.innerHTML = "";

        tareas.forEach(t => {
            const li = document.createElement("li");
            li.className = t.estado === "completada" ? "completada" : "";

            li.innerHTML = `
                <span class="tarea-titulo">${t.titulo}</span>
                <span class="tarea-estado">[${t.estado}]</span>
                <button onclick="marcarCompletada(${t.id})" 
                        ${t.estado === "completada" ? "disabled" : ""}>✓</button>
                <button onclick="editarTarea(${t.id})">✏️</button>
                <button onclick="eliminarTarea(${t.id})">❌</button>
            `;

            lista.appendChild(li);
        });
    } catch (error) {
        console.error("Error cargando tareas:", error);
    }
}

async function eliminarTarea(id) {
    if (!confirm("¿Eliminar tarea?")) return;

    const res = await fetch(API + "/tareas/" + id, {
        method: "DELETE",
        credentials: "same-origin"
    });

    if (!res.ok) {
        if (res.status === 401) {
            logout();
            return;
        }
        const data = await res.json();
        alert(data.error || "Error al eliminar la tarea");
        return;
    }

    cargarTareas();
}

async function editarTarea(id) {
    const nuevo = prompt("Nuevo título:");
    if (nuevo && nuevo.trim()) {
        const res = await fetch(API + "/tareas/" + id, {
            method: "PUT",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ titulo: nuevo.trim() })
        });

        if (!res.ok) {
            if (res.status === 401) {
                logout();
                return;
            }
            const data = await res.json();
            alert(data.error || "Error al editar la tarea");
            return;
        }

        cargarTareas();
    }
}

async function marcarCompletada(id) {
    const res = await fetch(API + "/tareas/" + id, {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "completada" })
    });

    if (!res.ok) {
        if (res.status === 401) {
            logout();
            return;
        }
        const data = await res.json();
        alert(data.error || "Error al cambiar el estado");
        return;
    }

    cargarTareas();
}