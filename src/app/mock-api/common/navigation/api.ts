import { Injectable } from '@angular/core';
import { FuseNavigationItem } from '@fuse/components/navigation';
import { FuseMockApiService } from '@fuse/lib/mock-api';
import {
    compactNavigation,
    defaultNavigation,
    futuristicNavigation,
    horizontalNavigation,
} from 'app/mock-api/common/navigation/data';
import { cloneDeep } from 'lodash-es';
import { filtrarMenuPorVistas } from './navigation-filter';

@Injectable({ providedIn: 'root' })
export class NavigationMockApi {
    private readonly _compactNavigation: FuseNavigationItem[] = compactNavigation;
    private readonly _defaultNavigation: FuseNavigationItem[] = defaultNavigation;
    private readonly _futuristicNavigation: FuseNavigationItem[] = futuristicNavigation;
    private readonly _horizontalNavigation: FuseNavigationItem[] = horizontalNavigation;

    constructor(private _fuseMockApiService: FuseMockApiService) {
        this.registerHandlers();
    }

    registerHandlers(): void {

        // ---------------------------------------------------------------------------------
        // 1. ENDPOINT NUEVO: Obtener TODO el árbol (Para el Editor de Roles)
        // ---------------------------------------------------------------------------------
        this._fuseMockApiService.onGet('api/common/navigation/all').reply(() => {
            // Devolvemos el defaultNavigation clonado SIN FILTRAR NADA
            return [
                200,
                {
                    default: cloneDeep(this._defaultNavigation)
                }
            ];
        });


        // ---------------------------------------------------------------------------------
        // 2. ENDPOINT EXISTENTE: Obtener menú filtrado (Para la barra lateral del usuario)
        // ---------------------------------------------------------------------------------
        this._fuseMockApiService.onGet('api/common/navigation').reply(() => {

            // ... Tu lógica actual de filtrado por localStorage ...
            const storedData = JSON.parse(localStorage.getItem('userInformation') || '{}');

            // 🔹 CORRECCIÓN: Extraer permisos de forma más robusta (soportando múltiples estructuras)
            const vistasPermitidas: string[] = (storedData.permisos || []).map(p => {
                return p.vista?.nombreVista || p.vistaId || p.nombreVista || p.vista?.idVista || "";
            }).filter(v => v !== "");

            // Fill compact navigation children using the default navigation
            this._compactNavigation.forEach((compactNavItem) => {
                this._defaultNavigation.forEach((defaultNavItem) => {
                    if (defaultNavItem.id === compactNavItem.id) {
                        compactNavItem.children = cloneDeep(
                            defaultNavItem.children
                        );
                    }
                });
            });

            // Fill futuristic navigation children using the default navigation
            this._futuristicNavigation.forEach((futuristicNavItem) => {
                this._defaultNavigation.forEach((defaultNavItem) => {
                    if (defaultNavItem.id === futuristicNavItem.id) {
                        futuristicNavItem.children = cloneDeep(
                            defaultNavItem.children
                        );
                    }
                });
            });

            // Fill horizontal navigation children using the default navigation
            this._horizontalNavigation.forEach((horizontalNavItem) => {
                this._defaultNavigation.forEach((defaultNavItem) => {
                    if (defaultNavItem.id === horizontalNavItem.id) {
                        horizontalNavItem.children = cloneDeep(
                            defaultNavItem.children
                        );
                    }
                });
            });

            // El filtrado vive en navigation-filter.ts (función pura con pruebas).
            const filtrarNavegacion = (navigation: FuseNavigationItem[]): FuseNavigationItem[] =>
                filtrarMenuPorVistas(navigation, vistasPermitidas);

            return [
                200,
                {
                    compact: filtrarNavegacion(cloneDeep(this._compactNavigation)),
                    default: filtrarNavegacion(cloneDeep(this._defaultNavigation)), // Aquí se filtra
                    futuristic: filtrarNavegacion(cloneDeep(this._futuristicNavigation)),
                    horizontal: filtrarNavegacion(cloneDeep(this._horizontalNavigation)),
                },
            ];
        });
    }
}