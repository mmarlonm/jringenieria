import { provideHttpClient } from '@angular/common/http';
import { APP_INITIALIZER, ApplicationConfig, inject, importProvidersFrom } from '@angular/core';
import { LuxonDateAdapter } from '@angular/material-luxon-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
    PreloadAllModules,
    provideRouter,
    withInMemoryScrolling,
    withPreloading,
    withHashLocation
} from '@angular/router';
import { provideFuse } from '@fuse';
import { TranslocoService, provideTransloco } from '@ngneat/transloco';
import { appRoutes } from 'app/app.routes';
import { provideAuth } from 'app/core/auth/auth.provider';
import { provideIcons } from 'app/core/icons/icons.provider';
import { SignalRService } from 'app/signalr.service';
import { mockApiServices } from 'app/mock-api';
import { firstValueFrom } from 'rxjs';
import { TranslocoHttpLoader } from './core/transloco/transloco.http-loader';

// 👇 Soporte para idioma español
import { Settings } from 'luxon';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

// Registramos el idioma español
registerLocaleData(localeEs, 'es');
Settings.defaultLocale = 'es'; // Luxon usará español globalmente

export const appConfig: ApplicationConfig = {
    providers: [
        provideAnimations(),
        provideHttpClient(),
        provideRouter(
            appRoutes,
            withPreloading(PreloadAllModules),
            withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
            withHashLocation()
        ),

        // 👇 Ajuste importante: forzar locale "es" en LuxonDateAdapter
        { provide: MAT_DATE_LOCALE, useValue: 'es' },
        {
            provide: DateAdapter,
            useClass: LuxonDateAdapter,
            deps: [MAT_DATE_LOCALE],
        },
        {
            provide: MAT_DATE_FORMATS,
            useValue: {
                parse: { dateInput: 'D' },
                display: {
                    dateInput: 'DDD',
                    monthYearLabel: 'LLLL yyyy',
                    dateA11yLabel: 'DD',
                    monthYearA11yLabel: 'LLLL yyyy',
                },
            },
        },

        // Transloco Config
        provideTransloco({
            config: {
                availableLangs: [
                    { id: 'en', label: 'English' },
                    { id: 'tr', label: 'Turkish' },
                ],
                defaultLang: 'en',
                fallbackLang: 'en',
                reRenderOnLangChange: true,
                prodMode: true,
            },
            loader: TranslocoHttpLoader,
        }),
        {
            provide: APP_INITIALIZER,
            useFactory: () => {
                const translocoService = inject(TranslocoService);
                const defaultLang = translocoService.getDefaultLang();
                translocoService.setActiveLang(defaultLang);
                return () => firstValueFrom(translocoService.load(defaultLang));
            },
            multi: true,
        },

        {
            provide: APP_INITIALIZER,
            useFactory: () => {
                const signalRService = inject(SignalRService);
                return () => {
                    const token = localStorage.getItem('accessToken');
                    const userInfo = localStorage.getItem('userInformation');
                    if (token && userInfo) {
                        try {
                            const data = JSON.parse(userInfo);
                            const userId = data?.usuario?.id;
                            if (userId) {
                                console.log('[AppConfig] 🚀 Iniciando SignalR desde APP_INITIALIZER');
                                signalRService.startConnection(userId.toString(), token);
                            }
                        } catch (e) { }
                    }
                };
            },
            multi: true,
        },
        provideAuth(),
        provideIcons(),
        provideFuse({
            mockApi: { delay: 0, services: mockApiServices },
            fuse: {
                layout: 'classy',
                scheme: 'light',
                screens: { sm: '600px', md: '960px', lg: '1280px', xl: '1440px' },
                theme: 'theme-default',
                themes: [
                    { id: 'theme-default', name: 'Default' },
                    { id: 'theme-brand', name: 'Brand' },
                    { id: 'theme-teal', name: 'Teal' },
                    { id: 'theme-rose', name: 'Rose' },
                    { id: 'theme-purple', name: 'Purple' },
                    { id: 'theme-amber', name: 'Amber' },
                ],
            },
        }),
    ],
};
