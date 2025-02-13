import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
    BehaviorSubject,
    Observable,
    filter,
    map,
    of,
    switchMap,
    take,
    tap,
    throwError,
} from 'rxjs';
import { environment } from 'environments/environment'; // Asegúrate de tener la URL base de tu API aquí
import { FuseNavigationItem } from '@fuse/components/navigation';

@Injectable({ providedIn: 'root' })
export class RolService {
    private apiUrl = `${environment.apiUrl}/Rol`; // Asegúrate de que esto sea correcto

    private apiUrlNav = 'api/common/navigation'; // URL del Mock API

    // Private
    private _rol: BehaviorSubject<any | null> = new BehaviorSubject(
        null
    );
    private _roles: BehaviorSubject<any[] | null> = new BehaviorSubject(
        null
    );

    /**
     * Constructor
     */
    constructor(private _httpClient: HttpClient) {}

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
     * insert or update roles
     */
    updateRoles(rol: any): Observable<any> {
        return this._httpClient.post<any>(`${this.apiUrl}/guardar-rol`, rol).pipe(
            tap((updatedRol) => {
                // Obtener la lista actual de roles
                this.roles$.pipe(take(1)).subscribe((roles) => {
                    // Si el rol existe, actualizarlo; si no, agregarlo
                    const updatedRoles = roles.some(r => r.rolId === updatedRol.rolId)
                        ? roles.map(r => (r.rolId === updatedRol.rolId ? updatedRol : r))
                        : [...roles, updatedRol];
    
                    // Emitir la nueva lista de roles
                    this._roles.next(updatedRoles);
                });
            })
        );
    }

    getUserById(id: string): Observable<any> {
        return this._roles.pipe(
            take(1),
            map((roles) => {
                // Find the rol
                console.log("id ", id)
                console.log("roles ", roles)
                const rol = roles.find((item) => item.rolId == id) || null;
                console.log("rol buscado ", rol)
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
                // Crear un nuevo usuario con valores predeterminados
                const newRol = {
                    rolId:0,
                    nombreRol:""
                };
    
                // Actualizar la lista de roles agregando el nuevo usuario
                this._roles.next([newRol, ...roles]);
    
                // Retornar el nuevo usuario
                return newRol;
            })
        );
    }


    searchRoles(query: string): Observable<any[]> {
        // Buscar en los datos locales en lugar de hacer una solicitud HTTP
        const filteredContacts = this._roles.value.filter(roles =>
            roles.rolId.toLowerCase().includes(query.toLowerCase()) ||
            roles.nombreRol.toLowerCase().includes(query.toLowerCase())
        );
    
        // Devolver el resultado como un observable
        return new Observable<any[]>((observer) => {
          observer.next(filteredContacts);
          observer.complete();
        });
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
}
