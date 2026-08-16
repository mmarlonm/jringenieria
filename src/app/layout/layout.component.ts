import { DOCUMENT } from '@angular/common';
import {
    Component,
    Inject,
    OnDestroy,
    OnInit,
    Renderer2,
    ViewEncapsulation,
} from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ChatIaService } from 'app/core/services/chat-ia.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TextFieldModule } from '@angular/cdk/text-field';
import { environment } from 'environments/environment';
import { FuseConfig, FuseConfigService } from '@fuse/services/config';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { FusePlatformService } from '@fuse/services/platform';
import { FUSE_VERSION } from '@fuse/version';
import { Subject, combineLatest, filter, map, takeUntil, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UserService } from 'app/core/user/user.service';
import { TaskService } from '@fuse/components/calendar/calendar.service';
import { SettingsComponent } from './common/settings/settings.component';
import { EmptyLayoutComponent } from './layouts/empty/empty.component';
import { CenteredLayoutComponent } from './layouts/horizontal/centered/centered.component';
import { EnterpriseLayoutComponent } from './layouts/horizontal/enterprise/enterprise.component';
import { MaterialLayoutComponent } from './layouts/horizontal/material/material.component';
import { ModernLayoutComponent } from './layouts/horizontal/modern/modern.component';
import { ClassicLayoutComponent } from './layouts/vertical/classic/classic.component';
import { ClassyLayoutComponent } from './layouts/vertical/classy/classy.component';
import { CompactLayoutComponent } from './layouts/vertical/compact/compact.component';
import { DenseLayoutComponent } from './layouts/vertical/dense/dense.component';
import { FuturisticLayoutComponent } from './layouts/vertical/futuristic/futuristic.component';
import { ThinLayoutComponent } from './layouts/vertical/thin/thin.component';

@Component({
    selector: 'layout',
    templateUrl: './layout.component.html',
    styleUrls: ['./layout.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
        EmptyLayoutComponent,
        CenteredLayoutComponent,
        EnterpriseLayoutComponent,
        MaterialLayoutComponent,
        ModernLayoutComponent,
        ClassicLayoutComponent,
        ClassyLayoutComponent,
        CompactLayoutComponent,
        DenseLayoutComponent,
        FuturisticLayoutComponent,
        ThinLayoutComponent,
        SettingsComponent,
        CommonModule,
        FormsModule,
        MatIconModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        TextFieldModule,
    ],
})
export class LayoutComponent implements OnInit, OnDestroy {
    config: FuseConfig;
    layout: string;
    scheme: 'dark' | 'light';
    theme: string;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    // ============================================
    // 🤖 AGENTE DE IA CHAT FLOTANTE GLOBAL
    // ============================================
    isChatOpen = false;
    chatInput = '';
    isChatLoading = false;
    chatMessages: Array<{ sender: 'user' | 'ia'; text: string; timestamp: Date }> = [];
    currentModuleName = '';
    currentModuleDataJson = '';
    
    quickSuggestions: string[] = [
        'Resumen de cotizaciones aprobadas',
        '¿Cuáles tareas están atrasadas?',
        'Dime la desviación de utilidad de obra',
        'Resumen de incidencias recientes'
    ];

    /**
     * Constructor
     */
    constructor(
        private _activatedRoute: ActivatedRoute,
        @Inject(DOCUMENT) private _document: any,
        private _renderer2: Renderer2,
        private _router: Router,
        private _fuseConfigService: FuseConfigService,
        private _fuseMediaWatcherService: FuseMediaWatcherService,
        private _fusePlatformService: FusePlatformService,
        private _http: HttpClient,
        private _chatIaService: ChatIaService,
        private _userService: UserService,
        private _taskService: TaskService
    ) {}

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        // Set the theme and scheme based on the configuration
        combineLatest([
            this._fuseConfigService.config$,
            this._fuseMediaWatcherService.onMediaQueryChange$([
                '(prefers-color-scheme: dark)',
                '(prefers-color-scheme: light)',
            ]),
        ])
            .pipe(
                takeUntil(this._unsubscribeAll),
                map(([config, mql]) => {
                    const options = {
                        scheme: config.scheme,
                        theme: config.theme,
                    };

                    // If the scheme is set to 'auto'...
                    if (config.scheme === 'auto') {
                        // Decide the scheme using the media query
                        options.scheme = mql.breakpoints[
                            '(prefers-color-scheme: dark)'
                        ]
                            ? 'dark'
                            : 'light';
                    }

                    return options;
                })
            )
            .subscribe((options) => {
                // Store the options
                this.scheme = options.scheme;
                this.theme = options.theme;

                // Update the scheme and theme
                this._updateScheme();
                this._updateTheme();
            });

