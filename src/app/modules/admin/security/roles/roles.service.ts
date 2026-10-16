import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
    BehaviorSubject,
    Observable,
    catchError,
    filter,
    map,
    of,
    shareReplay,
    switchMap,
    take,
    tap,
    throwError,
} from 'rxjs';
import { environment } from 'environments/environment'; // Asegúrate de tener la URL base de tu API aquí
import { FuseNavigationItem } from '@fuse/components/navigation';
import { PedidoMasivo, PermisoCatalogo } from './roles-permisos.utils';

/** Lo que responde el API al asignar permisos a varios roles. */
export interface ResultadoAsignacionMasiva {
    roles: number;
    permisosAgregados: number;
    permisosQuitados: number;
    vistasQuitadas: number;
    detalle: { rolId: number; nombreRol: string; agregados: number; quitados: number }[];
}

@Injectable({ providedIn: 'root' })
export class RolService {
    private apiUrl = `${environment.apiUrl}/Rol`; // Asegúrate de que esto sea correcto

    private apiUrlNav = 'api/common/navigation/all'; // URL del Mock API

    // Private
    private _rol: BehaviorSubject<any | null> = new BehaviorSubject(
        null
    );
    private _roles: BehaviorSubject<any[] | null> = new BehaviorSubject(
        null
    );
    private _catalogoPermisos$: Observable<PermisoCatalogo[]> | null = null;

    /**
     * Constructor
     */
    constructor(private _httpClient: HttpClient) { }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Getter for rol
     */
    get rol$(): Observable<any> {
        return this._rol.asObservable();
    }

    /**
     * Getter for contacts
     */
    get roles$(): Observable<any[]> {
        return this._roles.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Get roles
     */
    getRoles(): Observable<any[]> {
        return this._httpClient.get<any[]>(`${this.apiUrl}/get-roles`).pipe(
            tap((roles) => {
                this._roles.next(roles);
            })
        );
    }

    /**
     * Crea o actualiza un rol. Responde con el id del rol guardado y deja la lista de roles (y el rol abierto) al día.
     */
    updateRoles(rol: any): Observable<number> {
        return this._httpClient.post<number>(`${this.apiUrl}/guardar-rol`, rol).pipe(
            switchMap((rolId) => this.getRoles().pipe(
                tap((roles) => this._rol.next(roles.find((r) => r.rolId === rolId) ?? null)),
                map(() => rolId)
            ))
        );
    }

    /**
     * Agrega o quita permisos de una o varias vistas a varios roles en una sola operación (todo o nada).
     */
    asignarMasivo(pedido: PedidoMasivo): Observable<ResultadoAsignacionMasiva> {
        return this._httpClient.post<ResultadoAsignacionMasiva>(`${this.apiUrl}/asignar-masivo`, pedido).pipe(
            // Los roles cambiaron: se vuelve a pedir la lista para que todo se vea al día
            switchMap((resultado) => this.getRoles().pipe(map(() => resultado)))
        );
    }

    /**
     * Catálogo de permisos (Ver, Agregar, Editar...). Se pide una sola vez; si la tabla estuviera vacía se inicializa.
     */
    getCatalogoPermisos(): Observable<PermisoCatalogo[]> {
        if (!this._catalogoPermisos$) {
            this._catalogoPermisos$ = this.getPermisos().pipe(
                switchMap((data: any) => {
                    const crudos = Array.isArray(data) ? data : (data?.data || data?.result || []);
                    return crudos.length > 0 ? of(crudos) : this.inicializarPermisos().pipe(map((r: any) => r?.permisos || []));
                }),
                map((crudos: any[]) => crudos.map((p) => ({
                    permisoId: Number(p.permisoId ?? p.PermisoId ?? p.idPermiso ?? p.id),
                    descripcionPermiso: p.descripcionPermiso ?? p.DescripcionPermiso ?? '',
                }))),
                // Si falla, la próxima vez se vuelve a intentar
                catchError((err) => { this._catalogoPermisos$ = null; return throwError(() => err); }),
                shareReplay(1)
            );
        }
        return this._catalogoPermisos$;
    }

    getUserById(id: string): Observable<any> {
        return this._roles.pipe(
            take(1),
            map((roles) => {
                // Find the rol
                const rol = roles.find((item) => item.rolId == id) || null;
                // Update the rol
                this._rol.next(rol);

                // Return the rol
                return rol;
            }),
            switchMap((rol) => {
                if (!rol) {
                    return throwError(
                        'Could not found rol with id of ' + id + '!'
                    );
                }

                return of(rol);
            })
        );
    }

    /**
     * Create rol
     */
    createRol(): Observable<any> {
        return this.roles$.pipe(
            take(1),
            map((roles) => {
                // Si ya hay un rol nuevo sin guardar, se reutiliza (no se duplica)
                const existente = roles.find((r) => r.rolId === 0);
                if (existente) {
                    return existente;
                }

                // Rol nuevo sin permisos
                const newRol = {
                    rolId: 0,
                    nombreRol: "",
                    vistas: [],
                    permisos: []
                };

                this._roles.next([newRol, ...roles]);
                return newRol;
            })
        );
    }


    /** Quita de la lista el rol nuevo que aún no se guardó (id 0). */
    descartarNuevo(): void {
        this._roles.next((this._roles.value ?? []).filter((r) => r.rolId !== 0));
    }

    /**
     * Obtiene la navegación desde el Mock API
     */
    getNavigation(): Observable<{ [key: string]: FuseNavigationItem[] }> {
        return this._httpClient.get<{ [key: string]: FuseNavigationItem[] }>(this.apiUrlNav);
    }


    /**
     * Get permisos
     */
    getPermisos(): Observable<any[]> {
        return this._httpClient.get<any[]>(`${this.apiUrl}/permisos`);
    }

    /**
     * Inicializar permisos si están vacíos
     */
    inicializarPermisos(): Observable<any> {
        return this._httpClient.post<any>(`${this.apiUrl}/inicializar-permisos`, {});
    }
}
