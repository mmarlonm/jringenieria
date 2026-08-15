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
import { environment } from 'environments/environment';
import { FuseConfig, FuseConfigService } from '@fuse/services/config';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { FusePlatformService } from '@fuse/services/platform';
import { FUSE_VERSION } from '@fuse/version';
import { Subject, combineLatest, filter, map, takeUntil } from 'rxjs';
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
        private _chatIaService: ChatIaService
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
        this.isChatOpen = !this.isChatOpen;
        if (this.isChatOpen) {
            setTimeout(() => this.scrollToBottom(), 50);
        }
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
        
        // Contexto dinámico de la vista activa o genérico
        const contexto = this.currentModuleDataJson || JSON.stringify({ mensaje: 'No hay datos de reporte activos en esta pantalla.' });
        const modulo = this.currentModuleName || 'General / Desconocido';

        this._http.post<any>(`${environment.apiUrl}/ReportDashboard/chat-agente-ia`, {
            contextoJson: contexto,
            pregunta: query,
            moduloName: modulo
        }).subscribe({
            next: (res) => {
                this.isChatLoading = false;
                let rawRespuesta = res?.respuesta || 'No he podido obtener una respuesta.';
                
                // Analizar si contiene comando de navegación
                // Formato: [NAVIGATE: /ruta/destino]
                const navRegex = /\[NAVIGATE:\s*([^\s\]]+)\]/i;
                const match = rawRespuesta.match(navRegex);
                
                if (match && match[1]) {
                    const targetRoute = match[1];
                    // Remover el comando del texto visible para que sea estético
                    rawRespuesta = rawRespuesta.replace(navRegex, '').trim();
                    
                    // Navegar al destino
                    this._router.navigateByUrl(targetRoute);
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
