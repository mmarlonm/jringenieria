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

@Injectable({ providedIn: 'root' })
export class UsersService {
    private apiUrl = `${environment.apiUrl}/Profile`; // Asegúrate de que esto sea correcto
    private apiUrlProyecto = `${environment.apiUrl}/Proyecto`;
    private _user: BehaviorSubject<any | null> = new BehaviorSubject(null);
    private _users: BehaviorSubject<any[] | null> = new BehaviorSubject(null);
    private _allUsers: any[] = [];

    /**
     * Constructor
     */
    constructor(private _httpClient: HttpClient) { }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Getter for contact
     */
    get user$(): Observable<any> {
        return this._user.asObservable();
    }

    /**
     * Getter for contacts
     */
    get users$(): Observable<any[]> {
        return this._users.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Get contacts
     */
    getUsers(): Observable<any[]> {
        return this._httpClient.get<any[]>(`${this.apiUrl}/get-users`).pipe(
            tap((contacts) => {
                this._allUsers = contacts;
                this._users.next(contacts);
            })
        );
    }

    /**
     * Get contact by id
     */
    getUserById(id: string): Observable<any> {
        return this.users$.pipe(
            take(1),
            map((contacts) => {
                // Find the contact
                const contact = contacts.find((item) => item.usuarioId == id) || null;
                // Update the contact
                this._user.next(contact);

                // Return the contact
                return contact;
            }),
            switchMap((contact) => {
                if (!contact) {
                    return throwError(
                        () => 'Could not found contact with id of ' + id + '!'
                    );
                }

                return of(contact);
            })
        );
    }

    /**
     * Create contact
     */
    createContact(): Observable<any> {
        return this.users$.pipe(
            take(1),
            switchMap((contacts) =>
                this._httpClient
                    .post<any>('api/apps/contacts/contact', {})
                    .pipe(
                        map((newContact) => {
                            // Update the contacts with the new contact
                            var newUSer = {
                                avatar: null,
                                email: "",
                                fechaCreacion: null,
                                nombreUsuario: "New User",
                                usuarioId: 0,
                                activo: true
                            }
                            this._allUsers = [newUSer, ...this._allUsers];
                            this._users.next(this._allUsers);

                            // Return the new contact
                            return newUSer;
                        })
                    )
            )
        );
    }

    /**
     * Create contact
     */
    updateUsers(user: any): Observable<any> {
        return this._httpClient.post<any>(`${this.apiUrl}/created-user`, user).pipe(
            tap((updatedUser) => {
                // Actualizar caché maestro: Buscar por ID real o por el marcador temporal (ID 0)
                const index = this._allUsers.findIndex(r =>
                    r.usuarioId === updatedUser.usuarioId ||
                    (updatedUser.usuarioId !== 0 && r.usuarioId === 0)
                );

                if (index !== -1) {
                    this._allUsers[index] = updatedUser;
                } else {
                    this._allUsers = [updatedUser, ...this._allUsers];
                }

                // Emitir la nueva lista filtrada si hay búsqueda activa o la lista completa
                this._users.next([...this._allUsers]);
            })
        );
    }

    /**
     * Update contact
     *
     * @param id
     * @param contact
     */
    updateContact(id: string, contact: any): Observable<any> {
        return this.users$.pipe(
            take(1),
            switchMap((contacts) =>
                this._httpClient
                    .patch<any>(`${this.apiUrl}/get-users`, {
                        id,
                        contact,
                    })
                    .pipe(
                        map((updatedContact) => {
                            // Find the index of the updated contact
                            const index = contacts.findIndex(
                                (item) => item.usuarioId === id
                            );

                            // Update the contact
                            contacts[index] = updatedContact;

                            // Update the contacts
                            this._allUsers = [...contacts];
                            this._users.next(contacts);

                            // Return the updated contact
                            return updatedContact;
                        }),
                        switchMap((updatedContact) =>
                            this.user$.pipe(
                                take(1),
                                filter((item) => item && item.usuarioId === id),
                                tap(() => {
                                    // Update the contact if it's selected
                                    this._user.next(updatedContact);

                                    // Return the updated contact
                                    return updatedContact;
                                })
                            )
                        )
                    )
            )
        );
    }

    /**
     * Delete the contact
     *
     * @param id
     */
    deleteContact(id: number): Observable<boolean> {
        // En este caso es usuarioId
        const idStr = id.toString();
        return this.users$.pipe(
            take(1),
            switchMap((contacts) =>
                this._httpClient
                    .delete(`${this.apiUrl}/delete-user/${id}`)
                    .pipe(
                        map(() => {
                            // Find the index of the deleted contact
                            const index = contacts.findIndex(
                                (item) => item.usuarioId === id
                            );

                            // Delete the contact
                            if (index !== -1) {
                                contacts.splice(index, 1);
                            }

                            // Update the contacts
                            this._allUsers = [...contacts];
                            this._users.next(contacts);

                            // Return the deleted status
                            return true;
                        })
                    )
            )
        );
    }

    /**
     * Update the avatar of the given contact
     *
     * @param id
     * @param avatar
     */
    uploadAvatar(id: string, avatar: File): Observable<any> {
        return this.users$.pipe(
            take(1),
            switchMap((contacts) =>
                this._httpClient
                    .post<any>(
                        `${this.apiUrl}/upload-avatar`,
                        {
                            id,
                            avatar,
                        },
                        {
                            headers: {
                                // eslint-disable-next-line @typescript-eslint/naming-convention
                                'Content-Type': avatar.type,
                            },
                        }
                    )
                    .pipe(
                        map((updatedContact) => {
                            // Find the index of the updated contact
                            const index = contacts.findIndex(
                                (item) => item.usuarioId === id
                            );

                            // Update the contact
                            contacts[index] = updatedContact;

                            // Update the contacts
                            this._allUsers = [...contacts];
                            this._users.next(contacts);

                            // Return the updated contact
                            return updatedContact;
                        }),
                        switchMap((updatedContact) =>
                            this.user$.pipe(
                                take(1),
                                filter((item) => item && item.usuarioId === id),
                                tap(() => {
                                    // Update the contact if it's selected
                                    this._user.next(updatedContact);

                                    // Return the updated contact
                                    return updatedContact;
                                })
                            )
                        )
                    )
            )
        );
    }


    // Función modificada para buscar en los contactos cargados localmente
    searchContacts(query: string): Observable<any[]> {
        if (!query) {
            this._users.next(this._allUsers);
            return of(this._allUsers);
        }

        const filteredContacts = this._allUsers.filter(contact =>
            (contact.nombreUsuario?.toLowerCase().includes(query.toLowerCase())) ||
            (contact.email?.toLowerCase().includes(query.toLowerCase()))
        );

        this._users.next(filteredContacts);
        return of(filteredContacts);
    }

    /**
     * Remove the unsaved (temporary) user
     */
    removeUnsavedUser(): void {
        this._allUsers = this._allUsers.filter(user => user.usuarioId !== 0);
        this._users.next([...this._allUsers]);
    }

    /**
     * Get business units
     */
    getUnidadesNegocio(): Observable<any[]> {
        return this._httpClient.get<any[]>(`${this.apiUrlProyecto}/unidades-negocio`);
    }
}
