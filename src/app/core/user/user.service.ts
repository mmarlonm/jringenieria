import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { User } from 'app/core/user/user.types';
import { environment } from 'environments/environment'; // Asegúrate de tener la URL base de tu API aquí
import { map, Observable, ReplaySubject, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserService {
    private apiUrl = `${environment.apiUrl}/profile`; // Asegúrate de que esto sea correcto
    private _httpClient = inject(HttpClient);
    private _user: ReplaySubject<User> = new ReplaySubject<User>(1);
    private apiUrlGoogle = `${environment.apiUrl}/Auth`; // Asegúrate de que esto sea correcto

    // Inicializar con un objeto vacío para evitar errores
    constructor() {
        this._user.next({ id: '', name: '', email: '', avatar: '' });
    }
    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Setter & getter for user
     *
     * @param value
     */
    set user(value: User) {
        // Store the value
        this._user.next(value);
    }

    get user$(): Observable<User> {
        return this._user.asObservable();
    }

    get userInformation(): string {
        return localStorage.getItem("userInformation") ?? "";
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Get the current signed-in user data
     */
    get(): Observable<User> {
        return this._httpClient.get<User>('api/common/user').pipe(
            tap((user) => {
                this._user.next(user);
            })
        );
    }

    /**
     * Update the user
     *
     * @param user
     */
    update(user: User): Observable<any> {
        return this._httpClient.patch<User>('api/common/user', { user }).pipe(
            map((response) => {
                this._user.next(response);
            })
        );
    }

    /**
     * update avatar
     *
     * @param formData
     */
    // UserService
    updateAvatar(id: string, formData: FormData): Observable<any> {
        formData.append('usuarioId', id);

        const headers = new HttpHeaders({
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`, // Obtener el token almacenado
        });
        return this._httpClient
            .post(`${this.apiUrl}/upload-avatar`, formData, { headers }) // Agregar headers a la solicitud
            .pipe(
                map((res: any) => {
                    if (res.avatarBase64) {
                        const updatedAvatar = res.avatarBase64;

                        // Actualizar avatar en localStorage
                        const user = JSON.parse(
                            localStorage.getItem('userInformation') || '{}'
                        );
                        user.usuario.avatar = updatedAvatar;
                        localStorage.setItem(
                            'userInformation',
                            JSON.stringify(user)
                        );

                        // Emitir usuario actualizado
                        this._user.next(user);
                    }

                    return res;
                })
            );
    }

    /**
     * update user
     *
     * @param formData
     */
    // UserService
    updateUser(data: { nombreUsuario; email; id }): Observable<any> {
        return this._httpClient.put(`${this.apiUrl}/update-user`, data);
    }

    /**
     * update password
     *
     * @param formData
     */
    // UserService
    changePassword(
        UsuarioId: number,
        currentPassword: string,
        newPassword: string,
        ConfirmPassword: string
    ): Observable<any> {
        return this._httpClient.post(`${this.apiUrl}/change-password`, {
            UsuarioId,
            currentPassword,
            newPassword,
            ConfirmPassword,
        });
    }


    // -----------------------------------------------------------------------------------------------------
    // @ Login con Google
    // -----------------------------------------------------------------------------------------------------

    /**
     * Inicia sesión con Google (obtiene URL de autenticación del backend)
     */
    loginWithGoogle(usuarioId: number): void {
        this._httpClient.get<{ url: string }>(`${this.apiUrlGoogle}/google/login?usuarioId=${usuarioId}`)
            .subscribe({
                next: (res) => {
                    if (res.url) {
                        window.location.href = res.url; // 🔹 Redirige a Google
                    } else {
                        console.error('No se recibió una URL válida desde el servidor.');
                    }
                },
                error: (err) => {
                    console.error('Error al iniciar sesión con Google:', err);
                }
            });
    }


    /**
 * Verifica si el usuario sigue logeado con Google o si su sesión expiró
 */
    checkGoogleStatus(usuarioId: number): Observable<any> {
        return this._httpClient.get<any>(
            `${this.apiUrlGoogle}/google/status/${usuarioId}`
        );
    }

    /**
 * Verifica si el usuario sigue logeado con Google o si su sesión expiró
 */
    getCalendar(usuarioId: number): Observable<any> {
        return this._httpClient.get<any>(
            `${this.apiUrlGoogle}/events/${usuarioId}`
        );
    }


    /**
     * Verifica si el usuario sigue logeado con Google o si su sesión expiró
    */
    createEvent(event: any) {
        return this._httpClient.post(`${this.apiUrlGoogle}/events/create`, event);
    }

}
