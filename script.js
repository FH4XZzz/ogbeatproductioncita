/* ==========================================
   SCRIPT PRINCIPAL - OG BEAT PRODUCTION
   ========================================== */

// ==========================================
// 0. CONFIGURACIÓN DE DISPONIBILIDAD
// ==========================================

// Modo de desarrollo (cambiar a false en producción)
const DEBUG_MODE = false; // MANTENER EN FALSE PARA PRODUCCIÓN

/**
 * Sistema inteligente de disponibilidad tipo Airbnb/Booking
 */
const SISTEMA_DISPONIBILIDAD = {
    // Días completamente ocupados (formato YYYY-MM-DD)
    diasOcupados: [
        // Ejemplo: '2026-03-20', '2026-03-21'
    ],
    
    // Reservas: cada reserva ocupa 2 horas consecutivas
    // Formato: { fecha: '2026-03-20', horaInicio: '10:00' }
    // Si reserva 10:00, bloquea 10:00 y 12:00
    reservas: [
        // Ejemplo: { fecha: '2026-03-20', horaInicio: '10:00' }
    ],
    
    // Configuración de horarios por categoría de día
    horariosDisponibles: {
        // Horarios normales (lunes a viernes) - Cada 2 horas
        normal: [
            { hora: '08:00', etiqueta: '8:00 AM', disponible: true },
            { hora: '10:00', etiqueta: '10:00 AM', disponible: true },
            { hora: '12:00', etiqueta: '12:00 PM', disponible: true },
            { hora: '14:00', etiqueta: '2:00 PM', disponible: true },
            { hora: '16:00', etiqueta: '4:00 PM', disponible: true },
            { hora: '18:00', etiqueta: '6:00 PM', disponible: true },
            { hora: '20:00', etiqueta: '8:00 PM', disponible: true }
        ],
        // Horarios fines de semana (sábado-domingo) - Cada 2 horas
        finDeSemana: [
            { hora: '10:00', etiqueta: '10:00 AM', disponible: true },
            { hora: '12:00', etiqueta: '12:00 PM', disponible: true },
            { hora: '14:00', etiqueta: '2:00 PM', disponible: true },
            { hora: '16:00', etiqueta: '4:00 PM', disponible: true },
            { hora: '18:00', etiqueta: '6:00 PM', disponible: true },
            { hora: '20:00', etiqueta: '8:00 PM', disponible: true }
        ]
    },
    
    // Métodos del sistema
    getDiaOcupado(fechaISO) {
        return this.diasOcupados.includes(fechaISO);
    },
    
    getHorariosParaDia(fecha) {
        if (!fecha) return [];
        
        // Determinar si es fin de semana (0 = domingo, 6 = sábado)
        const diaSemana = fecha.getDay();
        const esFinDeSemana = diaSemana === 0 || diaSemana === 6;
        
        return esFinDeSemana ? this.horariosDisponibles.finDeSemana : this.horariosDisponibles.normal;
    },
    
    /**
     * Obtiene la próxima hora (+ 2 horas)
     */
    getProximaHora(hora) {
        const [horas, minutos] = hora.split(':');
        const horasNum = parseInt(horas) + 2;
        return String(horasNum).padStart(2, '0') + ':' + minutos;
    },
    
    /**
     * Verifica si una hora está disponible (incluyendo la siguiente)
     */
    horaDisponible(fechaISO, hora) {
        const proximaHora = this.getProximaHora(hora);
        // Usamos getHorasOcupadas para ser consistentes con lo que ve el usuario (bloquea start y end)
        const horasOcupadas = this.getHorasOcupadas(fechaISO);
        
        // Verificar si la hora actual o la siguiente están en la lista de ocupadas
        if (horasOcupadas.includes(hora) || horasOcupadas.includes(proximaHora)) {
            return false;
        }
        
        // Verificar que la próxima hora existe en el horario disponible
        const horariosDelDia = this.getHorariosParaDia(new Date(fechaISO + 'T00:00:00'));
        return horariosDelDia.some(h => h.hora === hora);
    },
    
    /**
     * Agrega una reserva (bloquea 2 horas automáticamente)
     */
    agregarReserva(fechaISO, horaInicio, nombreCliente = 'Cliente') {
        if (!this.horaDisponible(fechaISO, horaInicio)) {
            console.warn(`❌ Hora ${horaInicio} no disponible en ${fechaISO}`);
            return false;
        }
        
        const proximaHora = this.getProximaHora(horaInicio);
        
        this.reservas.push({
            fecha: fechaISO,
            horaInicio: horaInicio,
            proximaHora: proximaHora,
            nombreCliente: nombreCliente,
            duracion: 2
        });
        
        // 💾 GUARDAR AUTOMÁTICAMENTE EN LOCALSTORAGE
        this.guardarEnLocalStorage();
        
        if (DEBUG_MODE) console.log(`✅ Reserva agregada: ${fechaISO} ${horaInicio}-${proximaHora} (${nombreCliente})`);
        return true;
    },
    
    /**
     * Quita una reserva (libera 2 horas)
     */
    quitarReserva(fechaISO, horaInicio) {
        this.reservas = this.reservas.filter(r => !(r.fecha === fechaISO && r.horaInicio === horaInicio));
        if (DEBUG_MODE) console.log(`📅 Reserva removida: ${fechaISO} ${horaInicio}`);
    },
    
    /**
     * Obtiene las reservas de un día específico
     */
    getReservasDelDia(fechaISO) {
        return this.reservas.filter(r => r.fecha === fechaISO);
    },
    
    /**
     * Obtiene horas ocupadas de un día (para visualización)
     */
    getHorasOcupadas(fechaISO) {
        const horasOcupadas = [];
        this.reservas.forEach(reserva => {
            if (reserva.fecha === fechaISO) {
                horasOcupadas.push(reserva.horaInicio);
                horasOcupadas.push(reserva.proximaHora);
            }
        });
        return [...new Set(horasOcupadas)]; // Eliminar duplicados
    },
    
    // Agregar un día como ocupado
    agregarDiaOcupado(fechaISO) {
        if (!this.diasOcupados.includes(fechaISO)) {
            this.diasOcupados.push(fechaISO);
            if (DEBUG_MODE) console.log(`📅 Día ${fechaISO} marcado como ocupado`);
        }
    },
    
    // Quitar un día de ocupado
    quitarDiaOcupado(fechaISO) {
        this.diasOcupados = this.diasOcupados.filter(dia => dia !== fechaISO);
        if (DEBUG_MODE) console.log(`📅 Día ${fechaISO} marcado como disponible`);
    },
    
    /**
     * GUARDAR RESERVAS EN LOCALSTORAGE (persistencia)
     */
    guardarEnLocalStorage() {
        try {
            const datos = {
                reservas: this.reservas,
                diasOcupados: this.diasOcupados,
                guardadoEn: new Date().toISOString()
            };
            localStorage.setItem('seatStudioReservas', JSON.stringify(datos));
            if (DEBUG_MODE) console.log('💾 Reservas guardadas en navegador');
            return true;
        } catch (error) {
            console.error('❌ Error al guardar en localStorage:', error);
            return false;
        }
    },
    
    /**
     * CARGAR RESERVAS DESDE LOCALSTORAGE
     */
    cargarDelLocalStorage() {
        try {
            const datosGuardados = localStorage.getItem('seatStudioReservas');
            if (datosGuardados) {
                const datos = JSON.parse(datosGuardados);
                this.reservas = datos.reservas || [];
                this.diasOcupados = datos.diasOcupados || [];
                if (DEBUG_MODE) console.log(`✅ Cargadas ${this.reservas.length} reservas del navegador`);
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ Error al cargar de localStorage:', error);
            return false;
        }
    },
    
    /**
     * BORRAR TODAS LAS RESERVAS (para testing)
     */
    limpiarLocalStorage() {
        try {
            localStorage.removeItem('seatStudioReservas');
            this.reservas = [];
            this.diasOcupados = [];
            if (DEBUG_MODE) console.log('🗑️ Todas las reservas eliminadas');
            return true;
        } catch (error) {
            console.error('❌ Error al limpiar localStorage:', error);
            return false;
        }
    }
};

// ==========================================
// 1. INICIALIZACIÓN
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    // 💾 CARGAR RESERVAS GUARDADAS EN EL NAVEGADOR
    SISTEMA_DISPONIBILIDAD.cargarDelLocalStorage();
    
    // Inicializar componentes
    initNavigation();
    initScrollAnimations();
    initFormValidation();
    initNavLinks();
    initServiceImages();
    initIOSGuide();
    
    if (DEBUG_MODE) {
        console.log('✓ OG BEAT PRODUCTION cargado correctamente');
        console.log('✓ Sistema de disponibilidad inicializado');
    }
});

