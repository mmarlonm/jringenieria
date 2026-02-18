import {
    Component,
    OnDestroy,
    OnInit,
    ViewChild,
    ViewEncapsulation,
    ElementRef,
    NgZone,
} from '@angular/core';
import {
    MatButtonModule
} from '@angular/material/button';
import {
    MatIconModule
} from '@angular/material/icon';
import {
    MatMenuModule
} from '@angular/material/menu';
import {
    MatProgressSpinnerModule
} from '@angular/material/progress-spinner';
import {
    ActivatedRoute,
    Router,
    RouterOutlet
} from '@angular/router';
import {
    FuseFullscreenComponent
} from '@fuse/components/fullscreen';
import {
    TareasCalendarComponent
} from '@fuse/components/calendar';
import {
    FuseLoadingBarComponent
} from '@fuse/components/loading-bar';
import {
    FuseNavigationService,
    FuseVerticalNavigationComponent,
} from '@fuse/components/navigation';
import {
    FuseMediaWatcherService
} from '@fuse/services/media-watcher';
import {
    NavigationService
} from 'app/core/navigation/navigation.service';
import {
    Navigation
} from 'app/core/navigation/navigation.types';
import {
    UserService
} from 'app/core/user/user.service';
import {
    TaskService
} from '@fuse/components/calendar';
import {
    User
} from 'app/core/user/user.types';
import {
    LanguagesComponent
} from 'app/layout/common/languages/languages.component';
import {
    MessagesComponent
} from 'app/layout/common/messages/messages.component';
import {
    NotificationsComponent
} from 'app/layout/common/notifications/notifications.component';
import {
    QuickChatComponent
} from 'app/layout/common/quick-chat/quick-chat.component';
import {
    SearchComponent
} from 'app/layout/common/search/search.component';
import {
    ShortcutsComponent
} from 'app/layout/common/shortcuts/shortcuts.component';
import {
    UserComponent
} from 'app/layout/common/user/user.component';
import {
    Subject,
    takeUntil
} from 'rxjs';
import {
    TaskViewConfigService
} from 'app/modules/admin/dashboards/tasks/services/task-view-config.service';
import {
    CommonModule
} from '@angular/common';
import Swal from 'sweetalert2';
import Calendar from 'tui-calendar';
import 'tui-calendar/dist/tui-calendar.css';
import { FuseConfigService } from '@fuse/services/config';
import { FuseConfig } from '@fuse/services/config/config.types';
import { PersonalManagementService } from 'app/modules/rrhh/personal-management/personal-management.service';

@Component({
    selector: 'classy-layout',
    templateUrl: './classy.component.html',
    styleUrls: ['./classy.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
        FuseLoadingBarComponent,
        FuseVerticalNavigationComponent,
        NotificationsComponent,
        UserComponent,
        MatIconModule,
        MatButtonModule,
        LanguagesComponent,
        FuseFullscreenComponent,
        SearchComponent,
        ShortcutsComponent,
        MessagesComponent,
        RouterOutlet,
        QuickChatComponent,
        TareasCalendarComponent,
        MatMenuModule,
        MatProgressSpinnerModule,
        CommonModule
    ],
})
export class ClassyLayoutComponent implements OnInit, OnDestroy {
    isScreenSmall: boolean;
    navigation: Navigation;
    user: User;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    misTareas: any[] = [];

    @ViewChild('fullCalendar') calendarComponent: TareasCalendarComponent;
    @ViewChild('tuiCalendarContainer', { static: false }) tuiCalendarContainer: ElementRef;

    googleStatus: any = null;
    calendarEvents: any;
    calendarInstance: any;

    showGoogleModal = false;
    googleEvents: any[] = [];
    isLoadingGoogleEvents = false;

    currentView = 'month';
    currentDateLabel = '';
    newEvent: any;
    showAddEventForm: boolean;
    selectedEventId: any;

    config: FuseConfig;
    isDark: boolean;

    asistenciaStatus: 'ENTRADA' | 'SALIDA' | 'NINGUNO' = 'NINGUNO';
    ubicacionNombre: string = 'Detectando...';
    currentCoords: { lat: number, lon: number, lng?: number } | null = null;
    locationPermission: 'pending' | 'granted' | 'denied' | 'unavailable' = 'pending';
    constructor(
        private _activatedRoute: ActivatedRoute,
        private _router: Router,
        private _navigationService: NavigationService,
        private _userService: UserService,
        private _fuseMediaWatcherService: FuseMediaWatcherService,
        private _fuseNavigationService: FuseNavigationService,
        private _fuseConfigService: FuseConfigService,
        private tareasService: TaskService,
        private _taskConfigService: TaskViewConfigService,
        private _personalManagementService: PersonalManagementService,
        private _ngZone: NgZone
    ) { }

