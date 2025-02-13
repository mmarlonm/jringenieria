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

@Injectable({ providedIn: 'root' })
export class NavigationMockApi {
    private readonly _compactNavigation: FuseNavigationItem[] =
        compactNavigation;
    private readonly _defaultNavigation: FuseNavigationItem[] =
        defaultNavigation;
    private readonly _futuristicNavigation: FuseNavigationItem[] =
        futuristicNavigation;
    private readonly _horizontalNavigation: FuseNavigationItem[] =
        horizontalNavigation;

    /**
     * Constructor
     */
    constructor(private _fuseMockApiService: FuseMockApiService) {
        // Register Mock API handlers
        this.registerHandlers();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Register Mock API handlers
     */
    registerHandlers(): void {
        this._fuseMockApiService.onGet('api/common/navigation').reply(() => {
            // 🔹 Obtener los datos del usuario desde localStorage
            const storedData = JSON.parse(localStorage.getItem('userInformation') || '{}');
            const vistasPermitidas: string[] = storedData.vistas?.map(v => v.nombreVista) || [];

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
    
            // 🔹 Función para filtrar la navegación
            const filtrarNavegacion = (navigation: FuseNavigationItem[]) => {
                return navigation.map(group => ({
                    ...group,
                    children: group.children
                        ? group.children.filter(item => vistasPermitidas.includes(item.id))
                        : []
                })).filter(group => group.children.length > 0); // Eliminar grupos vacíos
            };
    
            const compactNav = filtrarNavegacion(cloneDeep(this._compactNavigation));
            const defaultNav = filtrarNavegacion(cloneDeep(this._defaultNavigation));
            const defaultNav2 = cloneDeep(this._defaultNavigation);
            const futuristicNav = filtrarNavegacion(cloneDeep(this._futuristicNavigation));
            const horizontalNav = filtrarNavegacion(cloneDeep(this._horizontalNavigation));
    
            // 🔹 Devolver la navegación filtrada
            return [
                200,
                {
                    compact: compactNav,
                    default: defaultNav,
                    default2: defaultNav2,
                    futuristic: futuristicNav,
                    horizontal: horizontalNav,
                },
            ];
        });
    }
}
