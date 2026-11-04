import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Route, Router, RouterOutlet, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { AuthService } from 'app/core/auth/auth.service';
import { rutasDeInvitados } from './app.routes.invitados';

@Component({ standalone: true, template: 'pantalla' })
class PantallaFalsa {}

@Component({ standalone: true, imports: [RouterOutlet], template: '<router-outlet />' })
class MarcoFalso {}

/**
 * Las mismas rutas y los mismos guards de la aplicación, pero con pantallas de mentira y sin cargar datos:
 * lo que se prueba es a dónde llega cada dirección según haya o no sesión, no lo que dibuja.
 */
function conPantallasFalsas(rutas: Route[]): Route[] {
    return rutas.map((r) => {
        const { component, loadComponent, loadChildren, resolve, children, ...resto } = r;
        const copia: Route = { ...resto };
        if (r.redirectTo !== undefined) return copia;
        if (children) {
            copia.children = conPantallasFalsas(children);
            if (component || loadComponent) copia.component = MarcoFalso;
        } else if (loadChildren) {
            copia.loadChildren = () => [{ path: '**', component: PantallaFalsa }];
        } else {
            copia.component = PantallaFalsa;
        }
        return copia;
    });
}

// Lo que app.routes.ts pone alrededor: la redirección del inicio y el destino al que NoAuthGuard manda a quien ya inició sesión.
const rutas: Route[] = [
    { path: '', pathMatch: 'full', redirectTo: '/dashboards/analytics' },
    ...rutasDeInvitados(MarcoFalso),
    { path: 'dashboards/analytics', component: PantallaFalsa }
];

describe('rutas de invitados: quién puede abrir cada dirección', () => {
    async function irA(url: string, conSesion: boolean): Promise<string> {
        TestBed.configureTestingModule({
            providers: [
                provideRouter(conPantallasFalsas(rutas)),
                { provide: AuthService, useValue: { check: () => of(conSesion) } }
            ]
        });
        const harness = await RouterTestingHarness.create();
        await harness.navigateByUrl(url);
        return TestBed.inject(Router).url;
    }

    // Páginas para visitantes externos: se abren con o sin sesión, nunca se desvían a analytics.
    const publicas = [
        '/survey-productos/satisfaccion-productos',
        '/survey/12',
        '/public/cuestionario-proveedor/abc',
        '/eventos/ver-pase',
        '/eventos/ver-pase/token-1',
        '/public/registro-staff/5'
    ];

    publicas.forEach((url) => {
        it(`con la sesión abierta ${url} se abre y no manda a analytics`, async () => {
            expect(await irA(url, true)).toBe(url);
        });

        it(`sin sesión ${url} se abre`, async () => {
            expect(await irA(url, false)).toBe(url);
        });
    });

    it('con la sesión abierta, las pantallas de acceso siguen mandando a analytics', async () => {
        for (const url of ['/sign-in', '/sign-up', '/forgot-password', '/reset-password', '/confirmation-required']) {
            TestBed.resetTestingModule();
            expect(await irA(url, true)).withContext(url).toBe('/dashboards/analytics');
        }
    });

    it('sin sesión, las pantallas de acceso se abren', async () => {
        for (const url of ['/sign-in', '/sign-up', '/forgot-password']) {
            TestBed.resetTestingModule();
            expect(await irA(url, false)).withContext(url).toBe(url);
        }
    });
});