// ==========================================
// 2. MENÚ HAMBURGUESA
// ==========================================

/**
 * Inicializa el menú hamburguesa para dispositivos móviles
 */
function initNavigation() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    
    if (hamburger) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        // Cerrar menú cuando se hace clic en un enlace
        const navLinks = navMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }
}

// ==========================================
// 3. NAVEGACIÓN DE ENLACES Y SCROLL
// ==========================================

/**
 * Actualizar enlaces activos al hacer scroll
 */
function initNavLinks() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    window.addEventListener('scroll', function() {
        let current = '';
        
        // Detectar sección actual
        const sections = document.querySelectorAll('section');
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (pageYOffset >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });
        
        // Actualizar enlaces activos
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').slice(1) === current) {
                link.classList.add('active');
            }
        });
    });
}

// ==========================================
// 4. ANIMACIONES AL HACER SCROLL
// ==========================================

/**
 * Inicializa animaciones cuando los elementos entran en vista
 */
function initScrollAnimations() {
    // Usar Intersection Observer para animaciones de scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'slideInUp 0.8s ease forwards';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observar tarjetas de servicios
    const servicioCards = document.querySelectorAll('.servicio-card');
    servicioCards.forEach(card => {
        observer.observe(card);
    });
    
    // Observar items de galería
    const galeryItems = document.querySelectorAll('.galeria-item');
    galeryItems.forEach((item, index) => {
        observer.observe(item);
    });
    
    // Observar items de contacto
    const contactItems = document.querySelectorAll('.contacto-item');
    contactItems.forEach(item => {
        observer.observe(item);
    });
}

// ==========================================
// 5. VALIDACIÓN DE FORMULARIO
// ==========================================

/**
 * Inicializa la validación del formulario de reserva
 */
function initFormValidation() {
    const form = document.getElementById('formReserva');
    const confirmacionMensaje = document.getElementById('confirmacionMensaje');
    
    if (!form) return;
    
    // Configurar disponibilidad de fechas (desde mañana en adelante)
    configurarDisponibilidadFechas();
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Validar todos los campos
        if (validarFormulario()) {
            // Extraer datos del formulario (con null checks)
            const nombreElem = document.getElementById('nombre');
            const emailElem = document.getElementById('email');
            const telefonoElem = document.getElementById('telefono');
            const servicioElem = document.getElementById('servicio');
            const fechaElem = document.getElementById('fecha');
            const horaElem = document.getElementById('hora');
            
            // Protección: si falta algún elemento, cancelar
            if (!nombreElem || !emailElem || !telefonoElem || !servicioElem || !fechaElem || !horaElem) {
                console.error(' Falta algún elemento del formulario');
                alert('Error: No se pudieron obtener los datos del formulario');
                return;
            }
            
            const nombre = nombreElem.value.trim();
            const email = emailElem.value.trim();
            const telefono = telefonoElem.value.trim();
            const servicio = servicioElem.value;
            const fechaInput = fechaElem.value;
            const horaInput = horaElem.value;
            const mensajeElem = document.getElementById('mensaje');
            const mensaje = mensajeElem ? mensajeElem.value.trim() : '';
            
            // Convertir fecha a formato ISO (YYYY-MM-DD)
            if (fechaInput && horaInput) {
                try {
                    // Parsear fecha de Flatpickr (d/m/Y → YYYY-MM-DD)
                    const fechaISO = parsearFechaFlatpickr(fechaInput);
                    
                    if (!fechaISO) {
                        console.error('❌ Error al parsear fecha');
                        alert('❌ Error: Fecha inválida. Por favor selecciona nuevamente.');
                        return;
                    }
                    
                    // AGREGAR RESERVA AL SISTEMA (bloquea 2 horas automáticamente)
                    const reservaAgregada = SISTEMA_DISPONIBILIDAD.agregarReserva(fechaISO, horaInput, nombre);
                    
                    if (!reservaAgregada) {
                        console.error('❌ No se pudo agregar la reserva. La hora no está disponible.');
                        alert('❌ Esta hora no está disponible. Por favor selecciona otra.');
                        return;
                    }
                } catch (error) {
                    console.error('❌ Error al procesar la reserva:', error);
                    alert('❌ Error al procesar la reserva. Por favor intenta nuevamente.');
                    return;
                }
            }
            
            // Mostrar confirmación
            mostrarConfirmacion(form);
            
            // Redibujar horarios disponibles
            if (fechaElem && fechaElem.value) {
                try {
                    const fechaISO = parsearFechaFlatpickr(fechaElem.value);
                    if (fechaISO) {
                        const fechaSeleccionada = new Date(fechaISO + 'T00:00:00');
                        actualizarHorariosDisponibles(fechaSeleccionada);
                    }
                } catch (error) {
                    console.error('Error al actualizar horarios:', error);
                }
            }
            
            // Limpiar formulario después de 2 segundos
            setTimeout(function() {
                if (form) form.reset();
                // Reinicializar horarios disponibles
                const horaSelect = document.getElementById('hora');
                if (horaSelect) {
                    horaSelect.innerHTML = '<option value="">Selecciona una hora</option>';
                }
            }, 2000);
        }
    });
    
    // Validar en tiempo real (solo si el formulario existe)
    if (form) {
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input) {
                input.addEventListener('blur', function() {
                    validarCampo(this);
                });
                
                input.addEventListener('change', function() {
                    validarCampo(this);
                });
            }
        });
    }
}

