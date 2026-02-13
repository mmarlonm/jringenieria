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
            const vistasPermitidas: string[] = storedData.permisos?.map(p => p.vista?.nombreVista) || [];

            // ... (El resto de tu código de filtrado que ya tenías) ...

            // Función de filtrado (la que me pasaste)
            const filtrarNavegacion = (navigation: FuseNavigationItem[]): FuseNavigationItem[] => {
                // ... tu lógica de filtrado ...
                return navigation.map(item => {
                    const newItem = cloneDeep(item);
                    if (newItem.children && newItem.children.length > 0) {
                        newItem.children = filtrarNavegacion(newItem.children);
                    }
                    if (newItem.type === 'group' || newItem.type === 'collapsable' || newItem.type === 'aside') {
                        return (newItem.children && newItem.children.length > 0) ? newItem : null;
                    }
                    // Lógica para ITEMS FINALES
                    const tienePermiso = vistasPermitidas.some(permiso => {
                        if (!permiso) return false;
                        const basePermiso = permiso.split('.').pop();
                        const baseItemId = newItem.id.split('.').pop();
                        return basePermiso === baseItemId || permiso === newItem.id;
                    });
                    return tienePermiso ? newItem : null;
                }).filter(item => item !== null);
            };

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