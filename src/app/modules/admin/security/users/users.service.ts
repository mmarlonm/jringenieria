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
    // Private
    private _user: BehaviorSubject<any | null> = new BehaviorSubject(
        null
    );
    private _users: BehaviorSubject<any[] | null> = new BehaviorSubject(
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
                this._users.next(contacts);
            })
        );
    }

    /**
     * Get contact by id
     */
    getUserById(id: string): Observable<any> {
        return this._users.pipe(
            take(1),
            map((contacts) => {
                // Find the contact
                console.log("id ", id)
                console.log("contacts ", contacts)
                const contact = contacts.find((item) => item.usuarioId == id) || null;
                console.log("contacto buscado ", contact)
                // Update the contact
                this._user.next(contact);

                // Return the contact
                return contact;
            }),
            switchMap((contact) => {
                if (!contact) {
                    return throwError(
                        'Could not found contact with id of ' + id + '!'
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
                                nombreUsuario : "",
                                usuarioId:0
                            }
                            this._users.next([newUSer, ...contacts]);

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
                // Obtener la lista actual de users
                this.users$.pipe(take(1)).subscribe((users) => {
                    // Si el rol existe, actualizarlo; si no, agregarlo
                    const updatedUsers = users.some(r => r.usuarioId === updatedUser.usuarioId)
                        ? users.map(r => (r.rolId === updatedUser.usuarioId ? updatedUser : r))
                        : [...users, updatedUser];
    
                    // Emitir la nueva lista de users
                    this._users.next(updatedUsers);
                });
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
                                (item) => item.id === id
                            );

                            // Update the contact
                            contacts[index] = updatedContact;

                            // Update the contacts
                            this._users.next(contacts);

                            // Return the updated contact
                            return updatedContact;
                        }),
                        switchMap((updatedContact) =>
                            this.user$.pipe(
                                take(1),
                                filter((item) => item && item.id === id),
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
    deleteContact(id: string): Observable<boolean> {
        return this.users$.pipe(
            take(1),
            switchMap((contacts) =>
                this._httpClient
                    .delete('api/apps/contacts/contact', { params: { id } })
                    .pipe(
                        map((isDeleted: boolean) => {
                            // Find the index of the deleted contact
                            const index = contacts.findIndex(
                                (item) => item.id === id
                            );

                            // Delete the contact
                            contacts.splice(index, 1);

                            // Update the contacts
                            this._users.next(contacts);

                            // Return the deleted status
                            return isDeleted;
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
                                (item) => item.id === id
                            );

                            // Update the contact
                            contacts[index] = updatedContact;

                            // Update the contacts
                            this._users.next(contacts);

                            // Return the updated contact
                            return updatedContact;
                        }),
                        switchMap((updatedContact) =>
                            this.user$.pipe(
                                take(1),
                                filter((item) => item && item.id === id),
                                tap(() => {
                                    // Update the contact if it's selected
                                    this._users.next(updatedContact);

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
    // Buscar en los datos locales en lugar de hacer una solicitud HTTP
    const filteredContacts = this._users.value.filter(contact =>
      contact.name.toLowerCase().includes(query.toLowerCase()) ||
      contact.email.toLowerCase().includes(query.toLowerCase())
    );

    // Devolver el resultado como un observable
    return new Observable<any[]>((observer) => {
      observer.next(filteredContacts);
      observer.complete();
    });
  }
}