/**
 * Valida un campo individual
 */
function validarCampo(campo) {
    if (!campo) return false;  // Protección null
    
    const nombre = campo.name;
    const valor = campo.value.trim();
    const errorElement = document.getElementById('error' + nombre.charAt(0).toUpperCase() + nombre.slice(1));
    
    let esValido = true;
    let mensaje = '';
    
    switch(nombre) {
        case 'nombre':
            if (valor === '') {
                esValido = false;
                mensaje = 'El nombre es requerido';
            } else if (valor.length < 3) {
                esValido = false;
                mensaje = 'El nombre debe tener al menos 3 caracteres';
            } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(valor)) {
                esValido = false;
                mensaje = 'El nombre solo puede contener letras';
            }
            break;
            
        case 'email':
            // Email opcional: solo validar si el usuario escribió algo
            if (valor !== '' && !validarEmail(valor)) {
                esValido = false;
                mensaje = 'Por favor ingresa un email válido';
            }
            break;
            
        case 'telefono':
            if (valor === '') {
                esValido = false;
                mensaje = 'El teléfono es requerido';
            } else if (!/^\+?[1-9]\d{1,14}$/.test(valor.replace(/[\s\-\(\)]/g, ''))) {
                esValido = false;
                mensaje = 'Por favor ingresa un teléfono válido (ej: +1 829 769 4405)';
            }
            break;
            
        case 'servicio':
            if (valor === '') {
                esValido = false;
                mensaje = 'Debes seleccionar un servicio';
            }
            break;
            
        case 'fecha':
            if (valor === '') {
                esValido = false;
                mensaje = 'La fecha es requerida';
            } else {
                // Parsear fecha de Flatpickr correctamente
                const fechaISO = parsearFechaFlatpickr(valor);
                if (!fechaISO) {
                    esValido = false;
                    mensaje = 'Fecha inválida. Por favor selecciona una fecha válida';
                } else {
                    // Validar que sea una fecha a partir de mañana
                    const fechaSeleccionada = new Date(fechaISO + 'T00:00:00');
                    const mañana = new Date();
                    mañana.setDate(mañana.getDate() + 1);
                    mañana.setHours(0, 0, 0, 0);
                    
                    if (fechaSeleccionada < mañana) {
                        esValido = false;
                        mensaje = 'Selecciona una fecha a partir de mañana';
                    }
                }
            }
            break;
            
        case 'hora':
            if (valor === '') {
                esValido = false;
                mensaje = 'La hora es requerida';
            } else {
                // Validar formato de hora
                if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(valor)) {
                    esValido = false;
                    mensaje = 'Formato de hora inválido';
                }
            }
            break;
    }
    
    if (errorElement) {
        if (!esValido) {
            errorElement.textContent = mensaje;
            errorElement.classList.add('show');
            campo.style.borderColor = '#ff4444';
            campo.style.boxShadow = '0 0 10px rgba(255, 68, 68, 0.3)';
        } else {
            errorElement.classList.remove('show');
            campo.style.borderColor = '';
            campo.style.boxShadow = '';
        }
    }
    
    return esValido;
}

/**
 * Validación mejorada del formulario
 */
function validarFormulario() {
    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const servicio = document.getElementById('servicio').value;
    const fecha = document.getElementById('fecha').value.trim();
    const hora = document.getElementById('hora').value;
    
    let isValid = true;
    
    // Limpiar errores anteriores
    limpiarErrores();
    
    // Validación con feedback visual
    if (!nombre) {
        mostrarError('errorNombre', 'Por favor ingresa tu nombre');
        isValid = false;
    } else if (nombre.length < 3) {
        mostrarError('errorNombre', 'El nombre debe tener al menos 3 caracteres');
        isValid = false;
    }
    
    if (email && !validarEmail(email)) {
        mostrarError('errorEmail', 'Por favor ingresa un email válido');
        isValid = false;
    }
    
    if (!telefono) {
        mostrarError('errorTelefono', 'Por favor ingresa tu teléfono');
        isValid = false;
    } else if (!validarTelefono(telefono)) {
        mostrarError('errorTelefono', 'Por favor ingresa un teléfono válido');
        isValid = false;
    }
    
    if (!servicio) {
        mostrarError('errorServicio', 'Por favor selecciona un servicio');
        isValid = false;
    }
    
    if (!fecha) {
        mostrarError('errorFecha', 'Por favor selecciona una fecha');
        isValid = false;
    }
    
    if (!hora) {
        mostrarError('errorHora', 'Por favor selecciona una hora');
        isValid = false;
    }
    
    return isValid;
}

/**
 * Mostrar error con feedback visual
 */
function mostrarError(id, mensaje) {
    const errorElement = document.getElementById(id);
    const inputElement = errorElement.previousElementSibling;
    
    errorElement.textContent = mensaje;
    errorElement.style.display = 'block';
    inputElement.classList.add('error');
    
    // Quitar error después de 3 segundos
    setTimeout(() => {
        errorElement.style.display = 'none';
        inputElement.classList.remove('error');
    }, 3000);
}

/**
 * Limpiar todos los errores
 */
function limpiarErrores() {
    const errores = document.querySelectorAll('.error-message');
    const inputs = document.querySelectorAll('input, select');
    
    errores.forEach(error => {
        error.style.display = 'none';
        error.textContent = '';
    });
    
    inputs.forEach(input => {
        input.classList.remove('error');
    });
}

// ==========================================
// 5a. DISPONIBILIDAD DE FECHAS Y HORAS
// ==========================================

/**
 * Configura la disponibilidad de fechas - Sistema inteligente tipo Airbnb
 * Muestra días disponibles (verde) y ocupados (rojo)
 */
