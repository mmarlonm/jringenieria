import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { EventosService, EventoEdicion } from '../eventos.service';
import { FormularioRegistroService, CampoConfig, DisenoConfig, FormularioRegistroAdminDto } from './formulario-registro.service';

@Component({
    selector: 'app-configurador-registro',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatIconModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatSlideToggleModule,
        MatTooltipModule,
        MatTabsModule,
        MatSnackBarModule
    ],
    templateUrl: './configurador-registro.component.html',
    styleUrls: ['./configurador-registro.component.scss']
})
export class ConfiguradorRegistroComponent implements OnInit, OnDestroy {
    private _eventosService = inject(EventosService);
    private _formService = inject(FormularioRegistroService);
    private _snackBar = inject(MatSnackBar);
    private _cdr = inject(ChangeDetectorRef);
    private _destroy$ = new Subject<void>();

    // Estados
    loading = false;
    saving = false;
    activeTab: 'general' | 'campos' | 'diseno' | 'enlace' | 'respuestas' = 'general';
    previewDevice: 'desktop' | 'tablet' | 'mobile' = 'desktop';

    // Eventos disponibles
    eventos: EventoEdicion[] = [];
    selectedEventoId: number | null = null;
    currentFormId = 0;

    // Configuración General
    titulo = 'Registro al Evento';
    descripcion = 'Completa tus datos para confirmar tu participación y obtener tu pase de acceso.';
    slug = '';
    imagenPortadaUrl = 'assets/eventos/foro-energiza-logo.png';
    activo = true;
    totalRespuestas = 0;

    // Campos Dinámicos
    campos: CampoConfig[] = [];

    // Opciones de tipo de campo
    tiposCampo = [
        { value: 'input', label: 'Texto corto (Input)', icon: 'heroicons_outline:pencil' },
        { value: 'email', label: 'Correo electrónico', icon: 'heroicons_outline:envelope' },
        { value: 'tel', label: 'Teléfono / WhatsApp', icon: 'heroicons_outline:phone' },
        { value: 'number', label: 'Número', icon: 'heroicons_outline:hashtag' },
        { value: 'select', label: 'Menú desplegable (Select)', icon: 'heroicons_outline:chevron-down' },
        { value: 'radio', label: 'Opción única (Radio)', icon: 'heroicons_outline:check-circle' },
        { value: 'checkbox', label: 'Múltiple opción (Checkbox)', icon: 'heroicons_outline:squares-2x2' },
        { value: 'textarea', label: 'Área de texto (Párrafo)', icon: 'heroicons_outline:bars-3-bottom-left' }
    ];

    // Campos estándar sugeridos para mapeo automático al Asistente
    camposEstandar = [
        { value: '', label: 'Personalizado (Sin mapeo especial)' },
        { value: 'Nombre', label: 'Nombre del asistente' },
        { value: 'Apellidos', label: 'Apellidos del asistente' },
        { value: 'CorreoElectronico', label: 'Correo electrónico' },
        { value: 'NumeroTelefonico', label: 'Teléfono / WhatsApp' },
        { value: 'EmpresaRepresenta', label: 'Empresa / Procedencia' },
        { value: 'TipoAsistente', label: 'Tipo (General / Estudiante)' },
        { value: 'OcupacionCargo', label: 'Cargo / Ocupación' },
        { value: 'DireccionCiudadEstado', label: 'Ciudad / Estado de origen' },
        { value: 'UniversidadRepresentas', label: 'Universidad (Estudiantes)' },
        { value: 'CarreraCursas', label: 'Carrera / Especialidad' }
    ];

    // Configuración de Diseño
    diseno: DisenoConfig = {
        colorPrimario: '#1e8449',
        colorFondo: '#0f172a',
        estiloCard: 'solid',
        radioBorde: 'rounded-2xl',
        alturaPortada: 'medium',
        botonTexto: 'Confirmar mi Registro',
        mensajeExito: '¡Tu registro ha sido confirmado exitosamente! Te esperamos en el evento.',
        mostrarQrExito: true,
        temaOscuro: false
    };

    // Paletas predefinidas de colores
    paletasColores = [
        { nombre: 'Verde Energiza', color: '#1e8449' },
        { nombre: 'Azul Eléctrico', color: '#0284c7' },
        { nombre: 'Índigo Tech', color: '#6366f1' },
        { nombre: 'Ámbar Energía', color: '#f59e0b' },
        { nombre: 'Violeta Futurista', color: '#8b5cf6' },
        { nombre: 'Esmeralda Pro', color: '#059669' },
        { nombre: 'Rojo Pasión', color: '#dc2626' },
        { nombre: 'Negro Elegante', color: '#18181b' }
    ];