        // Subscribe to config changes
        this._fuseConfigService.config$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((config: FuseConfig) => {
                // Store the config
                this.config = config;

                // Update the layout
                this._updateLayout();
            });

        // Subscribe to NavigationEnd event
        this._router.events
            .pipe(
                filter((event) => event instanceof NavigationEnd),
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(() => {
                // Update the layout
                this._updateLayout();
            });

        // Set the app version
        this._renderer2.setAttribute(
            this._document.querySelector('[ng-version]'),
            'fuse-version',
            FUSE_VERSION
        );

        // Set the OS name
        this._renderer2.addClass(
            this._document.body,
            this._fusePlatformService.osName
        );

        // Suscribirse al contexto del modulo activo para tener conciencia del reporte en pantalla
        this._chatIaService.context$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((ctx) => {
                if (ctx) {
                    this.currentModuleName = ctx.moduloName;
                    this.currentModuleDataJson = ctx.datosJson;
                } else {
                    this.currentModuleName = '';
                    this.currentModuleDataJson = '';
                }
            });

        // Suscribirse al estado abierto/cerrado global del chat
        this._chatIaService.isOpen$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((isOpen) => {
                this.isChatOpen = isOpen;
                if (isOpen) {
                    setTimeout(() => this.scrollToBottom(), 50);
                }
            });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Private methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Update the selected layout
     */
    private _updateLayout(): void {
        // Get the current activated route
        let route = this._activatedRoute;
        while (route.firstChild) {
            route = route.firstChild;
        }

        // 1. Set the layout from the config
        this.layout = this.config.layout;

        // 2. Get the query parameter from the current route and
        // set the layout and save the layout to the config
        const layoutFromQueryParam = route.snapshot.queryParamMap.get('layout');
        if (layoutFromQueryParam) {
            this.layout = layoutFromQueryParam;
            if (this.config) {
                this.config.layout = layoutFromQueryParam;
            }
        }

        // 3. Iterate through the paths and change the layout as we find
        // a config for it.
        //
        // The reason we do this is that there might be empty grouping
        // paths or componentless routes along the path. Because of that,
        // we cannot just assume that the layout configuration will be
        // in the last path's config or in the first path's config.
        //
        // So, we get all the paths that matched starting from root all
        // the way to the current activated route, walk through them one
        // by one and change the layout as we find the layout config. This
        // way, layout configuration can live anywhere within the path and
        // we won't miss it.
        //
        // Also, this will allow overriding the layout in any time so we
        // can have different layouts for different routes.
        const paths = route.pathFromRoot;
        paths.forEach((path) => {
            // Check if there is a 'layout' data
            if (
                path.routeConfig &&
                path.routeConfig.data &&
                path.routeConfig.data.layout
            ) {
                // Set the layout
                this.layout = path.routeConfig.data.layout;
            }
        });
    }

    /**
     * Update the selected scheme
     *
     * @private
     */
    private _updateScheme(): void {
        // Remove class names for all schemes
        this._document.body.classList.remove('light', 'dark');

        // Add class name for the currently selected scheme
        this._document.body.classList.add(this.scheme);
    }

    /**
     * Update the selected theme
     *
     * @private
     */
    private _updateTheme(): void {
        // Find the class name for the previously selected theme and remove it
        this._document.body.classList.forEach((className: string) => {
            if (className.startsWith('theme-')) {
                this._document.body.classList.remove(
                    className,
                    className.split('-')[1]
                );
            }
        });

        // Add class name for the currently selected theme
        this._document.body.classList.add(this.theme);
    }

    // ============================================
    // 🤖 AGENTE DE IA METODOS Y LOGICA
    // ============================================
    toggleChat(): void {
        this._chatIaService.toggleChat();
    }

    sendSuggestion(text: string): void {
        this.chatInput = text;
        this.sendChatMessage();
    }

    sendChatMessage(): void {
        const query = this.chatInput.trim();
        if (!query || this.isChatLoading) return;

        this.chatMessages.push({
            sender: 'user',
            text: query,
            timestamp: new Date()
        });

        this.chatInput = '';
        this.isChatLoading = true;
        
        const storedData = JSON.parse(localStorage.getItem('userInformation') || '{}');
        const userId = storedData.usuario?.id;

        let contextObs$;
        if (userId) {
            console.log('[Rayito IA Debug] Fetching tasks and calendar for userId:', userId);
            contextObs$ = forkJoin({
                tasks: this._taskService.getTasks(Number(userId)).pipe(
                    map(tasks => {
                        const mappedTasks = (tasks || []).map(t => ({
                            titulo: t.title || t.nombre || t.descripcion,
                            estado: t.status || t.estatus,
                            vence: t.dueDate || t.fechaVencimiento || t.fechaLimite,
                            prioridad: t.priority
                        }));
                        console.log('[Rayito IA Debug] Mapped CRM tasks:', mappedTasks);
                        return mappedTasks;
                    }),
                    catchError((err) => {
                        console.error('[Rayito IA Debug] Error fetching CRM tasks:', err);
                        return of([]);
                    })
                ),
                calendar: this._userService.getCalendar(Number(userId)).pipe(
                    map(res => {
                        console.log('[Rayito IA Debug] Raw Google Calendar response:', res);
                        const items = res?.items || res?.Items || [];
                        const mapped = items.map(e => ({
                            id: e.id,
                            titulo: e.summary || e.titulo || e.nombre,
                            inicio: e.start?.dateTime || e.start?.date,
                            fin: e.end?.dateTime || e.end?.date,
                            ubicacion: e.location || e.ubicacion
                        }));
                        console.log('[Rayito IA Debug] Mapped calendar events:', mapped);
                        return mapped;
                    }),
                    catchError((err) => {
                        console.error('[Rayito IA Debug] Error fetching Google Calendar:', err);
                        return of([]);
                    })
                )
            });
        } else {
            console.warn('[Rayito IA Debug] No userId found in localStorage.');
            contextObs$ = of({ tasks: [], calendar: [] });
        }

        contextObs$.subscribe({
            next: (extraContext) => {
                let contexto = this.currentModuleDataJson || '';
                
                // Si cargamos contexto extra del calendario/tareas, lo inyectamos al JSON
                if (extraContext.tasks.length > 0 || extraContext.calendar.length > 0) {
                    try {
                        const parsedContext = contexto ? JSON.parse(contexto) : {};
                        parsedContext.tareasCRM = extraContext.tasks;
                        parsedContext.calendarioGoogle = extraContext.calendar;
                        contexto = JSON.stringify(parsedContext);
                    } catch (e) {
                        contexto = JSON.stringify({
                            tareasCRM: extraContext.tasks,
                            calendarioGoogle: extraContext.calendar,
                            mensajeErrorParsing: 'Error parsing active module context'
                        });
                    }
                }

                if (!contexto) {
                    contexto = JSON.stringify({ mensaje: 'No hay datos de reporte activos en esta pantalla.' });
                }

                const modulo = this.currentModuleName || 'General / Desconocido';
                const rutaActual = this._router.url;

                this._http.post<any>(`${environment.apiUrl}/ReportDashboard/chat-agente-ia`, {
                    contextoJson: contexto,
                    pregunta: query,
                    moduloName: `${modulo} (ruta: ${rutaActual})`
                }).subscribe({
                    next: (res) => {
                        this.isChatLoading = false;
                        let rawRespuesta = res?.respuesta || 'No he podido obtener una respuesta.';
                        
                        // Analizar si contiene comando de navegación
                        const navRegex = /\[NAVIGATE:\s*([^\s\]]+)\]/i;
                        const match = rawRespuesta.match(navRegex);
                        
                        if (match && match[1]) {
                            const targetRoute = match[1];
                            rawRespuesta = rawRespuesta.replace(navRegex, '').trim();
                            
                            if (this.checkPermissionForRoute(targetRoute)) {
                                this._router.navigateByUrl(targetRoute);
                            } else {
                                rawRespuesta = "No tienes los permisos necesarios para acceder al módulo solicitado (" + targetRoute + ").";
                            }
                        }

                        // Analizar si contiene comando de creación de evento en Google Calendar
                        // Formato: [CREATE_EVENT: title | start | end | location | body]
                        const eventRegex = /\[CREATE_EVENT:\s*([^\]]+)\]/i;
                        const eventMatch = rawRespuesta.match(eventRegex);
                        if (eventMatch && eventMatch[1] && userId) {
                            rawRespuesta = rawRespuesta.replace(eventRegex, '').trim();
                            this.crearEventoGoogleCalendarDesdeChat(eventMatch[1], Number(userId));
                        }

                        this.chatMessages.push({
                            sender: 'ia',
                            text: rawRespuesta,
                            timestamp: new Date()
                        });
                        
                        setTimeout(() => this.scrollToBottom(), 50);
                    },
                    error: (err) => {
                        this.isChatLoading = false;
                        this.chatMessages.push({
                            sender: 'ia',
                            text: 'Ocurrió un error al procesar tu pregunta. Por favor, intenta de nuevo.',
                            timestamp: new Date()
                        });
                        console.error(err);
                        setTimeout(() => this.scrollToBottom(), 50);
                    }
                });
            },
            error: (err) => {
                this.isChatLoading = false;
                console.error('Error fetching calendar context:', err);
            }
        });
    }

    private crearEventoGoogleCalendarDesdeChat(paramsStr: string, userId: number): void {
        const parts = paramsStr.split('|').map(p => p.trim());
        const title = parts[0] || 'Reunión desde Rayito IA';
        const startStr = parts[1]; // e.g. "2026-08-17T10:00:00"
        const endStr = parts[2];   // e.g. "2026-08-17T11:00:00"
        const location = parts[3] || '';
        const body = parts[4] || '';

        const eventDto = {
            title: title,
            start: startStr ? new Date(startStr) : new Date(Date.now() + 3600000), // por defecto en 1 hora
            end: endStr ? new Date(endStr) : new Date(Date.now() + 7200000), // duración 1 hora por defecto
            location: location,
            body: body,
            usuarioId: userId,
            calendarId: 'primary'
        };

        this._userService.createEvent(eventDto).subscribe({
            next: (res) => {
                console.log('Evento creado exitosamente en Google Calendar', res);
                this.chatMessages.push({
                    sender: 'ia',
                    text: `📢 Hecho. He agendado la reunión "${title}" en tu Google Calendar para el ${new Date(eventDto.start).toLocaleString()}.`,
                    timestamp: new Date()
                });
                setTimeout(() => this.scrollToBottom(), 50);
            },
            error: (err) => {
                console.error('Error al crear evento desde chat:', err);
                this.chatMessages.push({
                    sender: 'ia',
                    text: '⚠️ No pude agregar el evento a tu Google Calendar automáticamente. Por favor, asegúrate de haber verificado tu sesión de Google en el panel superior.',
                    timestamp: new Date()
                });
                setTimeout(() => this.scrollToBottom(), 50);
            }
        });
    }

    private checkPermissionForRoute(route: string): boolean {
        const routeToPermissionMap: { [key: string]: string } = {
            '/administration/solicitudes-compra': 'solicitudes-compra',
            '/administration/tablero-compras': 'tablero-compras',
            '/administration/recepcion-compras': 'recepcion-compras',
            '/administration/historico-compras': 'historico-compras',
            '/administration/cierre-terminal': 'cierre-terminal',
            '/administration/tickets': 'tickets',
            '/administration/resumen-compras': 'resumen-compras',
            '/administration/reporte-detalle-compras': 'reporte-detalle-compras',
            '/administration/control-entregas': 'control-entregas',
            '/administration/proveedores/cuestionario': 'cuestionario',
            '/administration/proveedores/maestro': 'maestro',
            '/administration/proveedores/reportes/resumen': 'resumen',
            '/administration/calidad': 'calidad',
            '/engineering/solicitantes': 'solicitantes',
            '/engineering/tablero-proyectos': 'tablero-proyectos',
            '/engineering/control-ejecucion': 'control-ejecucion',
            '/engineering/gantt-general': 'gantt-general',
            '/engineering/seguimiento-tareas': 'seguimiento-tareas',
            '/engineering/aliados': 'aliados',
            '/engineering/tickets': 'tickets',
            '/dashboards/tasks': 'tasks',
            '/catalogs/clients': 'clients',
            '/dashboards/prospects': 'prospects',
            '/dashboards/analytics': 'analytics',
            '/dashboards/roadmap': 'roadmap',
            '/dashboards/expenses': 'expenses',
            '/dashboards/quote': 'quote',
            '/dashboards/transfer-management': 'transfer-management',
            '/dashboards/project': 'project',
            '/reports/project-progress': 'project-progress',
            '/reports/existencias-tableros': 'existencias-tableros',
            '/reports/report-product-existence': 'report-product-existence',
            '/reports/inventory/kardex': 'kardex',
            '/reports/report-expenses': 'report-expenses',
            '/reports/dashboard-proyectos': 'dashboard-proyectos',
            '/crm/leads': 'leads',
            '/reports/report-venta': 'report-ventas',
            '/reports/report-ventas-agente': 'report-ventas-agente',
            '/reports/report-venta-product': 'report-ventas-product',
            '/reports/report-customers-segmentation': 'report-customers-segmentation',
            '/reports/report-customers': 'report-customers',
            '/reports/report-portfolio-overdue': 'report-portfolio-overdue',
            '/dashboards/surveys': 'surveys',
            '/dashboards/surveys-products': 'surveys-products',
            '/rrhh/personal-management': 'personal-management',
            '/rrhh/report-entrada-salida': 'report-entrada-salida',
            '/eventos/dashboard': 'dashboard',
            '/eventos/control': 'control',
            '/eventos/gestion-talleres': 'talleres',
            '/eventos/personal': 'personal',
            '/eventos/actividades': 'actividades',
            '/eventos/gestion-eventos': 'gestion',
            '/eventos/reportes': 'reportes',
            '/eventos/escanear-pase': 'escanear',
            '/eventos/mapa': 'mapa',
            '/security/users': 'users',
            '/security/roles': 'roles',
            '/security/activity-monitor': 'activity-monitor',
            '/reports/login-logs': 'login-logs'
        };

        const cleanRoute = route.split('?')[0];
        const permissionName = routeToPermissionMap[cleanRoute];
        if (!permissionName) {
            return true;
        }

        const storedData = JSON.parse(localStorage.getItem('userInformation') || '{}');
        const roles = storedData.roles || [];
        
        if (roles.some((r: string) => r && ['admin', 'pruebas'].includes(r.toLowerCase()))) {
            return true;
        }

        const vistasPermitidas: string[] = (storedData.permisos || []).map((p: any) => {
            return p.vista?.nombreVista || p.vistaId || p.nombreVista || p.vista?.idVista || "";
        }).filter((v: string) => v !== "");

        return vistasPermitidas.some(permiso => {
            if (!permiso) return false;
            const basePermiso = permiso.split('.').pop()?.toLowerCase();
            const basePermName = permissionName.toLowerCase();
            
            if (basePermName === 'users' && basePermiso === 'contacts') return true;
            if (basePermName === 'report-ventas' && basePermiso === 'report-venta') return true;
            if (basePermName === 'existencias-tableros' && basePermiso === 'products') return true;
            if (basePermName === 'tasks' && basePermiso === 'tasjks') return true;
            
            return basePermiso === basePermName || permiso.toLowerCase() === basePermName;
        });
    }

    private scrollToBottom(): void {
        try {
            const element = document.getElementById('globalChatHistory');
            if (element) {
                element.scrollTop = element.scrollHeight;
            }
        } catch (err) {}
    }
}