function configurarDisponibilidadFechas() {
    const inputFecha = document.getElementById('fecha');
    if (!inputFecha) {
        console.warn('⚠️ Campo de fecha no encontrado');
        return;
    }
    
    // Verificar si flatpickr está disponible
    if (typeof window.flatpickr !== 'function') {
        console.warn('⚠️ Flatpickr no está disponible. Usando fallback.');
        // Fallback simple: input de fecha normal
        inputFecha.type = 'date';
        
        // Configurar fecha mínima (mañana)
        const mañana = new Date();
        mañana.setDate(mañana.getDate() + 1);
        const fechaMin = mañana.toISOString().split('T')[0];
        inputFecha.min = fechaMin;
        
        // Agregar evento change para actualizar horarios
        inputFecha.addEventListener('change', function() {
            if (this.value) {
                const fechaSeleccionada = new Date(this.value + 'T00:00:00');
                actualizarHorariosDisponibles(fechaSeleccionada);
            }
        });
        
        if (DEBUG_MODE) console.log('✓ Sistema de fallback de fecha configurado');
        return;
    }
    
    // Calcular mañana
    const hoy = new Date();
    const mañana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
    
    // Configuración de Flatpickr
    try {
        const instancia = flatpickr('#fecha', {
            minDate: mañana,                      // Solo desde mañana
            dateFormat: 'd/m/Y',                  // Formato DD/MM/YYYY
            locale: 'es',                         // Idioma español
            enableTime: false,                    // Solo fecha, sin hora
            disableMobile: "true",                // Forzar Flatpickr en móviles en lugar del nativo
            animate: true,                        // Animaciones suaves
            static: false,                        // Calendario flotante
            clickOpens: true,                     // Abre al hacer clic
            altInput: true,                       // Input alternativo para mejor UX
            altFormat: "j \\de F, Y",             // Formato amigable: 19 de Marzo, 2026
            position: "auto",                     // Posicionamiento automático
            monthSelectorType: "static",          // Selector de mes estático para móviles
            
            // Deshabilitar días ocupados
            disable: [
                function(date) {
                    // Convertir fecha a formato YYYY-MM-DD
                    const fechaFormato = date.toISOString().split('T')[0];
                    
                    // Deshabilitar si está en la lista de ocupados
                    if (SISTEMA_DISPONIBILIDAD.getDiaOcupado(fechaFormato)) {
                        return true;
                    }
                    
                    // Deshabilitar fechas en el pasado y hoy
                    const hoy = new Date();
                    const soloFecha = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
                    return date <= soloFecha;
                }
            ],
            
            // Temas y estilos
            theme: 'light',                       // CSS personalizado para dark mode
            
            // Callbacks
            onReady: function(selectedDates, dateStr, instance) {
                // Aplicar colores al abrir
                aplicarColoresDisponibilidad();
                if (DEBUG_MODE) console.log('✓ Calendario con sistema de disponibilidad inicializado');
            },
            
            onChange: function(selectedDates, dateStr, instance) {
                // Cuando cambia la fecha, actualizar horarios disponibles
                if (selectedDates.length > 0) {
                    const fechaSeleccionada = selectedDates[0];
                    actualizarHorariosDisponibles(fechaSeleccionada);
                    validarCampoFecha();
                }
            },
            
            // Renderizar días con colores personalizados
            onDayCreate: function(dObj, dStr, fp, dayElem) {
                const date = dayElem.dateObj;
                const fechaFormato = date.toISOString().split('T')[0];
                
                // Agregar clase según disponibilidad
                if (SISTEMA_DISPONIBILIDAD.getDiaOcupado(fechaFormato)) {
                    dayElem.classList.add('dia-ocupado');  // Rojo
                } else if (date > new Date()) {
                    dayElem.classList.add('dia-disponible'); // Verde
                }
            }
        });
        
        if (DEBUG_MODE) console.log('📅 Sistema de disponibilidad inteligente: desde ' + mañana.toLocaleDateString('es-ES') + ' en adelante');
        
    } catch (error) {
        console.error('❌ Error al configurar flatpickr:', error);
        // Fallback a input de fecha normal
        inputFecha.type = 'date';
        const mañana = new Date();
        mañana.setDate(mañana.getDate() + 1);
        inputFecha.min = mañana.toISOString().split('T')[0];
    }
}

/**
 * Actualiza los horarios disponibles según el día seleccionado
 * Y desactiva automáticamente horas ocupadas (bloque de 2 horas)
 */
function actualizarHorariosDisponibles(fechaSeleccionada) {
    const selectHora = document.getElementById('hora');
    if (!selectHora) return;
    
    // Convertir fecha a formato ISO (YYYY-MM-DD) preservando zona horaria local
    // Usar toISOString() causaba errores de día (-1) en ciertas zonas horarias
    const year = fechaSeleccionada.getFullYear();
    const month = String(fechaSeleccionada.getMonth() + 1).padStart(2, '0');
    const day = String(fechaSeleccionada.getDate()).padStart(2, '0');
    const fechaISO = `${year}-${month}-${day}`;
    
    // Obtener horarios para el día seleccionado
    const horarios = SISTEMA_DISPONIBILIDAD.getHorariosParaDia(fechaSeleccionada);
    
    // Obtener horas ocupadas de este día (que bloquean 2 horas cada una)
    const horasOcupadas = SISTEMA_DISPONIBILIDAD.getHorasOcupadas(fechaISO);
    
    // Guardar opción seleccionada actual (si existe)
    const horaActual = selectHora.value;
    
    // Limpiar opciones anteriores
    selectHora.innerHTML = '<option value="">Selecciona una hora</option>';
    
    // Agregar nuevas opciones según el día
    horarios.forEach(horario => {
        const option = document.createElement('option');
        option.value = horario.hora;
        option.textContent = horario.etiqueta;
        
        // Verificar si esta hora está ocupada
        const estaOcupada = horasOcupadas.includes(horario.hora);
        
        if (estaOcupada) {
            // Marcar como deshabilitada (reservada)
            option.disabled = true;
            option.classList.add('hora-ocupada');
            option.textContent += ' (OCUPADA)';
        } else {
            option.classList.add('hora-disponible');
        }
        
        selectHora.appendChild(option);
    });
    
    // Restaurar opción anterior si sigue disponible
    if (horaActual && !horasOcupadas.includes(horaActual) && 
        Array.from(selectHora.options).some(opt => opt.value === horaActual)) {
        selectHora.value = horaActual;
    }
    
    // Log de estado con información detallada (solo en modo debug)
    if (DEBUG_MODE) {
        const totalDisponibles = horarios.length - horasOcupadas.length;
        console.log(`🕐 ${fechaISO}: ${totalDisponibles}/${horarios.length} horas disponibles`);
        console.log(`   Total reservas en sistema: ${SISTEMA_DISPONIBILIDAD.reservas.length}`);
        console.log(`   Reservas para esta fecha: ${SISTEMA_DISPONIBILIDAD.getReservasDelDia(fechaISO).length}`);
        if (horasOcupadas.length > 0) {
            console.log(`   ⏸️ Ocupadas: ${horasOcupadas.join(', ')}`);
        }
    }
}

/**
 * Aplica colores visuales al calendario según disponibilidad
 */
