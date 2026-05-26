const API = "";

window.onload = () => {
    checkSession();
};

async function checkSession() {
    try {
        const res = await fetch(API + '/auth/me', {
            credentials: 'same-origin'
        });

        if (res.ok) {
            const data = await res.json();
            localStorage.setItem('usuario', data.usuario);
            cargarGestor(data.usuario);
        }
    } catch (error) {
        console.error('No hay sesión activa:', error);
    }
}

function cargarGestor(usuario) {
    if (document.getElementById('gestor-script')) return;

    const script = document.createElement('script');
    script.id = 'gestor-script';
    script.src = 'gestor.js';
    script.onload = () => {
        if (typeof mostrarApp === 'function') {
            mostrarApp(usuario);
        }
    };
    document.body.appendChild(script);
}

async function register() {
    const usuario = document.getElementById('user').value;
    const password = document.getElementById('pass').value;

    if (!usuario || !password) {
        alert('❌ Completa todos los campos');
        return;
    }

    try {
        const res = await fetch(API + '/auth/register', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, password })
        });

        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('usuario', usuario);
            cargarGestor(usuario);
        } else {
            alert('❌ ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error de conexión. ¿El servidor está corriendo?');
    }
}

async function login() {
    const usuario = document.getElementById('user').value;
    const password = document.getElementById('pass').value;

    if (!usuario || !password) {
        alert('Completa todos los campos');
        return;
    }

    try {
        const res = await fetch(API + '/auth/login', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, password })
        });

        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('usuario', usuario);
            cargarGestor(usuario);
        } else {
            alert(data.error);
        }
    } catch (error) {
        console.error('Error de conexión con el servidor', error);
        alert('Error de conexión con el servidor');
    }
}
