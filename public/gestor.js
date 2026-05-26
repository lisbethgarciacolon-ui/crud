const API = ""; // Usar rutas relativas para que funcione desde el mismo servidor

window.onload = () => {
    const token = localStorage.getItem("token");
    const usuario = localStorage.getItem("usuario");
    if (token && usuario) {
        mostrarApp(usuario);
    }
};

function getAuthHeaders() {
    const token = localStorage.getItem("token");
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
}

async function register() {
    const usuario = document.getElementById("user").value;
    const password = document.getElementById("pass").value;

    if (!usuario || !password) {
        alert("❌ Completa todos los campos");
        return;
    }

    try {
        const res = await fetch(API + "/auth/register", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ usuario, password })
        });

        const data = await res.json();

        if (res.ok) {
            alert("✅ " + data.mensaje);
            localStorage.setItem("usuario", usuario);
            localStorage.setItem("token", data.token);
            document.getElementById("user").value = "";
            document.getElementById("pass").value = "";
            mostrarApp(usuario);
        } else {
            alert("❌ " + data.error);
        }

    } catch (error) {
        console.error("Error:", error);
        alert("❌ Error de conexión. ¿El servidor está corriendo?");
    }
}

async function login() {
    const usuario = document.getElementById("user").value;
    const password = document.getElementById("pass").value;

    if (!usuario || !password) {
        alert("Completa todos los campos");
        return;
    }

    try {
        const res = await fetch(API + "/auth/login", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ usuario, password })
        });

        const data = await res.json();

        if (res.ok) {
            localStorage.setItem("usuario", usuario);
            localStorage.setItem("token", data.token);
            mostrarApp(usuario);
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert("Error de conexión con el servidor");
        console.error(error);
    }
}

function mostrarApp(usuario) {
    document.getElementById("login").style.display = "none";
    document.getElementById("app").style.display = "block";
    document.getElementById("usuarioNombre").textContent = usuario;
    cargarTareas();
}

function logout() {
    localStorage.removeItem("usuario");
    localStorage.removeItem("token");
    location.reload();
}

async function crearTarea() {
    const titulo = document.getElementById("titulo").value;
    if (!titulo.trim()) {
        alert("Escribe un título");
        return;
    }

    const res = await fetch(API + "/tareas", {
        method: "POST",
        headers: getAuthHeaders(),
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
            headers: getAuthHeaders()
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
        headers: getAuthHeaders()
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
            headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
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