function aplicarColoresDisponibilidad() {
    const calendario = document.querySelector('.flatpickr-calendar');
    if (!calendario) return;
    
    // Los colores se aplican automáticamente en onDayCreate
    // Esta función es para aplicar estilos adicionales si es necesario
    const diasDisponibles = calendario.querySelectorAll('.dia-disponible');
    const diasOcupados = calendario.querySelectorAll('.dia-ocupado');
    
    if (DEBUG_MODE) console.log(`📊 Estado: ${diasDisponibles.length} días disponibles, ${diasOcupados.length} ocupados`);
}

/**
 * Valida el campo de fecha del formulario
 */
function validarCampoFecha() {
    const inputFecha = document.getElementById('fecha');
    if (!inputFecha) return true;
    
    const valor = inputFecha.value.trim();
    
    if (!valor) {
        mostrarError('Fecha', 'Por favor selecciona una fecha');
        return false;
    }
    
    limpiarError('Fecha');
    return true;
}

/**
 * Convierte hora de formato 24h a formato 12h (AM/PM)
 */
function convertirA12Horas(hora24) {
    // Ejemplo de entrada: "14:30"
    if (!hora24) return '';
    
    const [horas, minutos] = hora24.split(':');
    let horasNum = parseInt(horas);
    const periodo = horasNum >= 12 ? 'PM' : 'AM';
    
    // Convertir a formato 12h
    if (horasNum > 12) {
        horasNum -= 12;
    } else if (horasNum === 0) {
        horasNum = 12;
    }
    
    // Formatear con dos dígitos
    const horasFormato = String(horasNum).padStart(2, '0');
    
    return horasFormato + ':' + minutos + ' ' + periodo;
}

/**
 * Valida formato de email
 */
function validarEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regexEmail.test(email);
}

/**
 * Valida formato de teléfono (acepta formatos comunes y E.164)
 */
function validarTelefono(telefono) {
    if (!telefono || typeof telefono !== 'string') return false;

    const limpio = telefono.trim();
    if (!limpio) return false;

    // Permitir solo caracteres típicos de teléfono
    if (!/^[+\d\s()\-]+$/.test(limpio)) return false;

    // Contar dígitos reales (sin símbolos)
    const digitos = limpio.replace(/\D/g, '');
    return digitos.length >= 8 && digitos.length <= 15;
}

/**
 * Muestra mensaje de error
 */
function mostrarError(campo, mensaje) {
    const errorElement = document.getElementById('error' + campo.charAt(0).toUpperCase() + campo.slice(1));
    if (errorElement) {
        errorElement.textContent = mensaje;
        errorElement.classList.add('show');
    }
}

/**
 * Limpia mensaje de error
 */
function limpiarError(campo) {
    const errorElement = document.getElementById('error' + campo.charAt(0).toUpperCase() + campo.slice(1));
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.classList.remove('show');
    }
}

// ==========================================
// 5b. CONSTRUCCIÓN DE MENSAJES
// ==========================================

/**
 * Construye un mensaje profesional con los datos de la reserva
 */
function construirMensajeWhatsApp(datosReserva) {
    // Mapeo de servicios para nombres más legibles
    const servicios = {
        'grabacion': 'Grabación Profesional',
        'mezcla': 'Mezcla y Masterización',
        'beats': 'Producción de Beats',
        'otro': 'Otro servicio'
    };
    
    // Construir mensaje formateado
    let mensaje = '🎵 *NUEVA RESERVA DE CITA* 🎵\n\n';
    mensaje += '📋 *DATOS DEL CLIENTE:*\n';
    mensaje += `• *Nombre:* ${datosReserva.nombre}\n`;
    mensaje += `• *Email:* ${datosReserva.email}\n`;
    mensaje += `• *Teléfono:* ${datosReserva.telefono}\n\n`;
    
    mensaje += '🎚️ *DETALLES DE LA CITA:*\n';
    mensaje += `• *Servicio:* ${servicios[datosReserva.servicio] || datosReserva.servicio}\n`;
    mensaje += `• *Fecha:* ${formatearFecha(datosReserva.fecha)}\n`;
    mensaje += `• *Hora:* ${convertirA12Horas(datosReserva.hora)}\n\n`;
    
    // Agregar comentarios si existen
    if (datosReserva.comentarios && datosReserva.comentarios.trim() !== '') {
        mensaje += '💬 *COMENTARIOS:*\n';
        mensaje += `${datosReserva.comentarios}\n\n`;
    }
    
    mensaje += '_Mensaje enviado desde el formulario de OG BEAT PRODUCTION_';
    
    return mensaje;
}

/**
 * Formatea la fecha a un formato legible
 */
function formatearFecha(fechaISO) {
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const fecha = new Date(fechaISO + 'T00:00:00');
    return fecha.toLocaleDateString('es-ES', opciones);
}

/**
 * Envía la reserva a WhatsApp
 */
function enviarReservaWhatsApp(datosReserva) {
    try {
        // Número de WhatsApp del estudio (sin símbolo + ni espacios)
        const numeroEstudio = '18297694405';
        
        // Construir mensaje
        const mensaje = construirMensajeWhatsApp(datosReserva);
        
        // Codificar mensaje para URL
        const mensajeCodificado = encodeURIComponent(mensaje);
        
        // URL de WhatsApp
        const urlWhatsApp = `https://wa.me/${numeroEstudio}?text=${mensajeCodificado}`;
        
        // Abrir WhatsApp en nueva pestaña
        window.open(urlWhatsApp, '_blank');
        
        if (DEBUG_MODE) console.log('✓ Mensaje de WhatsApp preparado:', mensaje);
    } catch (error) {
        console.error('✗ Error al enviar a WhatsApp:', error);
        mostrarNotificacion('Error al abrir WhatsApp. Por favor intenta nuevamente.', 'error');
    }
}

/**
 * Muestra mensaje de error
 */
function mostrarError(campo, mensaje) {
    const errorElement = document.getElementById('error' + campo.charAt(0).toUpperCase() + campo.slice(1));
    if (errorElement) {
        errorElement.textContent = mensaje;
        errorElement.classList.add('show');
    }
}

/**
 * Muestra la confirmación de reserva y envía a WhatsApp
 */