    // ----------------------------------------------------------
    // LIFECYCLE
    // ----------------------------------------------------------

    ngOnInit(): void {
        this._fuseConfigService.config$.subscribe((config: FuseConfig) => {
            this.config = config;
            this.isDark = config.scheme === 'dark';
        });

        this._navigationService.navigation$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((navigation: Navigation) => (this.navigation = navigation));

        this._userService.user$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((user: any) => {
                this.user = user['usuario'];
            });

        this._fuseMediaWatcherService.onMediaChange$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(({ matchingAliases }) => {
                this.isScreenSmall = !matchingAliases.includes('md');
            });

        this.tareasService.getTasks(Number(this.user.id)).subscribe((data) => {
            this.misTareas = data;
        });

        this.checkGoogleStatus();
    }

    /**
     * Alternar el modo oscuro
     */
    toggleScheme(): void {
        const scheme = this.isDark ? 'light' : 'dark';
        this._fuseConfigService.config = { scheme };
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
        if (this.calendarInstance) this.calendarInstance.destroy();
    }

    // ----------------------------------------------------------
    // FUNCIONES
    // ----------------------------------------------------------

    toggleNavigation(name: string): void {
        const navigation = this._fuseNavigationService.getComponent<FuseVerticalNavigationComponent>(name);
        if (navigation) {
            navigation.toggle();
            // User requested that toggling/closing the sidebar also saves configuration
            const config = this._taskConfigService.getConfig();
            this._taskConfigService.saveConfig(config);
        }
    }

