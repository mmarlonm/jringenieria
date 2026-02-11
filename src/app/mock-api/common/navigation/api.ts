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

    registerHandlers(): void {
        this._fuseMockApiService.onGet('api/common/navigation').reply(() => {

            // 1. Obtener los datos del usuario
            const storedData = JSON.parse(localStorage.getItem('userInformation') || '{}');

            // 🔹 MAPEO CORRECTO: Extraemos 'nombreVista' del array de objetos 'permisos'
            // Esto nos dará algo como ["dashboards.analytics", "dashboards.project", ...]
            const vistasPermitidas: string[] = storedData.permisos?.map(p => p.vista?.nombreVista) || [];

            // 2. Llenar hijos de navegación (Compact, Futuristic, Horizontal)
            [this._compactNavigation, this._futuristicNavigation, this._horizontalNavigation].forEach(nav => {
                nav.forEach(navItem => {
                    const defaultItem = this._defaultNavigation.find(d => d.id === navItem.id);
                    if (defaultItem) {
                        navItem.children = cloneDeep(defaultItem.children);
                    }
                });
            });

            /**
             * 🔹 Función de filtrado inteligente
             */
            const filtrarNavegacion = (navigation: FuseNavigationItem[]): FuseNavigationItem[] => {
                return navigation
                    .map(item => {
                        const newItem = cloneDeep(item);

                        // Si tiene hijos, filtramos los hijos primero
                        if (newItem.children && newItem.children.length > 0) {
                            newItem.children = filtrarNavegacion(newItem.children);
                        }

                        // Lógica para GRUPOS o COLAPSABLES: 
                        // Se muestran solo si terminaron con hijos permitidos después del filtro
                        if (newItem.type === 'group' || newItem.type === 'collapsable' || newItem.type === 'aside') {
                            return (newItem.children && newItem.children.length > 0) ? newItem : null;
                        }

                        // Lógica para ITEMS FINALES (vistas):
                        // Comparamos el final del ID para que coincida aunque el prefijo cambie
                        const tienePermiso = vistasPermitidas.some(permiso => {
                            if (!permiso) return false;

                            // Obtenemos la última parte (ej: de 'dashboards.quote' sacamos 'quote')
                            const basePermiso = permiso.split('.').pop();
                            const baseItemId = newItem.id.split('.').pop();

                            // 💡 Caso especial para IDs con guiones como 'quote-products' o 'transfer-management'
                            return basePermiso === baseItemId || permiso === newItem.id;
                        });

                        return tienePermiso ? newItem : null;
                    })
                    .filter(item => item !== null); // Eliminamos los que no pasaron el filtro
            };

            // 3. Generar la respuesta filtrada
            return [
                200,
                {
                    compact: filtrarNavegacion(cloneDeep(this._compactNavigation)),
                    default: filtrarNavegacion(cloneDeep(this._defaultNavigation)),
                    futuristic: filtrarNavegacion(cloneDeep(this._futuristicNavigation)),
                    horizontal: filtrarNavegacion(cloneDeep(this._horizontalNavigation)),
                },
            ];
        });
    }
}