function mostrarConfirmacion(form) {
    if (!form) {
        console.error('❌ Formulario no disponible');
        return;
    }
    
    const confirmacionMensaje = document.getElementById('confirmacionMensaje');
    const formulario = document.querySelector('.formulario-reserva');
    
    // Protección: verifica si los elementos existen
    if (!confirmacionMensaje || !formulario) {
        console.error('❌ Falta sección de confirmación o formulario');
        return;
    }
    
    // Obtener datos (con null checks)
    const nombreElem = form.querySelector('#nombre');
    const emailElem = form.querySelector('#email');
    const telefonoElem = form.querySelector('#telefono');
    const servicioElem = form.querySelector('#servicio');
    const fechaElem = form.querySelector('#fecha');
    const horaElem = form.querySelector('#hora');
    const comentariosElem = form.querySelector('#comentarios');
    
    if (!nombreElem || !emailElem || !telefonoElem || !servicioElem || !fechaElem || !horaElem) {
        console.error('❌ Falta algún campo requerido en el formulario');
        return;
    }
    
    const nombre = nombreElem.value;
    const email = emailElem.value;
    const telefono = telefonoElem.value;
    const servicio = servicioElem.value;
    const fechaInput = fechaElem.value;
    const hora = horaElem.value;
    const comentarios = comentariosElem ? comentariosElem.value : '';
    
    // Parsear fecha de Flatpickr a ISO
    const fechaISO = parsearFechaFlatpickr(fechaInput);
    if (!fechaISO) {
        console.error('❌ Error al parsear fecha');
        alert('Error al procesar la fecha. Por favor intenta nuevamente.');
        return;
    }
    
    // Crear objeto de reserva
    const reserva = {
        id: Date.now(),
        nombre,
        email,
        telefono,
        servicio,
        fecha: fechaISO,
        hora,
        comentarios,
        estado: 'pendiente', // Nueva cita inicia como pendiente
        fechaCreacion: new Date().toISOString()
    };

    // Bloquear el horario de inmediato para evitar que otros lo tomen mientras apruebas
    SISTEMA_DISPONIBILIDAD.agregarReserva(fechaISO, hora, nombre);
    
    // Simular guardado local (localStorage)
    const solicitudes = JSON.parse(localStorage.getItem('solicitudes_reservas') || '[]');
    solicitudes.push(reserva);
    localStorage.setItem('solicitudes_reservas', JSON.stringify(solicitudes));

    // Actualizar mensaje de confirmación (solo si los elementos existen)
    const emailConfirmado = document.getElementById('emailConfirmado');
    const telefonoConfirmado = document.getElementById('telefonoConfirmado');
    
    if (emailConfirmado) emailConfirmado.textContent = email || 'No proporcionado';
    if (telefonoConfirmado) telefonoConfirmado.textContent = telefono;
    
    // Ocultar formulario y mostrar confirmación
    formulario.style.display = 'none';
    confirmacionMensaje.style.display = 'block';
    
    // Mostrar notificación visual
    mostrarNotificacion('¡Solicitud enviada correctamente! Pendiente de aprobación.', 'éxito');
    
    // Enviar mensaje a WhatsApp avisando que es una SOLICITUD PENDIENTE
    const mensajeWA = construirMensajeWhatsApp(reserva);
    // Cambiar a la URL universal de WhatsApp para mejor compatibilidad en iPhone
    const urlWA = `https://api.whatsapp.com/send?phone=18297694405&text=${encodeURIComponent(mensajeWA)}`;
    
    // Intentar abrir WhatsApp inmediatamente
    window.location.href = urlWA;

    // Log de datos (solo en modo debug)
    if (DEBUG_MODE) {
        console.log('📋 Reserva registrada:', reserva);
    }
}

// ==========================================
// 6. NOTIFICACIONES
// ==========================================

/**
 * Muestra notificación visual
 */