    // Presets de portadas rápidas
    portadasPresets = [
        { nombre: 'Foro Energiza Banner', url: 'assets/eventos/foro-energiza-logo.png' },
        { nombre: 'Ingeniería Tech', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80' },
        { nombre: 'Conferencia & Networking', url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80' },
        { nombre: 'Energía Renovable', url: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1200&auto=format&fit=crop&q=80' }
    ];

    // Preview simulador - respuestas interactivas
    previewRespuestas: { [key: string]: any } = {};

    // Respuestas registradas (modo consulta)
    respuestasEvento: any[] = [];
    cargandoRespuestas = false;

    ngOnInit(): void {
        this.cargarEventos();
    }

    ngOnDestroy(): void {
        this._destroy$.next();
        this._destroy$.complete();
    }

    /** Carga catálogo de eventos disponibles */
    cargarEventos(): void {
        this.loading = true;
        this._eventosService.getEventosCompletos()
            .pipe(takeUntil(this._destroy$))
            .subscribe({
                next: (list) => {
                    const mapped: EventoEdicion[] = (list || []).map(e => ({
                        id: e.id,
                        nombre: e.nombreNovedad || e.nombre || 'Evento',
                        anio: e.anio || new Date().getFullYear()
                    }));
                    this.eventos = mapped;
                    if (this.eventos.length > 0) {
                        this.selectedEventoId = this.eventos[0].id;
                        this.cargarFormularioPorEvento(this.selectedEventoId);
                    } else {
                        this.loading = false;
                    }
                },
                error: (err) => {
                    this.loading = false;
                    this.mostrarAlerta('Error al cargar eventos: ' + (err.message || 'Error de conexión'));
                }
            });
    }

    /** Carga o inicializa la configuración del formulario del evento seleccionado */
    cargarFormularioPorEvento(eventoId: number): void {
        this.loading = true;
        this.currentFormId = 0;
        this.selectedEventoId = eventoId;

        const eventoSeleccionado = this.eventos.find(e => e.id === eventoId);
        const slugSugerido = eventoSeleccionado
            ? this.generarSlug(eventoSeleccionado.nombre + ' ' + (eventoSeleccionado.anio || ''))
            : 'registro-evento';

        this._formService.getPorEvento(eventoId)
            .pipe(takeUntil(this._destroy$))
            .subscribe({
                next: (form) => {
                    this.loading = false;
                    if (form) {
                        this.currentFormId = form.id;
                        this.titulo = form.titulo || 'Registro al Evento';
                        this.descripcion = form.descripcion || '';
                        this.slug = form.slug || slugSugerido;
                        this.imagenPortadaUrl = form.imagenPortadaUrl || 'assets/eventos/foro-energiza-logo.png';
                        this.activo = form.activo;
                        this.totalRespuestas = form.totalRespuestas || 0;

                        try {
                            this.campos = JSON.parse(form.camposConfigJson || '[]');
                        } catch {
                            this.campos = [];
                        }

                        try {
                            this.diseno = { ...this.diseno, ...JSON.parse(form.disenoConfigJson || '{}') };
                        } catch {
                            // Usar valores por defecto
                        }
                    } else {
                        // Formulario nuevo: inicializar con plantilla estándar recomendada
                        this.inicializarPlantillaEstandar(eventoSeleccionado?.nombre || 'Evento', slugSugerido);
                    }

                    this.inicializarPreviewRespuestas();
                    this._cdr.markForCheck();
                },
                error: () => {
                    this.loading = false;
                    this.inicializarPlantillaEstandar(eventoSeleccionado?.nombre || 'Evento', slugSugerido);
                    this.inicializarPreviewRespuestas();
                    this._cdr.markForCheck();
                }
            });
    }

    /** Inicializa plantilla con campos comunes recomendados */
    inicializarPlantillaEstandar(nombreEvento: string, slugSugerido: string): void {
        this.currentFormId = 0;
        this.titulo = `Registro — ${nombreEvento}`;
        this.descripcion = 'Completa tus datos para confirmar tu participación y recibir tu gafete de acceso.';
        this.slug = slugSugerido;
        this.imagenPortadaUrl = 'assets/eventos/foro-energiza-logo.png';
        this.activo = true;
        this.totalRespuestas = 0;

        this.campos = [
            {
                id: 'campo_nombre',
                tipo: 'input',
                etiqueta: 'Nombre completo',
                placeholder: 'Ingresa tu nombre y apellidos',
                requerido: true,
                ancho: 'full',
                campoEstandar: 'Nombre',
                orden: 1
            },
            {
                id: 'campo_email',
                tipo: 'email',
                etiqueta: 'Correo electrónico',
                placeholder: 'ejemplo@correo.com',
                requerido: true,
                ancho: 'half',
                campoEstandar: 'CorreoElectronico',
                orden: 2
            },
            {
                id: 'campo_telefono',
                tipo: 'tel',
                etiqueta: 'Número telefónico / WhatsApp',
                placeholder: '10 dígitos',
                requerido: true,
                ancho: 'half',
                campoEstandar: 'NumeroTelefonico',
                orden: 3
            },
            {
                id: 'campo_tipo',
                tipo: 'radio',
                etiqueta: '¿Con qué perfil asistes?',
                placeholder: '',
                requerido: true,
                ancho: 'full',
                campoEstandar: 'TipoAsistente',
                opciones: ['Público General / Empresario', 'Estudiante / Académico', 'Expositor / Patrocinador'],
                orden: 4
            },
            {
                id: 'campo_empresa',
                tipo: 'input',
                etiqueta: 'Empresa o Institución de donde nos visitas',
                placeholder: 'Nombre de tu empresa, escuela u organización',
                requerido: false,
                ancho: 'full',
                campoEstandar: 'EmpresaRepresenta',
                orden: 5
            },
            {
                id: 'campo_difusion',
                tipo: 'select',
                etiqueta: '¿Cómo te enteraste del evento?',
                placeholder: 'Selecciona una opción',
                requerido: false,
                ancho: 'half',
                opciones: ['Redes Sociales (Facebook/LinkedIn)', 'Invitación Directa / Amigo', 'Página Web Oficial', 'Radio o Prensa'],
                orden: 6
            },
            {
                id: 'campo_comentarios',
                tipo: 'textarea',
                etiqueta: '¿Qué temas o actividades te interesan más?',
                placeholder: 'Cuéntanos qué esperas de esta edición...',
                requerido: false,
                ancho: 'full',
                orden: 7
            }
        ];
    }

    /** Inicializa valores de prueba para la previsualización interactiva */
    inicializarPreviewRespuestas(): void {
        this.previewRespuestas = {};
        this.campos.forEach(c => {
            if (c.tipo === 'checkbox') {
                this.previewRespuestas[c.id] = [];
            } else {
                this.previewRespuestas[c.id] = '';
            }
        });
    }

    /** Añade un nuevo campo dinámico al formulario */
    agregarCampo(tipo: CampoConfig['tipo'] = 'input'): void {
        const nuevoId = 'campo_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
        const orden = this.campos.length + 1;

        let opcionesDefault: string[] | undefined;
        if (tipo === 'select' || tipo === 'radio') {
            opcionesDefault = ['Opción 1', 'Opción 2', 'Opción 3'];
        } else if (tipo === 'checkbox') {
            opcionesDefault = ['Interés 1', 'Interés 2'];
        }

        const nuevoCampo: CampoConfig = {
            id: nuevoId,
            tipo: tipo,
            etiqueta: `Nuevo campo ${orden}`,
            placeholder: tipo === 'textarea' ? 'Escribe aquí...' : 'Ingresa la información...',
            requerido: false,
            ancho: 'full',
            campoEstandar: '',
            opciones: opcionesDefault,
            orden: orden
        };

        this.campos.push(nuevoCampo);
        this.previewRespuestas[nuevoId] = tipo === 'checkbox' ? [] : '';
        this.reordenarCampos();
    }

    /** Elimina un campo */
    eliminarCampo(index: number): void {
        const campo = this.campos[index];
        delete this.previewRespuestas[campo.id];
        this.campos.splice(index, 1);
        this.reordenarCampos();
    }

    /** Mover campo arriba */
    moverArriba(index: number): void {
        if (index <= 0) return;
        const temp = this.campos[index];
        this.campos[index] = this.campos[index - 1];
        this.campos[index - 1] = temp;
        this.reordenarCampos();
    }

    /** Mover campo abajo */
    moverAbajo(index: number): void {
        if (index >= this.campos.length - 1) return;
        const temp = this.campos[index];
        this.campos[index] = this.campos[index + 1];
        this.campos[index + 1] = temp;
        this.reordenarCampos();
    }

    /** Duplicar campo existente */
    duplicarCampo(index: number): void {
        const original = this.campos[index];
        const copia: CampoConfig = {
            ...JSON.parse(JSON.stringify(original)),
            id: 'campo_' + Date.now().toString(36),
            etiqueta: original.etiqueta + ' (Copia)',
            orden: this.campos.length + 1
        };
        this.campos.splice(index + 1, 0, copia);
        this.reordenarCampos();
    }

    /** Reordena índices de campos */
    reordenarCampos(): void {
        this.campos.forEach((c, idx) => c.orden = idx + 1);
    }

    /** Agregar opción a un campo de tipo select/radio/checkbox */
    agregarOpcion(campo: CampoConfig): void {
        if (!campo.opciones) campo.opciones = [];
        campo.opciones.push(`Opción ${campo.opciones.length + 1}`);
    }

    /** Eliminar opción de un campo */
    eliminarOpcion(campo: CampoConfig, optIndex: number): void {
        if (!campo.opciones) return;
        campo.opciones.splice(optIndex, 1);
    }

    /** Manejo de cambio de imagen de portada por archivo local */
    onFileSelected(event: any): void {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.mostrarAlerta('Por favor selecciona un archivo de imagen válido (PNG, JPG, WebP).');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e: any) => {
            this.imagenPortadaUrl = e.target.result;
            this._cdr.markForCheck();
        };
        reader.readAsDataURL(file);
    }

    /** Asigna un preset de portada */
    seleccionarPresetPortada(url: string): void {
        this.imagenPortadaUrl = url;
    }

    /** Obtiene el enlace público absoluto */
    get enlacePublico(): string {
        if (!this.slug) return '';
        const base = window.location.origin;
        return `${base}/#/eventos/registro/${this.slug}`;
    }

    /** Copia el enlace al portapapeles */
    copiarEnlace(): void {
        if (!this.enlacePublico) return;
        navigator.clipboard.writeText(this.enlacePublico).then(() => {
            this.mostrarAlerta('¡Enlace público copiado al portapapeles!');
        }).catch(() => {
            this.mostrarAlerta('No se pudo copiar el enlace. Cópialo manualmente.');
        });
    }

    /** Abre la vista pública en nueva pestaña */
    abrirEnlacePublico(): void {
        if (!this.enlacePublico) return;
        window.open(this.enlacePublico, '_blank');
    }

    /** Genera URL de código QR vía API pública segura */
    get qrCodeUrl(): string {
        if (!this.enlacePublico) return '';
        return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(this.enlacePublico)}`;
    }

    /** Manejo de cambio de tipo de campo en el selector */
    onTipoCampoChange(campo: CampoConfig): void {
        if ((campo.tipo === 'select' || campo.tipo === 'radio' || campo.tipo === 'checkbox') && (!campo.opciones || campo.opciones.length === 0)) {
            campo.opciones = ['Sí', 'No'];
        }
        if (campo.tipo === 'checkbox' && !Array.isArray(this.previewRespuestas[campo.id])) {
            this.previewRespuestas[campo.id] = [];
        }
    }

    /** Guarda la configuración completa */
    guardar(): void {
        if (!this.selectedEventoId) {
            this.mostrarAlerta('Selecciona un evento.');
            return;
        }

        if (!this.titulo.trim()) {
            this.mostrarAlerta('El título del formulario es obligatorio.');
            this.activeTab = 'general';
            return;
        }

        if (!this.slug.trim()) {
            this.mostrarAlerta('El enlace amigable (slug) es obligatorio.');
            this.activeTab = 'enlace';
            return;
        }

        if (this.campos.length === 0) {
            this.mostrarAlerta('Agrega al menos un campo al cuestionario.');
            this.activeTab = 'campos';
            return;
        }

        // Asegurar que campos con opciones tengan valores por defecto
        this.campos.forEach(c => {
            if (c.tipo === 'select' || c.tipo === 'radio' || c.tipo === 'checkbox') {
                if (!c.opciones || c.opciones.length === 0) {
                    c.opciones = ['Sí', 'No'];
                } else {
                    c.opciones = c.opciones.map(o => o ? o.trim() : '').filter(o => o.length > 0);
                    if (c.opciones.length === 0) c.opciones = ['Sí', 'No'];
                }
            }
        });

        this.saving = true;

        const payload = {
            id: this.currentFormId,
            eventoId: this.selectedEventoId,
            slug: this.generarSlug(this.slug),
            titulo: this.titulo.trim(),
            descripcion: this.descripcion?.trim() || '',
            imagenPortadaUrl: this.imagenPortadaUrl,
            camposConfigJson: JSON.stringify(this.campos),
            disenoConfigJson: JSON.stringify(this.diseno),
            activo: this.activo
        };

        this._formService.guardarConfiguracion(payload)
            .pipe(takeUntil(this._destroy$))
            .subscribe({
                next: (res) => {
                    this.saving = false;
                    this.currentFormId = res.id;
                    this.slug = res.slug;
                    this.mostrarAlerta('¡Formulario de registro guardado exitosamente!');
                    this._cdr.markForCheck();
                },
                error: (err) => {
                    this.saving = false;
                    const msg = err?.error?.mensaje || err?.message || 'Error al guardar configuración.';
                    this.mostrarAlerta(msg);
                }
            });
    }

    /** Carga respuestas recibidas para el evento */
    cargarRespuestas(): void {
        if (!this.selectedEventoId) return;
        this.cargandoRespuestas = true;
        this._formService.getRespuestasPorEvento(this.selectedEventoId)
            .pipe(takeUntil(this._destroy$))
            .subscribe({
                next: (data) => {
                    this.respuestasEvento = (data || []).map(r => {
                        let parsed = {};
                        try {
                            parsed = JSON.parse(r.respuestasJson);
                        } catch {
                            parsed = {};
                        }
                        return { ...r, respuestasObj: parsed };
                    });
                    this.totalRespuestas = this.respuestasEvento.length;
                    this.cargandoRespuestas = false;
                    this._cdr.markForCheck();
                },
                error: () => {
                    this.cargandoRespuestas = false;
                }
            });
    }

    /** Exporta respuestas del formulario a formato CSV */
    exportarRespuestasCsv(): void {
        if (this.respuestasEvento.length === 0) {
            this.mostrarAlerta('No hay respuestas para exportar.');
            return;
        }

        const headers = ['ID', 'Asistente', 'Correo', 'Teléfono', 'Fecha Registro', 'IP'];
        const dynamicKeys = this.campos.map(c => c.etiqueta);
        const allHeaders = [...headers, ...dynamicKeys];

        const rows = this.respuestasEvento.map(r => {
            const row = [
                r.id,
                `"${(r.nombreAsistente || '').replace(/"/g, '""')}"`,
                `"${r.correoAsistente || ''}"`,
                `"${r.telefonoAsistente || ''}"`,
                `"${new Date(r.fechaRegistro).toLocaleString()}"`,
                `"${r.ipOrigen || ''}"`
            ];

            this.campos.forEach(c => {
                const val = r.respuestasObj ? r.respuestasObj[c.id] : '';
                const formatVal = Array.isArray(val) ? val.join('; ') : (val ?? '');
                row.push(`"${String(formatVal).replace(/"/g, '""')}"`);
            });

            return row.join(',');
        });

        const csvContent = '\uFEFF' + [allHeaders.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `respuestas-registro-${this.slug || 'evento'}.csv`;
        a.click();
    }

    /** Alternar selección de checkbox en preview interactivo */
    toggleCheckboxPreview(campoId: string, opcion: string): void {
        if (!this.previewRespuestas[campoId]) {
            this.previewRespuestas[campoId] = [];
        }
        const arr = this.previewRespuestas[campoId] as string[];
        const idx = arr.indexOf(opcion);
        if (idx >= 0) {
            arr.splice(idx, 1);
        } else {
            arr.push(opcion);
        }
    }

    /** Helper para trackBy en ngFor */
    trackByIndex(index: number): number {
        return index;
    }

    /** Helper para generar slugs limpios */
    generarSlug(texto: string): string {
        return texto
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Elimina acentos
            .replace(/[^a-z0-9\s-]/g, '')                     // Elimina caracteres especiales
            .trim()
            .replace(/\s+/g, '-');                             // Espacios por guiones
    }

    /** Notificación flotante rápida */
    mostrarAlerta(mensaje: string): void {
        this._snackBar.open(mensaje, 'Cerrar', {
            duration: 4000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom'
        });
    }
}