    onCalendarMenuOpened(): void {
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 100);
    }

    // ✅ Verifica estado y carga eventos
    checkGoogleStatus(): void {
        this._userService.checkGoogleStatus(Number(this.user.id)).subscribe({
            next: (res) => {
                this.googleStatus = res;

                if (res.isLoggedIn && !res.isExpired) {
                    this._userService.getCalendar(Number(this.user.id)).subscribe({
                        next: (calendar) => {
                            this.calendarEvents = calendar;
                        },
                        error: (err) => console.error('❌ Error al obtener calendario:', err)
                    });
                } else if (res.isExpired) {
                    console.warn('⚠️ Sesión Google expirada.');
                }
            },
            error: (err) => {
                console.error('❌ Error al verificar estado de Google:', err);
                this.googleStatus = { isLoggedIn: false, isExpired: true };
            }
        });
    }

    // ✅ Login manual
    loginWithGoogle(): void {
        if (this.googleStatus?.isLoggedIn && !this.googleStatus?.isExpired) {
            Swal.fire({
                title: '¡Conectado!',
                text: 'Ya estás conectado con Google 😎',
                icon: 'success',
                confirmButtonText: 'Aceptar',
                timer: 3000,
                showConfirmButton: true
            });
            return;
        }
        this._userService.loginWithGoogle(Number(this.user.id));
    }

    // ✅ Modal con TUI Calendar
    openGoogleEventsModal(): void {
        this.showGoogleModal = true;
        if (this.googleStatus?.isLoggedIn && !this.googleStatus?.isExpired) {
            this._userService.getCalendar(Number(this.user.id)).subscribe({
                next: (calendar) => {
                    this.calendarEvents = calendar;
                },
                error: (err) => console.error('❌ Error al obtener calendario:', err)
            });
        }
        setTimeout(() => this.initializeTuiCalendar(), 100);
    }

    closeGoogleEventsModal(): void {
        this.showGoogleModal = false;
        if (this.calendarInstance) {
            this.calendarInstance.destroy();
            this.calendarInstance = null;
        }
    }

    // ✅ Inicializa el TUI Calendar dentro del modal
    initializeTuiCalendar(): void {
        const container = this.tuiCalendarContainer?.nativeElement;
        if (!container) return;

        this.calendarInstance = new Calendar(container, {
            defaultView: this.currentView,
            taskView: false,
            scheduleView: ['time'],
            useCreationPopup: true,  // 🔹 habilita popup de creación
            useDetailPopup: true,    // 🔹 habilita popup de edición
        });


        // ✅ Eventos del calendario
        this.calendarInstance.on('clickSchedule', (event) => this.onEventClick(event));
        this.calendarInstance.on('beforeCreateSchedule', (event) => this.saveNewEvent(event));
        this.calendarInstance.on('beforeUpdateSchedule', (event) => this.onBeforeUpdateSchedule(event));


        this.updateDateLabel();
        this.loadGoogleEventsToCalendar();
    }
    // ✅ Carga eventos de Google
    loadGoogleEventsToCalendar(): void {
        if (!this.calendarEvents || !this.calendarInstance) return;

        const items = this.calendarEvents.items || [];

        const colorMap: { [key: string]: string } = {
            '1': '#a4bdfc',
            '2': '#7ae7bf',
            '3': '#dbadff',
            '4': '#ff887c',
            '5': '#fbd75b',
            '6': '#ffb878',
            '7': '#46d6db',
            '8': '#e1e1e1',
            '9': '#5484ed',
            '10': '#51b749',
            '11': '#dc2127'
        };

        const mappedEvents = items.map((ev: any) => {
            const color = ev.backgroundColor || colorMap[ev.colorId] || '#5484ed';
            const textColor = ev.foregroundColor || '#fff';

            let start = ev.start?.dateTime || ev.start?.date;
            let end = ev.end?.dateTime || ev.end?.date;

            // 🔧 Ajustar el fin si es evento de día completo (allday)
            if (ev.start?.date && ev.end?.date) {
                const adjustedEnd = new Date(end);
                adjustedEnd.setDate(adjustedEnd.getDate() - 1);
                end = adjustedEnd.toISOString().split('T')[0]; // mantener formato YYYY-MM-DD
            }

            return {
                id: ev.id,
                calendarId: '1',
                title: ev.summary || '(Sin título)',
                category: ev.start?.dateTime ? 'time' : 'allday',
                start,
                end,
                location: ev.location || '',
                body: ev.description || '',
                isReadOnly: false,
                bgColor: color,
                borderColor: color,
                color: textColor,
                raw: {
                    htmlLink: ev.htmlLink,
                    creator: ev.creator?.email,
                    organizer: ev.organizer?.email,
                    eventType: ev.eventType
                }
            };
        });

        this.calendarInstance.clear();
        this.calendarInstance.createSchedules(mappedEvents);
        this.updateDateLabel();
    }
    // ✅ Cambia vista (month/week/day)
    changeView(view: 'month' | 'week' | 'day'): void {
        if (this.calendarInstance) {
            this.currentView = view;
            this.calendarInstance.changeView(view, true);
            this.updateDateLabel();
        }
    }
    // ✅ Navegar entre fechas
    prev(): void {
        if (this.calendarInstance) {
            this.calendarInstance.prev();
            this.updateDateLabel();
        }
    }
    next(): void {
        if (this.calendarInstance) {
            this.calendarInstance.next();
            this.updateDateLabel();
        }
    }
    today(): void {
        if (this.calendarInstance) {
            this.calendarInstance.today();
            this.updateDateLabel();
        }
    }
    updateDateLabel(): void {
        if (!this.calendarInstance) return;
        const date = this.calendarInstance.getDate();
        this.currentDateLabel = date.toDate().toLocaleString('es-MX', {
            year: 'numeric',
            month: 'long'
        });
    }
    // 🆕 Cuando el usuario hace clic en un espacio vacío (crear nuevo evento)
    onDayClick(event: any): void {

        this.selectedEventId = null;
        this.showAddEventForm = true;

        // Determinar fechas (usando _date si viene de TUI)
        const start = event.start?._date ? new Date(event.start._date) : new Date();
        const end = event.end?._date ? new Date(event.end._date) : new Date(start.getTime() + 60 * 60 * 1000);

        this.newEvent = {
            title: '',
            description: '',
            location: '',
            start: start.toISOString().slice(0, 16), // formato yyyy-MM-ddTHH:mm
            end: end.toISOString().slice(0, 16),
            allDay: event.isAllDay || false,
        };
    }
    // ✏️ Cuando el usuario hace clic en un evento existente (editar)
    onEventClick(event: any): void {

        const schedule = event.schedule;
        if (!schedule) return;

        this.selectedEventId = schedule.id;
        this.showAddEventForm = true;

        const start = schedule.start?._date || schedule.start;
        const end = schedule.end?._date || schedule.end;

        this.newEvent = {
            title: schedule.title,
            description: schedule.body || '',
            location: schedule.location || '',
            start: new Date(start).toISOString().slice(0, 16),
            end: new Date(end).toISOString().slice(0, 16),
            allDay: schedule.category === 'allday',
        };
    }

    saveNewEvent(event: any) {
        if (!event.title || !event.start || !event.end) {
            Swal.fire('Campos incompletos', 'Completa los campos requeridos', 'warning');
            return;
        }

        const payload = {
            id: this.selectedEventId,
            title: event.title,
            body: event.description,
            start: new Date(event.start).toISOString(),
            end: new Date(event.end).toISOString(),
            location: event.location,
            category: event.category,
            usuarioId: Number(this.user.id)
        };

        this._userService.createEvent(payload).subscribe({
            next: (res: any) => {
                Swal.fire({
                    icon: 'success',
                    title: this.selectedEventId ? 'Evento actualizado' : 'Evento creado',
                    timer: 2000,
                    showConfirmButton: false
                });

                // ✅ Ajuste de fechas (restar 1 día a ambas)
                let start = new Date(res.start);
                let end = new Date(res.end);

                // 🔧 Restar siempre un día
                start.setDate(start.getDate() - 1);
                end.setDate(end.getDate() - 1);

                const newEvent = {
                    id: res.id || crypto.randomUUID(),
                    calendarId: res.calendarId || '1',
                    title: res.title || event.title,
                    category: res.category || event.category || 'time',
                    start,
                    end,
                    location: res.location || event.location,
                    bgColor: res.bgColor || '#047bfe',
                    borderColor: res.borderColor || '#047bfe',
                    color: res.color || '#fff'
                };

                // 🗓️ Agregar al calendario localmente
                this.calendarInstance.createSchedules([newEvent]);
                this.calendarInstance.render();

                this.showAddEventForm = false;
                this.selectedEventId = null;
            },
            error: (err) => {
                console.error('Error al guardar evento:', err);
                Swal.fire('Error', 'No se pudo guardar el evento', 'error');
            }
        });
    }


    onBeforeUpdateSchedule(event: any): void {
        const { schedule, changes } = event;

        // Combinar cambios con datos existentes
        const updated = {
            ...schedule,
            ...changes,
            start: changes.start ? changes.start._date : schedule.start,
            end: changes.end ? changes.end._date : schedule.end,
        };

        // 🧠 Construir payload para backend
        const payload = {
            id: updated.id,
            title: updated.title,
            body: updated.description,
            start: new Date(this.newEvent.start).toISOString(),
            end: new Date(this.newEvent.end).toISOString(),
            location: updated.location,
            category: updated.category,
            usuarioId: Number(this.user.id)
        };

        // 🔄 Llamar a tu API (.NET)
        this._userService.createEvent(payload).subscribe({
            next: (response: any) => {
                // ✅ Actualizar en el calendario local
                const isAllDay = response.category === 'allday';
                let start: any;
                let end: any;

                if (isAllDay) {
                    start = response.start; // Ej: '2025-11-07'

                    // ✅ Restamos un día al end porque Google usa el siguiente día como límite
                    const endDate = new Date(response.end);
                    endDate.setDate(endDate.getDate() - 1);
                    end = endDate.toISOString().split('T')[0];
                } else {
                    start = new Date(response.start);
                    end = new Date(response.end);
                }

                this.calendarInstance.updateSchedule(schedule.id, schedule.calendarId, {
                    ...changes,
                    title: response.title,
                    start,
                    end,
                });
            },
            error: (err) => {
                console.error('Error al actualizar evento', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo actualizar el evento.',
                });
            },
        });
    }

    /**
     * Se llama al abrir el menú de asistencia.
     * Solicita permisos de ubicación y actualiza el estado del menú.
     */
    solicitarPermisosUbicacion(): void {
        if (!navigator.geolocation) {
            this.locationPermission = 'unavailable';
            return;
        }

        this.locationPermission = 'pending';
        this.ubicacionNombre = 'Obteniendo GPS...';

        console.log('📍 Solicitando ubicación...');

        // Timeout manual para asegurar que no se quede pegado cargando
        const manualTimeout = setTimeout(() => {
            this._ngZone.run(() => {
                if (this.locationPermission === 'pending') {
                    console.warn('⚠️ Tiempo de espera agotado manualmente.');
                    this.locationPermission = 'unavailable';
                    this.ubicacionNombre = 'Tiempo de espera agotado';
                }
            });
        }, 12000); // 12 segundos

        navigator.geolocation.getCurrentPosition(
            (position) => {
                clearTimeout(manualTimeout);
                this._ngZone.run(() => {
                    console.log('✅ Ubicación obtenida', position);
                    this.locationPermission = 'granted';
                    this.currentCoords = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude // Mantengo 'lon' aquí si así se definió en la interfaz, pero 'lng' es más común en Google Maps
                    };
                    // Estandarizar para el resto del componente:
                    if (!this.currentCoords['lng']) {
                        this.currentCoords['lng'] = position.coords.longitude;
                    }

                    this.ubicacionNombre = `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`;
                });
            },
            (error) => {
                clearTimeout(manualTimeout);
                this._ngZone.run(() => {
                    console.error('❌ Error al obtener ubicación', error);
                    // Si el usuario denegó, mostrar error específico
                    if (error.code === error.PERMISSION_DENIED) {
                        this.locationPermission = 'denied';
                        this.ubicacionNombre = 'Permiso denegado';
                    } else {
                        this.locationPermission = 'unavailable';
                        this.ubicacionNombre = 'Error al obtener ubicación';
                    }
                });
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }

    /**
     * Nombre: ejecutarMarcaje
     * Descripción: Gestiona permisos de GPS, obtiene coordenadas y registra asistencia.
     * Parámetros: tipo ('ENTRADA' | 'SALIDA')
     */
    ejecutarMarcaje(tipo: 'ENTRADA' | 'SALIDA'): void {

        // 0. Si ya tenemos coordenadas recientes, usarlas directamente
        if (this.currentCoords && this.locationPermission === 'granted') {
            const coords = {
                lat: this.currentCoords.lat,
                lng: this.currentCoords['lng'] || this.currentCoords.lon
            };
            this._enviarAlServicio(tipo, coords);
            return;
        }

        // 1. Verificar si el navegador soporta Geolocalización
        if (!navigator.geolocation) {
            alert('Tu navegador no soporta geolocalización. Por favor, usa uno moderno.');
            return;
        }

        // 2. Opciones de precisión
        const geoOptions = {
            enableHighAccuracy: true, // Alta precisión para GPS de obra
            timeout: 10000,           // 10 segundos máximo de espera
            maximumAge: 0             // No usar ubicaciones en caché
        };

        // 3. Solicitar ubicación (Esto disparará el permiso del navegador si no existe)
        navigator.geolocation.getCurrentPosition(
            (position) => {
                this._ngZone.run(() => {
                    // ÉXITO: Tenemos coordenadas
                    const coords = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    this._enviarAlServicio(tipo, coords);
                });
            },
            (error) => {
                this._ngZone.run(() => {
                    // ERROR/DENEGADO: Gestionar según el código de error
                    this._handleLocationError(error);
                });
            },
            geoOptions
        );
    }

    /**
     * Procesa el envío final al servicio de C#
     */
    private _enviarAlServicio(tipo: string, coords: any): void {
        const payload = {
            usuarioId: Number(this.user.id),
            tipo: tipo,
            latitud: coords.lat,
            longitud: coords.lng,
            ubicacionNombre: 'Ubicación detectada por GPS' // Aquí puedes integrar Geocoding después
        };

        this._personalManagementService.registrarAsistencia(payload).subscribe({
            next: (res) => {
                this.asistenciaStatus = tipo === 'ENTRADA' ? 'ENTRADA' : 'NINGUNO';
                console.log('Asistencia registrada correctamente');
            },
            error: (err) => {
                console.error('Error en el servidor al registrar asistencia', err);
            }
        });
    }

    /**
     * Manejo de errores de permisos y GPS
     */
    private _handleLocationError(error: GeolocationPositionError): void {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                alert('Para marcar asistencia en JR Ingeniería es OBLIGATORIO permitir la ubicación. Por favor, habilítala en la configuración de tu navegador.');
                break;
            case error.POSITION_UNAVAILABLE:
                alert('No se pudo determinar tu ubicación actual. Revisa tu señal de GPS.');
                break;
            case error.TIMEOUT:
                alert('Se agotó el tiempo esperando la respuesta del GPS.');
                break;
        }
    }
}
