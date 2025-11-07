import {
    Component,
    OnDestroy,
    OnInit,
    ViewChild,
    ViewEncapsulation,
    ElementRef,
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
    CommonModule
} from '@angular/common';
import Swal from 'sweetalert2';
import Calendar from 'tui-calendar';
import 'tui-calendar/dist/tui-calendar.css';

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

    constructor(
        private _activatedRoute: ActivatedRoute,
        private _router: Router,
        private _navigationService: NavigationService,
        private _userService: UserService,
        private _fuseMediaWatcherService: FuseMediaWatcherService,
        private _fuseNavigationService: FuseNavigationService,
        private tareasService: TaskService
    ) { }

    // ----------------------------------------------------------
    // LIFECYCLE
    // ----------------------------------------------------------

    ngOnInit(): void {
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
        if (navigation) navigation.toggle();
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
                console.log('Estado de Google:', res);

                if (res.isLoggedIn && !res.isExpired) {
                    this._userService.getCalendar(Number(this.user.id)).subscribe({
                        next: (calendar) => {
                            console.log('📅 Eventos del calendario de Google:', calendar);
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
            useCreationPopup: false,
            useDetailPopup: true,
            template: {
                monthDayname: (dayname) => `<span class="tui-full-calendar-dayname-name">${dayname.label}</span>`
            }
        });

        this.updateDateLabel();
        this.loadGoogleEventsToCalendar();
    }

    // ✅ Carga eventos de Google
    loadGoogleEventsToCalendar(): void {
        if (!this.calendarEvents || !this.calendarInstance) return;

        const items = this.calendarEvents.items || [];
        console.log('📅 Cargando eventos en TUI Calendar...', items);

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
                isReadOnly: true,
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

        console.log('✅ Eventos con color y fechas ajustadas:', mappedEvents);
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
}