function mostrarNotificacion(mensaje, tipo = 'info') {
    // Crear elemento de notificación
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion notificacion-${tipo}`;
    notificacion.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px;">
            <i style="font-size: 20px;"></i>
            <span>${mensaje}</span>
        </div>
    `;
    
    // Estilos
    notificacion.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${tipo === 'éxito' ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' : 
                      tipo === 'error' ? '#ff4444' : '#FFD700'};
        color: ${tipo === 'éxito' || tipo === 'info' ? '#000' : 'white'};
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        z-index: 9999;
        animation: slideInRight 0.5s ease;
        font-weight: 600;
        max-width: 400px;
    `;
    
    // Icono
    const icon = notificacion.querySelector('i');
    if (tipo === 'éxito') {
        icon.className = 'fas fa-check-circle';
    } else if (tipo === 'error') {
        icon.className = 'fas fa-exclamation-circle';
    } else {
        icon.className = 'fas fa-info-circle';
    }
    
    // Protecci\u00f3n: verificar que document.body existe
    if (document.body) {
        document.body.appendChild(notificacion);
        
        // Remover después de 5 segundos
        setTimeout(function() {
            notificacion.style.animation = 'slideOutRight 0.5s ease';
            setTimeout(function() {
                notificacion.remove();
            }, 500);
        }, 5000);
    } else {
        console.error('❌ No se pudo mostrar notificación: document.body no disponible');
    }
}

// ==========================================
// 7a. UTILIDADES DE FECHA
// ==========================================

/**
 * Parsea fecha de Flatpickr (formato d/m/Y) a ISO (YYYY-MM-DD)
 * Ejemplo: "17/03/2026" → "2026-03-17"
 */
function parsearFechaFlatpickr(fechaStr) {
    if (!fechaStr || typeof fechaStr !== 'string') {
        console.warn('⚠️ Fecha inválida:', fechaStr);
        return null;
    }
    
    try {
        // Flatpickr devuelve en formato d/m/Y
        const partes = fechaStr.split('/');
        if (partes.length !== 3) {
            console.error('❌ Formato de fecha inválido:', fechaStr);
            return null;
        }
        
        const dia = partes[0].padStart(2, '0');
        const mes = partes[1].padStart(2, '0');
        const año = partes[2];
        
        // Validar rango numérico
        const diaNum = parseInt(dia);
        const mesNum = parseInt(mes);
        const añoNum = parseInt(año);
        
        if (diaNum < 1 || diaNum > 31 || mesNum < 1 || mesNum > 12 || añoNum < 2020 || añoNum > 2030) {
            console.error('❌ Valores de fecha fuera de rango:', { dia: diaNum, mes: mesNum, año: añoNum });
            return null;
        }
        
        // Convertir a ISO: YYYY-MM-DD
        const fechaISO = `${año}-${mes}-${dia}`;
        
        // Validar que es una fecha válida
        const date = new Date(fechaISO + 'T00:00:00');
        if (isNaN(date.getTime())) {
            console.error('❌ Fecha inválida después de parsing:', fechaISO);
            return null;
        }
        
        return fechaISO;
    } catch (error) {
        console.error('❌ Error al parsear fecha:', error);
        return null;
    }
}

/**
 * Animar números de estadísticas
 */
function animarNumeros() {
    const statItems = document.querySelectorAll('.stat-item h3');
    
    statItems.forEach(element => {
        const numeroFinal = parseInt(element.textContent);
        let numeroActual = 0;
        const incremento = Math.ceil(numeroFinal / 50);
        
        const intervalo = setInterval(function() {
            numeroActual += incremento;
            if (numeroActual >= numeroFinal) {
                element.textContent = numeroFinal + '+';
                clearInterval(intervalo);
            } else {
                element.textContent = numeroActual + '+';
            }
        }, 50);
    });
}

// ==========================================
// 8. EFECTOS ADICIONALES
// ==========================================

/**
 * Efecto de paralax en scroll
 */
window.addEventListener('scroll', function() {
    const scrollTop = window.pageYOffset;
    
    // Afectar fondos con efecto parallax
    const heroGradient = document.querySelector('.hero::before');
    if (heroGradient) {
        document.querySelector('.hero').style.backgroundPosition = `0px ${scrollTop * 0.5}px`;
    }
});

/**
 * Agregar efecto de clic a los botones
 */
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn')) {
        // Crear efecto de onda al hacer clic
        const x = e.clientX - e.target.getBoundingClientRect().left;
        const y = e.clientY - e.target.getBoundingClientRect().top;
        
        const ripple = document.createElement('span');
        ripple.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.5);
            pointer-events: none;
            animation: ripple 0.6s ease-out;
        `;
        
        // Agregar animación de ripple si no existe
        if (!document.querySelector('style[data-ripple]')) {
            const style = document.createElement('style');
            style.setAttribute('data-ripple', 'true');
            style.textContent = `
                @keyframes ripple {
                    from {
                        width: 0;
                        height: 0;
                        opacity: 1;
                    }
                    to {
                        width: 300px;
                        height: 300px;
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
});

// ==========================================
// 11. GUÍA PWA PARA IOS
// ==========================================

function initIOSGuide() {
    // Solo mostrar si es un dispositivo iOS y NO está ya en modo standalone (instalado)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    // Desactivar el selector nativo de iOS y evitar que se abra el teclado
    const fechaInput = document.getElementById('fecha');
    if (fechaInput) {
        fechaInput.setAttribute('type', 'text');
        fechaInput.setAttribute('readonly', 'readonly');
        fechaInput.setAttribute('inputmode', 'none'); // Evita que se abra el teclado en móviles
    }

    if (isIOS && !isStandalone) {
        // Mostrar la guía después de 3 segundos
        setTimeout(() => {
            const guide = document.getElementById('ios-pwa-guide');
            if (guide) guide.style.display = 'block';
        }, 3000);
    }
}

/**
 * Función secreta para abrir el panel (se puede llamar desde consola o un link oculto)
 * Escribe 'abrirAdmin()' en la consola para probar
 */
function abrirAdmin() {
    document.getElementById('admin-citas').style.display = 'block';
    window.location.hash = 'admin-citas';
}

function loginAdmin() {
    const pass = document.getElementById('admin-pass').value;
    // Contraseña básica: ogbeat2026
    if (pass === 'ogbeat2026') {
        document.getElementById('admin-login').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'block';
        cargarSolicitudesAdmin();
    } else {
        alert('Contraseña incorrecta');
    }
}

function logoutAdmin() {
    document.getElementById('admin-login').style.display = 'block';
    document.getElementById('admin-panel').style.display = 'none';
    document.getElementById('admin-citas').style.display = 'none';
}

async function cargarSolicitudesAdmin() {
    const lista = document.getElementById('lista-solicitudes');
    
    let solicitudes = [];
    
    if (supabase) {
        const { data, error } = await supabase
            .from('reservas')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) {
            console.error('❌ Error cargando de Supabase:', error);
            solicitudes = JSON.parse(localStorage.getItem('solicitudes_reservas') || '[]');
        } else {
            solicitudes = data;
        }
    } else {
        solicitudes = JSON.parse(localStorage.getItem('solicitudes_reservas') || '[]');
    }
    
    if (solicitudes.length === 0) {
        lista.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No hay solicitudes pendientes.</p>';
        return;
    }

    lista.innerHTML = '';
    solicitudes.forEach(reserva => {
        const div = document.createElement('div');
        div.className = 'contacto-item';
        div.style.textAlign = 'left';
        div.style.padding = '20px';
        div.innerHTML = `
            <h4>${reserva.nombre}</h4>
            <p style="font-size: 13px; margin: 5px 0;">
                <strong>Servicio:</strong> ${reserva.servicio}<br>
                <strong>Fecha:</strong> ${reserva.fecha}<br>
                <strong>Hora:</strong> ${reserva.hora}<br>
                <strong>WhatsApp:</strong> ${reserva.telefono}
            </p>
            <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button onclick="gestionarCita(${reserva.id}, 'aceptar')" class="btn btn-primary" style="padding: 8px 15px; font-size: 11px; flex: 1;">Aceptar</button>
                <button onclick="gestionarCita(${reserva.id}, 'rechazar')" class="btn btn-secondary" style="padding: 8px 15px; font-size: 11px; flex: 1; border-color: #ff4444; color: #ff4444;">Rechazar</button>
            </div>
        `;
        lista.appendChild(div);
    });
}

function gestionarCita(id, accion) {
    let solicitudes = JSON.parse(localStorage.getItem('solicitudes_reservas') || '[]');
    const reservaIndex = solicitudes.findIndex(r => r.id === id);
    
    if (reservaIndex === -1) return;
    const reserva = solicitudes[reservaIndex];
    
    if (accion === 'aceptar') {
        alert(`Cita de ${reserva.nombre} aceptada. Ya está bloqueada en tu calendario.`);
    } else if (accion === 'rechazar') {
        // LIBERAR EL HORARIO EN EL SISTEMA
        SISTEMA_DISPONIBILIDAD.quitarReserva(reserva.fecha, reserva.hora);
        SISTEMA_DISPONIBILIDAD.guardarEnLocalStorage();
        alert(`Cita de ${reserva.nombre} rechazada. El horario ${reserva.hora} vuelve a estar disponible.`);
    }
    
    // Eliminar de la lista de solicitudes pendientes
    solicitudes.splice(reservaIndex, 1);
    localStorage.setItem('solicitudes_reservas', JSON.stringify(solicitudes));
    cargarSolicitudesAdmin();
}

// Hacer funciones globales para onclick
window.abrirAdmin = abrirAdmin;
window.loginAdmin = loginAdmin;
window.logoutAdmin = logoutAdmin;
window.gestionarCita = gestionarCita;

// ==========================================
// 9. OPTIMIZACIONES DE RENDIMIENTO
// ==========================================

/**
 * Lazy loading para imágenes (si las hubiera)
 */
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            }
        });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => imageObserver.observe(img));
}

// ==========================================
// 10. GESTIÓN DE ERRORES EN CONSOLA
// ==========================================

/**
 * Gestionar errores globales con más información
 */
window.addEventListener('error', function(event) {
    if (event.error) {
        console.error('❌ Error capturado:', event.error.message || event.error);
        if (event.error.stack) {
            console.error('Stack trace:', event.error.stack);
        }
    } else {
        console.error('❌ Error desconocido');
    }
});

// =========================================
// 12. LIMPIEZA DE CONSOLA - PRODUCCIÓN
// =========================================

// Eliminar logs de branding en producción
if (!DEBUG_MODE) {
    // Limpiar consola para producción
    console.clear();
    
    // Sobreescribir console.log para evitar logs no deseados
    const originalLog = console.log;
    console.log = function(...args) {
        // Permitir solo logs de errores críticos
        if (args[0] && typeof args[0] === 'string' && args[0].includes('❌')) {
            originalLog.apply(console, args);
        }
    };
}

/**
 * Mensajes personalizados en consola (solo en modo debug)
 */
if (DEBUG_MODE) {
    console.log('%c🎵 OG BEAT PRODUCTION', 'font-size: 24px; font-weight: bold; color: #FFD700; text-shadow: 0 0 10px #FFD700;');
    console.log('%cDonde tu sonido se convierte en éxito', 'font-size: 16px; color: #00FF88; font-style: italic;');
    console.log('%c✓ Página cargada correctamente', 'color: #00FF88; font-weight: bold;');
}

// ==========================================
// 11. GESTIÓN DE IMÁGENES DE SERVICIOS
// ==========================================

/**
 * Analiza las tarjetas de servicios e inyecta fotos correspondientes automáticamente
 */
function initServiceImages() {
    const cards = document.querySelectorAll('.servicio-card');
    
    // URLs de imágenes profesionales (Unsplash) para cada categoría
    const imagenes = {
        'grabacion': 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=600&auto=format&fit=crop', // Micrófono de estudio
        'mezcla': 'https://images.unsplash.com/photo-1598653222000-6b7b7a552625?q=80&w=600&auto=format&fit=crop',    // Consola de mezcla
        'beats': 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=600&auto=format&fit=crop',     // Producción/Synth
        'default': 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?q=80&w=600&auto=format&fit=crop'    // Estudio general
    };

    cards.forEach(card => {
        // Evitar duplicar si ya tiene imagen
        if (card.querySelector('.servicio-img-wrapper')) return;

        // Analizar el título para determinar la categoría
        const titulo = card.querySelector('h3');
        const texto = titulo ? titulo.textContent.toLowerCase() : '';
        let imgUrl = imagenes.default;

        if (texto.includes('grabación') || texto.includes('rec') || texto.includes('voz')) {
            imgUrl = imagenes.grabacion;
        } else if (texto.includes('mezcla') || texto.includes('master') || texto.includes('mix')) {
            imgUrl = imagenes.mezcla;
        } else if (texto.includes('beat') || texto.includes('prod') || texto.includes('instrumental')) {
            imgUrl = imagenes.beats;
        }

        // Crear contenedor de imagen con estilos integrados
        const imgWrapper = document.createElement('div');
        imgWrapper.className = 'servicio-img-wrapper';
        imgWrapper.style.cssText = 'width: 100%; height: 160px; overflow: hidden; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);';
        
        const img = document.createElement('img');
        img.src = imgUrl;
        img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease;';
        
        // Efecto Zoom al pasar el mouse
        card.addEventListener('mouseenter', () => img.style.transform = 'scale(1.1)');
        card.addEventListener('mouseleave', () => img.style.transform = 'scale(1.0)');

        imgWrapper.appendChild(img);
        card.insertBefore(imgWrapper, card.firstChild);
    });
}

/**
 * FUNCIÓN DE EJEMPLO: Agrega una reserva de demostración para MAÑANA a las 8 AM
 * Usa esto para VER cómo funciona el bloqueo de 2 horas
 * Llamada en consola: agregarEjemploReserva()
 */
window.agregarEjemploReserva = function() {
    // Calcular mañana
    const hoy = new Date();
    const mañana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
    const fechaISO = mañana.toISOString().split('T')[0];
    const nombreMes = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][mañana.getMonth()];
    
    // Agregar una reserva de ejemplo a las 8 AM
    const resultado = SISTEMA_DISPONIBILIDAD.agregarReserva(
        fechaISO,
        '08:00',
        'CLIENTE EJEMPLO'
    );
    
    if (resultado) {
        console.log(`Fecha: ${fechaISO} (${mañana.getDate()} de ${nombreMes})`);
        console.log(`Hora: 08:00 AM - 10:00 AM (bloquea 2 horas automáticamente)`);
        console.log(`Cliente: CLIENTE EJEMPLO`);
        
        console.log('AHORA PRUEBA ESTO EN LA PÁGINA:');
        console.log('1. Desplázate hacia arriba al formulario');
        console.log('2. Haz clic en el campo FECHA (calendario)');
        console.log(`3. Selecciona MAÑANA (${mañana.getDate()} de ${nombreMes})`);
        console.log('   ↓ Mira cómo se actualiza el select de HORAS ↓');
        console.log('%c   ↓ Mira cómo se actualiza el select de HORAS ↓', 'color: #00FF88; font-size: 11px;');
        
        console.log('%c❌ DEBERÍA VER ESTO EN ROJO Y DESHABILITADO:', 'font-size: 12px; font-weight: bold; color: #ff6464;');
        console.log('%c   • 8:00 AM (OCUPADA)  ← BLOQUEADA', 'color: #ff6464; font-size: 11px;');
        console.log('%c   • 10:00 AM (OCUPADA) ← BLOQUEADA AUTOMÁTICAMENTE (2 horas)', 'color: #ff6464; font-size: 11px;');
        
        console.log('%c✅ DEBERÍA VER ESTO DISPONIBLE EN VERDE:', 'font-size: 12px; font-weight: bold; color: #00FF88;');
        console.log('%c   • 12:00 PM', 'color: #00FF88; font-size: 11px;');
        console.log('%c   • 2:00 PM', 'color: #00FF88; font-size: 11px;');
        console.log('%c   • 4:00 PM', 'color: #00FF88; font-size: 11px;');
        console.log('%c   • etc...', 'color: #00FF88; font-size: 11px;');
        
        console.log('%c📊 Para ver estado actual en consola:', 'font-size: 12px; font-weight: bold; color: #FFD700;');
        console.log(`%c   debugReservas()  ← Ve todas las reservas`, 'color: #FFD700; font-size: 11px;');
        console.log(`%c   verificarHorasOcupadas("${fechaISO}")  ← Ve horas bloqueadas para mañana`, 'color: #FFD700; font-size: 11px;');
        
    } else {
        console.error('%c❌ No se pudo agregar el ejemplo (posible conflicto de horarios)', 'font-size: 12px; color: #ff6464; font-weight: bold;');
    }
};
